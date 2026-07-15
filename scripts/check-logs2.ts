import 'dotenv/config';
import { db } from '../src/lib/db';
async function main() {
  const runs = await db.scraperRun.findMany({ orderBy: { createdAt: 'desc' }, take: 3 });
  for (const run of runs) {
    const results = await db.rawScraperResult.count({ where: { scraperRunId: run.id } });
    console.log(`Run ${run.id} (${run.query} in ${run.status}): ${results} results`);
  }
}
main().catch(console.error).finally(() => db.$disconnect());
