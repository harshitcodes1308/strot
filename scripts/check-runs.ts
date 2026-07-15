import 'dotenv/config';
import { db } from '../src/lib/db';
async function main() {
  const runs = await db.scraperRun.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
  console.log("Recent Runs:", runs);
  const results = await db.rawScraperResult.count();
  console.log("Total Raw Results:", results);
}
main().catch(console.error).finally(() => db.$disconnect());
