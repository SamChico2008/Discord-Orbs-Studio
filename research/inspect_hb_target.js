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

async function inspectHB() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const target = 'QUESTS_HEARTBEAT(t)';
  const idx = code.indexOf(target);
  console.log("Found QUESTS_HEARTBEAT(t) at:", idx);
  console.log("\n--- Surrounding code ---\n");
  console.log(code.substring(idx - 1500, idx + 1500));
}

inspectHB().catch(console.error);
