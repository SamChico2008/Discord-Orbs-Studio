/**
 *  Discord Quest Completer ─ AUTO v25 (Interactive Selector)
 *  ──────────────────────────────────────────────────────────
 *  • Overlay interactif dans Discord pour choisir les quêtes
 *  • Checkboxes + infos (type, progression, temps restant)
 *  • Toute la gestion d'erreurs v24 conservée
 */
(async function () {
  "use strict";

  const DEBUG = true;
  const log  = (...a) => DEBUG && console.log("%c[QS v25]", "color:#5865f2;font-weight:700", ...a);
  const warn = (...a) => console.warn("%c[QS v25]", "color:#faa61a;font-weight:700", ...a);
  const err  = (...a) => console.error("%c[QS v25]", "color:#ed4245;font-weight:700", ...a);

  const sleep  = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = (b, v = 0.25) => Math.max(b * 0.5, Math.floor(b + b * v * (Math.sqrt(-2 * Math.log(Math.random() || 1e-10)) * Math.cos(2 * Math.PI * Math.random()))));
  const safe   = (fn, fb) => { try { return fn(); } catch (_) { return fb; } };
  const getProp = (obj, ...keys) => {
    if (!obj) return undefined;
    for (const k of keys) if (obj[k] !== undefined) return obj[k];
    return undefined;
  };

  const MAX_CONSECUTIVE_ERRORS = 5;
  const MAX_429_RETRIES        = 3;
  const INTER_QUEST_DELAY      = 3000;
  const NETWORK_RETRY_BASE     = 5000;
  const MAX_NETWORK_RETRIES    = 4;

  // ── TOKEN ──
  const getToken = () => {
    if (window.DISCORD_TOKEN) return window.DISCORD_TOKEN;
    const fromMods = safe(() => {
      if (typeof window.Vencord !== "undefined" && window.Vencord.Webpack) {
        const m = window.Vencord.Webpack.findByProps("getToken") || window.Vencord.Webpack.findStore("TokenStore");
        if (m?.getToken) return m.getToken();
      }
      if (typeof window.BdApi !== "undefined" && window.BdApi.Webpack) {
        const filter = window.BdApi.Webpack.Filters?.byProps("getToken");
        const m = filter ? window.BdApi.Webpack.getModule(filter) : window.BdApi.Webpack.getStore("TokenStore");
        if (m?.getToken) return m.getToken();
      }
      return null;
    });
    if (fromMods) return fromMods;
    const fromWebpack = safe(() => {
      if (typeof window.webpackChunkdiscord_app === "undefined") return null;
      let wpRequire;
      const chunkId = Math.floor(Math.random() * 899999) + 100000;
      window.webpackChunkdiscord_app.push([[chunkId], {}, r => { wpRequire = r; }]);
      window.webpackChunkdiscord_app.pop();
      if (!wpRequire || !wpRequire.c) return null;
      for (const id in wpRequire.c) {
        const exp = wpRequire.c[id]?.exports;
        if (!exp) continue;
        if (typeof exp.getToken === "function") return exp.getToken();
        if (typeof exp.default?.getToken === "function") return exp.default.getToken();
        if (typeof exp.Z?.getToken === "function") return exp.Z.getToken();
        if (typeof exp.ZP?.getToken === "function") return exp.ZP.getToken();
        if (typeof exp.Ay?.getToken === "function") return exp.Ay.getToken();
      }
      return null;
    });
    if (fromWebpack) return fromWebpack;
    return safe(() => { const t = window.localStorage.getItem("token"); return t ? JSON.parse(t) : null; });
  };

  const token = getToken();
  if (!token) { err("Impossible d'extraire le token."); return; }

  // ── API FETCH SMART ──
  const PREFIX = "/api/v9";
  const apiFetch = async (endpoint, method = "GET", body = null) => {
    const url = endpoint.startsWith("http") ? endpoint : `https://discord.com${PREFIX}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
    const opts = { method, headers: { "Authorization": token, "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);

    for (let netRetry = 0; netRetry <= MAX_NETWORK_RETRIES; netRetry++) {
      let res, data = null;
      try { res = await fetch(url, opts); } catch (netErr) {
        const backoff = NETWORK_RETRY_BASE * Math.pow(2, netRetry);
        if (netRetry < MAX_NETWORK_RETRIES) { warn(`Erreur réseau ${method} ${endpoint} — retry ${netRetry+1}/${MAX_NETWORK_RETRIES} dans ${Math.round(backoff/1000)}s`); await sleep(backoff); continue; }
        return { ok: false, status: 0, body: null, networkError: true };
      }
      try { data = await res.json(); } catch (_) {}
      if (res.status === 429) {
        const retryAfter = data?.retry_after ?? 5;
        const waitMs = Math.ceil(retryAfter * 1000) + jitter(500, 0.3);
        if (netRetry < MAX_429_RETRIES) { warn(`429 sur ${endpoint} — attente ${Math.round(waitMs/1000)}s`); await sleep(waitMs); continue; }
        return { ok: false, status: 429, body: data, rateLimited: true };
      }
      return { ok: res.ok, status: res.status, body: data };
    }
    return { ok: false, status: 0, body: null, networkError: true };
  };

  const auth = await apiFetch("/users/@me");
  if (!auth.ok) { err("Token invalide."); return; }
  log(`Connecté : ${auth.body.username}`);

  // ── STORES ──
  let wpRequire = null;
  if (typeof webpackChunkdiscord_app !== "undefined") {
    safe(() => { const c = Math.floor(Math.random()*899999)+100000; webpackChunkdiscord_app.push([[c],{},r=>{wpRequire=r}]); webpackChunkdiscord_app.pop(); });
  }
  const findModule = (filter) => {
    if (typeof window.Vencord !== "undefined" && window.Vencord.Webpack) { const m = safe(() => window.Vencord.Webpack.findModule(filter)); if (m) return m; }
    if (typeof window.BdApi !== "undefined" && window.BdApi.Webpack) { const m = safe(() => window.BdApi.Webpack.getModule(filter)); if (m) return m; }
    if (wpRequire?.c) { for (const id in wpRequire.c) { const m = wpRequire.c[id]?.exports; if (!m) continue; if (filter(m)) return m; if (m.default && filter(m.default)) return m.default; if (m.Z && filter(m.Z)) return m.Z; if (m.Ay && filter(m.Ay)) return m.Ay; if (m.A && filter(m.A)) return m.A; } }
    return null;
  };

  const QuestsStore               = findModule(m => m.getQuest || m.getName?.() === "QuestsStore");
  const RunningGameStore          = findModule(m => m.getRunningGames || m.getName?.() === "RunningGameStore");
  const ApplicationStreamingStore = findModule(m => m.getStreamerActiveStreamMetadata || m.getName?.() === "ApplicationStreamingStore");
  const ChannelStore              = findModule(m => m.getSortedPrivateChannels || m.getName?.() === "ChannelStore");
  const GuildChannelStore         = findModule(m => m.getSFWDefaultChannel || m.getName?.() === "GuildChannelStore");
  const FluxDispatcher            = findModule(m => m.dispatch && m.subscribe && !m.getAPIBaseURL);

  const disguise = (original, replacement) => {
    const src = safe(() => Function.prototype.toString.call(original), "function(){}");
    try { Object.defineProperties(replacement, { toString:{value:()=>src,configurable:true}, length:{value:original.length,configurable:true}, name:{value:original.name,configurable:true} }); } catch(_){}
    return replacement;
  };

  // ── FETCH QUESTS ──
  let allQuests = [];
  const rawQuests = QuestsStore?.quests ?? safe(() => QuestsStore?.getQuests());
  if (rawQuests) {
    allQuests = rawQuests instanceof Map ? [...rawQuests.values()] : Array.isArray(rawQuests) ? rawQuests : typeof rawQuests === "object" ? Object.values(rawQuests) : [];
  }
  if (!allQuests.length) {
    const qApi = await apiFetch("/quests/@me");
    if (qApi.ok && qApi.body) {
      if (Array.isArray(qApi.body)) allQuests = qApi.body;
      else if (Array.isArray(qApi.body.quests)) allQuests = qApi.body.quests;
      else if (typeof qApi.body.quests === "object") allQuests = Object.values(qApi.body.quests);
    }
  }
  log(`${allQuests.length} quête(s) reçue(s).`);

  // ── FILTER ──
  const eligible = [];
  const skippedReasons = [];

  for (const q of allQuests) {
    const name = q?.config?.messages?.questName ?? q?.config?.messages?.quest_name ?? "(sans nom)";
    const expiresAtStr = getProp(q?.config, "expiresAt", "expires_at");
    const exp = expiresAtStr ? new Date(expiresAtStr).getTime() : Date.now() + 86400000;
    const userStatus  = getProp(q, "userStatus", "user_status");
    const completedAt = getProp(userStatus, "completedAt", "completed_at");
    const claimedAt   = getProp(userStatus, "claimedAt", "claimed_at");

    if (exp <= Date.now())  { skippedReasons.push(`${name}: expirée`); continue; }
    if (completedAt)        { skippedReasons.push(`${name}: déjà complétée`); continue; }
    if (claimedAt)          { skippedReasons.push(`${name}: déjà réclamée`); continue; }

    const taskConfig = getProp(q?.config, "taskConfig", "task_config", "taskConfigV2", "task_config_v2");
    const tasks = getProp(taskConfig, "tasks");
    if (!tasks || !Object.keys(tasks).length) { skippedReasons.push(`${name}: aucune tâche`); continue; }

    const taskName = Object.keys(tasks)[0];
    const targetPlatform = getProp(tasks[taskName], "platform", "target_platform");
    if (targetPlatform && !["DESKTOP","ANY","CROSS_PLATFORM"].includes(targetPlatform.toUpperCase?.())) {
      skippedReasons.push(`${name}: plateforme ${targetPlatform}`); continue;
    }

    eligible.push(q);
  }

  if (skippedReasons.length) { log("Quêtes filtrées :"); skippedReasons.forEach(r => log(`  ⏭ ${r}`)); }
  if (!eligible.length) { warn("Aucune quête éligible."); return; }

  // ── HELPERS ──
  const getTaskType = (taskName) => {
    if (!taskName) return "Inconnu";
    const t = taskName.toUpperCase();
    if (t.includes("WATCH_VIDEO") || t.includes("VIDEO")) return "🎬 Vidéo";
    if (t.includes("PLAY_ON_DESKTOP")) return "🎮 Jouer";
    if (t.includes("PLAY") && !t.includes("ACTIVITY")) return "🎮 Jouer";
    if (t.includes("STREAM")) return "📡 Stream";
    if (t.includes("ACTIVITY")) return "🎯 Activité";
    return "⚙️ Autre";
  };

  const getTaskBadgeColor = (taskName) => {
    if (!taskName) return "#99aab5";
    const t = taskName.toUpperCase();
    if (t.includes("VIDEO")) return "#e67e22";
    if (t.includes("PLAY")) return "#2ecc71";
    if (t.includes("STREAM")) return "#9b59b6";
    if (t.includes("ACTIVITY")) return "#3498db";
    return "#99aab5";
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return "0s";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // ── BUILD QUEST INFO ──
  const questInfos = eligible.map(q => {
    const taskConfig = getProp(q.config, "taskConfig", "task_config", "taskConfigV2", "task_config_v2");
    const tasks = getProp(taskConfig, "tasks") || {};
    const taskName = Object.keys(tasks)[0] || "";
    const secondsNeeded = tasks[taskName]?.target ?? 60;
    const userStatus = getProp(q, "userStatus", "user_status");
    const progressObj = getProp(userStatus, "progress");
    const secondsDone = progressObj?.[taskName]?.value ?? 0;
    const pct = Math.min(100, Math.round((secondsDone / secondsNeeded) * 100));
    const remaining = Math.max(0, secondsNeeded - secondsDone);
    const questName = q.config?.messages?.questName ?? q.config?.messages?.quest_name ?? "Quête";
    const appObj = getProp(q.config, "application");
    const appName = getProp(appObj, "name") ?? "";
    const enrolledAt = getProp(userStatus, "enrolledAt", "enrolled_at");

    return { quest: q, questName, appName, taskName, taskType: getTaskType(taskName), badgeColor: getTaskBadgeColor(taskName), secondsNeeded, secondsDone, pct, remaining, enrolled: !!enrolledAt };
  });

  // ── RENDER SELECTOR UI ──
  const showSelector = () => new Promise((resolve) => {
    // Remove existing overlay if any
    const existing = document.getElementById("qs-selector-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "qs-selector-overlay";
    overlay.innerHTML = `
      <style>
        #qs-selector-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.75); z-index: 999999;
          display: flex; align-items: center; justify-content: center;
          font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          animation: qsFadeIn 0.2s ease-out;
        }
        @keyframes qsFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes qsSlideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }

        #qs-selector-panel {
          background: #2b2d31; border-radius: 12px; width: 560px; max-height: 80vh;
          display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          animation: qsSlideUp 0.25s ease-out;
          border: 1px solid #3f4147;
        }

        #qs-selector-header {
          padding: 20px 24px 16px; border-bottom: 1px solid #3f4147;
        }
        #qs-selector-header h2 {
          margin: 0 0 4px; color: #f2f3f5; font-size: 20px; font-weight: 700;
        }
        #qs-selector-header p {
          margin: 0; color: #b5bac1; font-size: 13px;
        }

        #qs-selector-actions {
          padding: 10px 24px; display: flex; gap: 8px; border-bottom: 1px solid #3f4147;
        }
        .qs-action-btn {
          background: #383a40; border: none; color: #b5bac1; padding: 6px 12px;
          border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.15s;
        }
        .qs-action-btn:hover { background: #4e5058; color: #f2f3f5; }

        #qs-selector-list {
          flex: 1; overflow-y: auto; padding: 8px 12px;
          scrollbar-width: thin; scrollbar-color: #4e5058 transparent;
        }
        #qs-selector-list::-webkit-scrollbar { width: 6px; }
        #qs-selector-list::-webkit-scrollbar-thumb { background: #4e5058; border-radius: 3px; }

        .qs-quest-item {
          display: flex; align-items: center; gap: 12px; padding: 10px 12px;
          border-radius: 8px; cursor: pointer; transition: background 0.12s;
          margin-bottom: 2px;
        }
        .qs-quest-item:hover { background: #35373c; }
        .qs-quest-item.qs-selected { background: rgba(88,101,242,0.12); }

        .qs-checkbox {
          width: 20px; height: 20px; border-radius: 4px; border: 2px solid #4e5058;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          transition: all 0.15s;
        }
        .qs-selected .qs-checkbox {
          background: #5865f2; border-color: #5865f2;
        }
        .qs-checkbox svg { opacity: 0; transition: opacity 0.12s; }
        .qs-selected .qs-checkbox svg { opacity: 1; }

        .qs-quest-info { flex: 1; min-width: 0; }
        .qs-quest-name {
          color: #f2f3f5; font-size: 14px; font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .qs-quest-meta {
          display: flex; align-items: center; gap: 8px; margin-top: 4px;
        }
        .qs-badge {
          font-size: 11px; font-weight: 600; padding: 2px 8px;
          border-radius: 10px; color: #fff; white-space: nowrap;
        }
        .qs-app-name { color: #949ba4; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .qs-quest-right { flex-shrink: 0; text-align: right; }
        .qs-progress-bar {
          width: 80px; height: 6px; background: #4e5058; border-radius: 3px; overflow: hidden; margin-bottom: 3px;
        }
        .qs-progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
        .qs-progress-text { color: #949ba4; font-size: 11px; }
        .qs-enroll-tag { color: #faa61a; font-size: 10px; font-weight: 600; margin-top: 2px; }

        #qs-selector-footer {
          padding: 16px 24px; border-top: 1px solid #3f4147;
          display: flex; align-items: center; justify-content: space-between;
        }
        #qs-selected-count { color: #b5bac1; font-size: 13px; }

        #qs-start-btn {
          background: #5865f2; color: #fff; border: none; padding: 10px 24px;
          border-radius: 4px; font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.15s;
        }
        #qs-start-btn:hover { background: #4752c4; }
        #qs-start-btn:disabled { background: #4e5058; color: #949ba4; cursor: not-allowed; }

        #qs-cancel-btn {
          background: transparent; color: #b5bac1; border: none; padding: 10px 16px;
          border-radius: 4px; font-size: 14px; cursor: pointer; transition: color 0.15s;
        }
        #qs-cancel-btn:hover { color: #f2f3f5; }
      </style>

      <div id="qs-selector-panel">
        <div id="qs-selector-header">
          <h2>⚡ Quest Completer v25</h2>
          <p>Sélectionnez les quêtes à compléter automatiquement</p>
        </div>

        <div id="qs-selector-actions">
          <button class="qs-action-btn" id="qs-select-all">Tout sélectionner</button>
          <button class="qs-action-btn" id="qs-deselect-all">Tout désélectionner</button>
        </div>

        <div id="qs-selector-list"></div>

        <div id="qs-selector-footer">
          <span id="qs-selected-count">0 sélectionnée(s)</span>
          <div style="display:flex;gap:8px">
            <button id="qs-cancel-btn">Annuler</button>
            <button id="qs-start-btn" disabled>Lancer</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const listEl = document.getElementById("qs-selector-list");
    const countEl = document.getElementById("qs-selected-count");
    const startBtn = document.getElementById("qs-start-btn");
    const selected = new Set();

    const updateUI = () => {
      countEl.textContent = `${selected.size} sélectionnée(s)`;
      startBtn.disabled = selected.size === 0;
      startBtn.textContent = selected.size > 0 ? `Lancer (${selected.size})` : "Lancer";
    };

    // Build list items
    questInfos.forEach((info, idx) => {
      const item = document.createElement("div");
      item.className = "qs-quest-item";
      item.dataset.idx = idx;

      const pctColor = info.pct >= 75 ? "#2ecc71" : info.pct >= 25 ? "#f1c40f" : "#5865f2";

      item.innerHTML = `
        <div class="qs-checkbox">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11.5 3.5L5.5 10L2.5 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="qs-quest-info">
          <div class="qs-quest-name">${info.questName}</div>
          <div class="qs-quest-meta">
            <span class="qs-badge" style="background:${info.badgeColor}">${info.taskType}</span>
            ${info.appName ? `<span class="qs-app-name">${info.appName}</span>` : ""}
          </div>
        </div>
        <div class="qs-quest-right">
          <div class="qs-progress-bar"><div class="qs-progress-fill" style="width:${info.pct}%;background:${pctColor}"></div></div>
          <div class="qs-progress-text">${info.pct}% · reste ${formatTime(info.remaining)}</div>
          ${!info.enrolled ? '<div class="qs-enroll-tag">⚠ pas encore inscrit</div>' : ""}
        </div>
      `;

      item.addEventListener("click", () => {
        if (selected.has(idx)) {
          selected.delete(idx);
          item.classList.remove("qs-selected");
        } else {
          selected.add(idx);
          item.classList.add("qs-selected");
        }
        updateUI();
      });

      listEl.appendChild(item);
    });

    // Select all / deselect all
    document.getElementById("qs-select-all").addEventListener("click", () => {
      document.querySelectorAll(".qs-quest-item").forEach((el, i) => {
        selected.add(i); el.classList.add("qs-selected");
      });
      updateUI();
    });
    document.getElementById("qs-deselect-all").addEventListener("click", () => {
      selected.clear();
      document.querySelectorAll(".qs-quest-item").forEach(el => el.classList.remove("qs-selected"));
      updateUI();
    });

    // Cancel
    document.getElementById("qs-cancel-btn").addEventListener("click", () => {
      overlay.remove();
      resolve(null);
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) { overlay.remove(); resolve(null); }
    });

    // Start
    startBtn.addEventListener("click", () => {
      const chosen = [...selected].sort((a,b)=>a-b).map(i => questInfos[i].quest);
      overlay.remove();
      resolve(chosen);
    });

    updateUI();
  });

  // ── SHOW SELECTOR ──
  const chosenQuests = await showSelector();
  if (!chosenQuests || !chosenQuests.length) {
    log("Aucune quête sélectionnée. Arrêt.");
    return;
  }

  log(`${chosenQuests.length} quête(s) sélectionnée(s) :`, chosenQuests.map(q => q.config?.messages?.questName ?? q.config?.messages?.quest_name));

  // ── ENROLL MISSING ──
  for (const q of chosenQuests) {
    const userStatus = getProp(q, "userStatus", "user_status");
    const enrolledAt = getProp(userStatus, "enrolledAt", "enrolled_at");
    const name = q.config?.messages?.questName ?? q.config?.messages?.quest_name ?? "?";
    if (!enrolledAt) {
      log(`Inscription : "${name}"...`);
      const res = await apiFetch(`/quests/${q.id}/enroll`, "POST");
      if (!res.ok) {
        const msg = res.body?.message ?? `HTTP ${res.status}`;
        warn(`  Inscription refusée pour "${name}": ${msg} — skip`);
        chosenQuests.splice(chosenQuests.indexOf(q), 1);
      }
      await sleep(jitter(1500, 0.2));
    }
  }

  if (!chosenQuests.length) { warn("Toutes les inscriptions ont échoué."); return; }

  // ── PROCESSING ──
  const queue = [...chosenQuests];
  const results = { completed: [], failed: [], skipped: [] };

  // ── PROGRESS OVERLAY ──
  const showProgress = () => {
    const existing = document.getElementById("qs-progress-overlay");
    if (existing) existing.remove();

    const el = document.createElement("div");
    el.id = "qs-progress-overlay";
    el.innerHTML = `
      <style>
        #qs-progress-overlay {
          position: fixed; bottom: 24px; right: 24px; z-index: 999999;
          background: #2b2d31; border: 1px solid #3f4147; border-radius: 10px;
          padding: 14px 18px; min-width: 300px; max-width: 400px;
          font-family: 'gg sans','Noto Sans',Helvetica,Arial,sans-serif;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          animation: qsSlideUp 0.2s ease-out;
        }
        #qs-progress-title { color: #f2f3f5; font-size: 13px; font-weight: 700; margin-bottom: 6px; }
        #qs-progress-detail { color: #b5bac1; font-size: 12px; line-height: 1.4; }
        #qs-progress-bar-outer { width: 100%; height: 6px; background: #4e5058; border-radius: 3px; margin-top: 8px; overflow: hidden; }
        #qs-progress-bar-inner { height: 100%; background: #5865f2; border-radius: 3px; transition: width 0.5s; width: 0%; }
        #qs-progress-close { position:absolute; top:8px; right:10px; background:none; border:none; color:#949ba4; cursor:pointer; font-size:16px; }
        #qs-progress-close:hover { color:#f2f3f5; }
      </style>
      <button id="qs-progress-close">✕</button>
      <div id="qs-progress-title">⏳ En attente...</div>
      <div id="qs-progress-detail"></div>
      <div id="qs-progress-bar-outer"><div id="qs-progress-bar-inner"></div></div>
    `;
    document.body.appendChild(el);
    document.getElementById("qs-progress-close").addEventListener("click", () => el.remove());
  };

  const updateProgress = (title, detail, pct) => {
    const t = document.getElementById("qs-progress-title");
    const d = document.getElementById("qs-progress-detail");
    const b = document.getElementById("qs-progress-bar-inner");
    if (t) t.textContent = title;
    if (d) d.textContent = detail;
    if (b) b.style.width = `${Math.min(100, pct)}%`;
  };

  const removeProgress = () => {
    const el = document.getElementById("qs-progress-overlay");
    if (el) el.remove();
  };

  showProgress();

  // ── SMART HEARTBEAT ──
  const makeSmartHeartbeat = () => {
    let consecutiveErrors = 0;
    return async (endpoint, payload) => {
      const res = await apiFetch(endpoint, "POST", payload);
      if (res.networkError) { consecutiveErrors++; return { ok:false, fatal: consecutiveErrors >= MAX_CONSECUTIVE_ERRORS, data:null }; }
      if (res.rateLimited) { consecutiveErrors++; return { ok:false, fatal: consecutiveErrors >= MAX_CONSECUTIVE_ERRORS, data:null, rateLimited:true }; }
      if (res.status === 400 || res.status === 403 || res.status === 404) {
        const msg = String(res.body?.message ?? res.body?.code ?? "");
        if (res.status === 403 || msg.includes("not enrolled") || msg.includes("invalid") || msg.includes("not found")) return { ok:false, fatal:true, data:null };
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) return { ok:false, fatal:true, data:null };
        await sleep(jitter(2000 * consecutiveErrors, 0.3));
        return { ok:false, fatal:false, data:null };
      }
      consecutiveErrors = 0;
      return { ok:true, fatal:false, data: res.body };
    };
  };

  const processNext = async () => {
    if (!queue.length) {
      updateProgress("✅ Terminé", `${results.completed.length} complétée(s), ${results.failed.length} échouée(s)`, 100);
      log("\n════════════════════════════════════════");
      log("Rapport final :");
      log(`  ✅ ${results.completed.length} complétée(s)`); results.completed.forEach(n => log(`     • ${n}`));
      log(`  ❌ ${results.failed.length} échouée(s)`); results.failed.forEach(n => log(`     • ${n}`));
      log("════════════════════════════════════════");
      setTimeout(removeProgress, 10000);
      return;
    }

    await sleep(jitter(INTER_QUEST_DELAY, 0.3));

    const quest = queue.shift();
    const totalQuests = chosenQuests.length;
    const doneQuests = totalQuests - queue.length - 1;
    const pid = 4 + Math.floor(Math.random() * 65000);
    const appObj = getProp(quest.config, "application");
    const applicationId = getProp(appObj, "id") ?? getProp(quest.config, "applicationId", "application_id") ?? "0";
    const applicationName = getProp(appObj, "name") ?? quest.config?.messages?.questName ?? quest.config?.messages?.quest_name ?? "Game";
    const questName = quest.config?.messages?.questName ?? quest.config?.messages?.quest_name ?? "Quête";
    const taskConfig = getProp(quest.config, "taskConfig", "task_config", "taskConfigV2", "task_config_v2");
    const tasks = getProp(taskConfig, "tasks") || {};
    const taskName = Object.keys(tasks)[0];

    if (!taskName) { results.skipped.push(questName); return processNext(); }

    const secondsNeeded = tasks[taskName]?.target ?? 60;
    const userStatus = getProp(quest, "userStatus", "user_status");
    const progressObj = getProp(userStatus, "progress");
    let secondsDone = progressObj?.[taskName]?.value ?? 0;

    const smartHeartbeat = makeSmartHeartbeat();

    log(`\n⚡ ${questName} [${taskName}] (${Math.floor(secondsDone)}/${secondsNeeded}s)`);
    updateProgress(`⚡ ${questName} (${doneQuests+1}/${totalQuests})`, `${getTaskType(taskName)} · ${Math.floor(secondsDone)}/${secondsNeeded}s`, (secondsDone/secondsNeeded)*100);

    // ── VIDEO ──
    if (taskName.toUpperCase().includes("VIDEO")) {
      const speed = 7;
      let completed = false;
      while (secondsDone < secondsNeeded) {
        await sleep(jitter(speed*1000, 0.2));
        const payloadTs = Math.min(secondsNeeded, secondsDone + speed + Math.random()*0.5);
        const hb = await smartHeartbeat(`/quests/${quest.id}/video-progress`, { timestamp: payloadTs });
        if (hb.fatal) { results.failed.push(questName); return processNext(); }
        if (hb.ok) {
          completed = hb.data?.completed_at != null || hb.data?.completedAt != null;
          secondsDone = Math.min(secondsNeeded, secondsDone + speed);
          updateProgress(`🎬 ${questName} (${doneQuests+1}/${totalQuests})`, `Vidéo · ${Math.floor(secondsDone)}/${secondsNeeded}s`, (secondsDone/secondsNeeded)*100);
          log(`  [Vidéo] ${Math.floor(secondsDone)}/${secondsNeeded}s`);
        }
        if (completed || secondsDone >= secondsNeeded) break;
      }
      if (!completed) { await sleep(1000); await smartHeartbeat(`/quests/${quest.id}/video-progress`, { timestamp: secondsNeeded }); }
      log(`✅ ${questName}`); results.completed.push(questName);
      return processNext();
    }

    // ── PLAY ──
    if (taskName.toUpperCase().includes("PLAY") && !taskName.toUpperCase().includes("ACTIVITY")) {
      if (RunningGameStore && FluxDispatcher) {
        let appData = appObj;
        if (!appData && applicationId !== "0") {
          const r = await apiFetch(`/applications/public?application_ids=${applicationId}`);
          if (r.ok && Array.isArray(r.body) && r.body[0]) appData = r.body[0];
        }
        const safeName = (appData?.name ?? applicationName).replace(/[\\/:*?"<>|]/g, "");
        const exeName = appData?.executables?.find(x => x.os === "win32")?.name?.replace(">","") ?? `${safeName}.exe`;
        const appName = appData?.name ?? applicationName;

        const fakeGame = { cmdLine:`C:\\Program Files\\${appName}\\${exeName}`, exeName, exePath:`c:/program files/${appName.toLowerCase()}/${exeName}`, hidden:false, isLauncher:false, id:applicationId, name:appName, pid, pidPath:[pid], processName:appName, start:Date.now() };
        const realGames = RunningGameStore.getRunningGames();
        const fakeGames = [fakeGame];
        const origGet = RunningGameStore.getRunningGames;
        const origPID = RunningGameStore.getGameForPID;

        RunningGameStore.getRunningGames = disguise(origGet, function getRunningGames() { return fakeGames; });
        if (origPID) RunningGameStore.getGameForPID = disguise(origPID, function getGameForPID(p) { return fakeGames.find(g => g.pid===p); });
        FluxDispatcher.dispatch({ type:"RUNNING_GAMES_CHANGE", removed:realGames, added:[fakeGame], games:fakeGames });

        let stallC = 0;
        const cleanup = () => {
          RunningGameStore.getRunningGames = origGet;
          if (origPID) RunningGameStore.getGameForPID = origPID;
          FluxDispatcher.dispatch({ type:"RUNNING_GAMES_CHANGE", removed:[fakeGame], added:[], games:[] });
          FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", onHb);
          FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_FAILURE", onFail);
        };
        const onHb = (data) => {
          if (data.questId && data.questId !== quest.id) return;
          const pObj = getProp(getProp(data,"userStatus","user_status"),"progress");
          const p = quest.config?.configVersion===1 ? data.userStatus?.streamProgressSeconds : Math.floor(pObj?.[taskName]?.value ?? 0);
          if (p <= secondsDone) { stallC++; if (stallC>10) { cleanup(); results.failed.push(questName); processNext(); return; } } else { stallC=0; }
          secondsDone = p;
          updateProgress(`🎮 ${questName} (${doneQuests+1}/${totalQuests})`, `Jeu · ${p}/${secondsNeeded}s`, (p/secondsNeeded)*100);
          log(`  [Jeu] ${p}/${secondsNeeded}s`);
          if (p >= secondsNeeded) { cleanup(); log(`✅ ${questName}`); results.completed.push(questName); processNext(); }
        };
        let failC = 0;
        const onFail = (data) => {
          if (data.questId && data.questId !== quest.id) return;
          failC++; if (failC >= MAX_CONSECUTIVE_ERRORS) { cleanup(); results.failed.push(questName); processNext(); }
        };
        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", onHb);
        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_FAILURE", onFail);
        log(`  Spoof ${appName}. ~${Math.ceil((secondsNeeded-secondsDone)/60)} min.`);
        return;
      }

      // Fallback HTTP
      let stallC = 0, lastP = secondsDone;
      while (secondsDone < secondsNeeded) {
        await sleep(jitter(30000, 0.1));
        const hb = await smartHeartbeat(`/quests/${quest.id}/heartbeat`, { application_id: applicationId!=="0"?applicationId:undefined, terminal:false });
        if (hb.fatal) { results.failed.push(questName); return processNext(); }
        if (hb.ok) {
          const v = getProp(hb.data,"progress")?.[taskName]?.value;
          if (v != null) secondsDone = Math.floor(v);
          if (secondsDone <= lastP) { stallC++; if (stallC>=5) { results.failed.push(questName); return processNext(); } } else { stallC=0; lastP=secondsDone; }
        }
        updateProgress(`🎮 ${questName} (${doneQuests+1}/${totalQuests})`, `Jeu HTTP · ${secondsDone}/${secondsNeeded}s`, (secondsDone/secondsNeeded)*100);
        log(`  [Jeu HTTP] ${secondsDone}/${secondsNeeded}s`);
      }
      await apiFetch(`/quests/${quest.id}/heartbeat`, "POST", { terminal:true });
      log(`✅ ${questName}`); results.completed.push(questName);
      return processNext();
    }

    // ── STREAM ──
    if (taskName.toUpperCase().includes("STREAM")) {
      if (ApplicationStreamingStore && FluxDispatcher) {
        const origMeta = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
        ApplicationStreamingStore.getStreamerActiveStreamMetadata = disguise(origMeta, function getStreamerActiveStreamMetadata() { return { id:applicationId, pid, sourceName:null }; });
        let failC = 0;
        const onHb = (data) => {
          if (data.questId && data.questId !== quest.id) return;
          const pObj = getProp(getProp(data,"userStatus","user_status"),"progress");
          const p = quest.config?.configVersion===1 ? data.userStatus?.streamProgressSeconds : Math.floor(pObj?.[taskName]?.value ?? 0);
          updateProgress(`📡 ${questName} (${doneQuests+1}/${totalQuests})`, `Stream · ${p}/${secondsNeeded}s`, (p/secondsNeeded)*100);
          log(`  [Stream] ${p}/${secondsNeeded}s`);
          if (p >= secondsNeeded) {
            ApplicationStreamingStore.getStreamerActiveStreamMetadata = origMeta;
            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", onHb);
            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_FAILURE", onF);
            log(`✅ ${questName}`); results.completed.push(questName); processNext();
          }
        };
        const onF = (data) => { if (data.questId && data.questId !== quest.id) return; failC++; if (failC>=MAX_CONSECUTIVE_ERRORS) {
          ApplicationStreamingStore.getStreamerActiveStreamMetadata = origMeta;
          FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS",onHb); FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_FAILURE",onF);
          results.failed.push(questName); processNext();
        }};
        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", onHb);
        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_FAILURE", onF);
        log(`  Spoof stream (${applicationName}). Partagez en vocal.`);
        return;
      }
      results.skipped.push(questName); return processNext();
    }

    // ── ACTIVITY ──
    if (taskName.toUpperCase().includes("ACTIVITY")) {
      const channelId = ChannelStore?.getSortedPrivateChannels?.()?.[0]?.id ?? Object.values(GuildChannelStore?.getAllGuilds?.() || {}).find(x => x?.VOCAL?.length > 0)?.VOCAL[0]?.channel?.id;
      if (!channelId) { results.skipped.push(questName); return processNext(); }
      const streamKey = `call:${channelId}:1`;
      let stallC = 0, lastP = 0;
      while (true) {
        await sleep(jitter(20000, 0.3));
        const hb = await smartHeartbeat(`/quests/${quest.id}/heartbeat`, { stream_key:streamKey, terminal:false });
        if (hb.fatal) { results.failed.push(questName); return processNext(); }
        if (hb.ok) {
          const p = getProp(hb.data,"progress")?.[taskName]?.value ?? 0;
          updateProgress(`🎯 ${questName} (${doneQuests+1}/${totalQuests})`, `Activité · ${p}/${secondsNeeded}s`, (p/secondsNeeded)*100);
          log(`  [Activité] ${p}/${secondsNeeded}s`);
          if (p<=lastP) { stallC++; if (stallC>=8) { results.failed.push(questName); return processNext(); } } else { stallC=0; lastP=p; }
          if (p >= secondsNeeded) { await sleep(jitter(1200)); await apiFetch(`/quests/${quest.id}/heartbeat`,"POST",{stream_key:streamKey,terminal:true}); break; }
        }
      }
      log(`✅ ${questName}`); results.completed.push(questName);
      return processNext();
    }

    // ── FALLBACK ──
    let stallC = 0, lastP = secondsDone;
    while (secondsDone < secondsNeeded) {
      await sleep(jitter(15000, 0.2));
      const hb = await smartHeartbeat(`/quests/${quest.id}/heartbeat`, { terminal:false });
      if (hb.fatal) { results.failed.push(questName); return processNext(); }
      if (hb.ok) {
        const v = getProp(hb.data,"progress")?.[taskName]?.value;
        if (v != null) secondsDone = Math.floor(v);
        if (secondsDone<=lastP) { stallC++; if (stallC>=6) { results.failed.push(questName); return processNext(); } } else { stallC=0; lastP=secondsDone; }
      }
      updateProgress(`⚙️ ${questName} (${doneQuests+1}/${totalQuests})`, `${secondsDone}/${secondsNeeded}s`, (secondsDone/secondsNeeded)*100);
      log(`  [Gen] ${secondsDone}/${secondsNeeded}s`);
    }
    await apiFetch(`/quests/${quest.id}/heartbeat`, "POST", { terminal:true });
    log(`✅ ${questName}`); results.completed.push(questName);
    return processNext();
  };

  processNext();
})();
