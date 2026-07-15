import { V2ScraperOrchestrator } from "../src/scrapers/v2/orchestrator";

// Requires GOOGLE_PLACES_API_KEY in the environment
async function main() {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error("Missing GOOGLE_PLACES_API_KEY environment variable. Exiting.");
    process.exit(1);
  }

  const orchestrator = new V2ScraperOrchestrator();
  
  // Use a hardcoded dummy workspaceId and userId for testing purposes.
  // In a real environment, ensure these map to valid UUIDs in your DB or mock the DB calls in orchestrator if needed.
  // We will assume that they are valid for this manual test, or at least they won't hard-crash if FK constraints allow it
  // Actually, we'll need a valid workspace. If you don't have one, this might throw a Prisma FK error.
  
  console.log("Starting V2 pipeline test...");
  
  try {
    const result = await orchestrator.runSearch({
      query: "Plumbers",
      location: "Austin, TX",
      limit: 2, // Keep limit low for testing
      workspaceId: "test-workspace-id", // Change to real ID if running locally against DB
      userId: "test-user-id" // Change to real ID if running locally against DB
    });
    
    console.log("Test Result:", result);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

main().catch(console.error);
