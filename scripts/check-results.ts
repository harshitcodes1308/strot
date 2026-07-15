import 'dotenv/config';
import { db } from '../src/lib/db';
async function main() {
  const results = await db.rawScraperResult.findMany({ 
    where: { scraperRunId: '6551cfb8-5541-4c76-8adf-d07686519b11' } 
  });
  console.log("Results for run:", results.length);
}
main().catch(console.error).finally(() => db.$disconnect());
