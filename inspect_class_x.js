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

async function inspectClassX() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const pos = 6842541;
  const idx = code.lastIndexOf('class x', pos);
  console.log("Found class x at:", idx);
  console.log(code.substring(idx, idx + 4000));
}

inspectClassX().catch(console.error);
