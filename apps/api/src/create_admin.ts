import { createClient } from "@supabase/supabase-js";
import { db, profiles } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || "https://euahwenkmrjcvvwovgzd.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1YWh3ZW5rbXJqY3Z2d292Z3pkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0MjUzMiwiZXhwIjoyMDk0MDE4NTMyfQ.a3Ot5QBm37LxDwgfM_DDGk5rbHjB6HbnPSFrlMDk8ho";
  const schoolAId = "a0000000-0000-4000-8000-000000000001";
  
  const adminEmail = "simaalouzi@gmail.com";
  const adminPassword = "SimaEdu2026!";

  console.log(`Initializing Supabase client for ${supabaseUrl}...`);
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log(`Checking if user ${adminEmail} already exists...`);
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  let authUser;
  const existingUser = listData?.users.find((u) => u.email === adminEmail);

  if (existingUser) {
    console.log(`User ${adminEmail} exists. Updating password and metadata...`);
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: adminPassword,
        user_metadata: {
          school_id: schoolAId,
          role: "admin",
          full_name: "Sima Admin",
          is_active: true
        }
      }
    );
    if (updateError) {
      console.error("Failed to update user:", updateError.message);
      process.exit(1);
    }
    authUser = updateData.user;
    console.log("User updated successfully in Supabase Auth.");
  } else {
    console.log(`User ${adminEmail} does not exist. Creating new user...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      user_metadata: {
        school_id: schoolAId,
        role: "admin",
        full_name: "Sima Admin",
        is_active: true
      },
      email_confirm: true
    });
    if (createError) {
      console.error("Failed to create user:", createError.message);
      process.exit(1);
    }
    authUser = createData.user;
    console.log("User created successfully in Supabase Auth.");
  }

  if (!authUser) {
    console.error("Auth user object is empty");
    process.exit(1);
  }

  console.log(`Syncing profile to public.profiles table for user ID: ${authUser.id}...`);
  try {
    await db.insert(profiles).values({
      id: authUser.id,
      schoolId: schoolAId,
      role: "admin",
      fullName: "Sima Admin",
      isActive: true
    }).onConflictDoUpdate({
      target: profiles.id,
      set: {
        schoolId: schoolAId,
        role: "admin",
        fullName: "Sima Admin",
        isActive: true,
        updatedAt: new Date()
      }
    });
    console.log(`SUCCESS: Custom admin profile created/updated in database.`);
  } catch (dbErr: any) {
    console.error("Failed to sync database profile:", dbErr.message);
    process.exit(1);
  }

  console.log("All tasks completed successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
