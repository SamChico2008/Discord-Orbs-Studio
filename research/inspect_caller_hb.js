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

async function inspectCallerOfHeartbeat() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  // Find where QUESTS_SEND_HEARTBEAT_SUCCESS is handled
  let idx = 0;
  while ((idx = code.indexOf('QUESTS_SEND_HEARTBEAT_SUCCESS', idx)) !== -1) {
    console.log("Found QUESTS_SEND_HEARTBEAT_SUCCESS at:", idx);
    console.log(code.substring(idx - 100, idx + 300));
    idx += 30;
  }
}

inspectCallerOfHeartbeat().catch(console.error);
