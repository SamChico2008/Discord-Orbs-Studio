'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function renderer(checkForUpdates) {
  let click;
  const button = { disabled: false, textContent: 'Check for updates', addEventListener: (event, handler) => { click = handler; } };
  const status = { textContent: '' };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/settings-updates.js'), 'utf8'), {
    document: { getElementById: (id) => id === 'btn-check-updates' ? button : status },
    window: { electronAPI: { checkForUpdates } }
  });
  return { button, status, click: () => click() };
}

test('the settings button waits for the result, prevents double clicks and displays the installed version', async () => {
  let resolveCheck;
  let calls = 0;
  const subject = renderer(() => { calls += 1; return new Promise((resolve) => { resolveCheck = resolve; }); });
  const pending = subject.click();
  assert.equal(subject.button.disabled, true);
  assert.equal(subject.button.textContent, 'Checking…');
  await subject.click();
  assert.equal(calls, 1);
  resolveCheck({ status: 'upToDate', version: '3.3.11' });
  await pending;
  assert.match(subject.status.textContent, /up to date.*3\.3\.11/);
  assert.equal(subject.button.disabled, false);
  assert.equal(subject.button.textContent, 'Check for updates');
});

test('settings give distinct feedback for Later, unavailable service, pending release and busy installation', async () => {
  for (const [response, expected] of [
    [{ status: 'available', latest: '3.3.13' }, /3\.3\.13.*available.*Update now/],
    [{ status: 'deferred', latest: '3.3.12' }, /3\.3\.12.*available/],
    [{ status: 'error' }, /unavailable/],
    [{ status: 'pending' }, /being prepared/],
    [{ status: 'busy' }, /already in progress/],
    [{ status: 'unsupported' }, /installed Windows application/],
    [{ status: 'failed' }, /could not be installed/],
    [{ status: 'cancelled' }, /cancelled/],
    [{ status: 'restarting', latest: '3.3.12' }, /Restarting.*3\.3\.12/]
  ]) {
    const subject = renderer(async () => response);
    await subject.click();
    assert.match(subject.status.textContent, expected);
    assert.equal(subject.button.disabled, false);
  }
});

test('a bridge failure restores the button and allows a retry', async () => {
  let calls = 0;
  const subject = renderer(async () => {
    if (++calls === 1) throw new Error('IPC failed');
    return { status: 'upToDate', version: '3.3.11' };
  });
  await subject.click();
  assert.match(subject.status.textContent, /unavailable/);
  assert.equal(subject.button.disabled, false);
  await subject.click();
  assert.match(subject.status.textContent, /up to date/);
});

test('the real settings page and isolated preload expose an accessible manual update control', async () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  assert.match(html, /id="tab-settings"[\s\S]*id="btn-check-updates"[^>]*aria-describedby="update-check-status"/);
  assert.match(html, /id="update-check-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /src="settings-updates.js"/);
  let bridge;
  const channels = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../preload.js'), 'utf8'), {
    require: () => ({ contextBridge: { exposeInMainWorld: (name, api) => { bridge = api; } },
      ipcRenderer: { invoke: async (channel) => { channels.push(channel); return { status: 'upToDate' }; } } })
  });
  assert.equal((await bridge.checkForUpdates()).status, 'upToDate');
  assert.deepEqual(channels, ['updates-check']);
});
