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

async function inspectR() {
  const code = await get("https://discord.com/assets/web.d013399d296fd06f.js");
  const target = 'QUESTS_HEARTBEAT(t)';
  const idx = code.indexOf(target);
  // Search backwards from idx for R = or var R = or import R
  const before = code.substring(idx - 10000, idx);
  // find all occurrences of R = or R.A
  const rMatches = [...before.matchAll(/([a-zA-Z0-9_$]+)\s*=\s*n\([0-9]+\)/g)];
  console.log("Imports near function:", rMatches.slice(-20).map(m => m[0]));

  // Also print the beginning of the module containing en(e)
  const modStart = before.lastIndexOf('function(');
  console.log("Module start ~", before.substring(modStart, modStart + 1000));
}

inspectR().catch(console.error);
