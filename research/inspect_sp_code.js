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

async function inspectSPCode() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const pos = 9643179;
  console.log(code.substring(pos - 100, pos + 3000));
}

inspectSPCode().catch(console.error);
