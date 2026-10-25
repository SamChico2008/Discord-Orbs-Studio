const https = require('https');

async function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function findEndpoints() {
  console.log("Fetching discord.com/app html...");
  const html = await get("https://discord.com/app");
  const scriptMatches = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(m => "https://discord.com" + m[1]);
  console.log(`Found ${scriptMatches.length} scripts in html.`);

  for (const scriptUrl of scriptMatches) {
    const code = await get(scriptUrl);
    if (code.includes('quests/') || code.includes('QUEST_') || code.includes('heartbeat')) {
      console.log(`Matching script: ${scriptUrl}`);
      // Find matches around quests/
      const regex = /["'`][^"'`]*quests[^"'`]*["'`]/gi;
      let m;
      while ((m = regex.exec(code)) !== null) {
        if (m[0].length < 100 && (m[0].includes('heartbeat') || m[0].includes('progress') || m[0].includes('/api'))) {
          console.log("  Endpoint match:", m[0]);
        }
      }

      // Look for heartbeat function or string
      const hbMatches = code.match(/.{0,50}heartbeat.{0,50}/gi) || [];
      for (const hbm of hbMatches.slice(0, 10)) {
        if (hbm.includes('quest') || hbm.includes('Quest') || hbm.includes('/')) {
          console.log("  HB Context:", hbm.trim());
        }
      }
    }
  }
}

findEndpoints().catch(console.error);
