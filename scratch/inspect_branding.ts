import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Find .env file dynamically
const dirs = [
  process.cwd(),
  path.resolve("apps/api"),
  path.resolve(".."),
  path.resolve("../apps/api"),
  path.resolve("../..")
];

let loaded = false;
for (const dir of dirs) {
  const p = path.join(dir, ".env");
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    console.log("Loaded environment from:", p);
    loaded = true;
    break;
  }
}

const { Client } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set! Process env is:", process.env.DATABASE_URL);
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const res = await client.query("SELECT id, name, logo_url, theme_color FROM schools;");
    console.log("Schools in database:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error running query:", err);
  } finally {
    await client.end();
  }
}

main();
