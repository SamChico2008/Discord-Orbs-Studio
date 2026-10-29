'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const update = { kind: 'application', name: 'Discord Orb Studio', current: '3.3.8', latest: '3.3.9', release: { tag: 'v3.3.9' } };
const flush = () => new Promise(setImmediate);

function harness({ result = { updates: [update], autoInstall: false }, failInstall = false, dialogResponse = 1 } = {}) {
  const windows = [];
  const states = [];
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
        dialog: { showMessageBox: async (parent, options) => { dialogs.push(options); return { response: dialogResponse }; } }
      };
      if (name === './quest-engine') return EventEmitter;
      if (name === './qr-auth') return class {};
      if (name === './token-detector') return {};
      if (name === './release-notes') return { createReleaseNotesStore: () => ({
        initialize() {}, stageUpdate: (update) => notesStaged.push(update), cancelUpdate: (version) => notesCancelled.push(version),
        getPendingSummary: async () => null, acknowledge: () => true
      }) };
      if (name === './update-manager') return {
        checkForUpdates: async (options) => { checks.push(options); return result; },
        applyUpdates: async (updates, options) => {
          installs.push({ updates, options });
          if (failInstall) throw new Error('Checksum failed');
        }
      };
      return require(name);
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8'), context);
  return {
    app, windows, states, installs, checks, dialogs, handlers, intervals, notesStaged, notesCancelled,
    run: (source) => vm.runInContext(source, context),
    advance: () => { now += 15 * 60 * 1000; },
    choose: (choice, sender = windows.at(-1).webContents) => handlers.get('startup-update-choice')({ sender }, choice)
  };
}

async function waitForState(subject, mode) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (subject.states.some((state) => state.mode === mode)) return;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  assert.fail(`Splash never reached ${mode}`);
}

test('startup waits for user acceptance even if legacy metadata requests automatic installation', async () => {
  const subject = harness({ result: { updates: [update], autoInstall: true } });
  const startup = subject.run('checkStartupUpdates()');
  await waitForState(subject, 'updateAvailable');
  assert.equal(subject.installs.length, 0);
  assert.equal(subject.choose('install', {}), false);
  assert.equal(subject.installs.length, 0);
  assert.equal(subject.choose('install'), true);
  assert.equal(await startup, true);
  assert.equal(subject.installs.length, 1);
  assert.equal(subject.notesStaged[0].latest, '3.3.9');
  assert.equal(subject.installs[0].options.tempDir, 'C:\\Orb Temp');
  assert.equal(subject.installs[0].options.installDir, path.dirname(process.execPath));
  assert.equal(subject.app.didQuit, true);
  assert.equal(subject.checks[0].appVersion, '3.3.8');
});

test('Later opens the installed app and suppresses the same release for the current session', async () => {
  const subject = harness();
  const startup = subject.run('checkStartupUpdates()');
  await waitForState(subject, 'updateAvailable');
  subject.choose('later');
  assert.equal(await startup, false);
  subject.run('createWindow(); startUpdateChecks()');
  subject.advance();
  await subject.run('checkBackgroundUpdates()');
  assert.equal(subject.dialogs.length, 0);
  assert.equal(subject.installs.length, 0);
});

test('closing the startup splash while a prompt is open continues without installing', async () => {
  const subject = harness();
  const startup = subject.run('checkStartupUpdates()');
  await waitForState(subject, 'updateAvailable');
  subject.windows[0].close();
  assert.equal(await startup, false);
  assert.equal(subject.installs.length, 0);
});

test('an installation failure leaves Open Studio available and keeps the app running', async () => {
  const subject = harness({ failInstall: true });
  const startup = subject.run('checkStartupUpdates()');
  await waitForState(subject, 'updateAvailable');
  subject.choose('install');
  await waitForState(subject, 'failed');
  subject.choose('continue');
  assert.equal(await startup, false);
  assert.equal(subject.app.didQuit, undefined);
  assert.deepEqual(subject.notesCancelled, ['3.3.9']);
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

test('background checks run every 15 minutes, ask before installing, and avoid duplicate prompts', async () => {
  const subject = harness();
  subject.run('createWindow(); startUpdateChecks()');
  assert.equal(subject.intervals[0].delay, 15 * 60 * 1000);
  await subject.run('checkBackgroundUpdates()');
  assert.equal(subject.checks.length, 0);
  subject.advance();
  await subject.intervals[0].callback();
  assert.equal(subject.dialogs.length, 1);
  assert.equal(subject.installs.length, 0);
  subject.advance();
  await subject.intervals[0].callback();
  assert.equal(subject.dialogs.length, 1);
});

test('accepting a background update hands the installer the current installation directory', async () => {
  const subject = harness({ dialogResponse: 0 });
  subject.run('createWindow(); startUpdateChecks()');
  subject.advance();
  await subject.run('checkBackgroundUpdates()');
  assert.equal(subject.installs.length, 1);
  assert.equal(subject.installs[0].options.installDir, path.dirname(process.execPath));
  assert.equal(subject.app.didQuit, true);
});

test('version IPC returns Electron installed metadata', () => {
  const subject = harness();
  assert.equal(subject.handlers.get('app-version')(), '3.3.8');
});

test('both renderer windows use the Electron sandbox with isolated preloads', () => {
  const subject = harness();
  subject.run('createWindow(); showStartupSplash()');
  for (const window of subject.windows) {
    assert.equal(window.options.webPreferences.sandbox, true);
    assert.equal(window.options.webPreferences.contextIsolation, true);
    assert.equal(window.options.webPreferences.nodeIntegration, false);
  }
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8'), /appendSwitch\(['"]no-sandbox/);
  assert.doesNotMatch(require('../package.json').scripts.start, /--no-sandbox/);
});
