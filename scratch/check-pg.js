const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const res = await pool.query('SELECT * FROM "ScraperRun" ORDER BY "createdAt" DESC LIMIT 5');
  console.log("Recent Scraper Runs:");
  console.dir(res.rows);
  
  if (res.rows.length > 0) {
    const rawRes = await pool.query('SELECT source FROM "RawScraperResult" WHERE "scraperRunId" = $1 LIMIT 5', [res.rows[0].id]);
    console.log("Raw results for latest run:", rawRes.rows);
  }
  
  pool.end();
}

main().catch(console.error);
