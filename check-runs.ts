import { db } from "./src/lib/db";

async function check() {
  const runs = await db.scraperRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log(runs);
}

check().finally(() => process.exit(0));
