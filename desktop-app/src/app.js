/**
 * Discord Orb Studio — Application Controller
 * Quest Engine, Heartbeat Dispatcher, Multi-Account & Telemetry Manager
 */

// ── Application State ──
let allQuests = [];
let selectedQuestIds = new Set();
let currentFilter = 'remaining';
let currentSearch = '';
let currentSort = 'default';
let currentUser = null;
let currentToken = null;
let savedAccounts = [];
let savedClaimedCodes = [];
let isEngineRunning = false;
let totalPacketsSent = 0;
let totalErrorsEncountered = 0;
let sessionStartTime = null;
let sessionTimerInterval = null;

// ── Secure HTML Sanitizer ──
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Audio Synthesizer (Zero-dependency Web Audio API) ──
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playAudioChime(type = 'success') {
  if (!settingAudioSfx || !settingAudioSfx.checked) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'success') {
      // Warm two-tone chime (F#5 - B5)
      const freqs = [739.99, 987.77];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.001, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    } else if (type === 'start') {
      // Soft ascending confirmation
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.12);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'click') {
      // Subtle UI tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    }
  } catch (_) {}
}

// ── DOM References ──
const navBtns = document.querySelectorAll('.nav-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const navAvatar = document.getElementById('nav-avatar');
const navUsername = document.getElementById('nav-username');
const navSubtext = document.getElementById('nav-subtext');
const navStatusIndicator = document.getElementById('nav-status-indicator');
const navNitroBadge = document.getElementById('nav-nitro-badge');
const navQuestCount = document.getElementById('nav-quest-count');
const liveIndicatorDot = document.getElementById('live-indicator-dot');

const userPill = document.getElementById('user-pill');
const btnUserPopout = document.getElementById('btn-user-popout');
const btnAccountSwitch = document.getElementById('btn-account-switch');
const btnQuickLogout = document.getElementById('btn-quick-logout');
const discordProfilePopout = document.getElementById('discord-profile-popout');
const btnClosePopout = document.getElementById('btn-close-popout');
const popoutBanner = document.getElementById('popout-banner');
const popoutAvatar = document.getElementById('popout-avatar');
const popoutStatusIndicator = document.getElementById('popout-status-indicator');
const popoutBadgesShelf = document.getElementById('popout-badges-shelf');
const popoutName = document.getElementById('popout-name');
const popoutHandle = document.getElementById('popout-handle');
const popoutCreatedDate = document.getElementById('popout-created-date');
const popoutNitroText = document.getElementById('popout-nitro-text');
const popoutUserId = document.getElementById('popout-user-id');
const popoutTokenMasked = document.getElementById('popout-token-masked');
const btnCopyUserIdPopout = document.getElementById('btn-copy-popout-user-id');
const btnCopyUserTokenPopout = document.getElementById('btn-copy-user-token');
const btnPopoutManageAccounts = document.getElementById('btn-popout-manage-accounts');
const btnPopoutLogout = document.getElementById('btn-popout-logout');

const dropdownAccountsList = document.getElementById('dropdown-accounts-list');
const btnDropdownAddAccount = document.getElementById('btn-dropdown-add-account');

// Mode Buttons
const modeBtnStealth = document.getElementById('mode-btn-stealth');
const modeBtnTurbo = document.getElementById('mode-btn-turbo');

// Skip & RPC Simulation
const btnSkipEngine = document.getElementById('btn-skip-engine');
const rpcSimGame = document.getElementById('rpc-sim-game');
const rpcSimAppId = document.getElementById('rpc-sim-appid');
const rpcSimType = document.getElementById('rpc-sim-type');
const rpcSimCadence = document.getElementById('rpc-sim-cadence');
const rpcSimNextHb = document.getElementById('rpc-sim-next-hb');
const radarPulseDot = document.getElementById('radar-pulse-dot');

// Title Bar Controls
const titleEnginePill = document.getElementById('title-engine-pill');
const titlePillDot = document.getElementById('title-pill-dot');
const titlePillText = document.getElementById('title-pill-text');
const btnQuickVault = document.getElementById('btn-quick-vault');
const titleVaultBadge = document.getElementById('title-vault-badge');
const btnQuickMute = document.getElementById('btn-quick-mute');
const iconSoundOn = document.getElementById('icon-sound-on');
const iconSoundOff = document.getElementById('icon-sound-off');
const themeQuickBtns = document.querySelectorAll('.theme-quick-btn');

// Quests Tab Elements
const questsContainer = document.getElementById('quests-container');
const questSearchInput = document.getElementById('quest-search');
const questSortSelect = document.getElementById('quest-sort-select');
const filterPills = document.querySelectorAll('.filter-pills .pill');
const btnSelectAll = document.getElementById('btn-select-all');
const btnDeselectAll = document.getElementById('btn-deselect-all');
const btnRefreshQuests = document.getElementById('btn-refresh-quests');
const btnClaimAllCompleted = document.getElementById('btn-claim-all-completed');
const claimAllBtnLabel = document.getElementById('claim-all-btn-label');
const btnStartSelected = document.getElementById('btn-start-selected');
const startBtnLabel = document.getElementById('start-btn-label');
const btnCompleteAll = document.getElementById('btn-complete-all');

const statTotal = document.getElementById('stat-total-quests');
const statCompleted = document.getElementById('stat-completed-quests');
const statTime = document.getElementById('stat-estimated-time');
const statCardAvailable = document.getElementById('stat-card-available');
const statCardCompleted = document.getElementById('stat-card-completed');
const statCardVault = document.getElementById('stat-card-vault');

const pillCountRemaining = document.getElementById('pill-count-remaining');
const pillCountAll = document.getElementById('pill-count-all');
const pillCountCompleted = document.getElementById('pill-count-completed');

// Live Tab Elements
const liveOrb = document.getElementById('live-orb');
const liveEngineStatus = document.getElementById('live-engine-status');
const liveCurrentTitle = document.getElementById('live-current-title');
const liveCurrentSub = document.getElementById('live-current-sub');
const liveProgressBar = document.getElementById('live-progress-bar');
const liveProgressPct = document.getElementById('live-progress-pct');
const liveProgressSec = document.getElementById('live-progress-sec');
const metricCurrentIdx = document.getElementById('metric-current-idx');
const metricLatency = document.getElementById('metric-latency');
const metricElapsed = document.getElementById('metric-elapsed');
const metricEta = document.getElementById('metric-eta');
const metricHeartbeats = document.getElementById('metric-heartbeats');
const metricSuccessRate = document.getElementById('metric-success-rate');
const btnStopEngine = document.getElementById('btn-stop-engine');
const btnPauseEngine = document.getElementById('btn-pause-engine');
const iconPauseBtn = document.getElementById('icon-pause-btn');
const labelPauseBtn = document.getElementById('label-pause-btn');
const btnJumpQuests = document.getElementById('btn-jump-quests');
const btnCopyTerminal = document.getElementById('btn-copy-terminal');
const terminalLogs = document.getElementById('terminal-logs');
const autoScrollCheck = document.getElementById('auto-scroll-check');
const btnClearTerminal = document.getElementById('btn-clear-terminal');
const btnExportLogs = document.getElementById('btn-export-logs');
const termPills = document.querySelectorAll('.term-pill');
let currentTermFilter = 'all';

// Vault Page Elements
const navVaultCount = document.getElementById('nav-vault-count');
const vaultPageItems = document.getElementById('vault-page-items');
const vaultStatTotal = document.getElementById('vault-stat-total');
const vaultStatReady = document.getElementById('vault-stat-ready');
const vaultSearchInput = document.getElementById('vault-search');
const btnVaultExportTxt = document.getElementById('btn-vault-export-txt');
const btnVaultCopyAllPage = document.getElementById('btn-vault-copy-all-page');
const btnVaultClearAll = document.getElementById('btn-vault-clear-all');
const btnVaultOpenDiscordPage = document.getElementById('btn-vault-open-discord-page');
let isEnginePaused = false;

// Account Tab Elements
const accountCardActive = document.getElementById('account-card-active');
const accountBanner = document.getElementById('account-banner');
const accountAvatar = document.getElementById('account-avatar');
const accountUsername = document.getElementById('account-username');
const accountGlobalname = document.getElementById('account-globalname');
const badgeNitro = document.getElementById('badge-nitro');
const badgeMfa = document.getElementById('badge-mfa');
const badgeVerified = document.getElementById('badge-verified');
const badgeBravery = document.getElementById('badge-bravery');
const badgeBrilliance = document.getElementById('badge-brilliance');
const badgeBalance = document.getElementById('badge-balance');
const badgeDev = document.getElementById('badge-dev');
const badgeEarly = document.getElementById('badge-early');

const btnCopyUserId = document.getElementById('btn-copy-user-id');
const btnRefreshProfile = document.getElementById('btn-refresh-profile');
const btnLogout = document.getElementById('btn-logout');

const accountId = document.getElementById('account-id');
const accountCreated = document.getElementById('account-created');
const accountNitroType = document.getElementById('account-nitro-type');
const accountQuestsSummary = document.getElementById('account-quests-summary');

const activeTokenField = document.getElementById('active-token-field');
const btnToggleActiveToken = document.getElementById('btn-toggle-active-token');
const btnToggleActiveTokenText = document.getElementById('btn-toggle-active-token-text');
const btnCopyActiveToken = document.getElementById('btn-copy-active-token');

const accountsHubCard = document.getElementById('accounts-hub-card');
const hubAccountsCount = document.getElementById('hub-accounts-count');
const savedAccountsGrid = document.getElementById('saved-accounts-grid');
const btnShowAddAccount = document.getElementById('btn-show-add-account');

const loginCard = document.getElementById('login-card');
const loginCardHeading = document.getElementById('login-card-heading');
const loginCardDesc = document.getElementById('login-card-desc');

const loginTabBtns = document.querySelectorAll('.login-tab-btn');
const loginTabContents = document.querySelectorAll('.login-tab-content');
const qrImage = document.getElementById('qr-image');
const qrPlaceholder = document.getElementById('qr-placeholder');
const qrStatusText = document.getElementById('qr-status-text');
const btnRefreshQr = document.getElementById('btn-refresh-qr');
const qrScannedOverlay = document.getElementById('qr-scanned-overlay');
const qrScannedAvatar = document.getElementById('qr-scanned-avatar');
const qrScannedName = document.getElementById('qr-scanned-name');
const qrExpiredOverlay = document.getElementById('qr-expired-overlay');
const btnQrExpiredRefresh = document.getElementById('btn-qr-expired-refresh');

const btnScanLocalTokens = document.getElementById('btn-scan-local-tokens');
const localTokensContainer = document.getElementById('local-tokens-container');

const manualTokenInput = document.getElementById('manual-token-input');
const btnToggleTokenEye = document.getElementById('btn-toggle-token-eye');
const btnSubmitToken = document.getElementById('btn-submit-token');

// Settings Elements
const presetCards = document.querySelectorAll('.preset-card');
const settingHbInterval = document.getElementById('setting-hb-interval');
const settingVideoStep = document.getElementById('setting-video-step');
const settingJitter = document.getElementById('setting-jitter');
const settingAutoClaim = document.getElementById('setting-auto-claim');
const settingAutoCopy = document.getElementById('setting-auto-copy');
const settingAutoRefresh = document.getElementById('setting-auto-refresh');
const settingAudioSfx = document.getElementById('setting-audio-sfx');
const settingDesktopNotify = document.getElementById('setting-desktop-notify');
const settingBuildNumber = document.getElementById('setting-build-number');
const themeDots = document.querySelectorAll('.theme-dot');
const btnSaveSettings = document.getElementById('btn-save-settings');
const settingsSavedIndicator = document.getElementById('settings-saved-indicator');

// Modal Elements
const questModal = document.getElementById('quest-modal');
const btnCloseQuestModal = document.getElementById('btn-close-quest-modal');
const btnCloseQuestModalBottom = document.getElementById('btn-close-quest-modal-bottom');
const modalHero = document.getElementById('modal-hero');
const modalTaskBadge = document.getElementById('modal-task-badge');
const modalQuestTitle = document.getElementById('modal-quest-title');
const modalQuestSub = document.getElementById('modal-quest-sub');
const modalPromoBox = document.getElementById('modal-promo-box');
const modalPromoCode = document.getElementById('modal-promo-code');
const btnCopyPromoCode = document.getElementById('btn-copy-promo-code');
const modalTargetTime = document.getElementById('modal-target-time');
const modalProgressPct = document.getElementById('modal-progress-pct');
const modalExpiration = document.getElementById('modal-expiration');
const modalAppId = document.getElementById('modal-app-id');
const btnCopyQuestId = document.getElementById('btn-copy-quest-id');
const btnModalClaim = document.getElementById('btn-modal-claim');

// Vault Modal Elements
const vaultModal = document.getElementById('vault-modal');
const btnCloseVaultModal = document.getElementById('btn-close-vault-modal');
const btnCloseVaultBottom = document.getElementById('btn-close-vault-bottom');
const btnVaultCopyAll = document.getElementById('btn-vault-copy-all');
const btnVaultOpenDiscord = document.getElementById('btn-vault-open-discord');
const vaultTotalCodes = document.getElementById('vault-total-codes');
const vaultTotalOrbs = document.getElementById('vault-total-orbs');
const vaultItemsContainer = document.getElementById('vault-items-container');

let activeModalQuest = null;

// ── Window Controls ──
document.getElementById('btn-minimize').addEventListener('click', () => window.electronAPI.minimizeWindow());
document.getElementById('btn-maximize').addEventListener('click', () => window.electronAPI.maximizeWindow());
document.getElementById('btn-close').addEventListener('click', () => window.electronAPI.closeWindow());

// ── Toast Notification Helper ──
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  if (type === 'success') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  }

  toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Tab Switching ──
function switchTab(tabId, suppressQR = false) {
  navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === tabId));
  playAudioChime('click');

  if (tabId === 'tab-vault') {
    renderVaultPage();
  }

  if (tabId === 'tab-account' && !suppressQR) {
    const qrTabBtn = document.querySelector('.login-tab-btn[data-login-tab="tab-login-qr"]');
    if (qrTabBtn && qrTabBtn.classList.contains('active')) {
      startQrFlow();
    }
  } else if (tabId !== 'tab-account') {
    qrSessionActive = false;
    window.electronAPI.stopQR();
  }
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Multi-Account Management ──
async function loadSavedAccounts() {
  try {
    savedAccounts = await window.electronAPI.getAccounts();
    renderAccountsDropdown();
    renderSavedAccountsHub();
  } catch (_) {
    savedAccounts = [];
  }
}

function renderAccountsDropdown() {
  if (!dropdownAccountsList) return;
  dropdownAccountsList.innerHTML = '';

  if (!savedAccounts || savedAccounts.length === 0) {
    dropdownAccountsList.innerHTML = '<div class="dropdown-empty">No other saved accounts</div>';
    return;
  }

  savedAccounts.forEach(acc => {
    const item = document.createElement('div');
    const isCurrent = currentUser && currentUser.id === acc.id;
    item.className = `dropdown-account-item ${isCurrent ? 'active' : ''}`;
    item.innerHTML = `
      <img class="dropdown-acc-avatar" src="${acc.avatar}" alt="Avatar">
      <div class="dropdown-acc-info">
        <div class="dropdown-acc-name">${escapeHtml(acc.global_name || acc.username)}</div>
        <div class="dropdown-acc-tag">@${escapeHtml(acc.username)}</div>
      </div>
      <button class="dropdown-acc-remove" title="Remove account">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `;

    item.addEventListener('click', async (e) => {
      if (e.target.closest('.dropdown-acc-remove')) return;
      if (discordProfilePopout) discordProfilePopout.style.display = 'none';
      if (isCurrent) return;

      addTerminalLog(`Switching to account @${acc.username}...`, 'info');
      await window.electronAPI.saveToken(acc.token);
      const valRes = await window.electronAPI.validateToken(acc.token);
      if (valRes.ok) {
        setAuthenticatedUser(valRes.user, acc.token);
        loadQuests();
        showToast(`Active account: ${acc.global_name || acc.username}`, 'success');
        playAudioChime('start');
      } else {
        showToast(`Session expired for @${acc.username}`, 'error');
      }
    });

    item.querySelector('.dropdown-acc-remove').addEventListener('click', async (e) => {
      e.stopPropagation();
      savedAccounts = await window.electronAPI.removeAccount(acc.id);
      renderAccountsDropdown();
      renderSavedAccountsHub();
      showToast(`Account @${acc.username} removed`, 'info');
    });

    dropdownAccountsList.appendChild(item);
  });
}

function renderSavedAccountsHub() {
  if (!savedAccountsGrid) return;
  savedAccountsGrid.innerHTML = '';

  const count = savedAccounts ? savedAccounts.length : 0;
  if (hubAccountsCount) {
    hubAccountsCount.textContent = `${count} account${count > 1 ? 's' : ''}`;
  }

  if (!savedAccounts || savedAccounts.length === 0) {
    savedAccountsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
        Saved accounts will appear here.
      </div>
    `;
    return;
  }

  savedAccounts.forEach(acc => {
    const isCurrent = currentUser && currentUser.id === acc.id;
    const card = document.createElement('div');
    card.className = `saved-account-card ${isCurrent ? 'active' : ''}`;

    card.innerHTML = `
      <img class="saved-acc-avatar" src="${acc.avatar || '../assets/avatar-placeholder.svg'}" alt="Avatar">
      <div class="saved-acc-info">
        <div class="saved-acc-name">${escapeHtml(acc.global_name || acc.username)}</div>
        <div class="saved-acc-tag">@${escapeHtml(acc.username)}</div>
        ${isCurrent ? '<div class="saved-acc-status"><span class="pulse-dot-green"></span> Active Session</div>' : ''}
      </div>
      <div class="saved-acc-actions">
        ${!isCurrent ? `<button class="btn-acc-switch" data-acc-id="${acc.id}">Use Account</button>` : ''}
        <button class="btn-acc-remove" data-acc-del="${acc.id}" title="Remove account">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    const btnSwitch = card.querySelector(`[data-acc-id="${acc.id}"]`);
    if (btnSwitch) {
      btnSwitch.addEventListener('click', async () => {
        addTerminalLog(`Switching to @${acc.username}...`, 'info');
        await window.electronAPI.saveToken(acc.token);
        const valRes = await window.electronAPI.validateToken(acc.token);
        if (valRes.ok) {
          setAuthenticatedUser(valRes.user, acc.token);
          loadQuests();
          showToast(`Active account: ${acc.global_name || acc.username}`, 'success');
          playAudioChime('start');
        } else {
          showToast(`Session for @${acc.username} has expired`, 'error');
        }
      });
    }

    const btnDel = card.querySelector(`[data-acc-del="${acc.id}"]`);
    if (btnDel) {
      btnDel.addEventListener('click', async () => {
        savedAccounts = await window.electronAPI.removeAccount(acc.id);
        renderAccountsDropdown();
        renderSavedAccountsHub();
        showToast(`Account @${acc.username} removed`, 'info');
      });
    }

    savedAccountsGrid.appendChild(card);
  });
}

function toggleDiscordProfilePopout() {
  if (!discordProfilePopout) return;
  const isShown = discordProfilePopout.style.display === 'block';
  discordProfilePopout.style.display = isShown ? 'none' : 'block';
  if (!isShown) renderAccountsDropdown();
}

if (btnUserPopout) {
  btnUserPopout.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentUser) {
      switchTab('tab-account');
    } else {
      toggleDiscordProfilePopout();
    }
  });
}

if (btnAccountSwitch) {
  btnAccountSwitch.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDiscordProfilePopout();
  });
}

if (btnClosePopout) {
  btnClosePopout.addEventListener('click', (e) => {
    e.stopPropagation();
    if (discordProfilePopout) discordProfilePopout.style.display = 'none';
  });
}

if (btnCopyUserIdPopout) {
  btnCopyUserIdPopout.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentUser) {
      navigator.clipboard.writeText(currentUser.id);
      showToast("User ID copied", 'success');
      playAudioChime('click');
    }
  });
}

if (btnCopyUserTokenPopout) {
  btnCopyUserTokenPopout.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentToken) {
      navigator.clipboard.writeText(currentToken);
      showToast("Token copied", 'success');
      playAudioChime('click');
    }
  });
}

if (btnPopoutManageAccounts) {
  btnPopoutManageAccounts.addEventListener('click', () => {
    if (discordProfilePopout) discordProfilePopout.style.display = 'none';
    switchTab('tab-account');
    if (accountsHubCard) accountsHubCard.scrollIntoView({ behavior: 'smooth' });
  });
}

if (btnPopoutLogout) {
  btnPopoutLogout.addEventListener('click', async () => {
    if (discordProfilePopout) discordProfilePopout.style.display = 'none';
    await window.electronAPI.clearToken();
    setUnauthenticatedUser();
    allQuests = [];
    selectedQuestIds.clear();
    updateStats();
    renderQuests();
    switchTab('tab-account');
    showToast("You have been logged out", 'info');
    playAudioChime('click');
  });
}

if (btnQuickLogout) {
  btnQuickLogout.addEventListener('click', async (e) => {
    e.stopPropagation();
    await window.electronAPI.clearToken();
    setUnauthenticatedUser();
    allQuests = [];
    selectedQuestIds.clear();
    updateStats();
    renderQuests();
    switchTab('tab-account');
    showToast("You have been logged out", 'info');
    playAudioChime('click');
  });
}

if (btnDropdownAddAccount) {
  btnDropdownAddAccount.addEventListener('click', () => {
    if (discordProfilePopout) discordProfilePopout.style.display = 'none';
    switchTab('tab-account');
    if (loginCard) loginCard.scrollIntoView({ behavior: 'smooth' });
  });
}

if (btnShowAddAccount) {
  btnShowAddAccount.addEventListener('click', () => {
    if (loginCard) loginCard.scrollIntoView({ behavior: 'smooth' });
    playAudioChime('click');
  });
}

document.addEventListener('click', (e) => {
  if (discordProfilePopout && !discordProfilePopout.contains(e.target) && !userPill.contains(e.target)) {
    discordProfilePopout.style.display = 'none';
  }
});

// ── Discord Snowflake Decoder ──
function getDiscordCreationDate(snowflakeId) {
  try {
    if (!snowflakeId) return '--';
    const timestamp = Number((BigInt(snowflakeId) >> 22n) + 1420070400000n);
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (_) {
    return '--';
  }
}

function updateAccountQuestsSummary() {
  if (!accountQuestsSummary) return;
  const eligible = allQuests.filter(q => !q.isCompleted && !q.isExpired);
  const completed = allQuests.filter(q => q.isCompleted);
  accountQuestsSummary.textContent = `${eligible.length} available / ${completed.length} completed`;
}

// ── Account & Auth Management ──
async function initAuth() {
  loadSavedCodes();
  await loadSavedAccounts();
  const config = await window.electronAPI.loadConfig();
  if (config.token) {
    addTerminalLog("Connecting with saved session…", 'info');
    const valRes = await window.electronAPI.validateToken(config.token);
    if (valRes.ok) {
      setAuthenticatedUser(valRes.user, config.token);
      loadQuests();
    } else {
      addTerminalLog("Saved session token has expired.", 'warn');
      setUnauthenticatedUser();
      switchTab('tab-account', true);
    }
  } else {
    setUnauthenticatedUser();
    switchTab('tab-account', true);
  }
}

async function setAuthenticatedUser(user, token) {
  currentUser = user;
  currentToken = token;

  const userAvatarUrl = user.avatar || '../assets/avatar-placeholder.svg';

  // Update Nav Pill
  navAvatar.src = userAvatarUrl;
  navUsername.textContent = user.global_name || user.username;
  navUsername.title = `${user.global_name || user.username} (@${user.username})`;
  navSubtext.textContent = `@${user.username}`;
  navStatusIndicator.classList.add('online');

  if (navNitroBadge) {
    navNitroBadge.style.display = (user.premium_type > 0) ? 'inline-block' : 'none';
  }
  if (btnQuickLogout) {
    btnQuickLogout.style.display = 'flex';
  }

  // Update Popout Card
  if (popoutAvatar) popoutAvatar.src = userAvatarUrl;
  if (popoutName) popoutName.textContent = user.global_name || user.username;
  if (popoutHandle) popoutHandle.textContent = `@${user.username}`;
  if (popoutCreatedDate) popoutCreatedDate.textContent = getDiscordCreationDate(user.id);
  if (popoutUserId) popoutUserId.textContent = user.id;
  if (popoutTokenMasked) {
    popoutTokenMasked.textContent = token ? (token.slice(0, 8) + '••••••••' + token.slice(-4)) : '••••••••';
  }
  if (popoutNitroText) {
    popoutNitroText.textContent = (user.premium_type === 2) ? 'Nitro Boost (Tier 2)' :
                                   (user.premium_type === 1) ? 'Nitro Classic' :
                                   (user.premium_type === 3) ? 'Nitro Basic' : 'Standard';
  }

  if (popoutBanner) {
    if (user.banner) {
      popoutBanner.style.backgroundImage = `url('${user.banner}')`;
    } else {
      popoutBanner.style.backgroundImage = 'linear-gradient(135deg, #4d425f, #302a3c)';
    }
  }

  // Badges: Decode User Flags
  const flags = user.flags || 0;
  const isBravery = (flags & (1 << 6)) !== 0;
  const isBrilliance = (flags & (1 << 7)) !== 0;
  const isBalance = (flags & (1 << 8)) !== 0;
  const isEarly = (flags & (1 << 9)) !== 0;
  const isActiveDev = (flags & (1 << 22)) !== 0 || (flags & (1 << 17)) !== 0;

  if (popoutBadgesShelf) {
    popoutBadgesShelf.innerHTML = '';
    if (user.premium_type > 0) {
      popoutBadgesShelf.innerHTML += `<span class="nitro-pill-badge" style="font-size: 10px; margin-right: 4px;">NITRO</span>`;
    }
    if (isBravery) popoutBadgesShelf.innerHTML += `<span class="badge-pill" title="HypeSquad Bravery" style="background:#9c84ef; color:#fff; font-size:9px; padding:2px 5px; border-radius:4px; font-weight:700; margin-right: 4px;">Bravery</span>`;
    if (isBrilliance) popoutBadgesShelf.innerHTML += `<span class="badge-pill" title="HypeSquad Brilliance" style="background:#f47b67; color:#fff; font-size:9px; padding:2px 5px; border-radius:4px; font-weight:700; margin-right: 4px;">Brilliance</span>`;
    if (isBalance) popoutBadgesShelf.innerHTML += `<span class="badge-pill" title="HypeSquad Balance" style="background:#45ddc0; color:#111; font-size:9px; padding:2px 5px; border-radius:4px; font-weight:700; margin-right: 4px;">Balance</span>`;
    if (isActiveDev) popoutBadgesShelf.innerHTML += `<span class="badge-pill" title="Active Developer" style="background:#5865f2; color:#fff; font-size:9px; padding:2px 5px; border-radius:4px; font-weight:700; margin-right: 4px;">Developer</span>`;
    if (isEarly) popoutBadgesShelf.innerHTML += `<span class="badge-pill" title="Early Supporter" style="background:#fee75c; color:#111; font-size:9px; padding:2px 5px; border-radius:4px; font-weight:700;">Supporter</span>`;
  }

  // Update Account Card Hero
  accountAvatar.src = userAvatarUrl;
  accountUsername.textContent = user.global_name || user.username;
  accountGlobalname.textContent = `@${user.username}`;
  accountId.textContent = user.id;

  // Banner
  if (accountBanner) {
    if (user.banner) {
      accountBanner.style.backgroundImage = `url('${user.banner}')`;
    } else {
      accountBanner.style.backgroundImage = 'linear-gradient(135deg, #51445e, #302a3c)';
    }
  }

  if (badgeNitro) badgeNitro.style.display = (user.premium_type > 0) ? 'inline-flex' : 'none';
  if (badgeMfa) badgeMfa.style.display = user.mfa_enabled ? 'inline-flex' : 'none';
  if (badgeVerified) badgeVerified.style.display = (user.email || user.phone) ? 'inline-flex' : 'none';
  if (badgeBravery) badgeBravery.style.display = isBravery ? 'inline-flex' : 'none';
  if (badgeBrilliance) badgeBrilliance.style.display = isBrilliance ? 'inline-flex' : 'none';
  if (badgeBalance) badgeBalance.style.display = isBalance ? 'inline-flex' : 'none';
  if (badgeDev) badgeDev.style.display = isActiveDev ? 'inline-flex' : 'none';
  if (badgeEarly) badgeEarly.style.display = isEarly ? 'inline-flex' : 'none';

  // Details Grid
  if (accountCreated) accountCreated.textContent = getDiscordCreationDate(user.id);
  if (accountNitroType) {
    accountNitroType.textContent = (user.premium_type === 2) ? 'Nitro Boost' :
                                   (user.premium_type === 1) ? 'Nitro Classic' :
                                   (user.premium_type === 3) ? 'Nitro Basic' : 'Standard';
  }
  updateAccountQuestsSummary();

  // Active Token Vault
  if (activeTokenField) {
    activeTokenField.value = token;
    activeTokenField.type = 'password';
  }
  if (btnToggleActiveTokenText) {
    btnToggleActiveTokenText.textContent = 'Show';
  }

  // Display Cards
  accountCardActive.style.display = 'block';
  if (accountsHubCard) accountsHubCard.style.display = 'block';
  loginCard.style.display = 'block';

  if (loginCardHeading) loginCardHeading.textContent = "Add Discord Account";
  if (loginCardDesc) loginCardDesc.textContent = "Connect another account to switch sessions seamlessly.";

  // Auto-save to saved accounts list
  const accountProfile = {
    id: user.id,
    username: user.username,
    global_name: user.global_name || user.username,
    avatar: user.avatar,
    token: token
  };
  savedAccounts = await window.electronAPI.saveAccount(accountProfile);
  renderAccountsDropdown();
  renderSavedAccountsHub();

  addTerminalLog(`Connected as @${user.username} (${user.id}).`, 'success');
}

function setUnauthenticatedUser() {
  currentUser = null;
  currentToken = null;

  navAvatar.src = '../assets/avatar-placeholder.svg';
  navUsername.textContent = 'Not Connected';
  navUsername.removeAttribute('title');
  navSubtext.textContent = 'Click to connect';
  navStatusIndicator.classList.remove('online');

  if (navNitroBadge) navNitroBadge.style.display = 'none';
  if (btnQuickLogout) btnQuickLogout.style.display = 'none';
  if (discordProfilePopout) discordProfilePopout.style.display = 'none';

  accountCardActive.style.display = 'none';
  if (accountsHubCard) accountsHubCard.style.display = savedAccounts.length > 0 ? 'block' : 'none';
  loginCard.style.display = 'block';

  renderQuests();
  updateStats();
  if (loginCardHeading) loginCardHeading.textContent = "Welcome to Orb Studio.";
  if (loginCardDesc) loginCardDesc.textContent = "Select how you would like to connect your Discord account.";
}

btnLogout.addEventListener('click', async () => {
  await window.electronAPI.clearToken();
  setUnauthenticatedUser();
  allQuests = [];
  selectedQuestIds.clear();
  updateStats();
  renderQuests();
  switchTab('tab-account');
  showToast("You have been logged out", 'info');
  playAudioChime('click');
});

btnCopyUserId.addEventListener('click', () => {
  if (currentUser) {
    navigator.clipboard.writeText(currentUser.id);
    showToast("User ID copied", 'info');
    playAudioChime('click');
  }
});

btnRefreshProfile.addEventListener('click', async () => {
  if (!currentToken) return;
  addTerminalLog("Refreshing account profile...", 'info');
  const valRes = await window.electronAPI.validateToken(currentToken);
  if (valRes.ok) {
    setAuthenticatedUser(valRes.user, currentToken);
    showToast("Profile refreshed", 'success');
    playAudioChime('click');
  } else {
    showToast("Session expired. Please reconnect your account.", 'error');
  }
});

if (btnToggleActiveToken && activeTokenField) {
  btnToggleActiveToken.addEventListener('click', () => {
    if (activeTokenField.type === 'password') {
      activeTokenField.type = 'text';
      if (btnToggleActiveTokenText) btnToggleActiveTokenText.textContent = 'Hide';
    } else {
      activeTokenField.type = 'password';
      if (btnToggleActiveTokenText) btnToggleActiveTokenText.textContent = 'Show';
    }
    playAudioChime('click');
  });
}

if (btnCopyActiveToken) {
  btnCopyActiveToken.addEventListener('click', () => {
    if (currentToken) {
      navigator.clipboard.writeText(currentToken);
      showToast("Token copied", 'success');
      playAudioChime('click');
    }
  });
}

// ── Login Tabs Navigation ──
loginTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    loginTabBtns.forEach(b => b.classList.remove('active'));
    loginTabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.loginTab).classList.add('active');

    if (btn.dataset.loginTab === 'tab-login-qr') {
      startQrFlow();
    } else {
      window.electronAPI.stopQR();
    }
    playAudioChime('click');
  });
});

// ── QR Code Flow ──
let qrCooldown = false;
let qrSessionActive = false;

function startQrFlow(forceRefresh = false) {
  if (!forceRefresh && qrSessionActive) return;
  if (qrCooldown) return;
  qrCooldown = true;
  setTimeout(() => { qrCooldown = false; }, 800);

  qrSessionActive = false;
  qrImage.style.display = 'none';
  qrPlaceholder.style.display = 'flex';
  if (qrExpiredOverlay) qrExpiredOverlay.style.display = 'none';
  if (qrScannedOverlay) qrScannedOverlay.style.display = 'none';
  qrStatusText.textContent = "Connecting to Discord…";
  window.electronAPI.startQR(forceRefresh);
}

btnRefreshQr.addEventListener('click', () => {
  playAudioChime('click');
  startQrFlow(true);
});

if (btnQrExpiredRefresh) {
  btnQrExpiredRefresh.addEventListener('click', (e) => {
    e.stopPropagation();
    playAudioChime('click');
    startQrFlow(true);
  });
}

window.electronAPI.onQR((dataUrl) => {
  qrSessionActive = true;
  qrImage.src = dataUrl;
  qrImage.style.display = 'block';
  qrPlaceholder.style.display = 'none';
  if (qrExpiredOverlay) qrExpiredOverlay.style.display = 'none';
  if (qrScannedOverlay) qrScannedOverlay.style.display = 'none';
});

window.electronAPI.onQRStatus((statusObj) => {
  let state = '';
  let text = '';
  if (typeof statusObj === 'string') {
    text = statusObj;
  } else if (statusObj && typeof statusObj === 'object') {
    state = statusObj.state || '';
    text = statusObj.message || statusObj.state || '';
  }

  if (qrStatusText && text) qrStatusText.textContent = text;

  if (state === 'expired' || state === 'closed' || state === 'cancelled') {
    qrSessionActive = false;
    qrPlaceholder.style.display = 'none';
    qrImage.style.display = 'none';
    if (qrExpiredOverlay) qrExpiredOverlay.style.display = 'flex';
    if (qrScannedOverlay) qrScannedOverlay.style.display = 'none';
  } else if (state === 'waiting_scan') {
    qrSessionActive = true;
    qrPlaceholder.style.display = 'none';
    if (qrExpiredOverlay) qrExpiredOverlay.style.display = 'none';
  }
});

window.electronAPI.onQRScanned((user) => {
  const uname = user?.username || 'User';
  if (qrStatusText) qrStatusText.innerHTML = `Code scanned by <b>@${escapeHtml(uname)}</b>. Approve login on your mobile device…`;
  showToast(`Code scanned by @${uname}`, 'info');

  if (qrScannedOverlay) {
    if (qrScannedAvatar) qrScannedAvatar.src = user?.avatarUrl || '../assets/avatar-placeholder.svg';
    if (qrScannedName) qrScannedName.textContent = `@${uname}`;
    qrScannedOverlay.style.display = 'flex';
  }
  if (qrExpiredOverlay) qrExpiredOverlay.style.display = 'none';
  playAudioChime('start');
});

window.electronAPI.onQRAuthenticated(async (payload) => {
  const token = typeof payload === 'string' ? payload : (payload?.token || '');
  if (!token) return;
  if (qrStatusText) qrStatusText.textContent = "Login successful. Loading profile…";
  if (qrScannedOverlay) qrScannedOverlay.style.display = 'none';
  if (qrExpiredOverlay) qrExpiredOverlay.style.display = 'none';

  await window.electronAPI.saveToken(token);
  const valRes = await window.electronAPI.validateToken(token);
  if (valRes.ok) {
    setAuthenticatedUser(valRes.user, token);
    loadQuests();
    switchTab('tab-quests');
    playAudioChime('success');
  } else {
    showToast(valRes.error || "Failed to validate session token.", "error");
  }
});

window.electronAPI.onQRError((err) => {
  qrSessionActive = false;
  let msg = '';
  if (typeof err === 'string') {
    msg = err;
  } else if (err && typeof err.message === 'string') {
    msg = err.message;
  } else if (err) {
    msg = JSON.stringify(err);
  }
  if (qrStatusText) qrStatusText.textContent = `Error: ${msg}. Click to retry.`;
  showToast(msg || "Mobile QR login failed.", "error");
  qrPlaceholder.style.display = 'none';
  qrImage.style.display = 'none';
  if (qrExpiredOverlay) qrExpiredOverlay.style.display = 'flex';
  if (qrScannedOverlay) qrScannedOverlay.style.display = 'none';
});

// ── Local Token Scanner ──
btnScanLocalTokens.addEventListener('click', async () => {
  localTokensContainer.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
  addTerminalLog("Scanning local sessions in Discord Desktop and web browsers...", 'info');

  const found = await window.electronAPI.scanLocalTokens();
  localTokensContainer.innerHTML = '';

  if (!found || found.length === 0) {
    localTokensContainer.innerHTML = '<p class="empty-hint">No local sessions detected. Use Mobile QR scan or paste your token manually.</p>';
    addTerminalLog("No local sessions detected.", 'warn');
    return;
  }

  addTerminalLog(`${found.length} account(s) detected on this PC.`, 'success');

  found.forEach(item => {
    const el = document.createElement('div');
    el.className = 'local-account-item';
    el.innerHTML = `
      <img class="local-account-avatar" src="${item.user.avatar}" alt="Avatar">
      <div class="local-account-info">
        <div class="local-account-name">${escapeHtml(item.user.global_name || item.user.username)}</div>
        <div class="local-account-id">@${escapeHtml(item.user.username)} · ID: ${item.user.id}</div>
      </div>
      <button class="btn btn-primary btn-sm">Use this Account</button>
    `;

    el.querySelector('button').addEventListener('click', async () => {
      await window.electronAPI.saveToken(item.token);
      setAuthenticatedUser(item.user, item.token);
      loadQuests();
      switchTab('tab-quests');
      playAudioChime('start');
    });

    localTokensContainer.appendChild(el);
  });
});

// ── Manual Token Input ──
btnToggleTokenEye.addEventListener('click', () => {
  manualTokenInput.type = manualTokenInput.type === 'password' ? 'text' : 'password';
});

btnSubmitToken.addEventListener('click', async () => {
  const token = manualTokenInput.value.trim();
  if (!token) {
    showToast("Please enter your token", "error");
    return;
  }

  btnSubmitToken.disabled = true;
  btnSubmitToken.textContent = "Verifying…";

  const valRes = await window.electronAPI.validateToken(token);
  btnSubmitToken.disabled = false;
  btnSubmitToken.textContent = "Log In";

  if (valRes.ok) {
    await window.electronAPI.saveToken(token);
    setAuthenticatedUser(valRes.user, token);
    manualTokenInput.value = '';
    loadQuests();
    switchTab('tab-quests');
    playAudioChime('start');
  } else {
    showToast("Token is invalid or rejected by Discord", "error");
    addTerminalLog("Invalid token.", "error");
  }
});

// ── Quests Fetching & Dashboard ──
async function loadQuests() {
  if (!currentToken) return;

  questsContainer.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Synchronizing your quests…</p>
    </div>
  `;

  try {
    const quests = await window.electronAPI.fetchQuests();
    allQuests = quests;

    // Check if any completed quest carries a claim code and save to vault
    allQuests.forEach(q => {
      if (q.claimCode) {
        saveClaimedCode({
          code: q.claimCode,
          questName: q.questName,
          gameTitle: q.gameTitle
        });
      }
    });

    // Retain selection of still-valid quests
    const validIds = new Set(allQuests.map(q => q.id));
    selectedQuestIds.forEach(id => {
      if (!validIds.has(id)) selectedQuestIds.delete(id);
    });

    updateStats();
    renderQuests();
    addTerminalLog(`${allQuests.length} quest(s) synchronized.`, 'info');
  } catch (err) {
    questsContainer.innerHTML = `
      <div class="empty-state">
        <p style="color: var(--ruby);">Quests could not be loaded: ${escapeHtml(err.message)}</p>
        <button class="btn btn-secondary" onclick="loadQuests()">Retry</button>
      </div>
    `;
    addTerminalLog(`Loading error: ${err.message}`, 'error');
  }
}

btnRefreshQuests.addEventListener('click', () => {
  playAudioChime('click');
  loadQuests();
});

function updateStats() {
  const total = allQuests.length;
  const completed = allQuests.filter(q => q.isCompleted).length;
  const eligible = allQuests.filter(q => !q.isCompleted && !q.isExpired);
  const unclaimed = allQuests.filter(q => q.isCompleted && !q.isClaimed);

  let totalRemainingSec = 0;
  eligible.forEach(q => {
    totalRemainingSec += q.remainingSeconds;
  });

  statTotal.textContent = eligible.length;
  statCompleted.textContent = completed;
  statTime.textContent = formatMinutes(totalRemainingSec);
  navQuestCount.textContent = eligible.length;

  if (pillCountRemaining) pillCountRemaining.textContent = eligible.length;
  if (pillCountAll) pillCountAll.textContent = total;
  if (pillCountCompleted) pillCountCompleted.textContent = completed;
  const pillCountClaimable = document.getElementById('pill-count-claimable');
  if (pillCountClaimable) pillCountClaimable.textContent = unclaimed.length;

  if (btnClaimAllCompleted && claimAllBtnLabel) {
    claimAllBtnLabel.textContent = `Claim (${unclaimed.length})`;
    btnClaimAllCompleted.disabled = unclaimed.length === 0 || isEngineRunning;
  }

  updateAccountQuestsSummary();
  updateStartButton();
}

function updateStartButton() {
  const count = selectedQuestIds.size;
  btnStartSelected.disabled = count === 0 || isEngineRunning;
  startBtnLabel.textContent = `Start (${count})`;

  const eligibleCount = allQuests.filter(q => !q.isCompleted && !q.isExpired).length;
  btnCompleteAll.disabled = eligibleCount === 0 || isEngineRunning;
}

// ── Search, Sorting & Filters ──
questSearchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value.toLowerCase().trim();
  renderQuests();
});

if (questSortSelect) {
  questSortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderQuests();
    playAudioChime('click');
  });
}

function setActiveFilter(filterName) {
  currentFilter = filterName;
  filterPills.forEach(p => {
    p.classList.toggle('active', p.dataset.filter === filterName);
  });
  renderQuests();
  updateStartButton();
  playAudioChime('click');
}

filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    setActiveFilter(pill.dataset.filter);
  });
});

if (statCardAvailable) {
  statCardAvailable.addEventListener('click', () => {
    setActiveFilter('remaining');
  });
}

if (statCardCompleted) {
  statCardCompleted.addEventListener('click', () => {
    setActiveFilter('completed');
  });
}

if (statCardVault) {
  statCardVault.addEventListener('click', () => {
    openVaultModal();
  });
}

btnSelectAll.addEventListener('click', () => {
  getFilteredQuests().forEach(q => {
    if (!q.isCompleted && !q.isExpired) selectedQuestIds.add(q.id);
  });
  renderQuests();
  updateStartButton();
  playAudioChime('click');
});

btnDeselectAll.addEventListener('click', () => {
  selectedQuestIds.clear();
  renderQuests();
  updateStartButton();
  playAudioChime('click');
});

function getFilteredQuests() {
  let list = allQuests.filter(q => {
    if (currentSearch) {
      const matchName = (q.questName || '').toLowerCase().includes(currentSearch);
      const matchGame = (q.gameTitle || '').toLowerCase().includes(currentSearch);
      if (!matchName && !matchGame) return false;
    }

    if (currentFilter === 'remaining') return !q.isCompleted && !q.isExpired;
    if (currentFilter === 'VIDEO') return q.taskType === 'VIDEO';
    if (currentFilter === 'GAME') return q.taskType === 'GAME';
    if (currentFilter === 'ACTIVITY') return q.taskType === 'ACTIVITY' || q.taskType === 'STREAM';
    if (currentFilter === 'claimable') return q.isCompleted && !q.isClaimed;
    if (currentFilter === 'completed') return q.isCompleted;

    return true;
  });

  // Apply sorting
  if (currentSort === 'urgent') {
    list.sort((a, b) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity));
  } else if (currentSort === 'shortest') {
    list.sort((a, b) => a.remainingSeconds - b.remainingSeconds);
  } else if (currentSort === 'longest') {
    list.sort((a, b) => b.remainingSeconds - a.remainingSeconds);
  } else if (currentSort === 'name') {
    list.sort((a, b) => (a.questName || '').localeCompare(b.questName || ''));
  }

  return list;
}

function renderQuests() {
  const filtered = getFilteredQuests();
  questsContainer.innerHTML = '';

  if (filtered.length === 0) {
    if (!currentUser && allQuests.length === 0) {
      questsContainer.innerHTML = `<div class="state-card"><svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-30 12 12)"/></svg><h3>Your next reward is waiting.</h3><p class="state-copy">Connect your Discord account to view available quests in your studio.</p><button class="btn btn-primary" id="btn-empty-connect">Connect Account</button></div>`;
      document.getElementById('btn-empty-connect').addEventListener('click', () => switchTab('tab-account'));
      return;
    }
    const completedCount = allQuests.filter(q => q.isCompleted).length;
    const vaultCount = savedClaimedCodes ? savedClaimedCodes.length : 0;

    if (allQuests.length > 0 && currentFilter === 'remaining') {
      questsContainer.innerHTML = `
        <div class="all-completed-celebration">
          <div class="celebration-icon">✓</div>
          <h3 class="celebration-title">All Quests Completed!</h3>
          <p class="celebration-desc">You have completed all available quests. View your history or check out your reward codes in the vault.</p>
          <div class="celebration-actions">
            <button class="btn btn-primary" id="btn-celebrate-view-completed">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>View Completed Quests (${completedCount})</span>
            </button>
            <button class="btn btn-secondary" id="btn-celebrate-view-vault">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Open Rewards Vault (${vaultCount})</span>
            </button>
            <button class="btn btn-secondary" id="btn-celebrate-refresh">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-celebrate-view-completed')?.addEventListener('click', () => {
        setActiveFilter('completed');
      });
      document.getElementById('btn-celebrate-view-vault')?.addEventListener('click', () => {
        switchTab('tab-vault');
      });
      document.getElementById('btn-celebrate-refresh')?.addEventListener('click', () => {
        loadQuests();
      });
      return;
    }

    questsContainer.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
        <p>No quests found. Try a different filter or refresh the list.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(q => {
    const isSelected = selectedQuestIds.has(q.id);
    const card = document.createElement('div');
    card.className = `quest-card ${isSelected ? 'selected' : ''} ${q.isCompleted ? 'completed' : ''}`;
    card.dataset.questId = q.id;

    const bannerBg = q.iconUrl ? `style="background-image: url('${q.iconUrl}')"` : '';
    let badgeClass = 'badge-game';
    let badgeText = q.taskLabel;

    if (q.taskType === 'VIDEO') {
      badgeClass = 'badge-video';
    } else if (q.taskType === 'ACTIVITY') {
      badgeClass = 'badge-activity';
    } else if (q.taskType === 'STREAM') {
      badgeClass = 'badge-stream';
    } else if (q.rewardType === 'DECORATION') {
      badgeClass = 'badge-decoration';
    }

    // Expiration calculation
    let expText = "";
    if (q.expiresAt) {
      const diff = q.expiresAt - Date.now();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        expText = days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
      } else {
        expText = `Expired`;
      }
    }

    // Reward type tag
    let rTagClass = 'reward-tag-orbs';
    let rTagText = 'Orbs';
    if (q.rewardType === 'DECORATION') {
      rTagClass = 'reward-tag-decoration';
      rTagText = 'Decoration';
    } else if (q.rewardType === 'NITRO') {
      rTagClass = 'reward-tag-nitro';
      rTagText = 'Nitro';
    } else if (q.rewardType === 'CODE') {
      rTagClass = 'reward-tag-code';
      rTagText = 'Game Code';
    }

    card.innerHTML = `
      <div class="quest-card-banner">
        ${q.iconUrl ? `<img class="quest-banner-img" src="${escapeHtml(q.iconUrl)}" alt="${escapeHtml(q.questName)}" loading="lazy" onerror="this.style.display='none'; const wm = this.parentElement.querySelector('.banner-watermark'); if (wm) wm.style.display='flex';">` : ''}
        <div class="banner-watermark" style="${q.iconUrl ? 'display: none;' : ''}">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <rect x="2" y="6" width="20" height="12" rx="4"/>
            <path d="M6 12h4m-2-2v4m9-2h.01m3 0h.01"/>
          </svg>
        </div>
        <div class="quest-banner-overlay"></div>
        ${q.logoUrl ? `<img class="quest-logo-img" src="${escapeHtml(q.logoUrl)}" alt="${escapeHtml(q.gameTitle)}" loading="lazy">` : ''}
        <div class="quest-badge-type ${badgeClass}">
          <span class="badge-dot"></span>
          <span>${escapeHtml(badgeText)}</span>
        </div>
        <div class="quest-card-checkbox">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>

      <div class="quest-card-body">
        <h4 class="quest-title" title="${escapeHtml(q.questName)}">${escapeHtml(q.questName)}</h4>
        <span class="quest-game-name">${escapeHtml(q.gameTitle)}</span>

        <div class="quest-reward-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(q.rewardName)}</span>
          <span class="reward-type-tag ${rTagClass}">${rTagText}</span>
        </div>

        <div class="quest-progress-wrap">
          <div class="quest-progress-header">
            <span>${q.isCompleted ? 'Completed' : `${formatSeconds(q.remainingSeconds)} left`}</span>
            <span>${q.percentage}%</span>
          </div>
          <div class="quest-progress-bar">
            <div class="quest-progress-fill" style="width: ${q.percentage}%;"></div>
          </div>
        </div>

        <div class="card-footer-actions">
          <div class="quest-expires-tag">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${expText}</span>
          </div>
          <div class="quest-card-actions">
            ${!q.isCompleted && !q.isExpired ? `<button class="btn-card-run" data-run-id="${q.id}"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>Start</button>` : ''}
            ${q.isCompleted && !q.isClaimed ? `<button class="btn-card-claim" data-claim-id="${q.id}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/></svg>Claim</button>` : ''}
            ${q.isCompleted && q.claimCode ? `<button class="btn-card-claim"  data-code-id="${q.id}">Code</button>` : ''}
            <button class="btn-card-details" data-details-id="${q.id}">Details</button>
            <button class="btn-card-details" data-discord-id="${q.id}" title="Open in Discord App">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z"/></svg>
              <span>Discord</span>
            </button>
          </div>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-footer-actions')) return;
      if (q.isCompleted) return;
      if (selectedQuestIds.has(q.id)) {
        selectedQuestIds.delete(q.id);
        card.classList.remove('selected');
      } else {
        selectedQuestIds.add(q.id);
        card.classList.add('selected');
      }
      playAudioChime('click');
      updateStartButton();
    });

    const btnDiscord = card.querySelector(`[data-discord-id="${q.id}"]`);
    if (btnDiscord) {
      btnDiscord.addEventListener('click', (e) => {
        e.stopPropagation();
        window.electronAPI.openExternal(`https://discord.com/quests/${q.id}`);
      });
    }

    const btnRun = card.querySelector(`[data-run-id="${q.id}"]`);
    if (btnRun) {
      btnRun.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isEngineRunning) {
          showToast("A session is already running.", "warn");
          return;
        }
        selectedQuestIds.clear();
        selectedQuestIds.add(q.id);
        renderQuests();
        updateStartButton();
        btnStartSelected.click();
      });
    }

    const btnDetails = card.querySelector(`[data-details-id="${q.id}"]`);
    if (btnDetails) {
      btnDetails.addEventListener('click', (e) => {
        e.stopPropagation();
        openQuestModal(q);
      });
    }

    const btnClaim = card.querySelector(`[data-claim-id="${q.id}"]`);
    if (btnClaim) {
      btnClaim.addEventListener('click', async (e) => {
        e.stopPropagation();
        await triggerSingleClaim(q);
      });
    }

    const btnCode = card.querySelector(`[data-code-id="${q.id}"]`);
    if (btnCode) {
      btnCode.addEventListener('click', (e) => {
        e.stopPropagation();
        openQuestModal(q);
      });
    }

    questsContainer.appendChild(card);
  });
}

// ── Quest Details & Promo Code Modal ──
function openQuestModal(q) {
  activeModalQuest = q;
  modalQuestTitle.textContent = q.questName;
  modalQuestSub.textContent = `${q.gameTitle} • Application ID: ${q.applicationId || 'N/A'}`;
  modalTaskBadge.textContent = q.taskLabel;

  if (q.iconUrl) {
    modalHero.style.backgroundImage = `linear-gradient(180deg, rgba(23, 23, 25, 0.08), rgba(23, 23, 25, 0.65)), url('${q.iconUrl}')`;
  } else {
    modalHero.style.backgroundImage = `linear-gradient(135deg, #393341, #242427)`;
  }

  modalTargetTime.textContent = formatMinutes(q.targetSeconds);
  modalProgressPct.textContent = `${q.percentage}% (${q.currentSeconds}s / ${q.targetSeconds}s)`;
  modalAppId.textContent = q.applicationId || '0';

  if (q.expiresAt) {
    const diff = q.expiresAt - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    modalExpiration.textContent = days > 0 ? `${days} days remaining` : `Expires soon`;
  } else {
    modalExpiration.textContent = "No expiration";
  }

  if (q.claimCode) {
    modalPromoBox.style.display = 'block';
    modalPromoCode.value = q.claimCode;
  } else {
    modalPromoBox.style.display = 'none';
  }

  if (q.isCompleted && !q.isClaimed) {
    btnModalClaim.style.display = 'inline-flex';
  } else {
    btnModalClaim.style.display = 'none';
  }

  questModal.style.display = 'flex';
  playAudioChime('click');
}

function closeQuestModal() {
  questModal.style.display = 'none';
  activeModalQuest = null;
}

btnCloseQuestModal.addEventListener('click', closeQuestModal);
btnCloseQuestModalBottom.addEventListener('click', closeQuestModal);
questModal.addEventListener('click', (e) => {
  if (e.target === questModal) closeQuestModal();
});

btnCopyPromoCode.addEventListener('click', () => {
  if (modalPromoCode.value) {
    navigator.clipboard.writeText(modalPromoCode.value);
    showToast("Reward code copied to clipboard", "success");
    playAudioChime('click');
  }
});

btnCopyQuestId.addEventListener('click', () => {
  if (activeModalQuest) {
    navigator.clipboard.writeText(activeModalQuest.id);
    showToast("Quest ID copied to clipboard", "info");
    playAudioChime('click');
  }
});

btnModalClaim.addEventListener('click', async () => {
  if (activeModalQuest) {
    await triggerSingleClaim(activeModalQuest);
    if (activeModalQuest.claimCode) {
      modalPromoBox.style.display = 'block';
      modalPromoCode.value = activeModalQuest.claimCode;
      btnModalClaim.style.display = 'none';
    }
  }
});

async function triggerSingleClaim(quest) {
  showToast(`Claiming reward for ${quest.questName}...`, 'info');
  addTerminalLog(`Claiming reward for "${quest.questName}"...`, 'info');

  const res = await window.electronAPI.claimSingleQuest(quest);
  if (res && res.ok) {
    quest.isClaimed = true;
    if (res.code) {
      quest.claimCode = res.code;
      saveClaimedCode({
        code: res.code,
        questName: quest.questName,
        gameTitle: quest.gameTitle
      });
      showToast(`Promo code unlocked: ${res.code}`, 'success');
      playAudioChime('success');
      openQuestModal(quest);
    } else {
      showToast(`Reward successfully credited to your Discord account!`, 'success');
      playAudioChime('success');
    }
    renderQuests();
    updateStats();
  } else if (res && res.captchaRequired) {
    showToast("Discord captcha required. Click 'Discord' to claim.", 'warn');
    addTerminalLog(`Discord captcha required for "${quest.questName}". Can be claimed directly in Discord > User Settings > Gift Inventory.`, 'warn');
    window.electronAPI.openExternal(`https://discord.com/quests/${quest.id}`);
  } else {
    showToast(`Claim: ${res?.message || 'Check on Discord'}`, 'warn');
  }
}

// ── Batch "Claim All" Action ──
if (btnClaimAllCompleted) {
  btnClaimAllCompleted.addEventListener('click', async () => {
    const unclaimed = allQuests.filter(q => q.isCompleted && !q.isClaimed);
    if (unclaimed.length === 0) return;

    btnClaimAllCompleted.disabled = true;
    showToast(`Claiming ${unclaimed.length} reward(s)…`, 'info');
    addTerminalLog(`Claiming batch rewards for ${unclaimed.length} quest(s)...`, 'info');

    const resList = await window.electronAPI.claimAllQuests(unclaimed);
    let successCount = 0;
    resList.forEach(({ quest, res }) => {
      if (res && res.ok) {
        successCount++;
        quest.isClaimed = true;
        if (res.code) {
          quest.claimCode = res.code;
          saveClaimedCode({
            code: res.code,
            questName: quest.questName,
            gameTitle: quest.gameTitle
          });
        }
      }
    });

    renderQuests();
    updateStats();
    showToast(`Successfully claimed ${successCount} of ${unclaimed.length} reward(s)`, 'success');
    playAudioChime('success');
    if (savedClaimedCodes.length > 0) openVaultModal();
  });
}

// ── Reward Vault & Code Locker ──
async function loadSavedCodes() {
  try {
    const diskCodes = await window.electronAPI.getVaultCodes();
    if (Array.isArray(diskCodes) && diskCodes.length > 0) {
      savedClaimedCodes = diskCodes;
    } else {
      const raw = localStorage.getItem('orb_claimed_codes');
      savedClaimedCodes = raw ? JSON.parse(raw) : [];
    }
  } catch (_) {
    savedClaimedCodes = [];
  }
  updateVaultBadge();
  renderVaultPage();
  renderVaultItems();
}

async function saveClaimedCode(entry) {
  if (!entry || !entry.code) return;
  const exists = savedClaimedCodes.some(c => c.code === entry.code);
  if (!exists) {
    const codeObj = {
      id: entry.id || String(Date.now()),
      code: entry.code,
      questName: entry.questName || entry.rewardName || 'Discord Quest',
      gameTitle: entry.gameTitle || 'Discord Game',
      rewardName: entry.rewardName || 'Reward',
      rewardType: entry.rewardType || 'PROMO',
      claimedAt: new Date().toISOString(),
      date: new Date().toLocaleDateString()
    };
    savedClaimedCodes.unshift(codeObj);
    try {
      localStorage.setItem('orb_claimed_codes', JSON.stringify(savedClaimedCodes));
      await window.electronAPI.saveVaultCode(codeObj);
    } catch (_) {}
    updateVaultBadge();
    renderVaultPage();
    renderVaultItems();
  }
}

function updateVaultBadge() {
  const count = savedClaimedCodes ? savedClaimedCodes.length : 0;
  if (titleVaultBadge) titleVaultBadge.textContent = count;
  if (vaultTotalCodes) vaultTotalCodes.textContent = count;
  if (navVaultCount) navVaultCount.textContent = count;
  if (vaultStatTotal) vaultStatTotal.textContent = count;
  if (vaultStatReady) vaultStatReady.textContent = count;
}

function renderVaultPage() {
  if (!vaultPageItems) return;
  const searchTerm = vaultSearchInput ? vaultSearchInput.value.toLowerCase().trim() : '';

  let list = savedClaimedCodes || [];
  if (searchTerm) {
    list = list.filter(c => 
      (c.questName && c.questName.toLowerCase().includes(searchTerm)) ||
      (c.gameTitle && c.gameTitle.toLowerCase().includes(searchTerm)) ||
      (c.code && c.code.toLowerCase().includes(searchTerm))
    );
  }

  updateVaultBadge();
  vaultPageItems.innerHTML = '';

  if (list.length === 0) {
    vaultPageItems.innerHTML = `
      <div class="state-card">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom: 12px;"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
        <h3>Your collection starts here.</h3>
        <p class="state-copy">Codes, gifts, and rewards from completed quests will be collected here.</p>
      </div>
    `;
    return;
  }

  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'vault-card';
    card.innerHTML = `
      <div class="vault-card-top">
        <div class="vault-card-game-wrap">
          <div class="vault-card-titles">
            <div class="vault-card-title">${escapeHtml(item.questName || 'Discord Quest')}</div>
            <div class="vault-card-game">${escapeHtml(item.gameTitle || 'Discord Game')}</div>
          </div>
        </div>
        <span class="vault-card-badge">${escapeHtml(item.rewardType || 'PROMO')}</span>
      </div>

      <div class="vault-code-box">
        <span class="vault-code-string" title="Click to copy">${escapeHtml(item.code)}</span>
        <button class="btn-code-copy" data-copy-code="${escapeHtml(item.code)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>Copy</span>
        </button>
      </div>

      <div class="vault-card-footer">
        <span>Claimed on ${item.claimedAt ? new Date(item.claimedAt).toLocaleDateString() : (item.date || 'Recently')}</span>
        <div class="vault-card-btns">
          <button class="btn-vault-redeem" data-redeem-code="${escapeHtml(item.code)}">Redeem</button>
          <button class="btn-vault-del" data-del-id="${item.id || item.code}" title="Remove this code">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </div>
      </div>
    `;

    const copyBtn = card.querySelector('[data-copy-code]');
    const codeString = card.querySelector('.vault-code-string');
    const copyHandler = () => {
      navigator.clipboard.writeText(item.code);
      showToast(`Code copied: ${item.code}`, 'success');
      playAudioChime('click');
      if (copyBtn) {
        copyBtn.querySelector('span').textContent = 'Copied';
        setTimeout(() => { if (copyBtn) copyBtn.querySelector('span').textContent = 'Copy'; }, 1500);
      }
    };
    if (copyBtn) copyBtn.addEventListener('click', copyHandler);
    if (codeString) codeString.addEventListener('click', copyHandler);

    const redeemBtn = card.querySelector('[data-redeem-code]');
    if (redeemBtn) {
      redeemBtn.addEventListener('click', () => {
        const promoCode = encodeURIComponent(item.code.trim());
        window.electronAPI.openExternal(`https://discord.com/billing/promotions/${promoCode}`);
      });
    }

    const delBtn = card.querySelector('[data-del-id]');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        savedClaimedCodes = savedClaimedCodes.filter(c => (c.id !== item.id && c.code !== item.code));
        await window.electronAPI.removeVaultCode(item.id || item.code);
        try { localStorage.setItem('orb_claimed_codes', JSON.stringify(savedClaimedCodes)); } catch (_) {}
        updateVaultBadge();
        renderVaultPage();
        renderVaultItems();
        showToast("Code removed from vault", "info");
      });
    }

    vaultPageItems.appendChild(card);
  });
}

if (vaultSearchInput) {
  vaultSearchInput.addEventListener('input', () => {
    renderVaultPage();
  });
}

if (btnVaultExportTxt) {
  btnVaultExportTxt.addEventListener('click', async () => {
    if (!savedClaimedCodes || savedClaimedCodes.length === 0) {
      showToast("Your vault is empty.", "info");
      return;
    }
    const lines = [
      "-------------------------------------------------------",
      "  DISCORD ORB STUDIO — REWARD VAULT CODES EXPORT",
      `  Export Date: ${new Date().toISOString()}`,
      `  Total Codes: ${savedClaimedCodes.length}`,
      "-------------------------------------------------------",
      "",
      ...savedClaimedCodes.map((c, i) => `[${i + 1}] ${c.questName || 'Quest'} (${c.gameTitle || 'Game'})\n    Code: ${c.code}\n    Date: ${c.claimedAt || c.date || 'N/A'}\n`)
    ].join("\r\n");

    const res = await window.electronAPI.exportLogs(lines);
    if (res && res.ok) {
      showToast(`Export saved: ${res.filePath}`, "success");
      playAudioChime('click');
    }
  });
}

if (btnVaultCopyAllPage) {
  btnVaultCopyAllPage.addEventListener('click', () => {
    if (!savedClaimedCodes || savedClaimedCodes.length === 0) {
      showToast("Your vault is empty.", "info");
      return;
    }
    const txt = savedClaimedCodes.map(c => `${c.questName || 'Quest'}: ${c.code}`).join("\n");
    navigator.clipboard.writeText(txt);
    showToast(`${savedClaimedCodes.length} codes copied`, "success");
    playAudioChime('click');
  });
}

if (btnVaultClearAll) {
  btnVaultClearAll.addEventListener('click', async () => {
    if (!savedClaimedCodes || savedClaimedCodes.length === 0) return;
    if (await window.confirmVaultClear()) {
      savedClaimedCodes = [];
      await window.electronAPI.clearVaultCodes();
      try { localStorage.removeItem('orb_claimed_codes'); } catch (_) {}
      updateVaultBadge();
      renderVaultPage();
      renderVaultItems();
      showToast("Vault cleared.", "info");
    }
  });
}

if (btnVaultOpenDiscordPage) {
  btnVaultOpenDiscordPage.addEventListener('click', () => {
    window.electronAPI.openExternal("https://discord.com/billing/promotions");
  });
}

function openVaultModal() {
  switchTab('tab-vault');
}

function closeVaultModal() {
  if (!vaultModal) return;
  vaultModal.style.display = 'none';
}

function renderVaultItems() {
  if (!vaultItemsContainer) return;
  vaultItemsContainer.innerHTML = '';

  if (!savedClaimedCodes || savedClaimedCodes.length === 0) {
    vaultItemsContainer.innerHTML = `
      <div class="empty-state" style="padding: 30px;">
        <p style="color: var(--text-muted);">Reward codes from your next quests will appear here.</p>
      </div>
    `;
    return;
  }

  savedClaimedCodes.forEach(item => {
    const row = document.createElement('div');
    row.className = 'vault-item-row';
    row.innerHTML = `
      <div class="vault-item-info">
        <span class="vault-item-name">${escapeHtml(item.questName)}</span>
        <span class="vault-item-game">${escapeHtml(item.gameTitle)} · ${item.date || ''}</span>
      </div>
      <div class="vault-item-code-wrap">
        <span class="vault-code-text">${escapeHtml(item.code)}</span>
        <button class="btn btn-secondary btn-sm" data-copy-code="${escapeHtml(item.code)}">Copy</button>
      </div>
    `;

    row.querySelector('[data-copy-code]').addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(item.code);
      showToast(`Code copied: ${item.code}`, 'success');
      playAudioChime('click');
    });

    vaultItemsContainer.appendChild(row);
  });
}

if (btnQuickVault) btnQuickVault.addEventListener('click', openVaultModal);
if (statCardVault) statCardVault.addEventListener('click', openVaultModal);
if (btnCloseVaultModal) btnCloseVaultModal.addEventListener('click', closeVaultModal);
if (btnCloseVaultBottom) btnCloseVaultBottom.addEventListener('click', closeVaultModal);
if (vaultModal) {
  vaultModal.addEventListener('click', (e) => {
    if (e.target === vaultModal) closeVaultModal();
  });
}

if (btnVaultCopyAll) {
  btnVaultCopyAll.addEventListener('click', () => {
    if (!savedClaimedCodes || savedClaimedCodes.length === 0) {
      showToast("No codes to copy.", 'info');
      return;
    }
    const txt = savedClaimedCodes.map(c => `${c.questName} (${c.gameTitle}): ${c.code}`).join("\n");
    navigator.clipboard.writeText(txt);
    showToast(`${savedClaimedCodes.length} code(s) copied`, 'success');
    playAudioChime('click');
  });
}

if (btnVaultOpenDiscord) {
  btnVaultOpenDiscord.addEventListener('click', () => {
    window.electronAPI.openExternal('https://discord.com/channels/@me');
  });
}

// ── One-Click "Complete All" Action ──
btnCompleteAll.addEventListener('click', async () => {
  if (isEngineRunning) {
    showToast("A session is already running.", "warn");
    return;
  }
  const incompleteQuests = allQuests.filter(q => !q.isCompleted && !q.isExpired);
  if (incompleteQuests.length === 0) {
    showToast("All your available quests are completed.", "info");
    return;
  }

  selectedQuestIds.clear();
  incompleteQuests.forEach(q => selectedQuestIds.add(q.id));
  renderQuests();
  updateStartButton();

  playAudioChime('start');
  showToast(`Starting ${incompleteQuests.length} quest(s)…`, "info");

  switchTab('tab-live');
  btnStartSelected.click();
});

// ── Launching Engine & Telemetry ──
btnStartSelected.addEventListener('click', async () => {
  if (isEngineRunning) {
    showToast("A session is already running.", "warn");
    return;
  }
  const toRun = allQuests.filter(q => selectedQuestIds.has(q.id));
  if (toRun.length === 0) return;

  isEngineRunning = true;
  totalPacketsSent = 0;
  totalErrorsEncountered = 0;
  startSessionTimer();

  liveOrb.classList.add('active');
  liveEngineStatus.classList.add('running');
  liveEngineStatus.textContent = "Running";
  btnStopEngine.disabled = false;
  liveIndicatorDot.classList.add('active');

  if (titleEnginePill) {
    titleEnginePill.classList.add('running');
    titlePillText.textContent = `Running (${toRun.length})`;
  }
  document.body.classList.add('engine-active');

  metricCurrentIdx.textContent = `0/${toRun.length}`;
  metricHeartbeats.textContent = '0';
  if (metricLatency) metricLatency.textContent = '-- ms';
  if (metricSuccessRate) metricSuccessRate.textContent = '100%';

  switchTab('tab-live');
  updateStartButton();

  playAudioChime('start');
  addTerminalLog(`Launching autonomous engine for ${toRun.length} quest(s)...`, 'info');
  await window.electronAPI.startQuests(toRun);
});

btnStopEngine.addEventListener('click', async () => {
  btnStopEngine.disabled = true;
  if (btnPauseEngine) btnPauseEngine.disabled = true;
  addTerminalLog("Engine stop requested...", 'warn');
  await window.electronAPI.stopQuests();
});

if (btnPauseEngine) {
  btnPauseEngine.addEventListener('click', async () => {
    if (!isEngineRunning) return;
    if (isEnginePaused) {
      await window.electronAPI.resumeQuests();
    } else {
      await window.electronAPI.pauseQuests();
    }
    playAudioChime('click');
  });
}

if (btnJumpQuests) {
  btnJumpQuests.addEventListener('click', () => switchTab('tab-quests'));
}

// ── Session Timer Stopwatch ──
function startSessionTimer() {
  stopSessionTimer();
  sessionStartTime = Date.now();
  sessionTimerInterval = setInterval(() => {
    if (!sessionStartTime) return;
    const elapsedSec = Math.floor((Date.now() - sessionStartTime) / 1000);
    const m = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const s = (elapsedSec % 60).toString().padStart(2, '0');
    metricElapsed.textContent = `${m}:${s}`;
  }, 1000);
}

function stopSessionTimer() {
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
  }
}

// ── Execution Mode Controls ──
if (modeBtnStealth && modeBtnTurbo) {
  modeBtnStealth.addEventListener('click', () => {
    modeBtnStealth.classList.add('active');
    modeBtnTurbo.classList.remove('active');
    window.electronAPI.updateSettings({ executionMode: 'stealth' });
    showToast("Stealth mode active", 'info');
    playAudioChime('click');
  });

  modeBtnTurbo.addEventListener('click', () => {
    modeBtnTurbo.classList.add('active');
    modeBtnStealth.classList.remove('active');
    window.electronAPI.updateSettings({ executionMode: 'turbo' });
    showToast("Turbo mode active", 'warn');
    playAudioChime('click');
  });
}

// ── Skip Active Quest Handler ──
if (btnSkipEngine) {
  btnSkipEngine.addEventListener('click', async () => {
    if (!isEngineRunning) return;
    playAudioChime('click');
    addTerminalLog("Manual skip requested for active quest...", 'warn');
    await window.electronAPI.skipQuest();
  });
}

if (window.electronAPI.onEngineQuestSkipped) {
  window.electronAPI.onEngineQuestSkipped((data) => {
    showToast(`Quest skipped: ${data.quest?.questName || 'Active'}`, 'warn');
    addTerminalLog(`Quest skipped: ${data.quest?.questName}`, 'warn');
    playAudioChime('click');
  });
}

// ── Quest Engine IPC Event Listeners ──
window.electronAPI.onEngineLog((evt) => {
  addTerminalLog(evt.message, evt.type);
});

window.electronAPI.onEngineQuestStart((data) => {
  liveCurrentTitle.textContent = data.quest.questName;
  liveCurrentSub.textContent = `${data.quest.gameTitle} • ${data.quest.taskLabel}`;
  metricCurrentIdx.textContent = `${data.index + 1}/${data.total}`;
  liveProgressBar.style.width = `${data.quest.percentage}%`;
  liveProgressPct.textContent = `${data.quest.percentage}%`;
  liveProgressSec.textContent = `${data.quest.currentSeconds}s / ${data.quest.targetSeconds}s`;

  if (titleEnginePill) {
    titlePillText.textContent = `Quest ${data.index + 1}/${data.total}`;
  }

  if (btnSkipEngine) btnSkipEngine.disabled = false;
  if (rpcSimGame) rpcSimGame.textContent = `${data.quest.gameTitle.toUpperCase()}`;
  if (rpcSimAppId) rpcSimAppId.textContent = data.quest.applicationId || 'N/A';
  if (rpcSimType) rpcSimType.textContent = `${data.quest.taskLabel.toUpperCase()}`;
  if (rpcSimNextHb) rpcSimNextHb.textContent = (data.quest.taskType === 'VIDEO') ? '~7s' : '~28s';
});

window.electronAPI.onEngineProgress((data) => {
  totalPacketsSent++;
  metricHeartbeats.textContent = totalPacketsSent;

  if (radarPulseDot) {
    radarPulseDot.style.animation = 'none';
    void radarPulseDot.offsetWidth;
    radarPulseDot.style.animation = 'radarPulse 0.8s ease-out';
  }

  if (rpcSimNextHb) {
    const nextSec = data.type === 'video' ? '7s' : '28s';
    rpcSimNextHb.textContent = `~${nextSec} (±jitter)`;
  }

  if (data.latencyMs && metricLatency) {
    metricLatency.textContent = `${data.latencyMs} ms`;
    if (data.latencyMs < 80) metricLatency.style.color = 'var(--emerald)';
    else if (data.latencyMs < 180) metricLatency.style.color = 'var(--amber)';
    else metricLatency.style.color = 'var(--ruby)';
  }

  if (metricSuccessRate) {
    const rate = Math.round(((totalPacketsSent - totalErrorsEncountered) / totalPacketsSent) * 100);
    metricSuccessRate.textContent = `${Math.max(0, rate)}%`;
  }

  liveProgressBar.style.width = `${data.pct}%`;
  liveProgressPct.textContent = `${data.pct}%`;
  liveProgressSec.textContent = `${data.current}s / ${data.target}s`;

  const remainingSec = Math.max(0, data.target - data.current);
  metricEta.textContent = formatSeconds(remainingSec);

  const card = document.querySelector(`.quest-card[data-quest-id="${data.quest.id}"]`);
  if (card) {
    const fill = card.querySelector('.quest-progress-fill');
    const header = card.querySelector('.quest-progress-header span:first-child');
    const pctSpan = card.querySelector('.quest-progress-header span:last-child');
    if (fill) fill.style.width = `${data.pct}%`;
    if (header) header.textContent = `${formatSeconds(remainingSec)} remaining`;
    if (pctSpan) pctSpan.textContent = `${data.pct}%`;
  }
});

window.electronAPI.onEngineQuestComplete((data) => {
  showToast(`Quest completed: ${data.quest.questName}`, 'success');
  playAudioChime('success');

  data.quest.isCompleted = true;
  data.quest.percentage = 100;
  selectedQuestIds.delete(data.quest.id);
  updateStats();
  updateStartButton();
  renderQuests();

  if (settingDesktopNotify && settingDesktopNotify.checked) {
    window.electronAPI.notifyDesktop({
      title: "Discord Quest Completed!",
      body: `"${data.quest.questName}" was completed successfully.`
    });
  }
});

window.electronAPI.onEngineQuestFail((data) => {
  totalErrorsEncountered++;
  showToast(`Quest failed: ${data.quest.questName} (${data.reason})`, 'error');
});

window.electronAPI.onEnginePaused(() => {
  isEnginePaused = true;
  liveEngineStatus.textContent = 'Paused';
  liveEngineStatus.classList.remove('running');
  liveEngineStatus.classList.add('paused');
  if (labelPauseBtn) labelPauseBtn.textContent = 'Resume';
  if (titlePillText) titlePillText.textContent = 'Paused';
  showToast("Session paused", "warn");
});

window.electronAPI.onEngineResumed(() => {
  isEnginePaused = false;
  liveEngineStatus.textContent = 'Running';
  liveEngineStatus.classList.add('running');
  liveEngineStatus.classList.remove('paused');
  if (labelPauseBtn) labelPauseBtn.textContent = 'Pause';
  if (titlePillText) titlePillText.textContent = 'Running';
  showToast("Session resumed", "info");
});

window.electronAPI.onEngineFinished((data) => {
  isEngineRunning = false;
  isEnginePaused = false;
  stopSessionTimer();

  liveOrb.classList.remove('active');
  liveEngineStatus.classList.remove('running');
  liveEngineStatus.classList.remove('paused');
  liveEngineStatus.textContent = 'Finished';
  btnStopEngine.disabled = true;
  if (btnPauseEngine) btnPauseEngine.disabled = true;
  if (btnSkipEngine) btnSkipEngine.disabled = true;
  if (rpcSimGame) rpcSimGame.textContent = "Session Idle";
  if (rpcSimAppId) rpcSimAppId.textContent = "--";
  if (rpcSimNextHb) rpcSimNextHb.textContent = "--";
  liveIndicatorDot.classList.remove('active');

  if (titleEnginePill) {
    titleEnginePill.classList.remove('running');
    titlePillText.textContent = 'Idle';
  }
  document.body.classList.remove('engine-active');

  updateStartButton();
  playAudioChime('success');
  showToast(`Session finished: ${data.completedList?.length || 0} quest(s) completed`, 'success');

  if (settingDesktopNotify && settingDesktopNotify.checked) {
    window.electronAPI.notifyDesktop({
      title: "Discord Orb Studio — Session Completed",
      body: `${data.completedList?.length || 0} quest(s) completed successfully!`
    });
  }

  loadQuests();
});

window.electronAPI.onEngineStopped(() => {
  isEngineRunning = false;
  isEnginePaused = false;
  stopSessionTimer();

  liveOrb.classList.remove('active');
  liveEngineStatus.classList.remove('running');
  liveEngineStatus.classList.remove('paused');
  liveEngineStatus.textContent = 'Stopped';
  btnStopEngine.disabled = true;
  if (btnPauseEngine) btnPauseEngine.disabled = true;
  if (btnSkipEngine) btnSkipEngine.disabled = true;
  if (rpcSimGame) rpcSimGame.textContent = "Session Idle";
  if (rpcSimAppId) rpcSimAppId.textContent = "--";
  if (rpcSimNextHb) rpcSimNextHb.textContent = "--";
  liveIndicatorDot.classList.remove('active');

  if (titleEnginePill) {
    titleEnginePill.classList.remove('running');
    titlePillText.textContent = 'Idle';
  }
  document.body.classList.remove('engine-active');

  updateStartButton();
  showToast("Session stopped", "warn");
});

window.electronAPI.onEngineRewardClaimed((data) => {
  if (data.code) {
    saveClaimedCode({
      id: data.quest?.id,
      code: data.code,
      questName: data.quest?.questName || data.rewardName,
      gameTitle: data.quest?.gameTitle,
      rewardName: data.quest?.rewardName,
      rewardType: data.quest?.rewardType
    });
    if (settingAutoCopy && settingAutoCopy.checked) {
      navigator.clipboard.writeText(data.code);
      showToast(`Code copied: ${data.code}`, 'success');
    } else {
      showToast(`Reward unlocked: ${data.code}`, 'success');
    }
  } else {
    showToast(`Reward claimed for ${data.quest?.questName || 'quest'}`, 'success');
  }
  playAudioChime('success');
  updateVaultBadge();
  renderVaultPage();
});

if (btnCopyTerminal) {
  btnCopyTerminal.addEventListener('click', () => {
    const lines = Array.from(terminalLogs.querySelectorAll('.log-line')).filter(l => l.style.display !== 'none').map(l => {
      const ts = l.querySelector('.log-ts')?.textContent || '';
      const msg = l.querySelector('.log-msg')?.textContent || '';
      return `${ts} ${msg}`;
    });
    if (lines.length === 0) {
      showToast("Log is empty.", "info");
      return;
    }
    navigator.clipboard.writeText(lines.join("\n"));
    showToast(`${lines.length} event(s) copied`, "success");
    playAudioChime('click');
  });
}

termPills.forEach(pill => {
  pill.addEventListener('click', () => {
    termPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentTermFilter = pill.dataset.termFilter;
    filterTerminalLogs();
    playAudioChime('click');
  });
});

function filterTerminalLogs() {
  const lines = terminalLogs.querySelectorAll('.log-line');
  lines.forEach(l => {
    if (currentTermFilter === 'all') {
      l.style.display = 'flex';
    } else if (currentTermFilter === 'info') {
      l.style.display = (l.classList.contains('log-info') || l.classList.contains('log-system')) ? 'flex' : 'none';
    } else if (currentTermFilter === 'success') {
      l.style.display = l.classList.contains('log-success') ? 'flex' : 'none';
    } else if (currentTermFilter === 'warn') {
      l.style.display = l.classList.contains('log-warn') ? 'flex' : 'none';
    } else if (currentTermFilter === 'error') {
      l.style.display = l.classList.contains('log-error') ? 'flex' : 'none';
    }
  });
}

// ── Terminal Logging Helper ──
function addTerminalLog(msg, type = 'info') {
  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  const ts = new Date().toLocaleTimeString();

  line.innerHTML = `
    <span class="log-ts">[${ts}]</span>
    <span class="log-msg">${escapeHtml(msg)}</span>
  `;

  terminalLogs.appendChild(line);

  if (autoScrollCheck.checked) {
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
  }
}

btnClearTerminal.addEventListener('click', () => {
  terminalLogs.innerHTML = '';
  playAudioChime('click');
});

// ── Export Logs Handler ──
btnExportLogs.addEventListener('click', async () => {
  const lines = Array.from(terminalLogs.querySelectorAll('.log-line')).map(l => {
    const ts = l.querySelector('.log-ts')?.textContent || '';
    const msg = l.querySelector('.log-msg')?.textContent || '';
    return `${ts} ${msg}`;
  });

  if (lines.length === 0) {
    showToast("Log is empty.", "info");
    return;
  }

  const fileContent = [
    "-------------------------------------------------------",
    "  DISCORD ORB STUDIO — EXECUTION LOGS",
    `  Date: ${new Date().toISOString()}`,
    "-------------------------------------------------------",
    "",
    ...lines
  ].join("\r\n");

  const res = await window.electronAPI.exportLogs(fileContent);
  if (res && res.ok) {
    showToast(`Log saved: ${res.filePath}`, 'success');
    playAudioChime('click');
  }
});

// ── Settings & Presets Management ──
presetCards.forEach(card => {
  card.addEventListener('click', () => {
    presetCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    const preset = card.dataset.preset;
    if (preset === 'turbo') {
      settingVideoStep.value = 10;
      settingHbInterval.value = 20;
    } else if (preset === 'safe') {
      settingVideoStep.value = 5;
      settingHbInterval.value = 32;
    } else {
      settingVideoStep.value = 7;
      settingHbInterval.value = 28;
    }
    playAudioChime('click');
  });
});

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('orb_theme', theme);
  themeDots.forEach(d => d.classList.toggle('active', d.dataset.theme === theme));
  themeQuickBtns.forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
}

themeDots.forEach(dot => {
  dot.addEventListener('click', () => {
    applyTheme(dot.dataset.theme);
    playAudioChime('click');
  });
});

themeQuickBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(btn.dataset.theme);
    playAudioChime('click');
  });
});

// Quick Mute button
if (btnQuickMute) {
  btnQuickMute.addEventListener('click', () => {
    if (settingAudioSfx) {
      settingAudioSfx.checked = !settingAudioSfx.checked;
      updateMuteButtonVisual();
      showToast(settingAudioSfx.checked ? "Audio cues enabled" : "Audio cues muted", 'info');
      playAudioChime('click');
    }
  });
}

function updateMuteButtonVisual() {
  const isMuted = settingAudioSfx && !settingAudioSfx.checked;
  if (iconSoundOn) iconSoundOn.style.display = isMuted ? 'none' : 'block';
  if (iconSoundOff) iconSoundOff.style.display = isMuted ? 'block' : 'none';
}

if (settingAudioSfx) {
  settingAudioSfx.addEventListener('change', updateMuteButtonVisual);
}

let autoRefreshTimer = null;
function setupAutoRefresh(enabled) {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
  if (enabled) {
    autoRefreshTimer = setInterval(() => {
      if (currentUser && !isEngineRunning) {
        addTerminalLog("Checking for new quests…", "info");
        loadQuests();
      }
    }, 5 * 60 * 1000);
  }
}

async function loadSettings() {
  const config = await window.electronAPI.loadConfig();
  const s = config.settings || {};

  if (s.heartbeatInterval) settingHbInterval.value = s.heartbeatInterval;
  if (s.videoStep) settingVideoStep.value = s.videoStep;
  if (s.jitterEnabled !== undefined) settingJitter.checked = s.jitterEnabled;
  if (s.autoClaim !== undefined) settingAutoClaim.checked = s.autoClaim;
  if (s.autoCopy !== undefined && settingAutoCopy) settingAutoCopy.checked = s.autoCopy;
  if (s.autoRefresh !== undefined && settingAutoRefresh) {
    settingAutoRefresh.checked = s.autoRefresh;
    setupAutoRefresh(s.autoRefresh);
  }
  if (s.audioSfx !== undefined) settingAudioSfx.checked = s.audioSfx;
  if (s.desktopNotify !== undefined) settingDesktopNotify.checked = s.desktopNotify;
  if (s.buildNumber) settingBuildNumber.value = s.buildNumber;

  if (s.speedPreset) {
    presetCards.forEach(c => c.classList.toggle('active', c.dataset.preset === s.speedPreset));
  }

  if (s.executionMode) {
    if (s.executionMode === 'turbo') {
      if (modeBtnTurbo) modeBtnTurbo.classList.add('active');
      if (modeBtnStealth) modeBtnStealth.classList.remove('active');
    } else {
      if (modeBtnStealth) modeBtnStealth.classList.add('active');
      if (modeBtnTurbo) modeBtnTurbo.classList.remove('active');
    }
  }

  // Restore Theme
  const savedTheme = localStorage.getItem('orb_theme') || s.theme || 'default';
  applyTheme(savedTheme);
  updateMuteButtonVisual();
}

btnSaveSettings.addEventListener('click', async () => {
  const activePreset = document.querySelector('.preset-card.active')?.dataset.preset || 'balanced';
  const activeTheme = document.querySelector('.theme-dot.active')?.dataset.theme || 'default';

  const settings = {
    heartbeatInterval: parseInt(settingHbInterval.value, 10) || 28,
    videoStep: parseInt(settingVideoStep.value, 10) || 7,
    jitterEnabled: settingJitter.checked,
    autoClaim: settingAutoClaim.checked,
    autoCopy: settingAutoCopy ? settingAutoCopy.checked : true,
    autoRefresh: settingAutoRefresh ? settingAutoRefresh.checked : false,
    audioSfx: settingAudioSfx.checked,
    desktopNotify: settingDesktopNotify.checked,
    buildNumber: parseInt(settingBuildNumber.value, 10) || 606747,
    speedPreset: activePreset,
    theme: activeTheme,
    executionMode: modeBtnTurbo?.classList.contains('active') ? 'turbo' : 'stealth'
  };

  setupAutoRefresh(settings.autoRefresh);
  await window.electronAPI.updateSettings(settings);
  settingsSavedIndicator.style.display = 'inline-block';
  setTimeout(() => {
    settingsSavedIndicator.style.display = 'none';
  }, 3000);

  playAudioChime('click');
  showToast("Preferences saved", "success");
});

// ── Time Formatting Helpers ──
function formatSeconds(sec) {
  sec = Math.round(sec);
  if (sec <= 0) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatMinutes(sec) {
  const m = Math.ceil(sec / 60);
  if (m <= 0) return "0 min";
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return `${h}h ${r}m`;
  }
  return `~${m} min`;
}

// ── Application Startup ──
window.addEventListener('DOMContentLoaded', () => {
  initAuth();
  loadSettings();
});
