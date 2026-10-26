'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  checkForPackagedRuntimeUpdates,
  applyUpdates
} = require('../update-manager');

const currentRuntime = { electron: '45.0.0', node: '24.22.0' };
const installer = Buffer.from('fixture setup executable');
const sha256 = (value) => `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;

function makeRelease({ appVersion = '3.3.7', electron = '46.0.0', node = '25.0.0', installerBytes = installer } = {}) {
  const manifestBytes = Buffer.from(JSON.stringify({ appVersion, electron, node, platform: 'win32', arch: 'x64' }));
  const manifestAsset = { name: 'runtime-manifest.json', digest: sha256(manifestBytes), browser_download_url: 'https://github.com/SamChico2008/Discord-Orbs-Studio/releases/download/v3.3.7/runtime-manifest.json' };
  const installerAsset = {
    name: `Discord.Orb.Studio.Setup.${appVersion}.exe`,
    digest: sha256(installerBytes),
    size: installerBytes.length,
    browser_download_url: `https://github.com/SamChico2008/Discord-Orbs-Studio/releases/download/v${appVersion}/Discord.Orb.Studio.Setup.${appVersion}.exe`
  };
  const release = { tag_name: `v${appVersion}`, draft: false, prerelease: false, assets: [manifestAsset, installerAsset] };
  const fetchJson = async (url) => {
    if (url.includes('nodejs.org')) return [{ version: 'v25.0.0', lts: 'Jod' }, { version: 'v26.0.0', lts: false }];
    if (url.includes('registry.npmjs.org')) return { version: '46.0.0' };
    if (url.includes('/releases/latest')) return release;
    throw new Error(`Unexpected URL ${url}`);
  };
  const fetchAsset = async (asset) => asset.name === manifestAsset.name ? manifestBytes : installerBytes;
  return { release, manifestAsset, installerAsset, manifestBytes, fetchJson, fetchAsset };
}

test('checks embedded Node.js and Electron and selects a compatible stable installer', async () => {
  const fixture = makeRelease();
  const result = await checkForPackagedRuntimeUpdates({
    appVersion: '3.3.6', runtime: currentRuntime, platform: 'win32',
    fetchJson: fixture.fetchJson, fetchAsset: fixture.fetchAsset
  });

  assert.equal(result.autoInstall, true);
  assert.deepEqual(result.updates.map(({ name, current, latest }) => ({ name, current, latest })), [
    { name: 'Node.js', current: '24.22.0', latest: '25.0.0' },
    { name: 'Electron', current: '45.0.0', latest: '46.0.0' }
  ]);
  assert.equal(result.updates[0].release.tag, 'v3.3.7');
  assert.equal(result.updates[0].release.installerDigest, fixture.installerAsset.digest);
});

test('does not download a setup when both embedded runtimes are current', async () => {
  const fixture = makeRelease();
  let releaseLookups = 0;
  const fetchJson = async (url) => {
    if (url.includes('nodejs.org')) return [{ version: 'v25.0.0', lts: 'Jod' }];
    if (url.includes('registry.npmjs.org')) return { version: '46.0.0' };
    if (url.includes('/releases/latest')) releaseLookups += 1;
    return fixture.fetchJson(url);
  };
  const result = await checkForPackagedRuntimeUpdates({
    appVersion: '3.3.7', runtime: { node: '25.0.0', electron: '46.0.0' }, platform: 'win32', fetchJson
  });

  assert.deepEqual(result.updates, []);
  assert.equal(releaseLookups, 0);
});

test('waits for a newer compatible app release when upstream runtimes are newer', async () => {
  const fixture = makeRelease({ appVersion: '3.3.6', electron: '45.0.0', node: '24.22.0' });
  const result = await checkForPackagedRuntimeUpdates({
    appVersion: '3.3.6', runtime: currentRuntime, platform: 'win32',
    fetchJson: fixture.fetchJson, fetchAsset: fixture.fetchAsset
  });

  assert.equal(result.pendingUpdate, true);
  assert.deepEqual(result.updates, []);
});

test('accepts a release that updates only the runtime which is behind', async () => {
  const fixture = makeRelease({ electron: '45.0.0', node: '25.0.0' });
  const fetchJson = async (url) => url.includes('registry.npmjs.org')
    ? { version: '45.0.0' }
    : fixture.fetchJson(url);
  const result = await checkForPackagedRuntimeUpdates({
    appVersion: '3.3.6', runtime: currentRuntime, platform: 'win32',
    fetchJson, fetchAsset: fixture.fetchAsset
  });

  assert.equal(result.autoInstall, true);
  assert.deepEqual(result.updates.map(({ name }) => name), ['Node.js']);
});

test('installs a compatible Electron update even when the separate Node LTS line is newer', async () => {
  const fixture = makeRelease({ electron: '46.0.0', node: '24.22.0' });
  const result = await checkForPackagedRuntimeUpdates({
    appVersion: '3.3.6', runtime: currentRuntime, platform: 'win32',
    fetchJson: fixture.fetchJson, fetchAsset: fixture.fetchAsset
  });

  assert.equal(result.autoInstall, true);
  assert.deepEqual(result.updates.map(({ name }) => name), ['Electron']);
  assert.equal(result.updates[0].latest, '46.0.0');
});

test('rejects a runtime manifest with a mismatched checksum', async () => {
  const fixture = makeRelease();
  fixture.fetchAsset = async () => Buffer.from('tampered manifest');

  await assert.rejects(checkForPackagedRuntimeUpdates({
    appVersion: '3.3.6', runtime: currentRuntime, platform: 'win32',
    fetchJson: fixture.fetchJson, fetchAsset: fixture.fetchAsset
  }), /Runtime manifest checksum verification failed/);
});

test('checks the installer before starting one silent install and restart handoff', async () => {
  const fixture = makeRelease();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-updater-test-'));
  let spawnCount = 0;
  let spawnedArgs;
  const spawnProcess = (executable, args, options) => {
    spawnCount += 1;
    spawnedArgs = { executable, args, options };
    const child = new EventEmitter();
    child.unref = () => {};
    process.nextTick(() => child.emit('spawn'));
    return child;
  };

  try {
    await assert.rejects(applyUpdates([
      { kind: 'runtime', release: { tag: 'v3.3.7', installerUrl: fixture.installerAsset.browser_download_url, installerDigest: 'sha256:' + '0'.repeat(64), installerSize: installer.length } },
      { kind: 'runtime', release: { tag: 'v3.3.7', installerUrl: fixture.installerAsset.browser_download_url, installerDigest: fixture.installerAsset.digest, installerSize: installer.length } }
    ], { tempDir, installDir: 'C:\\Orb Studio', download: async () => installer, spawnProcess }), /Installer checksum verification failed/);
    assert.equal(spawnCount, 0);

    await applyUpdates([
      { kind: 'runtime', release: { tag: 'v3.3.7', installerUrl: fixture.installerAsset.browser_download_url, installerDigest: fixture.installerAsset.digest, installerSize: installer.length } },
      { kind: 'runtime', release: { tag: 'v3.3.7', installerUrl: fixture.installerAsset.browser_download_url, installerDigest: fixture.installerAsset.digest, installerSize: installer.length } }
    ], { tempDir, installDir: 'C:\\Orb Studio', executableName: 'Discord Orb Studio.exe', download: async () => installer, spawnProcess });

    assert.equal(spawnCount, 1);
    assert.equal(spawnedArgs.executable, 'powershell.exe');
    const script = Buffer.from(spawnedArgs.args.at(-1), 'base64').toString('utf16le');
    assert.match(script, /Start-Process -FilePath \$installer -ArgumentList \$arguments -WindowStyle Hidden -Wait -PassThru/);
    assert.match(script, /\$arguments = @\('\/S', \('\"\/D=' \+ \$installDir \+ '\"'\)\)/);
    assert.match(script, /Test-Path -LiteralPath \$appPath/);
    assert.match(script, /Discord Orb Studio\.exe/);
    assert.equal(spawnedArgs.options.detached, true);
    const installerFile = fs.readdirSync(tempDir).find((name) => name.endsWith('-setup.exe'));
    assert.ok(installerFile);
    assert.deepEqual(fs.readFileSync(path.join(tempDir, installerFile)), installer);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
