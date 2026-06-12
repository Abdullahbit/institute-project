const pg = require("pg");
const { Client } = pg;

async function main() {
  const connectionString = "postgresql://postgres.euahwenkmrjcvvwovgzd:Thenobleprofession722.@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to database.");

  console.log("Activating subscriptions for all schools...");
  const res = await client.query(
    "UPDATE schools SET subscription_status = 'active', is_active = true;"
  );
  console.log(`Updated ${res.rowCount} schools.`);

  await client.end();
}

main().catch(console.error);
