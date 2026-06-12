const pg = require("pg");
const { Client } = pg;

async function main() {
  const connectionString = "postgresql://postgres.euahwenkmrjcvvwovgzd:Thenobleprofession722.@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";
  const client = new Client({ connectionString });
  await client.connect();
  
  const res = await client.query("SELECT id, name, subdomain, is_active, subscription_status FROM schools;");
  console.log("Schools list:", JSON.stringify(res.rows, null, 2));

  await client.end();
}

main().catch(console.error);
