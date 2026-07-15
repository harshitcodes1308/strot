import "dotenv/config";
import { db } from "./src/lib/db";

async function resetLimit() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const res = await db.lead.updateMany({
    data: {
      createdAt: yesterday
    }
  });
  console.log(`Reset limit by moving ${res.count} leads to yesterday.`);
}

resetLimit()
  .catch(console.error);
