const fs = require('fs');
const s = JSON.parse(fs.readFileSync('C:/Users/SamChicoPC/.gemini/antigravity-ide/scratch/discord-quest-bot/sessions.json', 'utf8'));
const token = Object.values(s)[0].token;

async function testHB() {
  // Let's test with quest 1542685543295361096 (Version Update: Typhoeus, already enrolled)
  const questId = "1542685543295361096";
  const appId = "1461154307171811401";

  console.log("Testing POST /quests/" + questId + "/heartbeat...");

  const variations = [
    {
      name: "Standard JSON with application_id",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      },
      body: { application_id: appId, terminal: false }
    },
    {
      name: "Empty JSON body",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      },
      body: {}
    },
    {
      name: "With Discord User-Agent and Super-Props",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9256 Chrome/128.0.6613.186 Electron/32.2.7 Safari/537.36",
        "X-Super-Properties": Buffer.from(JSON.stringify({
          os: "Windows",
          browser: "Discord Client",
          release_channel: "stable",
          client_version: "1.0.9256",
          os_version: "10.0.22631",
          os_arch: "x64",
          client_build_number: 326000
        })).toString("base64")
      },
      body: { application_id: appId, terminal: false }
    }
  ];

  for (const v of variations) {
    console.log(`\n--- [${v.name}] ---`);
    try {
      const res = await fetch(`https://discord.com/api/v9/quests/${questId}/heartbeat`, {
        method: "POST",
        headers: v.headers,
        body: JSON.stringify(v.body)
      });
      const txt = await res.text();
      console.log(`Status: ${res.status} ${res.statusText}`);
      console.log(`Response: ${txt}`);
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  }
}

testHB();
