const fs = require('fs');
const sessionPath = process.env.DISCORD_SESSION_PATH || './sessions.json';
const s = fs.existsSync(sessionPath) ? JSON.parse(fs.readFileSync(sessionPath, 'utf8')) : {};
const token = Object.values(s)[0]?.token || process.env.DISCORD_TOKEN || '';

async function check() {
  const res = await fetch('https://discord.com/api/v9/quests/@me', {
    headers: { Authorization: token }
  });
  const d = await res.json();
  const list = d.quests || [];
  console.log('Total quests in API:', list.length);
  for (const q of list) {
    const name = q.config?.messages?.questName || q.config?.messages?.quest_name;
    const u = q.user_status;
    const enrolled = !!u?.enrolled_at;
    const completed = !!u?.completed_at;
    const tCfg = q.config?.task_config || q.config?.task_config_v2 || q.config?.taskConfig || q.config?.taskConfigV2;
    const tasks = tCfg?.tasks || {};
    const tNames = Object.keys(tasks);
    const tName = tNames[0];
    const target = tasks[tName]?.target;
    const progress = u?.progress?.[tName]?.value || 0;
    if (!completed) {
      console.log(`[ACTIVE] ${name} | tasks: ${tNames.join(',')} | target: ${target}s | prog: ${progress}s | enrolled: ${enrolled} | id: ${q.id}`);
      console.log('Config snippet:', JSON.stringify({
        application: q.config?.application,
        taskConfig: tCfg
      }, null, 2));
    }
  }
}

check().catch(console.error);
