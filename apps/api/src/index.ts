import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { initTRPC, TRPCError } from '@trpc/server';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { z } from 'zod';
import { env } from './env';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { tenantResolution } from './middleware/tenant';
import { CreateInvitationSchema, AcceptInvitationSchema } from '@lingoflow/types';

// Load variables
const PORT = env.PORT;
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client with SERVICE ROLE key to bypass RLS for administrative tasks
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Setup tRPC Context
export const createContext = ({ req, res }: { req: FastifyRequest; res: FastifyReply }) => {
  return {
    req,
    res,
    school_id: req.school_id,
    school_slug: req.school_slug,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC v11
const t = initTRPC.context<Context>().create();

// tRPC Middlewares
const isAuthed = t.middleware(async ({ ctx, next }) => {
  const authHeader = ctx.req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session is invalid or expired' });
  }

  const userSchoolId = user.user_metadata?.school_id;
  const userRole = user.user_metadata?.role;

  // Enforce tenant boundary check
  if (!userSchoolId || userSchoolId !== ctx.school_id) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Forbidden: Cross-tenant access denied' });
  }

  return next({
    ctx: {
      ...ctx,
      user,
      userSchoolId,
      userRole,
    },
  });
});

const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (ctx.userRole !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Action requires Admin role permissions' });
  }
  return next();
});

// Define tRPC API Router
export const appRouter = t.router({
  // Hello procedure
  hello: t.procedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        message: `Hello, ${input.name || 'World'} from LingoFlow tRPC API!`,
        timestamp: new Date().toISOString(),
      };
    }),

  // Seed database with two schools and default admin
  seed: t.procedure.mutation(async () => {
    // 1. Upsert School A
    const { data: schoolA, error: errA } = await supabase
      .from('schools')
      .upsert(
        { slug: 'school-a', name: 'School Alpha Academy' },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    // 2. Upsert School B
    const { data: schoolB, error: errB } = await supabase
      .from('schools')
      .upsert(
        { slug: 'school-b', name: 'School Beta Academy' },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (errA || errB || !schoolA || !schoolB) {
      console.error('Seed Error:', { errA, errB });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to seed schools in the database',
      });
    }

    // 3. Create default admin for School A in Supabase Auth via Admin API
    const adminEmail = 'admin@school-a.com';
    const adminPassword = 'password123';
    
    const { data: usersList } = await supabase.auth.admin.listUsers();
    const existingAdmin = usersList?.users?.find(u => u.email === adminEmail);
    
    let authUser;
    if (existingAdmin) {
      authUser = existingAdmin;
    } else {
      const { data: created, error: authErr } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          school_id: schoolA.id,
          role: 'admin',
          full_name: 'Alpha School Admin',
          is_active: true,
        },
      });
      if (authErr) {
        console.error('Admin Auth Creation Error:', authErr);
      } else {
        authUser = created.user;
      }
    }

    if (authUser) {
      // Upsert user profile into public users table
      await supabase
        .from('users')
        .upsert({
          id: authUser.id,
          school_id: schoolA.id,
          role: 'admin',
          full_name: 'Alpha School Admin',
          email: adminEmail,
          is_active: true,
        });
    }

    return {
      message: 'Database seeded successfully with test schools and Alpha admin (admin@school-a.com / password123)',
      schoolA: { id: schoolA.id, name: schoolA.name, slug: schoolA.slug },
      schoolB: { id: schoolB.id, name: schoolB.name, slug: schoolB.slug },
    };
  }),

  // Validate invitation token
  validateInviteToken: t.procedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const { data: invite, error } = await supabase
        .from('invitations')
        .select('*, schools(name, slug)')
        .eq('token', input.token)
        .single();

      if (error || !invite) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation token not found' });
      }

      if (invite.accepted_at) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This invitation has already been accepted' });
      }

      if (new Date(invite.expires_at) < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This invitation has expired' });
      }

      return invite;
    }),

  // Accept invitation and create Supabase Auth & public profile
  acceptInvitation: t.procedure
    .input(AcceptInvitationSchema)
    .mutation(async ({ input }) => {
      // 1. Fetch and validate invitation
      const { data: invite, error: inviteErr } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', input.token)
        .single();

      if (inviteErr || !invite) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid invitation token' });
      }

      if (invite.accepted_at) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This invitation has already been accepted' });
      }

      if (new Date(invite.expires_at) < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This invitation has expired' });
      }

      // 2. Create the user in Supabase Auth via Admin API
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: invite.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          school_id: invite.school_id,
          role: invite.role,
          full_name: input.fullName,
          is_active: true,
        },
      });

      if (authErr || !authUser.user) {
        console.error('Auth User Creation Error:', authErr);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: authErr?.message || 'Failed to create auth user account',
        });
      }

      // 3. Insert user profile into public users table
      const { error: userErr } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          school_id: invite.school_id,
          role: invite.role,
          full_name: input.fullName,
          email: invite.email,
          is_active: true,
        });

      if (userErr) {
        console.error('Public User Sync Error:', userErr);
        // Rollback user account creation in Supabase Auth on profile sync failure
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to synchronize user profile record',
        });
      }

      // 4. Flag invitation as accepted
      const { error: patchErr } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      if (patchErr) {
        console.error('Invitation Accept Patch Error:', patchErr);
      }

      return { success: true };
    }),

  // Invite user (Admin only)
  inviteUser: t.procedure
    .use(isAuthed)
    .use(isAdmin)
    .input(CreateInvitationSchema)
    .mutation(async ({ input, ctx }) => {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 72); // Valid for 72 hours

      const { data: invite, error } = await supabase
        .from('invitations')
        .insert({
          school_id: ctx.school_id!,
          email: input.email,
          role: input.role,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error || !invite) {
        console.error('Invite Creation Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create invitation record',
        });
      }

      return {
        token: invite.token,
        expires_at: invite.expires_at,
      };
    }),
});

export type AppRouter = typeof appRouter;

const server = Fastify({
  logger: true,
});

async function main() {
  // Register plugins
  await server.register(cors, {
    origin: true,
  });
  await server.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Pre-handler hook for subdomain multi-tenant resolution
  server.addHook('preHandler', tenantResolution);

  // Health check endpoint
  server.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Register tRPC fastify adapter
  await server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
    },
  });

  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Fastify + tRPC server running on http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
