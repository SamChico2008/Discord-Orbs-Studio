/**
 * Discord Quest Engine - Core Heartbeat & Progress Automation
 * Emulates Discord Desktop Client (Build 606747) with realistic telemetry, jitter & latency tracking
 */
const crypto = require('crypto');
const EventEmitter = require('events');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const jitter = (b, v = 0.15) => Math.max(b * 0.7, Math.floor(b + b * v * (Math.sqrt(-2 * Math.log(Math.random() || 1e-10)) * Math.cos(2 * Math.PI * Math.random()))));

class QuestEngine extends EventEmitter {
  constructor() {
    super();
    this.token = null;
    this.running = false;
    this.paused = false;
    this.aborted = false;
    this.skipRequested = false;
    this.currentQuest = null;
    this.buildNumber = 606747;
    this.settings = {
      heartbeatInterval: 28, // seconds
      videoStep: 7, // seconds
      autoClaim: true,
      jitterEnabled: true,
      speedPreset: 'balanced',
      executionMode: 'stealth', // 'stealth' or 'turbo'
      buildNumber: 606747
    };
    this._cachedChannelId = null;
  }

  setToken(token) {
    this.token = token;
    this._cachedChannelId = null;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    if (newSettings.buildNumber) {
      this.buildNumber = parseInt(newSettings.buildNumber, 10) || 606747;
    }
    if (newSettings.speedPreset === 'turbo') {
      this.settings.videoStep = 10;
      this.settings.heartbeatInterval = 20;
    } else if (newSettings.speedPreset === 'safe') {
      this.settings.videoStep = 5;
      this.settings.heartbeatInterval = 32;
    } else if (newSettings.speedPreset === 'balanced') {
      this.settings.videoStep = 7;
      this.settings.heartbeatInterval = 28;
    }
  }

  getSuperProperties(sessionId) {
    const props = {
      os: "Windows",
      browser: "Discord Client",
      release_channel: "stable",
      client_version: "1.0.9256",
      os_version: "10.0.22631",
      os_arch: "x64",
      system_locale: "en-US",
      client_build_number: this.buildNumber || 606747,
      native_build_number: null,
      client_event_source: null,
      has_client_mods: false,
      client_heartbeat_session_id: sessionId || crypto.randomUUID()
    };
    return Buffer.from(JSON.stringify(props)).toString('base64');
  }

  getHeaders(sessionId) {
    const headers = {
      "Content-Type": "application/json",
      "X-Super-Properties": this.getSuperProperties(sessionId),
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9256 Chrome/128.0.6613.186 Electron/32.2.7 Safari/537.36",
      "X-Discord-Locale": "en-US",
      "X-Discord-Timezone": "America/New_York"
    };
    if (this.token) {
      headers["Authorization"] = this.token;
    }
    return headers;
  }

  async apiFetch(endpoint, method = "GET", body = null, sessionId = null) {
    const url = endpoint.startsWith('http') ? endpoint : `https://discord.com/api/v9${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const opts = {
      method,
      headers: this.getHeaders(sessionId)
    };
    if (body) opts.body = JSON.stringify(body);
    else if (method === "POST") opts.body = "{}";

    for (let retry = 0; retry < 3; retry++) {
      const startTime = Date.now();
      try {
        const res = await fetch(url, opts);
        const latencyMs = Date.now() - startTime;
        let data = null;
        try { data = await res.json(); } catch (_) {}

        if (res.status === 401) {
          this.log(`Session Discord invalide ou expirée (HTTP 401).`, 'error');
          return { ok: false, status: 401, body: data, latencyMs };
        }

        if (res.status === 429) {
          const waitTime = ((data?.retry_after ?? 4) * 1000) + 500;
          this.log(`Rate limited (429). Pause de ${(waitTime/1000).toFixed(1)}s...`, 'warn');
          await sleep(waitTime);
          continue;
        }

        return { ok: res.ok, status: res.status, body: data, latencyMs };
      } catch (err) {
        this.log(`Erreur réseau (${method} ${endpoint}) : ${err.message}. Retry ${retry + 1}/3...`, 'warn');
        await sleep(2000 * (retry + 1));
      }
    }
    return { ok: false, status: 0, body: null, latencyMs: 0 };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const event = { timestamp, message, type };
    this.emit('log', event);
  }

  async getCallChannelId() {
    if (this._cachedChannelId) return this._cachedChannelId;
    try {
      const res = await this.apiFetch('/users/@me/channels');
      if (res.ok && Array.isArray(res.body) && res.body.length > 0) {
        this._cachedChannelId = res.body[0].id;
        return this._cachedChannelId;
      }
    } catch (_) {}

    try {
      const gRes = await this.apiFetch('/users/@me/guilds');
      if (gRes.ok && Array.isArray(gRes.body) && gRes.body.length > 0) {
        for (const g of gRes.body.slice(0, 3)) {
          const cRes = await this.apiFetch(`/guilds/${g.id}/channels`);
          if (cRes.ok && Array.isArray(cRes.body)) {
            const voice = cRes.body.find(c => c.type === 2);
            if (voice) {
              this._cachedChannelId = voice.id;
              return this._cachedChannelId;
            }
          }
        }
      }
    } catch (_) {}

    return "123456789012345678";
  }

  async fetchQuests() {
    if (!this.token) throw new Error("Token non défini.");
    const res = await this.apiFetch('/quests/@me');
    if (!res.ok) {
      throw new Error(res.body?.message || `Erreur API Discord (${res.status})`);
    }

    let rawList = [];
    if (Array.isArray(res.body)) rawList = res.body;
    else if (Array.isArray(res.body?.quests)) rawList = res.body.quests;
    else if (typeof res.body?.quests === 'object') rawList = Object.values(res.body.quests);

    return rawList.map(q => this.formatQuest(q));
  }

  formatQuest(q) {
    const config = q.config || {};
    const messages = config.messages || {};
    const gameTitle = messages.gameTitle || messages.game_title || config.application?.name || "Jeu";
    const questName = messages.questName || messages.quest_name || gameTitle || "Quête Discord";

    const userStatus = q.user_status || q.userStatus || {};
    const enrolledAt = userStatus.enrolled_at || userStatus.enrolledAt;
    const completedAt = userStatus.completed_at || userStatus.completedAt;
    const claimedAt = userStatus.claimed_at || userStatus.claimedAt;

    const expiresAtStr = config.expires_at || config.expiresAt;
    const expiresAt = expiresAtStr ? new Date(expiresAtStr).getTime() : Date.now() + 86400000;
    const isExpired = expiresAt <= Date.now();

    const taskConfig = config.task_config || config.task_config_v2 || config.taskConfig || config.taskConfigV2 || {};
    const tasks = taskConfig.tasks || {};
    const taskNames = Object.keys(tasks);

    // Prefer desktop-compatible tasks over Xbox/PlayStation console tasks
    const priority = ['PLAY_ON_DESKTOP', 'WATCH_VIDEO', 'STREAM_ON_DESKTOP', 'PLAY_ACTIVITY', 'PLAY'];
    let taskName = taskNames.find(t => priority.includes(t)) 
      || taskNames.find(t => !t.includes('XBOX') && !t.includes('PLAYSTATION')) 
      || taskNames[0] 
      || "PLAY_ON_DESKTOP";

    const taskData = tasks[taskName] || {};
    const targetSeconds = taskData.target || 900;

    const progressObj = userStatus.progress || {};
    const currentSeconds = Math.floor(progressObj[taskName]?.value ?? userStatus.stream_progress_seconds ?? 0);
    const percentage = Math.min(100, Math.round((currentSeconds / targetSeconds) * 100));

    // Determine Task Category
    let taskType = "GAME";
    let taskLabel = "Jeu Desktop";
    const tUpper = taskName.toUpperCase();
    if (tUpper.includes("VIDEO")) {
      taskType = "VIDEO";
      taskLabel = "Vidéo Promotionnelle";
    } else if (tUpper.includes("ACTIVITY")) {
      taskType = "ACTIVITY";
      taskLabel = "Activité Vocale";
    } else if (tUpper.includes("STREAM")) {
      taskType = "STREAM";
      taskLabel = "Stream Discord";
    }

    // Reward Details (Decorations, Nitro, Codes, Orbs)
    const rewardsConfig = config.rewards_config || config.rewardsConfig || {};
    const rewards = rewardsConfig.rewards || [];
    let rewardName = "Récompense Discord";
    let rewardType = "ORBS";

    if (rewards.length > 0) {
      const r = rewards[0];
      rewardName = r.messages?.name || r.messages?.name_with_article || messages.rewardName || messages.reward_name || r.name || "Récompense Discord";
      const nameLower = rewardName.toLowerCase();
      if (r.orb_quantity || r.type === 1 || r.type === "ORBS" || nameLower.includes('orb')) {
        rewardType = "ORBS";
      } else if (r.type === 3 || nameLower.includes('avatar') || nameLower.includes('decoration') || nameLower.includes('effect')) {
        rewardType = "DECORATION";
      } else if (nameLower.includes('nitro')) {
        rewardType = "NITRO";
      } else if (r.type === 2) {
        rewardType = "CODE";
      } else {
        rewardType = "ORBS";
      }
    } else if (messages.rewardName || messages.reward_name) {
      rewardName = messages.rewardName || messages.reward_name;
      if (rewardName.toLowerCase().includes('orb')) rewardType = "ORBS";
    }

    // Asset & Banner URLs
    const assets = config.assets || {};
    let iconUrl = null;
    if (assets.hero) {
      iconUrl = `https://cdn.discordapp.com/assets/quests/${q.id}/${assets.hero}`;
    } else if (assets.quest_bar_hero) {
      iconUrl = `https://cdn.discordapp.com/assets/quests/${q.id}/${assets.quest_bar_hero}`;
    } else if (config.application?.icon) {
      iconUrl = `https://cdn.discordapp.com/app-icons/${config.application.id}/${config.application.icon}.png?size=128`;
    }

    const isClaimed = !!claimedAt || (userStatus.orb_quantity_claimed != null && userStatus.orb_quantity_claimed > 0);
    const isCompleted = !!completedAt || currentSeconds >= targetSeconds;

    return {
      id: q.id,
      questName,
      gameTitle,
      applicationId: config.application?.id || taskData?.applications?.[0]?.id || "0",
      applicationName: config.application?.name || gameTitle,
      taskName,
      taskType,
      taskLabel,
      targetSeconds,
      currentSeconds,
      remainingSeconds: Math.max(0, targetSeconds - currentSeconds),
      percentage,
      isEnrolled: !!enrolledAt,
      isCompleted,
      isClaimed,
      isExpired,
      rewardName,
      rewardType,
      iconUrl,
      expiresAt,
      claimCode: userStatus.claim_code || userStatus.code || userStatus.gift_code || userStatus.claimed_tier || null,
      raw: q
    };
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.log("Moteur mis en pause.", 'warn');
    this.emit('paused');
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.log("Reprise de l'exécution.", 'info');
    this.emit('resumed');
  }

  skip() {
    if (!this.running || !this.currentQuest) return false;
    this.skipRequested = true;
    this.log(`Passage de la quête active "${this.currentQuest.questName}"...`, 'warn');
    this.emit('quest-skipped', { quest: this.currentQuest });
    return true;
  }

  async checkPause() {
    while (this.paused && !this.aborted && !this.skipRequested) {
      await sleep(400);
    }
  }

  stop() {
    this.aborted = true;
    this.running = false;
    this.paused = false;
    this.log("Arrêt demandé par l'utilisateur.", 'warn');
    this.emit('stopped');
  }

  async runSingleQuest(quest) {
    return await this.runQuests([quest]);
  }

  async runQuests(selectedQuests) {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.aborted = false;

    const total = selectedQuests.length;
    const completedList = [];
    const failedList = [];

    this.log(`Lancement du moteur pour ${total} quête(s)...`, 'info');
    this.emit('started', { total });

    for (let i = 0; i < total; i++) {
      if (this.aborted) break;

      this.skipRequested = false;
      const quest = selectedQuests[i];
      this.currentQuest = quest;
      const questSessionId = crypto.randomUUID();

      this.log(`[${i + 1}/${total}] Quête : "${quest.questName}" [${quest.taskLabel}]`, 'info');
      this.emit('quest-start', { quest, index: i, total });

      // Step 1: Auto-Enrollment
      if (!quest.isEnrolled) {
        this.log(`Inscription automatique à la quête : "${quest.questName}"...`, 'info');
        const enrollRes = await this.apiFetch(`/quests/${quest.id}/enroll`, 'POST', null, questSessionId);
        if (!enrollRes.ok && enrollRes.status !== 400) {
          const msg = enrollRes.body?.message || `HTTP ${enrollRes.status}`;
          this.log(`Échec d'inscription : ${msg}`, 'error');
          failedList.push({ quest, reason: `Inscription refusée (${msg})` });
          continue;
        }
        this.log(`Inscription confirmée. Synchronisation (2s)...`, 'success');
        quest.isEnrolled = true;
        await sleep(2000);
      }

      let success = false;
      let failReason = "Temps maximum dépassé";
      let wasSkipped = false;

      // Step 2: Route by Task Type
      let execRes = null;
      if (quest.taskType === "VIDEO") {
        execRes = await this.executeVideoQuest(quest, questSessionId, i, total);
      } else if (quest.taskType === "ACTIVITY" || quest.taskType === "STREAM") {
        execRes = await this.executeActivityQuest(quest, questSessionId, i, total);
      } else {
        execRes = await this.executePlayQuest(quest, questSessionId, i, total);
      }

      success = execRes?.success || false;
      failReason = execRes?.reason || "Inconnu";
      wasSkipped = execRes?.skipped || false;

      if (wasSkipped) {
        this.log(`Quête sautée par l'utilisateur : "${quest.questName}"`, 'warn');
        failedList.push({ quest, reason: "Sautée manuellement", skipped: true });
        this.emit('quest-skipped', { quest, index: i, total });
      } else if (success) {
        this.log(`Quête terminée : "${quest.questName}"`, 'success');
        completedList.push(quest);

        // Step 3: Auto-Claim Reward if configured
        if (this.settings.autoClaim) {
          await sleep(1500);
          await this.claimReward(quest);
        }

        this.emit('quest-complete', { quest, index: i, total });
      } else if (!this.aborted) {
        this.log(`Échec pour "${quest.questName}" : ${failReason}`, 'error');
        failedList.push({ quest, reason: failReason });
        this.emit('quest-fail', { quest, reason: failReason });
      }

      if (i < total - 1 && !this.aborted) {
        const pauseMs = this.settings.executionMode === 'stealth'
          ? Math.floor(12000 + Math.random() * 8000)
          : 2500;
        this.log(`Pause inter-quêtes (${(pauseMs/1000).toFixed(1)}s)...`, 'info');
        await sleep(pauseMs);
      }
    }

    this.running = false;
    this.currentQuest = null;

    this.log(`Session terminée : ${completedList.length} complétée(s), ${failedList.length} échec(s)`, completedList.length > 0 ? 'success' : 'info');

    this.emit('finished', {
      completedList,
      failedList,
      aborted: this.aborted
    });
  }

  async executeVideoQuest(quest, sessionId, questIndex, totalQuests) {
    const step = this.settings.videoStep || 7;
    let current = quest.currentSeconds;
    const target = quest.targetSeconds;

    this.log(`Mode Vidéo activé : progression accélérée +${step}s par paquet...`, 'info');

    while (current < target && !this.aborted && !this.skipRequested) {
      await this.checkPause();
      if (this.aborted) return { success: false, reason: "Interrompu par l'utilisateur" };
      if (this.skipRequested) return { success: false, reason: "Sautée manuellement", skipped: true };

      const waitTime = this.settings.jitterEnabled ? jitter(step * 1000, 0.15) : step * 1000;
      await sleep(waitTime);

      await this.checkPause();
      if (this.aborted) return { success: false, reason: "Interrompu par l'utilisateur" };

      // Micro-jitter on timestamp to emulate official browser video element
      current = Math.min(target, current + step);
      const payloadTs = Math.min(target, current + (Math.random() * 0.3));
      const hb = await this.apiFetch(`/quests/${quest.id}/video-progress`, 'POST', { timestamp: payloadTs }, sessionId);

      if (hb.ok) {
        const pct = Math.min(100, Math.round((current / target) * 100));
        quest.currentSeconds = current;
        quest.percentage = pct;
        quest.remainingSeconds = Math.max(0, target - current);

        this.log(`Vidéo : ${current}/${target}s (${pct}%) · ${hb.latencyMs}ms`, 'info');
        this.emit('progress', {
          quest,
          current,
          target,
          pct,
          questIndex,
          totalQuests,
          latencyMs: hb.latencyMs,
          type: 'video'
        });

        if (hb.body?.completed_at || hb.body?.completedAt || current >= target) {
          return { success: true };
        }
      } else {
        const msg = hb.body?.message || `HTTP ${hb.status}`;
        return { success: false, reason: msg };
      }
    }

    if (current >= target && !this.aborted) {
      await sleep(1000);
      await this.apiFetch(`/quests/${quest.id}/video-progress`, 'POST', { timestamp: target }, sessionId);
      return { success: true };
    }

    return { success: current >= target, reason: "Fin du flux vidéo" };
  }

  async executePlayQuest(quest, sessionId, questIndex, totalQuests) {
    const interval = (this.settings.heartbeatInterval || 28) * 1000;
    let current = quest.currentSeconds;
    const target = quest.targetSeconds;
    const appId = quest.applicationId !== "0" ? quest.applicationId : undefined;
    let consecutiveErrors = 0;
    let stallCount = 0;
    let lastReportedSec = current;
    let isCompletedOnServer = false;

    this.log(`Simulation Desktop Client Build ${this.buildNumber}. Heartbeat toutes les ~${Math.round(interval/1000)}s...`, 'info');

    while (current < target && consecutiveErrors < 5 && !this.aborted && !this.skipRequested) {
      await this.checkPause();
      if (this.aborted) return { success: false, reason: "Interrompu par l'utilisateur" };
      if (this.skipRequested) return { success: false, reason: "Sautée manuellement", skipped: true };

      const waitTarget = this.settings.jitterEnabled ? jitter(interval, 0.15) : interval;
      const start = Date.now();

      while (Date.now() - start < waitTarget) {
        await this.checkPause();
        if (this.aborted) return { success: false, reason: "Interrompu par l'utilisateur" };
        if (this.skipRequested) return { success: false, reason: "Sautée manuellement", skipped: true };
        await sleep(400);
      }

      await this.checkPause();
      if (this.aborted) return { success: false, reason: "Interrompu par l'utilisateur" };
      if (this.skipRequested) return { success: false, reason: "Sautée manuellement", skipped: true };

      this.log(`Envoi signal heartbeat (AppID: ${appId || 'N/A'})...`, 'info');
      const hb = await this.apiFetch(`/quests/${quest.id}/heartbeat`, 'POST', {
        application_id: appId,
        terminal: false
      }, sessionId);

      if (hb.ok) {
        consecutiveErrors = 0;
        const taskProg = hb.body?.progress?.[quest.taskName]?.value
          ?? hb.body?.user_status?.progress?.[quest.taskName]?.value
          ?? hb.body?.userStatus?.progress?.[quest.taskName]?.value;

        if (taskProg != null) {
          const val = Math.floor(taskProg);
          if (val <= lastReportedSec) {
            stallCount++;
            if (stallCount >= 6) {
              this.log(`Progression inchangée (${val}s) après 6 paquets. Resynchronisation de session...`, 'warn');
              await this.apiFetch(`/quests/${quest.id}/enroll`, 'POST', null, sessionId);
              stallCount = 0;
            }
          } else {
            stallCount = 0;
            lastReportedSec = val;
          }
          current = val;
        } else {
          current = Math.min(target, current + Math.round(interval / 1000));
        }

        const pct = Math.min(100, Math.round((current / target) * 100));
        quest.currentSeconds = current;
        quest.percentage = pct;
        quest.remainingSeconds = Math.max(0, target - current);

        this.log(`Heartbeat OK : ${current}/${target}s (${pct}%) · ${hb.latencyMs}ms`, 'success');
        this.emit('progress', {
          quest,
          current,
          target,
          pct,
          questIndex,
          totalQuests,
          latencyMs: hb.latencyMs,
          type: 'play'
        });

        if (hb.body?.completed_at != null || hb.body?.completedAt != null || current >= target) {
          if (hb.body?.completed_at != null || hb.body?.completedAt != null) {
            isCompletedOnServer = true;
          }
          break;
        }
      } else {
        consecutiveErrors++;
        const msg = hb.body?.message || `HTTP ${hb.status}`;
        this.log(`Signal refusé (${consecutiveErrors}/5) : ${msg}`, 'warn');
        if (consecutiveErrors >= 5) {
          return { success: false, reason: `5 erreurs consécutives (${msg})` };
        }
      }
    }

    if ((current >= target || isCompletedOnServer) && !this.aborted) {
      await this.apiFetch(`/quests/${quest.id}/heartbeat`, 'POST', {
        application_id: appId,
        terminal: true
      }, sessionId);
      return { success: true };
    }

    return { success: false, reason: "Interrompu ou non complété" };
  }

  async executeActivityQuest(quest, sessionId, questIndex, totalQuests) {
    const interval = 20000;
    let current = quest.currentSeconds;
    const target = quest.targetSeconds;
    let consecutiveErrors = 0;
    let stallCount = 0;
    let lastReportedSec = current;
    let isCompletedOnServer = false;
    const appId = quest.applicationId !== "0" ? quest.applicationId : undefined;

    const channelId = await this.getCallChannelId();
    const streamKey = `call:${channelId}:1`;

    const isStream = quest.taskType === "STREAM";
    this.log(isStream 
      ? `Mode Stream : canal call:${channelId}:1, diffusion simulée...` 
      : `Mode Activité Vocale : canal call:${channelId}:1, heartbeats toutes les ~20s...`, 'info');

    while (current < target && consecutiveErrors < 5 && !this.aborted && !this.skipRequested) {
      await this.checkPause();
      if (this.aborted) return { success: false, reason: "Interrompu par l'utilisateur" };
      if (this.skipRequested) return { success: false, reason: "Sautée manuellement", skipped: true };

      const waitTarget = this.settings.jitterEnabled ? jitter(interval, 0.2) : interval;
      const start = Date.now();

      while (Date.now() - start < waitTarget) {
        await this.checkPause();
        if (this.aborted) return { success: false, reason: "Interrompu par l'utilisateur" };
        if (this.skipRequested) return { success: false, reason: "Sautée manuellement", skipped: true };
        await sleep(400);
      }

      await this.checkPause();
      if (this.aborted) return { success: false, reason: "Interrompu par l'utilisateur" };
      if (this.skipRequested) return { success: false, reason: "Sautée manuellement", skipped: true };

      const hb = await this.apiFetch(`/quests/${quest.id}/heartbeat`, 'POST', {
        application_id: appId,
        stream_key: streamKey,
        terminal: false
      }, sessionId);

      if (hb.ok) {
        consecutiveErrors = 0;
        const taskProg = hb.body?.progress?.[quest.taskName]?.value
          ?? hb.body?.user_status?.progress?.[quest.taskName]?.value
          ?? hb.body?.userStatus?.progress?.[quest.taskName]?.value;

        if (taskProg != null) {
          const val = Math.floor(taskProg);
          if (val <= lastReportedSec) {
            stallCount++;
            if (stallCount >= 6) {
              this.log(`Activité : progression inchangée (${val}s). Vérification...`, 'warn');
              stallCount = 0;
            }
          } else {
            stallCount = 0;
            lastReportedSec = val;
          }
          current = val;
        } else {
          current = Math.min(target, current + 20);
        }

        const pct = Math.min(100, Math.round((current / target) * 100));
        quest.currentSeconds = current;
        quest.percentage = pct;
        quest.remainingSeconds = Math.max(0, target - current);

        this.log(`Activité OK : ${current}/${target}s (${pct}%) · ${hb.latencyMs}ms`, 'success');
        this.emit('progress', {
          quest,
          current,
          target,
          pct,
          questIndex,
          totalQuests,
          latencyMs: hb.latencyMs,
          type: 'activity'
        });

        if (hb.body?.completed_at != null || hb.body?.completedAt != null || current >= target) {
          if (hb.body?.completed_at != null || hb.body?.completedAt != null) {
            isCompletedOnServer = true;
          }
          break;
        }
      } else {
        consecutiveErrors++;
        this.log(`Erreur activité (${consecutiveErrors}/5) : HTTP ${hb.status}`, 'warn');
        if (consecutiveErrors >= 5) {
          return { success: false, reason: "Erreurs répétées sur l'activité" };
        }
      }
    }

    if ((current >= target || isCompletedOnServer) && !this.aborted) {
      await this.apiFetch(`/quests/${quest.id}/heartbeat`, 'POST', {
        application_id: appId,
        stream_key: streamKey,
        terminal: true
      }, sessionId);
      return { success: true };
    }

    return { success: false, reason: "Incomplet" };
  }

  async claimReward(quest) {
    try {
      this.log(`Réclamation récompense pour "${quest.questName}"...`, 'info');
      
      // Step 1: Check if there's already a reward code available
      try {
        const rcRes = await this.apiFetch(`/quests/${quest.id}/reward-code`, 'GET');
        if (rcRes.ok && rcRes.body?.code) {
          const code = rcRes.body.code;
          this.log(`Code promo récupéré : ${code}`, 'success');
          quest.isClaimed = true;
          quest.claimCode = code;
          this.emit('reward-claimed', {
            quest,
            code,
            rewardName: quest.rewardName,
            gameTitle: quest.gameTitle,
            claimedAt: new Date().toISOString(),
            data: rcRes.body
          });
          return { ok: true, code, rewardName: quest.rewardName, gameTitle: quest.gameTitle, data: rcRes.body };
        }
      } catch (_) {}

      // Step 2: Post to Discord official claim-reward endpoint
      const res = await this.apiFetch(`/quests/${quest.id}/claim-reward`, 'POST', {
        platform: 0,
        location: 2, // QUEST_INVENTORY_CARD
        traffic_metadata_sealed: quest.raw?.traffic_metadata_sealed || null
      });

      // Handle Captcha verification required by Discord
      if (res.body?.captcha_key || res.body?.captcha_service) {
        this.log(`Captcha Discord requis pour "${quest.questName}". Ouvrez Discord pour valider le cadeau.`, 'warn');
        return { 
          ok: false, 
          captchaRequired: true, 
          message: "Captcha Discord requis — Cliquez sur 'Discord' pour réclamer directement dans l'application",
          questId: quest.id,
          data: res.body 
        };
      }

      let code = res.body?.code || res.body?.claim_code || res.body?.gift_code || res.body?.reward_code || null;
      if (!code && res.body?.entitlements?.items?.[0]?.tenantMetadata?.questRewards?.reward?.rewardCode) {
        code = res.body.entitlements.items[0].tenantMetadata.questRewards.reward.rewardCode;
      }

      if (res.ok) {
        if (code) {
          this.log(`Récompense obtenue ! Code : ${code}`, 'success');
        } else {
          this.log(`Récompense réclamée avec succès (créditée sur votre compte Discord) !`, 'success');
        }
        quest.isClaimed = true;
        quest.claimCode = code;
        this.emit('reward-claimed', {
          quest,
          code,
          rewardName: quest.rewardName,
          gameTitle: quest.gameTitle,
          claimedAt: new Date().toISOString(),
          data: res.body
        });
        return { ok: true, code, rewardName: quest.rewardName, gameTitle: quest.gameTitle, data: res.body };
      } else {
        const msg = res.body?.message || `HTTP ${res.status}`;
        this.log(`Note réclamation : ${msg}`, 'warn');
        return { ok: false, message: msg, data: res.body };
      }
    } catch (e) {
      this.log(`Erreur réclamation : ${e.message}`, 'error');
      return { ok: false, message: e.message };
    }
  }

  async claimAllRewards(quests) {
    const results = [];
    for (const q of quests) {
      if (q.isCompleted && !q.isClaimed) {
        const res = await this.claimReward(q);
        results.push({ quest: q, res });
        await sleep(1200);
      }
    }
    return results;
  }
}

module.exports = QuestEngine;
