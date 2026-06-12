import pg from "pg";
const { Pool } = pg;

async function run() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' });
  try {
    const today = new Date().toISOString().slice(0, 10);
    // Update all sessions to today's date for easy testing
    const res = await pool.query(`UPDATE lesson_sessions SET session_date = $1 RETURNING id`, [today]);
    console.log(`Updated ${res.rowCount} lesson sessions to today (${today}).`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
