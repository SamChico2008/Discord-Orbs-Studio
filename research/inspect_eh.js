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

async function inspectEH() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const pos = 9643179 + 8670;
  console.log(code.substring(pos - 1500, pos + 500));
}

inspectEH().catch(console.error);
