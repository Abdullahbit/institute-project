import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Try loading env from multiple possible relative paths
const paths = [
  path.resolve("apps/api/.env"),
  path.resolve(".env"),
  path.resolve("../apps/api/.env"),
  path.resolve("../../apps/api/.env"),
  path.resolve("../../../apps/api/.env")
];

let loaded = false;
for (const p of paths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    console.log(`Loaded env from: ${p}`);
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.log("Could not find .env file dynamically, using existing process.env");
}

const { Client } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set!");
    return;
  }

  console.log("Connecting to database:", connectionString.split("@")[1] || connectionString);
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // List all tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log("\nTables in database:");
    for (const row of tablesRes.rows) {
      console.log(` - ${row.table_name}`);
    }

    // Check columns in student_logs, substitute_requests, students, etc.
    const tablesToCheck = ['students', 'student_logs', 'substitute_requests'];
    for (const table of tablesToCheck) {
      const colRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      console.log(`\nColumns in table '${table}':`);
      for (const row of colRes.rows) {
        console.log(` - ${row.column_name} (${row.data_type})`);
      }
    }
  } catch (err) {
    console.error("Error inspecting database:", err);
  } finally {
    await client.end();
  }
}

main();
