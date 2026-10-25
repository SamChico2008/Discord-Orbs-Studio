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

async function inspect() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const targets = ['X-Super-Properties', 'client_heartbeat_session_id', 'is_playtime_eligible'];

  for (const t of targets) {
    let idx = 0;
    while ((idx = code.indexOf(t, idx)) !== -1) {
      console.log(`\n--- Found [${t}] at ${idx} ---`);
      console.log(code.substring(idx - 300, idx + 400));
      idx += t.length;
    }
  }
}

inspect().catch(console.error);
