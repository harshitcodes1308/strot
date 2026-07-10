const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query('SELECT id, status, "resultsCount", "errorMessage", "createdAt" FROM "ScraperRun" ORDER BY "createdAt" DESC LIMIT 5');
  console.log(res.rows);
  await client.end();
}
check();
