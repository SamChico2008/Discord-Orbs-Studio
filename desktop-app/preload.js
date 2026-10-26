/**
 * Electron Preload Bridge - Secure contextBridge
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Startup update experience
  startupUpdateChoice: (choice) => ipcRenderer.invoke('startup-update-choice', choice),
  onStartupUpdateState: (cb) => ipcRenderer.on('startup-update-state', (e, state) => cb(state)),

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Config & Token
  loadConfig: () => ipcRenderer.invoke('config-load'),
  saveToken: (token) => ipcRenderer.invoke('config-save-token', token),
  clearToken: () => ipcRenderer.invoke('config-clear-token'),
  validateToken: (token) => ipcRenderer.invoke('token-validate', token),
  scanLocalTokens: () => ipcRenderer.invoke('token-scan-local'),

  // QR Remote Auth
  startQR: (force = false) => ipcRenderer.invoke('qr-auth-start', force),
  stopQR: () => ipcRenderer.invoke('qr-auth-stop'),

  // Quests API & Engine
  fetchQuests: () => ipcRenderer.invoke('quests-fetch'),
  startQuests: (quests) => ipcRenderer.invoke('quests-start', quests),
  runSingleQuest: (quest) => ipcRenderer.invoke('quests-run-single', quest),
  pauseQuests: () => ipcRenderer.invoke('quests-pause'),
  resumeQuests: () => ipcRenderer.invoke('quests-resume'),
  skipQuest: () => ipcRenderer.invoke('quests-skip'),
  stopQuests: () => ipcRenderer.invoke('quests-stop'),
  claimQuest: (quest) => ipcRenderer.invoke('quests-claim', quest),
  claimSingleQuest: (quest) => ipcRenderer.invoke('quests-claim-single', quest),
  claimAllQuests: (quests) => ipcRenderer.invoke('quests-claim-all', quests),
  updateSettings: (settings) => ipcRenderer.invoke('settings-update', settings),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Multi-Account Management
  getAccounts: () => ipcRenderer.invoke('accounts-list'),
  saveAccount: (account) => ipcRenderer.invoke('accounts-save', account),
  setAccountDisplayName: (accountId, displayName) => ipcRenderer.invoke('accounts-set-display-name', accountId, displayName),
  removeAccount: (accountId) => ipcRenderer.invoke('accounts-remove', accountId),

  // Vault (Claimed Codes) Management
  getVaultCodes: () => ipcRenderer.invoke('vault-list'),
  saveVaultCode: (item) => ipcRenderer.invoke('vault-save', item),
  removeVaultCode: (id) => ipcRenderer.invoke('vault-remove', id),
  clearVaultCodes: () => ipcRenderer.invoke('vault-clear'),

  // Log Export & System Notifications
  exportLogs: (content) => ipcRenderer.invoke('logs-export', content),
  notifyDesktop: (payload) => ipcRenderer.invoke('notify-desktop', payload),

  // Events from Main Process
  onQR: (cb) => ipcRenderer.on('qr-code', (e, d) => cb(d)),
  onQRStatus: (cb) => ipcRenderer.on('qr-status', (e, d) => cb(d)),
  onQRScanned: (cb) => ipcRenderer.on('qr-scanned', (e, d) => cb(d)),
  onQRAuthenticated: (cb) => ipcRenderer.on('qr-authenticated', (e, d) => cb(d)),
  onQRError: (cb) => ipcRenderer.on('qr-error', (e, d) => cb(d)),

  onEngineStarted: (cb) => ipcRenderer.on('engine-started', (e, d) => cb(d)),
  onEngineLog: (cb) => ipcRenderer.on('engine-log', (e, d) => cb(d)),
  onEngineProgress: (cb) => ipcRenderer.on('engine-progress', (e, d) => cb(d)),
  onEngineQuestStart: (cb) => ipcRenderer.on('engine-quest-start', (e, d) => cb(d)),
  onEngineQuestComplete: (cb) => ipcRenderer.on('engine-quest-complete', (e, d) => cb(d)),
  onEngineQuestFail: (cb) => ipcRenderer.on('engine-quest-fail', (e, d) => cb(d)),
  onEngineQuestSkipped: (cb) => ipcRenderer.on('engine-quest-skipped', (e, d) => cb(d)),
  onEngineFinished: (cb) => ipcRenderer.on('engine-finished', (e, d) => cb(d)),
  onEnginePaused: (cb) => ipcRenderer.on('engine-paused', () => cb()),
  onEngineResumed: (cb) => ipcRenderer.on('engine-resumed', () => cb()),
  onEngineStopped: (cb) => ipcRenderer.on('engine-stopped', () => cb()),
  onEngineRewardClaimed: (cb) => ipcRenderer.on('engine-reward-claimed', (e, d) => cb(d))
});
