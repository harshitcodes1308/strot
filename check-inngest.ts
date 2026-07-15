import { db } from "./src/lib/db";
async function run() {
  const latestRun = await db.scraperRun.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log("Latest Run:", latestRun);
  
  if (latestRun) {
    const rawResults = await db.rawScraperResult.findMany({
      where: { scraperRunId: latestRun.id }
    });
    const sources = rawResults.map(r => r.source);
    
    const countBySource = sources.reduce((acc, src) => {
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("Sources breakdown:", countBySource);
  }
}
run();
