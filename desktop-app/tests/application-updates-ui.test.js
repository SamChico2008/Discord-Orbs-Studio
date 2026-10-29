'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const flush = () => new Promise(setImmediate);
const available = { phase: 'available', current: '3.3.12', latest: '3.3.13' };

function renderer({ initial = available, initialPromise, choose, otherDialog = false } = {}) {
  const elements = new Map();
  const choices = [];
  let listener;
  let onClose;
  let focused = { isConnected: true, focus() { focused = this; } };
  const originalFocus = focused;
  const element = () => ({
    textContent: '', disabled: false, open: false, isConnected: true, listeners: new Map(),
    addEventListener(event, callback) { this.listeners.set(event, callback); },
    showModal() { this.open = true; }, close() { this.open = false; }, focus() { focused = this; }
  });
  const get = (id) => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  const window = { electronAPI: {
    getApplicationUpdateState: async () => initialPromise || initial,
    onApplicationUpdateState: (callback) => { listener = callback; },
    applicationUpdateChoice: async (choice) => {
      choices.push(choice);
      return choose ? choose(choice) : { accepted: true, state: { phase: choice === 'later' ? 'idle' : 'installing', current: available.current, latest: available.latest } };
    }
  } };
  const document = { getElementById: get, get activeElement() { return focused; },
    querySelector: () => otherDialog ? {} : null,
    addEventListener: (event, callback) => { if (event === 'close') onClose = callback; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/application-updates.js'), 'utf8'), { window, document });
  return { get, choices, originalFocus, focus: () => focused, enable: () => window.enableApplicationUpdatePrompts(),
    push: (state) => listener(state), click: (id) => get(id).listeners.get('click')(),
    cancel: () => { let prevented = false; get('app-update-modal').listeners.get('cancel')({ preventDefault() { prevented = true; } }); return prevented; },
    closeOther: () => { otherDialog = false; onClose(); } };
}

test('the in-app prompt shows versions, waits for startup dialogs and focuses Later', async () => {
  const subject = renderer();
  await flush();
  assert.equal(subject.get('app-update-modal').open, false);
  assert.equal(subject.enable(), true);
  assert.equal(subject.get('app-update-modal').open, true);
  assert.equal(subject.get('app-update-current').textContent, 'v3.3.12');
  assert.equal(subject.get('app-update-latest').textContent, 'v3.3.13');
  assert.equal(subject.focus(), subject.get('app-update-later'));
  assert.deepEqual(subject.choices, []);
});

test('Later, close and Escape dismiss through the backend and restore focus', async () => {
  for (const action of ['app-update-later', 'app-update-close', 'Escape']) {
    const subject = renderer();
    await flush();
    subject.enable();
    if (action === 'Escape') assert.equal(subject.cancel(), true);
    else await subject.click(action);
    await flush();
    assert.deepEqual(subject.choices, ['later']);
    assert.equal(subject.get('app-update-modal').open, false);
    assert.equal(subject.focus(), subject.originalFocus);
  }
});

test('download and restart states block repeated clicks and Escape; failure enables retry', async () => {
  let finish;
  const subject = renderer({ choose: () => new Promise((resolve) => { finish = resolve; }) });
  await flush();
  subject.enable();
  const pending = subject.click('app-update-install');
  subject.push({ ...available, phase: 'installing' });
  assert.equal(subject.get('app-update-install').disabled, true);
  assert.equal(subject.get('app-update-later').disabled, true);
  assert.equal(subject.get('app-update-close').disabled, true);
  await subject.click('app-update-install');
  subject.cancel();
  assert.deepEqual(subject.choices, ['install']);
  subject.push({ ...available, phase: 'restarting' });
  assert.match(subject.get('app-update-status').textContent, /restart/);
  finish({ accepted: true, state: { ...available, phase: 'failed' } });
  await pending;
  assert.equal(subject.get('app-update-install').textContent, 'Try again');
  assert.equal(subject.get('app-update-install').disabled, false);
  assert.equal(subject.get('app-update-later').disabled, false);
});

test('an available update waits until the release-summary dialog closes', async () => {
  const subject = renderer({ otherDialog: true });
  await flush();
  assert.equal(subject.enable(), false);
  assert.equal(subject.get('app-update-modal').open, false);
  subject.closeOther();
  assert.equal(subject.get('app-update-modal').open, true);
});

test('a stale initial state cannot overwrite a newer update event', async () => {
  let resolveInitial;
  const subject = renderer({ initialPromise: new Promise((resolve) => { resolveInitial = resolve; }) });
  subject.enable();
  subject.push(available);
  resolveInitial({ phase: 'idle' });
  await flush();
  assert.equal(subject.get('app-update-modal').open, true);
});

test('a bridge error presents retry controls without closing the app', async () => {
  const subject = renderer({ choose: async () => { throw new Error('IPC failed'); } });
  await flush();
  subject.enable();
  await subject.click('app-update-install');
  assert.equal(subject.get('app-update-modal').open, true);
  assert.equal(subject.get('app-update-install').textContent, 'Try again');
  assert.equal(subject.get('app-update-close').disabled, false);
});

test('the real page includes a themed, accessible in-app modal and its isolated bridge', async () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  assert.match(html, /<dialog[^>]*id="app-update-modal"[^>]*aria-labelledby="app-update-title"/);
  assert.match(html, /id="app-update-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /src="application-updates.js"/);
  assert.match(html, /href="application-updates.css"/);
  let bridge;
  const calls = [];
  let subscription;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../preload.js'), 'utf8'), {
    require: () => ({ contextBridge: { exposeInMainWorld: (name, api) => { bridge = api; } },
      ipcRenderer: { invoke: async (...args) => { calls.push(args); }, on: (channel, callback) => { subscription = { channel, callback }; } } })
  });
  await bridge.getApplicationUpdateState();
  await bridge.applicationUpdateChoice('later');
  let received;
  bridge.onApplicationUpdateState((state) => { received = state; });
  subscription.callback({}, available);
  assert.deepEqual(calls, [['application-update-state'], ['application-update-choice', 'later']]);
  assert.equal(subscription.channel, 'application-update-state');
  assert.equal(received, available);
});
