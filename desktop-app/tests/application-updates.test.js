'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { checkForPackagedAppUpdates, checkForUpdates, applyUpdates } = require('../update-manager');

function releaseFixture({ version = '3.3.9', name = `Discord.Orb.Studio.Setup.${version}.exe` } = {}) {
  return {
    tag_name: `v${version}`,
    draft: false,
    prerelease: false,
    assets: [{
      name,
      size: 100,
      digest: `sha256:${'a'.repeat(64)}`,
      browser_download_url: `https://github.com/SamChico2008/Discord-Orbs-Studio/releases/download/v${version}/${encodeURIComponent(name)}`
    }]
  };
}

const check = (release, options = {}) => checkForPackagedAppUpdates({
  appVersion: '3.3.8', platform: 'win32', fetchJson: async () => release, ...options
});

test('offers a newer application release without consulting Node, Electron or a runtime manifest', async () => {
  const calls = [];
  const result = await check(releaseFixture(), { fetchJson: async (url) => {
    calls.push(url);
    assert.equal(url, 'https://api.github.com/repos/SamChico2008/Discord-Orbs-Studio/releases/latest');
    return releaseFixture();
  } });
  assert.equal(calls.length, 1);
  assert.equal(result.autoInstall, false);
  assert.equal(result.updates.length, 1);
  assert.deepEqual(result.updates[0], {
    kind: 'application', name: 'Discord Orb Studio', current: '3.3.8', latest: '3.3.9',
    release: {
      tag: 'v3.3.9',
      installerUrl: releaseFixture().assets[0].browser_download_url,
      installerDigest: `sha256:${'a'.repeat(64)}`,
      installerSize: 100,
      notes: { version: '3.3.9', title: 'Discord Orb Studio 3.3.9', body: '' }
    }
  });
});

test('the packaged entry point uses the installed app version for GitHub checks', async () => {
  const result = await checkForUpdates({ packaged: true, appVersion: '3.3.8', platform: 'win32', fetchJson: async () => releaseFixture() });
  assert.equal(result.updates[0].latest, '3.3.9');
  assert.equal(result.autoInstall, false);
});

test('accepts the existing unversioned setup and GitHub-normalized setup filenames', async () => {
  for (const name of ['Discord Orb Studio Setup.exe', 'Discord.Orb.Studio.Setup.exe', 'Discord Orb Studio Setup 3.3.9.exe']) {
    assert.equal((await check(releaseFixture({ name }))).updates.length, 1, name);
  }
});

test('ignores equal and older versions, drafts, prereleases and invalid tags', async () => {
  for (const release of [releaseFixture({ version: '3.3.8' }), releaseFixture({ version: '3.3.7' }),
    { ...releaseFixture(), draft: true }, { ...releaseFixture(), prerelease: true },
    { ...releaseFixture(), tag_name: 'v3.3.9-beta.1' }, { ...releaseFixture(), tag_name: 'invalid' }]) {
    assert.deepEqual((await check(release)).updates, []);
  }
  assert.equal((await check(releaseFixture({ version: '3.3.10' }))).updates[0].latest, '3.3.10');
});

test('accepts a stable version tag without the v prefix', async () => {
  const release = releaseFixture();
  release.tag_name = '3.3.9';
  release.assets[0].browser_download_url = release.assets[0].browser_download_url.replace('/v3.3.9/', '/3.3.9/');
  const result = await check(release);
  assert.equal(result.updates[0].release.tag, 'v3.3.9');
});

test('reports a release awaiting a usable installer rather than claiming it is offline', async () => {
  for (const mutate of [
    (asset) => { asset.name = 'Discord Orb Studio.exe'; },
    (asset) => { asset.digest = null; },
    (asset) => { asset.size = 201 * 1024 * 1024; },
    (asset) => { asset.size = 0; },
    (asset) => { asset.browser_download_url = 'https://example.com/setup.exe'; },
    (asset) => { asset.browser_download_url = 'https://github.com/SamChico2008/Discord-Orbs-Studio/releases/download/v3.3.7/setup.exe'; }
  ]) {
    const release = releaseFixture();
    mutate(release.assets[0]);
    const result = await check(release);
    assert.deepEqual(result.updates, []);
    assert.equal(result.pendingUpdate, true);
    assert.equal(result.latestVersion, '3.3.9');
  }
});

test('keeps HTTP failures distinct from the absence of an application update', async () => {
  for (const statusCode of [404, 403, 429]) {
    const result = await checkForUpdates({ packaged: true, platform: 'win32', fetchJson: async () => {
      throw Object.assign(new Error(`Update service returned HTTP ${statusCode}`), { statusCode });
    } });
    assert.deepEqual(result.updates, []);
    assert.equal(result.unavailable, statusCode === 404);
    assert.match(result.errors[0], new RegExp(`HTTP ${statusCode}`));
  }
});

test('a network failure is recoverable and development launches do not install toolchains', async () => {
  const result = await checkForUpdates({ packaged: true, platform: 'win32', fetchJson: async () => { throw new Error('Network timed out'); } });
  assert.deepEqual(result.updates, []);
  assert.deepEqual(result.errors, ['Network timed out']);
  const development = await checkForUpdates({ packaged: false, fetchJson: async () => { throw new Error('Must not request updates'); } });
  assert.equal(development.unsupported, true);
});

test('does not offer Windows installers on unsupported platforms', async () => {
  const result = await check(null, { platform: 'darwin', fetchJson: async () => { throw new Error('Must not fetch'); } });
  assert.equal(result.unsupported, true);
  assert.deepEqual(result.updates, []);
});

test('application installers use checksum verification before any process is launched', async () => {
  const result = await check(releaseFixture());
  let spawned = false;
  await assert.rejects(applyUpdates(result.updates, {
    tempDir: require('node:os').tmpdir(), installDir: 'C:\\Orb Studio',
    download: async () => Buffer.alloc(100), spawnProcess: () => { spawned = true; }
  }), /checksum verification failed/);
  assert.equal(spawned, false);
});
