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

async function inspectMod() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const target = '499785:';
  let idx = code.indexOf(target);
  if (idx === -1) idx = code.indexOf('"499785"');
  console.log("Found module 499785 at:", idx);
  if (idx !== -1) {
    console.log(code.substring(idx, idx + 1000));
  }
}

inspectMod().catch(console.error);
