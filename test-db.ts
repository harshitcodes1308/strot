import { db } from "./src/lib/db.js";
async function main() {
  const res = await db.rawScraperResult.findMany({
    orderBy: { createdAt: "desc" },
    take: 20
  });
  console.log("Found " + res.length + " results.");
  for (const r of res) {
    console.log(r.source);
  }
}
main();
