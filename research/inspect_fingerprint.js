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

async function inspectFP() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const target = 'executable_fingerprint';
  let idx = 0;
  while ((idx = code.indexOf(target, idx)) !== -1) {
    console.log("Found target at:", idx);
    console.log(code.substring(idx - 200, idx + 400));
    idx += target.length;
  }
}

inspectFP().catch(console.error);
