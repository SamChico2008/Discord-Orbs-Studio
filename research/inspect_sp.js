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

async function inspect174459() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const target = '174459:';
  let idx = code.indexOf(target);
  if (idx === -1) idx = code.indexOf('"174459"');
  if (idx === -1) idx = code.indexOf('174459(');
  console.log("Found 174459 at:", idx);
  // Also search for getSuperPropertiesBase64
  let spIdx = 0;
  while ((spIdx = code.indexOf('getSuperPropertiesBase64', spIdx)) !== -1) {
    console.log("Found getSuperPropertiesBase64 at:", spIdx);
    console.log(code.substring(spIdx - 200, spIdx + 600));
    spIdx += 24;
  }
}

inspect174459().catch(console.error);
