'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { installPackagedRuntimeUpdate } = require('../update-manager');

test('an update helper that exits without becoming ready never hands off the application', { skip: process.platform !== 'win32' }, async (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-handoff-failure-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const installer = Buffer.from('test installer');
  const release = {
    tag: 'v3.3.9', installerUrl: 'https://github.com/SamChico2008/Discord-Orbs-Studio/releases/download/v3.3.9/setup.exe',
    installerDigest: `sha256:${crypto.createHash('sha256').update(installer).digest('hex')}`, installerSize: installer.length
  };
  const spawnProcess = () => {
    const child = new EventEmitter();
    child.exitCode = 0;
    child.unref = () => assert.fail('A helper that never started must not be accepted');
    process.nextTick(() => child.emit('spawn'));
    return child;
  };
  await assert.rejects(installPackagedRuntimeUpdate(release, {
    tempDir: directory, installDir: directory, download: async () => installer, spawnProcess, handoffTimeout: 40
  }), /update helper did not start/);
  assert.ok(fs.readdirSync(directory).some((name) => name.endsWith('.cancel')));
  assert.equal(fs.readdirSync(directory).some((name) => name.endsWith('-setup.exe')), false);
});

test('the actual Windows bootstrap starts a helper that survives its Node parent', { skip: process.platform !== 'win32', timeout: 20000 }, async (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-handoff-survival-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const ready = path.join(directory, 'ready');
  const complete = path.join(directory, 'complete');
  const runner = path.join(directory, 'parent.cjs');
  const modulePath = path.resolve(__dirname, '../update-manager.js');
  const script = `[IO.File]::WriteAllText('${ready.replace(/'/g, "''")}', 'ready'); Start-Sleep -Milliseconds 900; [IO.File]::WriteAllText('${complete.replace(/'/g, "''")}', 'completed-after-parent-exit')`;
  fs.writeFileSync(runner, `
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { buildInstallerBootstrapCommand } = require(${JSON.stringify(modulePath)});
const command = buildInstallerBootstrapCommand(Buffer.from(${JSON.stringify(script)}, 'utf16le').toString('base64'));
const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', command], { detached: false, windowsHide: true, stdio: 'ignore' });
(async () => {
  const deadline = Date.now() + 7000;
  while (!fs.existsSync(${JSON.stringify(ready)}) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
  if (!fs.existsSync(${JSON.stringify(ready)})) throw new Error('Helper readiness timed out');
  child.unref();
  console.log('READY_BEFORE_PARENT_EXIT');
})().catch(error => { console.error(error); process.exitCode = 1; });
`);
  const parent = spawnSync(process.execPath, [runner], { encoding: 'utf8', windowsHide: true, timeout: 12000 });
  assert.equal(parent.status, 0, parent.stderr);
  assert.match(parent.stdout, /READY_BEFORE_PARENT_EXIT/);
  const deadline = Date.now() + 7000;
  while (!fs.existsSync(complete) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(fs.readFileSync(complete, 'utf8'), 'completed-after-parent-exit');
});
