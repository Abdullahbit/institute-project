const pg = require("pg");
const { Client } = pg;

async function main() {
  const connectionString = "postgresql://postgres.euahwenkmrjcvvwovgzd:Thenobleprofession722.@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to PostgreSQL database.");

  console.log("Adding logo_url column to schools table...");
  try {
    await client.query("ALTER TABLE schools ADD COLUMN logo_url text;");
    console.log("Success.");
  } catch (e) {
    console.log(`Skipped/Error: ${e.message}`);
  }

  console.log("Adding theme_color column to schools table...");
  try {
    await client.query("ALTER TABLE schools ADD COLUMN theme_color text;");
    console.log("Success.");
  } catch (e) {
    console.log(`Skipped/Error: ${e.message}`);
  }

  console.log("Adding parent_phone column to students table...");
  try {
    await client.query("ALTER TABLE students ADD COLUMN parent_phone text;");
    console.log("Success.");
  } catch (e) {
    console.log(`Skipped/Error: ${e.message}`);
  }

  await client.end();
  console.log("Migration script completed.");
}

main().catch(console.error);
