/**
 * Discord Orb Studio - Electron Main Process
 */
const { app, BrowserWindow, ipcMain, shell, dialog, Notification, screen } = require('electron');
app.commandLine.appendSwitch('no-sandbox');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

function isSafeExternalUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const QuestEngine = require('./quest-engine');
const QRAuthClient = require('./qr-auth');
const { findLocalTokens } = require('./token-detector');
const { checkForUpdates, applyUpdates } = require('./update-manager');

let mainWindow = null;
let startupSplash = null;
let startupUpdateChoiceResolver = null;
let startupSplashClosed = false;
let isStartingUp = true;
const questEngine = new QuestEngine();
let qrClient = null;

const CONFIG_PATH = path.join(app.getPath('userData'), 'orb_studio_config.json');

function loadStoredConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (_) {}
  return { token: null, settings: {} };
}

function saveStoredConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (_) {}
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(1140, width),
    height: Math.min(780, height),
    minWidth: Math.min(720, width),
    minHeight: Math.min(500, height),
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#171719',
    show: false,
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('Failed to load:', code, desc);
    closeStartupSplash();
  });

  mainWindow.webContents.on('console-message', (e) => {
    console.log(`[Renderer] ${e.message}`);
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    console.log('Main window ready to show, calling mainWindow.show()');
    mainWindow.show();
    closeStartupSplash();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

function showStartupSplash() {
  startupSplashClosed = false;
  startupSplash = new BrowserWindow({
    width: 660,
    height: 440,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    backgroundColor: '#171719',
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload-launch.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  startupSplash.loadFile(path.join(__dirname, 'src', 'launch.html'));
  startupSplash.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  startupSplash.webContents.on('will-navigate', (event, targetUrl) => {
    const launchFileUrl = pathToFileURL(path.join(__dirname, 'src', 'launch.html')).href;
    if (targetUrl !== launchFileUrl) event.preventDefault();
  });
  startupSplash.once('closed', () => {
    startupSplashClosed = true;
    if (startupUpdateChoiceResolver) startupUpdateChoiceResolver('later');
  });
  startupSplash.once('ready-to-show', () => startupSplash?.show());
  return startupSplash;
}

async function setSplashState(state) {
  if (!startupSplash || startupSplash.isDestroyed()) return;
  try {
    await startupSplash.webContents.executeJavaScript(`window.setStartupState(${JSON.stringify(state)})`);
  } catch (_) {}
}

function closeStartupSplash() {
  if (startupSplash && !startupSplash.isDestroyed()) startupSplash.close();
  startupSplash = null;
}

async function checkStartupUpdates() {
  const splash = showStartupSplash();
  try {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 3000);
      splash.webContents.once('did-finish-load', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  } catch (_) {}

  const startedAt = Date.now();
  let result;
  try {
    const checkPromise = checkForUpdates({ packaged: app.isPackaged });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Delai depasse')), 15000));
    result = await Promise.race([checkPromise, timeoutPromise]);
  } catch (error) {
    result = { updates: [], errors: [error.message], unsupported: false };
  }
  const remaining = Math.max(0, 700 - (Date.now() - startedAt));
  if (remaining) await new Promise((resolve) => setTimeout(resolve, remaining));
  if (startupSplashClosed) return false;

  if (result.pendingUpdate) {
    await setSplashState({ mode: 'unavailable' });
    await new Promise((resolve) => setTimeout(resolve, 900));
    return false;
  }

  if (result.unsupported) {
    await setSplashState({ mode: 'unavailable' });
    await new Promise((resolve) => setTimeout(resolve, 600));
    return false;
  }

  if (result.autoInstall) {
    await setSplashState({ mode: 'installing' });
    try {
      await applyUpdates(result.updates, {
        tempDir: app.getPath('temp'),
        installDir: path.dirname(process.execPath)
      });
      await setSplashState({ mode: 'restarting' });
      await new Promise((resolve) => setTimeout(resolve, 500));
      app.quit();
      return true;
    } catch (error) {
      await setSplashState({ mode: 'failed', message: error.message });
      await new Promise((resolve) => { startupUpdateChoiceResolver = resolve; });
      startupUpdateChoiceResolver = null;
      return false;
    }
  }

  if (!result.updates.length) {
    await setSplashState({ mode: result.errors?.length ? 'offline' : 'upToDate' });
    await new Promise((resolve) => setTimeout(resolve, 600));
    return false;
  }

  await setSplashState({ mode: 'updateAvailable', updates: result.updates.map(({ name, current, latest }) => ({ name, current, latest })) });
  const choice = await new Promise((resolve) => { startupUpdateChoiceResolver = resolve; });
  startupUpdateChoiceResolver = null;
  if (choice !== 'install') {
    return false;
  }

  await setSplashState({ mode: 'installing' });
  try {
    await applyUpdates(result.updates);
    await setSplashState({ mode: 'restarting' });
    await new Promise((resolve) => setTimeout(resolve, 500));
    app.relaunch();
    app.exit(0);
    return true;
  } catch (error) {
    await setSplashState({ mode: 'failed', message: error.message });
    await new Promise((resolve) => { startupUpdateChoiceResolver = resolve; });
    startupUpdateChoiceResolver = null;
    return false;
  }
}

app.whenReady().then(async () => {
  try {
    const relaunching = await checkStartupUpdates();
    if (relaunching) return;
  } catch (err) {
    console.error('Error during startup check:', err);
  }

  createWindow();
  isStartingUp = false;

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (isStartingUp) return;
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers: Window Controls ──
ipcMain.handle('startup-update-choice', (event, choice) => {
  if (!['install', 'later', 'continue'].includes(choice)) return false;
  if (startupUpdateChoiceResolver) startupUpdateChoiceResolver(choice);
  return true;
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// ── IPC Handlers: Configuration & Token ──
ipcMain.handle('config-load', () => {
  return loadStoredConfig();
});

ipcMain.handle('config-save-token', (event, token) => {
  const cfg = loadStoredConfig();
  cfg.token = token;
  saveStoredConfig(cfg);
  questEngine.setToken(token);
  return true;
});

ipcMain.handle('config-clear-token', () => {
  const cfg = loadStoredConfig();
  cfg.token = null;
  saveStoredConfig(cfg);
  questEngine.setToken(null);
  return true;
});

ipcMain.handle('token-validate', async (event, token) => {
  try {
    const res = await fetch('https://discord.com/api/v9/users/@me', {
      headers: {
        'Authorization': token,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      return { ok: false, error: 'Invalid token or expired session' };
    }

    const user = await res.json();
    questEngine.setToken(token);

    return {
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        global_name: user.global_name || user.username,
        avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : 'https://cdn.discordapp.com/embed/avatars/0.png',
        banner: user.banner ? `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.png?size=480` : null,
        email: user.email,
        phone: user.phone,
        premium_type: user.premium_type,
        mfa_enabled: user.mfa_enabled,
        flags: user.flags || user.public_flags || 0,
        accent_color: user.accent_color,
        bio: user.bio || null
      }
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── IPC Handlers: Local Token Scanner ──
ipcMain.handle('token-scan-local', async () => {
  return await findLocalTokens();
});

// ── IPC Handlers: QR Remote Auth ──
ipcMain.handle('qr-auth-start', (event, force = false) => {
  // If not forcing refresh and an active client already has a valid QR code, resend it immediately
  if (!force && qrClient && qrClient.active && qrClient.lastQrDataUrl) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('qr-code', qrClient.lastQrDataUrl);
    }
    return true;
  }

  console.log('[QR] qr-auth-start invoked (force =', force, ')');
  if (qrClient) {
    qrClient.stop();
    qrClient.removeAllListeners();
    qrClient = null;
  }

  qrClient = new QRAuthClient();

  qrClient.on('qr', (data) => {
    console.log('[QR] qr event received, dataUrl length:', data?.dataUrl?.length || 'raw');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('qr-code', data?.dataUrl || data);
    }
  });

  qrClient.on('status', (data) => {
    const message = typeof data === 'object' && data?.message ? data.message : String(data);
    console.log('[QR] status event:', message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('qr-status', data);
    }
  });

  qrClient.on('scanned', (data) => {
    console.log('[QR] scanned event:', data?.username);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('qr-scanned', data);
    }
  });

  qrClient.on('authenticated', (data) => {
    const token = typeof data === 'object' && data?.token ? data.token : data;
    console.log('[QR] authenticated event, token prefix:', String(token).slice(0, 10));
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('qr-authenticated', token);
    }
  });

  qrClient.on('error', (err) => {
    const errMsg = typeof err === 'object' && err?.message ? err.message : String(err);
    console.log('[QR] error event:', errMsg);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('qr-error', errMsg);
    }
  });

  qrClient.start();
  console.log('[QR] qrClient.start() called');
  return true;
});

ipcMain.handle('qr-auth-stop', () => {
  if (qrClient) {
    qrClient.stop();
    qrClient = null;
  }
  return true;
});

// ── IPC Handlers: Quests API & Engine ──
ipcMain.handle('quests-fetch', async () => {
  return await questEngine.fetchQuests();
});

ipcMain.handle('quests-start', async (event, questsToRun) => {
  // Run asynchronously without blocking IPC return
  questEngine.runQuests(questsToRun);
  return true;
});

ipcMain.handle('quests-run-single', (event, quest) => {
  questEngine.runSingleQuest(quest);
  return true;
});

ipcMain.handle('quests-pause', () => {
  questEngine.pause();
  return true;
});

ipcMain.handle('quests-resume', () => {
  questEngine.resume();
  return true;
});

ipcMain.handle('quests-stop', () => {
  questEngine.stop();
  return true;
});

ipcMain.handle('quests-skip', () => {
  return questEngine.skip();
});

ipcMain.handle('quests-claim', async (event, quest) => {
  return await questEngine.claimReward(quest);
});

ipcMain.handle('settings-update', (event, newSettings) => {
  questEngine.updateSettings(newSettings);
  const cfg = loadStoredConfig();
  cfg.settings = { ...cfg.settings, ...newSettings };
  saveStoredConfig(cfg);
  return true;
});

ipcMain.handle('open-external', (event, url) => {
  if (isSafeExternalUrl(url)) {
    shell.openExternal(url);
  }
});

// ── Multi-Account Profiles ──
ipcMain.handle('accounts-list', () => {
  const cfg = loadStoredConfig();
  return cfg.accounts || [];
});

ipcMain.handle('accounts-save', (event, account) => {
  const cfg = loadStoredConfig();
  cfg.accounts = cfg.accounts || [];
  const idx = cfg.accounts.findIndex(a => a.id === account.id);
  if (idx >= 0) {
    cfg.accounts[idx] = { ...cfg.accounts[idx], ...account };
  } else {
    cfg.accounts.push(account);
  }
  saveStoredConfig(cfg);
  return cfg.accounts;
});

ipcMain.handle('accounts-set-display-name', (event, accountId, displayName) => {
  if (typeof accountId !== 'string' || typeof displayName !== 'string') return { ok: false };
  const cfg = loadStoredConfig();
  const account = (cfg.accounts || []).find((item) => item.id === accountId);
  if (!account) return { ok: false };
  account.custom_name = displayName.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32);
  saveStoredConfig(cfg);
  return { ok: true, accounts: cfg.accounts, customName: account.custom_name };
});

ipcMain.handle('accounts-remove', (event, accountId) => {
  const cfg = loadStoredConfig();
  cfg.accounts = (cfg.accounts || []).filter(a => a.id !== accountId);
  saveStoredConfig(cfg);
  return cfg.accounts;
});

// ── Log Export & Notifications ──
ipcMain.handle('logs-export', async (event, textContent) => {
  if (!mainWindow) return { canceled: true };
  const dateStr = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Execution Logs',
    defaultPath: `Discord_Orb_Studio_Logs_${dateStr}.txt`,
    filters: [{ name: 'Text Files (*.txt)', extensions: ['txt'] }]
  });
  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, textContent, 'utf8');
  return { ok: true, filePath };
});

ipcMain.handle('notify-desktop', (event, { title, body }) => {
  try {
    if (Notification.isSupported()) {
      new Notification({
        title: title || 'Discord Orb Studio',
        body: body || '',
        icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
      }).show();
    }
  } catch (_) {}
  return true;
});

ipcMain.handle('quests-claim-single', async (event, quest) => {
  return await questEngine.claimReward(quest);
});

ipcMain.handle('quests-claim-all', async (event, quests) => {
  return await questEngine.claimAllRewards(quests);
});

// ── Vault (Claimed Codes) Management ──
ipcMain.handle('vault-list', () => {
  const cfg = loadStoredConfig();
  return cfg.claimedCodes || [];
});

ipcMain.handle('vault-save', (event, codeItem) => {
  const cfg = loadStoredConfig();
  cfg.claimedCodes = cfg.claimedCodes || [];
  const idx = cfg.claimedCodes.findIndex(c => c.id === codeItem.id);
  if (idx >= 0) {
    cfg.claimedCodes[idx] = { ...cfg.claimedCodes[idx], ...codeItem };
  } else {
    cfg.claimedCodes.unshift(codeItem);
  }
  saveStoredConfig(cfg);
  return cfg.claimedCodes;
});

ipcMain.handle('vault-remove', (event, codeId) => {
  const cfg = loadStoredConfig();
  cfg.claimedCodes = (cfg.claimedCodes || []).filter(c => c.id !== codeId);
  saveStoredConfig(cfg);
  return cfg.claimedCodes;
});

ipcMain.handle('vault-clear', () => {
  const cfg = loadStoredConfig();
  cfg.claimedCodes = [];
  saveStoredConfig(cfg);
  return [];
});

// ── Pipe QuestEngine events to Renderer ──
questEngine.on('started', (data) => {
  if (mainWindow) mainWindow.webContents.send('engine-started', data);
});

questEngine.on('log', (data) => {
  if (mainWindow) mainWindow.webContents.send('engine-log', data);
});

questEngine.on('progress', (data) => {
  if (mainWindow) mainWindow.webContents.send('engine-progress', data);
});

questEngine.on('quest-start', (data) => {
  if (mainWindow) mainWindow.webContents.send('engine-quest-start', data);
});

questEngine.on('quest-complete', (data) => {
  if (mainWindow) mainWindow.webContents.send('engine-quest-complete', data);
});

questEngine.on('quest-fail', (data) => {
  if (mainWindow) mainWindow.webContents.send('engine-quest-fail', data);
});

questEngine.on('finished', (data) => {
  if (mainWindow) mainWindow.webContents.send('engine-finished', data);
});

questEngine.on('paused', () => {
  if (mainWindow) mainWindow.webContents.send('engine-paused');
});

questEngine.on('resumed', () => {
  if (mainWindow) mainWindow.webContents.send('engine-resumed');
});

questEngine.on('stopped', () => {
  if (mainWindow) mainWindow.webContents.send('engine-stopped');
});

questEngine.on('quest-skipped', (data) => {
  if (mainWindow) mainWindow.webContents.send('engine-quest-skipped', data);
});

questEngine.on('reward-claimed', (data) => {
  if (data && data.code) {
    const cfg = loadStoredConfig();
    cfg.claimedCodes = cfg.claimedCodes || [];
    const exists = cfg.claimedCodes.some(c => c.code === data.code);
    if (!exists) {
      cfg.claimedCodes.unshift({
        id: data.quest?.id || crypto.randomUUID(),
        questName: data.quest?.questName || data.rewardName || 'Discord Quest',
        gameTitle: data.quest?.gameTitle || 'Discord Game',
        rewardName: data.quest?.rewardName || 'Reward',
        rewardType: data.quest?.rewardType || 'ORBS',
        code: data.code,
        claimedAt: new Date().toISOString()
      });
      saveStoredConfig(cfg);
    }
  }
  if (mainWindow) mainWindow.webContents.send('engine-reward-claimed', data);
});
