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

async function inspectCallers() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const idx = code.indexOf('async function en(e)');
  console.log("Found en at:", idx);
  // Find exports or usages of en
  // In webpack, function en might be exported as e.sendHeartbeat = en or something.
  const callers = [];
  let pos = 0;
  // search for en( or references
  const funcSlice = code.substring(idx - 1000, idx + 2000);
  console.log("\n--- Around en ---:\n", funcSlice);
}

inspectCallers().catch(console.error);
