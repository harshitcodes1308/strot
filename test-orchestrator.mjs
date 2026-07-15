import { V2ScraperOrchestrator } from './src/scrapers/v2/orchestrator.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const orchestrator = new V2ScraperOrchestrator();
  const res = await orchestrator.runSearch({
    runId: 'test-run',
    query: 'clothing',
    location: 'delhi',
    limit: 2,
    workspaceId: 'test-ws',
    userId: 'test-user'
  });
  console.log(res);
}

main().catch(console.error);
