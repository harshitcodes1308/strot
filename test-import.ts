require('dotenv').config();
try {
  const { orchestrator } = require('./src/scrapers/index');
  console.log("Import successful.");
} catch (e) {
  console.error("IMPORT ERROR:", e);
}
