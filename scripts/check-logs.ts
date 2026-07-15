import 'dotenv/config';
import { db } from '../src/lib/db';
async function main() {
  const runs = await db.scraperRun.findMany({ orderBy: { createdAt: 'desc' }, take: 1 });
  console.log("Recent Run:", runs[0]);
  
  if (runs[0]) {
    const results = await db.rawScraperResult.findMany({ 
      where: { scraperRunId: runs[0].id } 
    });
    console.log(`Results for run ${runs[0].id}:`, results.length);
  }
}
main().catch(console.error).finally(() => db.$disconnect());
