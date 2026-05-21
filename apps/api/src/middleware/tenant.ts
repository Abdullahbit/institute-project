import { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../index';

declare module 'fastify' {
  interface FastifyRequest {
    school_id?: string;
    school_slug?: string;
  }
}

export async function tenantResolution(req: FastifyRequest, reply: FastifyReply) {
  // Skip tenant resolution for non-tenant endpoints
  if (
    req.url.startsWith('/health') ||
    req.url.startsWith('/trpc/seed') ||
    req.url.startsWith('/trpc/validateInviteToken') ||
    req.url.startsWith('/trpc/acceptInvitation')
  ) {
    return;
  }

  // Resolve slug from x-school-slug header or host header subdomain
  const slugHeader = req.headers['x-school-slug'];
  let slug = '';

  if (typeof slugHeader === 'string' && slugHeader) {
    slug = slugHeader;
  } else {
    const host = req.headers.host || '';
    const hostWithoutPort = host.split(':')[0];
    const parts = hostWithoutPort.split('.');
    
    // e.g., school-a.lingoflow.com -> parts = ['school-a', 'lingoflow', 'com']
    // e.g., school-a.localhost -> parts = ['school-a', 'localhost']
    if (parts.length > 2) {
      slug = parts[0];
    } else if (parts.length === 2 && parts[1] === 'localhost') {
      slug = parts[0];
    }
  }

  if (!slug) {
    reply.status(400).send({ error: 'Tenant subdomain or x-school-slug header is required' });
    return;
  }

  // Query schools table to verify tenant exists
  const { data: school, error } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error || !school) {
    reply.status(444 || 404).code(404).send({ error: `Tenant school '${slug}' not found` });
    return;
  }

  req.school_id = school.id;
  req.school_slug = slug;
}
