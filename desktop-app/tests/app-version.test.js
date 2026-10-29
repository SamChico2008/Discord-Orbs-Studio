'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

test('the title bar displays the complete installed version and reflects a later installation', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app-version.js'), 'utf8');
  for (const version of ['3.3.8', '3.4.12']) {
    const badge = {};
    await vm.runInNewContext(source, {
      document: { getElementById: () => badge },
      window: { electronAPI: { getAppVersion: async () => version } }, console
    });
    assert.equal(badge.textContent, `v${version}`);
    assert.equal(badge.title, `Discord Orb Studio ${version}`);
  }
});

test('the version renderer handles a failed bridge without inventing an installed version', async () => {
  const badge = {};
  let logged = false;
  await vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/app-version.js'), 'utf8'), {
    document: { getElementById: () => badge },
    window: { electronAPI: { getAppVersion: async () => { throw new Error('IPC unavailable'); } } },
    console: { error: () => { logged = true; } }
  });
  assert.equal(logged, true);
  assert.equal(badge.textContent, undefined);
});

test('preload requests the application version from the main process', async () => {
  let bridge;
  const channels = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../preload.js'), 'utf8'), {
    require: () => ({
      contextBridge: { exposeInMainWorld: (name, api) => { bridge = api; } },
      ipcRenderer: { invoke: async (channel) => { channels.push(channel); return '3.3.8'; } }
    })
  });
  assert.equal(await bridge.getAppVersion(), '3.3.8');
  assert.deepEqual(channels, ['app-version']);
});

test('the actual title bar loads its version renderer and has no hardcoded version', () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  assert.match(html, /id="app-version"[^>]*><\/span>/);
  assert.match(html, /<script src="app-version.js"><\/script>/);
  assert.doesNotMatch(html, /class="brand-badge"[^>]*>v\d/);
});

test('an installation failure re-enables the splash action after Update Now was clicked', () => {
  const buttons = [{ disabled: true }];
  const panels = new Map(['state-failed', 'error-detail'].map((id) => [id, { classList: { remove() {} }, textContent: '' }]));
  const context = {
    window: {},
    document: {
      querySelectorAll: (selector) => selector === '[data-choice]' ? [] : [],
      getElementById: (id) => panels.get(id)
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/launch.js'), 'utf8'), context);
  context.document.querySelectorAll = (selector) => selector === '[data-choice]' ? buttons : [];
  context.window.setStartupState({ mode: 'failed', message: 'Download interrupted' });
  assert.equal(buttons[0].disabled, false);
  assert.equal(panels.get('error-detail').textContent, 'Download interrupted');
});
