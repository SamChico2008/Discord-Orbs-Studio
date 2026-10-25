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

async function inspectSyncHeartbeats() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const pos = 6842652;
  // search backwards for syncHeartbeats definition
  const idx = code.lastIndexOf('syncHeartbeats', pos);
  console.log("Found syncHeartbeats at:", idx);
  console.log(code.substring(idx - 500, idx + 2000));
}

inspectSyncHeartbeats().catch(console.error);
