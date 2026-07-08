const fs = require('fs');

const addCrypto = (path) => {
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('import crypto from "crypto";')) {
    content = content.replace('import { LeadSource', 'import crypto from "crypto";\nimport { LeadSource');
    fs.writeFileSync(path, content);
  }
};

['clutch.ts', 'behance.ts', 'dribbble.ts', 'facebook.ts', 'goodfirms.ts', 'justdial.ts'].forEach(f => {
  addCrypto(`/Users/uday/strot/src/scrapers/${f}`);
});

const fixNulls = (path) => {
  let content = fs.readFileSync(path, 'utf8');
  // replace `?? undefined` with `?? null`
  content = content.replace(/\?\? undefined/g, '?? null');
  fs.writeFileSync(path, content);
};

['google-dorking.ts', 'business-directories.ts', 'ad-libraries.ts', 'social-posts.ts'].forEach(f => {
  fixNulls(`/Users/uday/strot/src/scrapers/${f}`);
});
