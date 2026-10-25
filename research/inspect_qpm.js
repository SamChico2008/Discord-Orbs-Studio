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

async function inspectQPM() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const pos = 6842652;
  console.log("\n--- QuestProgressManager ---\n");
  console.log(code.substring(pos - 2000, pos + 2500));
}

inspectQPM().catch(console.error);
