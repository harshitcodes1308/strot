import { orchestrator } from "./src/scrapers/index";
import { db } from "./src/lib/db";

async function run() {
  const ws = await db.workspace.findFirst();
  const user = await db.user.findFirst();
  console.log("WS:", ws?.id, "User:", user?.id);

  if (!ws || !user) {
    console.log("Seeding dummy user and workspace...");
    const newUser = await db.user.create({ data: { clerkId: "clerk_" + Date.now(), email: "test@test.com" } });
    const newWs = await db.workspace.create({ data: { name: "Test WS", userId: newUser.id } });
    return run();
  }

  try {
    const res = await orchestrator.search(
      { query: "restaurant", location: "delhi", industry: "Food & Beverage" },
      ["linkedin", "instagram", "google_maps", "website"],
      { workspaceId: ws.id, userId: user.id }
    );
    console.log("Success:", res);
  } catch (e) {
    console.error("Full Error:", e);
  }
}

run().finally(() => process.exit(0));
