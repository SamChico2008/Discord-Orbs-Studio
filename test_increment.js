const fs = require('fs');
const crypto = require('crypto');
const s = JSON.parse(fs.readFileSync('C:/Users/SamChicoPC/.gemini/antigravity-ide/scratch/discord-quest-bot/sessions.json', 'utf8'));
const token = Object.values(s)[0].token;
const questId = "1542685543295361096"; // Typhoeus
const appId = "1461154307171811401";

const sessionId = crypto.randomUUID();

function getHeaders() {
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
    client_heartbeat_session_id: sessionId
  };
  return {
    "Authorization": token,
    "Content-Type": "application/json",
    "X-Super-Properties": Buffer.from(JSON.stringify(superProps)).toString("base64"),
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9256 Chrome/128.0.6613.186 Electron/32.2.7 Safari/537.36",
    "X-Discord-Locale": "en-US",
    "X-Discord-Timezone": "America/New_York"
  };
}

async function sendHB() {
  const res = await fetch(`https://discord.com/api/v9/quests/${questId}/heartbeat`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      application_id: appId,
      terminal: false
    })
  });
  const data = await res.json();
  const val = data.progress?.PLAY_ON_DESKTOP?.value;
  console.log(`[${new Date().toLocaleTimeString()}] Status: ${res.status} | Value: ${val}s`);
}

async function main() {
  console.log("Sending HB 1...");
  await sendHB();
  console.log("Waiting 32 seconds for heartbeat window...");
  await new Promise(r => setTimeout(r, 32000));
  console.log("Sending HB 2...");
  await sendHB();
}

main().catch(console.error);
