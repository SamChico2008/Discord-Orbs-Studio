const fs = require('fs');
const crypto = require('crypto');
const sessionPath = process.env.DISCORD_SESSION_PATH || './sessions.json';
const s = fs.existsSync(sessionPath) ? JSON.parse(fs.readFileSync(sessionPath, 'utf8')) : {};
const token = Object.values(s)[0]?.token || process.env.DISCORD_TOKEN || '';
const questId = "1542685543295361096"; // Typhoeus
const appId = "1461154307171811401";

const superProps = {
  os: "Windows",
  browser: "Discord Client",
  release_channel: "stable",
  client_version: "1.0.9256",
  os_version: "10.0.22631",
  os_arch: "x64",
  system_locale: "en-US",
  client_build_number: 606747,
  native_build_number: null,
  client_event_source: null,
  has_client_mods: false,
  client_heartbeat_session_id: crypto.randomUUID()
};

const superPropsB64 = Buffer.from(JSON.stringify(superProps)).toString("base64");

async function run() {
  console.log("1. Testing GET /quests/@me with Super Props (build 606747)...");
  const meRes = await fetch("https://discord.com/api/v9/quests/@me", {
    headers: {
      "Authorization": token,
      "X-Super-Properties": superPropsB64,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9256 Chrome/128.0.6613.186 Electron/32.2.7 Safari/537.36",
      "X-Discord-Locale": "en-US",
      "X-Discord-Timezone": "America/New_York"
    }
  });
  console.log("Status:", meRes.status);
  const meData = await meRes.json();
  console.log("Quests count:", meData.quests?.length ?? meData.length);

  console.log("\n2. Testing POST /quests/" + questId + "/heartbeat with exact Discord Desktop payload...");
  const hbRes = await fetch(`https://discord.com/api/v9/quests/${questId}/heartbeat`, {
    method: "POST",
    headers: {
      "Authorization": token,
      "Content-Type": "application/json",
      "X-Super-Properties": superPropsB64,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9256 Chrome/128.0.6613.186 Electron/32.2.7 Safari/537.36",
      "X-Discord-Locale": "en-US",
      "X-Discord-Timezone": "America/New_York"
    },
    body: JSON.stringify({
      application_id: appId,
      terminal: false
    })
  });
  console.log("Status:", hbRes.status, hbRes.statusText);
  console.log("Body:", await hbRes.text());
}

run().catch(console.error);
