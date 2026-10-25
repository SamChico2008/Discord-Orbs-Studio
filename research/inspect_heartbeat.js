const https = require('https');
const fs = require('fs');

async function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function inspect() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  console.log("Length:", code.length);

  let idx = 0;
  while ((idx = code.indexOf('QUESTS_HEARTBEAT', idx)) !== -1) {
    const start = Math.max(0, idx - 500);
    const end = Math.min(code.length, idx + 1500);
    console.log("\n================ CONTEXT ================\n");
    console.log(code.substring(start, end));
    idx += 16;
  }
}

inspect().catch(console.error);
