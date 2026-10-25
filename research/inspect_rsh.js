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

async function inspectRsh() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const target = 'QUESTS_HEARTBEAT';
  const idx = code.indexOf(target);
  console.log("Context around QUESTS_HEARTBEAT definition:");
  console.log(code.substring(idx - 100, idx + 200));

  // Find where D.Rsh or Rsh is defined
  const rshIdx = code.indexOf('Rsh=');
  if (rshIdx !== -1) {
    console.log("Found Rsh= at:", rshIdx);
    console.log(code.substring(rshIdx - 50, rshIdx + 200));
  }
}

inspectRsh().catch(console.error);
