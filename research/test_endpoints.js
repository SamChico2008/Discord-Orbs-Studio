const fs = require('fs');
const s = JSON.parse(fs.readFileSync('C:/Users/SamChicoPC/.gemini/antigravity-ide/scratch/discord-quest-bot/sessions.json', 'utf8'));
const token = Object.values(s)[0].token;
const questId = "1542685543295361096";

async function test() {
  const tests = [
    { url: `https://discord.com/api/v9/quests/${questId}`, method: "GET" },
    { url: `https://discord.com/api/v9/quests/${questId}/heartbeat`, method: "POST", body: { application_id: "1461154307171811401" } },
    { url: `https://discord.com/api/v10/quests/${questId}/heartbeat`, method: "POST", body: { application_id: "1461154307171811401" } },
    { url: `https://discord.com/api/v9/quests/${questId}/video-progress`, method: "POST", body: { timestamp: 10 } },
  ];

  for (const t of tests) {
    console.log(`\nTesting ${t.method} ${t.url}...`);
    const res = await fetch(t.url, {
      method: t.method,
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      },
      body: t.body ? JSON.stringify(t.body) : undefined
    });
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${await res.text()}`);
  }
}

test();
