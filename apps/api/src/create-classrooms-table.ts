import { pool } from "@workspace/db";

async function main() {
  console.log("Creating classrooms table...");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS classrooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES schools(id),
      name TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Classrooms table created successfully.");
  await pool.end();
}

main().catch(console.error);
