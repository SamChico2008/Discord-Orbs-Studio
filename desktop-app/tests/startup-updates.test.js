'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const update = { kind: 'application', name: 'Discord Orb Studio', current: '3.3.8', latest: '3.3.9', release: { tag: 'v3.3.9' } };
const flush = () => new Promise(setImmediate);

function harness({ result = { updates: [update], autoInstall: false }, failInstall = false,
  checkResult = async () => result, holdInstall } = {}) {
  const windows = [];
  const states = [];
  const appStates = [];
  const installs = [];
  const checks = [];
  const dialogs = [];
  const handlers = new Map();
  const intervals = [];
  const notesStaged = [];
  const notesCancelled = [];
  let now = 0;
  class Window extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      windows.push(this);
      this.webContents = new EventEmitter();
      this.webContents.setWindowOpenHandler = () => {};
      this.webContents.send = (channel, state) => appStates.push({ channel, ...state });
      this.webContents.executeJavaScript = async (script) => {
        states.push(JSON.parse(script.slice('window.setStartupState('.length, -1)));
      };
    }
    loadFile() { setImmediate(() => { this.webContents.emit('did-finish-load'); this.emit('ready-to-show'); }); }
    show() {}
    isDestroyed() { return !!this.destroyed; }
    close() { this.destroyed = true; this.emit('closed'); }
  }
  const app = new EventEmitter();
  Object.assign(app, {
    isPackaged: true, commandLine: { appendSwitch() {} },
    getPath: () => 'C:\\Orb Temp', getVersion: () => '3.3.8',
    whenReady: () => ({ then() {} }), quit: () => { app.didQuit = true; }
  });
  const context = vm.createContext({
    __dirname: path.join(__dirname, '..'),
    process, console: { log() {}, error() {} },
    Date: { now: () => now },
    setTimeout: (callback, delay) => setTimeout(callback, delay >= 15000 ? delay : 0), clearTimeout,
    setInterval: (callback, delay) => { const timer = { callback, delay, unref() {} }; intervals.push(timer); return timer; },
    clearInterval() {},
    require: (name) => {
      if (name === 'electron') return {
        app, BrowserWindow: Window,
        ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
        screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1200, height: 800 } }) },
        dialog: { showMessageBox: async () => { dialogs.push(true); throw new Error('Native update prompt called'); } }
      };
      if (name === './quest-engine') return EventEmitter;
      if (name === './qr-auth') return class {};
      if (name === './token-detector') return {};
      if (name === './release-notes') return { createReleaseNotesStore: () => ({
        initialize() {}, stageUpdate: (value) => notesStaged.push(value), cancelUpdate: (version) => notesCancelled.push(version),
        getPendingSummary: async () => null, acknowledge: () => true
      }) };
      if (name === './update-manager') return {
        checkForUpdates: async (options) => { checks.push(options); return checkResult(options); },
        applyUpdates: async (updates, options) => {
          installs.push({ updates, options });
          if (failInstall) throw new Error('Checksum failed');
          if (holdInstall) await holdInstall();
        }
      };
      return require(name);
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8'), context);
  return {
    app, windows, states, appStates, installs, checks, dialogs, handlers, intervals, notesStaged, notesCancelled,
    run: (code) => vm.runInContext(code, context),
    advance: () => { now += 15 * 60 * 1000; },
    setInstallFailure: (value) => { failInstall = value; },
    choose: (choice, sender = windows.at(-1).webContents) => handlers.get('application-update-choice')({ sender }, choice),
    manual: (sender = windows.at(-1).webContents) => handlers.get('updates-check')({ sender }),
    state: (sender = windows.at(-1).webContents) => handlers.get('application-update-state')({ sender })
  };
}

test('startup queues an in-app offer and never installs before acceptance, even with legacy autoInstall metadata', async () => {
  const subject = harness({ result: { updates: [update], autoInstall: true } });
  assert.equal(await subject.run('checkStartupUpdates()'), false);
  subject.run('createWindow()');
  await flush();
  assert.equal(subject.state().phase, 'available');
  assert.equal(subject.installs.length, 0);
  assert.equal(subject.dialogs.length, 0);
  assert.equal((await subject.choose('install', {})).accepted, false);
  assert.equal((await subject.choose('install')).state.phase, 'restarting');
  assert.equal(subject.installs.length, 1);
  assert.equal(subject.notesStaged[0].latest, '3.3.9');
  assert.equal(subject.installs[0].options.tempDir, 'C:\\Orb Temp');
  assert.equal(subject.installs[0].options.installDir, path.dirname(process.execPath));
  assert.equal(subject.app.didQuit, true);
});

test('Later dismisses the in-app offer and suppresses the same release for the session', async () => {
  const subject = harness();
  await subject.run('checkStartupUpdates()');
  subject.run('createWindow(); startUpdateChecks()');
  await subject.choose('later');
  assert.equal(subject.state().phase, 'idle');
  subject.advance();
  await subject.run('checkBackgroundUpdates()');
  assert.equal(subject.state().phase, 'idle');
  assert.equal(subject.installs.length, 0);
  assert.equal(subject.dialogs.length, 0);
});

test('closing the initial launch window while checking continues without queuing or installing', async () => {
  const subject = harness();
  const startup = subject.run('checkStartupUpdates()');
  subject.windows[0].close();
  assert.equal(await startup, false);
  assert.equal(subject.run('applicationUpdateState.phase'), 'idle');
  assert.equal(subject.installs.length, 0);
});

test('private release feed and connection errors continue to the installed app', async () => {
  for (const [result, expected] of [
    [{ updates: [], unavailable: true, errors: ['HTTP 404'] }, 'unavailable'],
    [{ updates: [], errors: ['Timed out'] }, 'offline'],
    [{ updates: [], unsupported: true }, 'unavailable'],
    [{ updates: [] }, 'upToDate']
  ]) {
    const subject = harness({ result });
    assert.equal(await subject.run('checkStartupUpdates()'), false);
    assert.equal(subject.states.at(-1).mode, expected);
  }
});

test('background checks run every 15 minutes and send one in-app prompt without a native dialog', async () => {
  const subject = harness();
  subject.run('createWindow(); startUpdateChecks()');
  assert.equal(subject.intervals[0].delay, 15 * 60 * 1000);
  await subject.run('checkBackgroundUpdates()');
  assert.equal(subject.checks.length, 0);
  subject.advance();
  await subject.intervals[0].callback();
  assert.equal(subject.appStates.length, 1);
  assert.equal(subject.appStates[0].phase, 'available');
  subject.advance();
  await subject.intervals[0].callback();
  assert.equal(subject.appStates.length, 1);
  assert.equal(subject.dialogs.length, 0);
  assert.equal(subject.installs.length, 0);
});

test('manual checks bypass the timer and offer a release again after Later', async () => {
  const subject = harness();
  subject.run('createWindow(); startUpdateChecks()');
  assert.equal((await subject.manual()).status, 'available');
  await subject.choose('later');
  assert.equal((await subject.manual()).latest, '3.3.9');
  assert.equal(subject.checks.length, 2);
  assert.equal(subject.installs.length, 0);
  assert.equal(subject.dialogs.length, 0);
});

test('the renderer receives only display versions and state, never installer arguments', async () => {
  const subject = harness();
  subject.run('createWindow()');
  await subject.manual();
  assert.deepEqual(Object.keys(subject.state()).sort(), ['current', 'latest', 'phase']);
  assert.equal(subject.state().current, '3.3.8');
  assert.equal(subject.state().latest, '3.3.9');
});

test('the update IPC rejects other windows, invalid choices and requests with no pending offer', async () => {
  const subject = harness();
  subject.run('createWindow()');
  assert.equal((await subject.choose('install')).accepted, false);
  await subject.manual();
  assert.equal((await subject.choose('install', {})).accepted, false);
  assert.equal((await subject.choose('unexpected')).accepted, false);
  assert.equal(subject.state({}).phase, 'idle');
  assert.equal(subject.installs.length, 0);
});

test('manual acceptance publishes installation states and reuses the verified handoff without another window', async () => {
  const subject = harness();
  subject.run('createWindow()');
  await flush();
  await subject.manual();
  const response = await subject.choose('install');
  assert.equal(response.state.phase, 'restarting');
  assert.deepEqual(subject.appStates.map((state) => state.phase), ['available', 'installing', 'restarting']);
  assert.equal(subject.windows.length, 1);
  assert.equal(subject.installs[0].options.installDir, path.dirname(process.execPath));
  assert.equal(subject.notesStaged[0].latest, '3.3.9');
  assert.equal(subject.app.didQuit, true);
});

test('an install failure stays in the app, permits a retry and clears incorrect staged notes', async () => {
  const subject = harness({ failInstall: true });
  subject.run('createWindow()');
  await subject.manual();
  assert.equal((await subject.choose('install')).state.phase, 'failed');
  assert.equal(subject.app.didQuit, undefined);
  assert.equal(subject.windows[0].isDestroyed(), false);
  assert.deepEqual(subject.notesCancelled, ['3.3.9']);
  subject.setInstallFailure(false);
  assert.equal((await subject.choose('install')).state.phase, 'restarting');
  assert.equal(subject.installs.length, 2);
  assert.equal(subject.app.didQuit, true);
});

test('Later also dismisses a failed installation without closing the application', async () => {
  const subject = harness({ failInstall: true });
  subject.run('createWindow()');
  await subject.manual();
  await subject.choose('install');
  await subject.choose('later');
  assert.equal(subject.state().phase, 'idle');
  assert.equal(subject.app.didQuit, undefined);
});

test('duplicate acceptance and checks during installation never start another installer', async () => {
  let completeInstall;
  const subject = harness({ holdInstall: () => new Promise((resolve) => { completeInstall = resolve; }) });
  subject.run('createWindow()');
  await subject.manual();
  const pending = subject.choose('install');
  assert.equal(subject.state().phase, 'installing');
  assert.equal((await subject.choose('install')).accepted, false);
  assert.equal((await subject.choose('later')).accepted, false);
  assert.equal((await subject.manual()).status, 'busy');
  assert.equal(subject.installs.length, 1);
  completeInstall();
  await pending;
});

test('manual checks distinguish current, incomplete, unavailable and unsupported releases', async () => {
  for (const [result, expected] of [
    [{ updates: [] }, 'upToDate'],
    [{ updates: [], pendingUpdate: true, latestVersion: '3.3.9' }, 'pending'],
    [{ updates: [], unavailable: true, errors: ['HTTP 404'] }, 'error'],
    [{ updates: [], errors: ['HTTP 429'] }, 'error'],
    [{ updates: [], unsupported: true }, 'unsupported']
  ]) {
    const subject = harness({ result });
    subject.run('createWindow()');
    const response = await subject.manual();
    assert.equal(response.status, expected);
    if (expected === 'upToDate') assert.equal(response.version, '3.3.8');
    assert.equal(subject.installs.length, 0);
  }
});

test('manual update IPC rejects other windows and development launches', async () => {
  const subject = harness();
  subject.run('createWindow(); showStartupSplash()');
  assert.equal((await subject.manual(subject.windows[1].webContents)).status, 'cancelled');
  assert.equal(subject.checks.length, 0);
  subject.app.isPackaged = false;
  assert.equal((await subject.manual(subject.windows[0].webContents)).status, 'unsupported');
  assert.equal(subject.checks.length, 0);
});

test('manual and background checks share a lock and recover from network failures', async () => {
  let resolveCheck;
  let fail = false;
  const subject = harness({ checkResult: () => {
    if (fail) throw new Error('Network failure');
    return new Promise((resolve) => { resolveCheck = resolve; });
  } });
  subject.run('createWindow(); startUpdateChecks()');
  const pending = subject.manual();
  assert.equal((await subject.manual()).status, 'busy');
  subject.advance();
  assert.equal((await subject.run('checkBackgroundUpdates()')).status, 'busy');
  assert.equal(subject.checks.length, 1);
  resolveCheck({ updates: [] });
  assert.equal((await pending).status, 'upToDate');
  fail = true;
  assert.equal((await subject.manual()).status, 'error');
  assert.equal((await subject.manual()).status, 'error');
});

test('version IPC returns installed metadata and both windows retain isolated sandboxed preloads', () => {
  const subject = harness();
  assert.equal(subject.handlers.get('app-version')(), '3.3.8');
  subject.run('createWindow(); showStartupSplash()');
  for (const window of subject.windows) {
    assert.equal(window.options.webPreferences.sandbox, true);
    assert.equal(window.options.webPreferences.contextIsolation, true);
    assert.equal(window.options.webPreferences.nodeIntegration, false);
  }
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8'), /showMessageBox/);
  assert.doesNotMatch(require('../package.json').scripts.start, /--no-sandbox/);
});
