'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createReleaseNotesStore, normalizeReleaseNotes, readBundledReleaseNotes } = require('../release-notes');

function fixture(context, currentVersion = '3.3.9', options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-release-notes-'));
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'state.json');
  const bundledPath = path.join(directory, 'CHANGELOG.md');
  fs.writeFileSync(bundledPath, '## 3.3.9\n\n### Nouveautés\n- Résumé après installation.\n\n## 3.3.8\n\n- Ancien contenu.\n');
  return { filePath, bundledPath, store: createReleaseNotesStore({ filePath, bundledPath, currentVersion, ...options }) };
}

test('a fresh installation records its version without announcing an update', async (context) => {
  const { store } = fixture(context);
  store.initialize();
  assert.equal(await store.getPendingSummary(), null);
});

test('an installed upgrade shows its own cached GitHub summary offline', async (context) => {
  const { store, filePath, bundledPath } = fixture(context, '3.3.8');
  store.initialize();
  store.stageUpdate({ latest: '3.3.9', release: { notes: {
    version: '3.3.9', title: 'Studio improvements', body: '### Fixes\n- A real fix.\n<!-- orb-runtime-manifest:YWJj -->'
  } } });
  const upgraded = createReleaseNotesStore({ filePath, bundledPath, currentVersion: '3.3.9', fetchNotes: async () => { throw new Error('Offline'); } });
  upgraded.initialize({ updated: true });
  const summary = await upgraded.getPendingSummary();
  assert.equal(summary.version, '3.3.9');
  assert.equal(summary.previousVersion, '3.3.8');
  assert.equal(summary.title, 'Studio improvements');
  assert.equal(summary.body, '### Fixes\n- A real fix.');
  assert.doesNotMatch(summary.body, /orb-runtime/);
});

test('acknowledging the popup prevents it on the next launch of the same version', async (context) => {
  const { store, filePath, bundledPath } = fixture(context);
  store.initialize({ updated: true });
  assert.ok(await store.getPendingSummary());
  assert.equal(store.acknowledge('3.3.9'), true);
  const reopened = createReleaseNotesStore({ filePath, bundledPath, currentVersion: '3.3.9' });
  reopened.initialize({ updated: true });
  assert.equal(await reopened.getPendingSummary(), null);
});

test('an unread summary survives an application restart', async (context) => {
  const { store, filePath, bundledPath } = fixture(context);
  store.initialize({ updated: true });
  assert.ok(await store.getPendingSummary());
  const reopened = createReleaseNotesStore({ filePath, bundledPath, currentVersion: '3.3.9' });
  reopened.initialize();
  assert.ok(await reopened.getPendingSummary());
});

test('manual upgrades use the installed version changelog when offline', async (context) => {
  const { filePath, bundledPath } = fixture(context);
  fs.writeFileSync(filePath, JSON.stringify({ lastRunVersion: '3.3.8' }));
  const store = createReleaseNotesStore({ filePath, bundledPath, currentVersion: '3.3.9' });
  store.initialize();
  const summary = await store.getPendingSummary();
  assert.equal(summary.body, '### Nouveautés\n- Résumé après installation.');
  assert.equal(summary.previousVersion, '3.3.8');
  assert.doesNotMatch(summary.body, /Ancien contenu/);
});

test('a failed installation never announces a version that was not installed', async (context) => {
  const { store, filePath, bundledPath } = fixture(context, '3.3.8');
  store.initialize();
  store.stageUpdate({ latest: '3.3.9', release: {} });
  store.cancelUpdate('3.3.9');
  const reopened = createReleaseNotesStore({ filePath, bundledPath, currentVersion: '3.3.8' });
  reopened.initialize({ updated: true });
  assert.equal(await reopened.getPendingSummary(), null);
});

test('a rollback clears staged notes instead of announcing the wrong version', async (context) => {
  const { filePath, bundledPath } = fixture(context);
  fs.writeFileSync(filePath, JSON.stringify({ lastRunVersion: '3.4.0', pending: { version: '3.4.0' } }));
  const store = createReleaseNotesStore({ filePath, bundledPath, currentVersion: '3.3.9' });
  store.initialize({ updated: true });
  assert.equal(await store.getPendingSummary(), null);
});

test('an installer handoff that relaunches the old executable does not announce update completion', async (context) => {
  const { store, filePath, bundledPath } = fixture(context, '3.3.8');
  store.initialize();
  store.stageUpdate({ latest: '3.3.9', release: { notes: { version: '3.3.9', body: '- Future changes.' } } });
  const reopened = createReleaseNotesStore({ filePath, bundledPath, currentVersion: '3.3.8' });
  reopened.initialize({ updated: true });
  assert.equal(await reopened.getPendingSummary(), null);
});

test('release lookup requests the installed tag and rejects notes for a different version', async () => {
  const { fetchReleaseNotes } = require('../update-manager');
  const urls = [];
  const notes = await fetchReleaseNotes('3.3.9', { fetchJson: async (url) => {
    urls.push(url);
    return { tag_name: 'v3.3.9', body: '- Matching changes.\n<!-- hidden -->' };
  } });
  assert.deepEqual(urls, ['https://api.github.com/repos/SamChico2008/Discord-Orbs-Studio/releases/tags/v3.3.9']);
  assert.equal(notes.body, '- Matching changes.');
  await assert.rejects(fetchReleaseNotes('3.3.9', { fetchJson: async () => ({ tag_name: 'v3.4.0', body: '- Wrong version.' }) }), /do not match/);
});

test('a subsequent release gets its own popup after a previous version was read', async (context) => {
  const { store, filePath, bundledPath } = fixture(context);
  store.initialize({ updated: true });
  store.acknowledge('3.3.9');
  store.stageUpdate({ latest: '3.4.0', release: { notes: { version: '3.4.0', body: '- Next version changes.' } } });
  const next = createReleaseNotesStore({ filePath, bundledPath, currentVersion: '3.4.0' });
  next.initialize();
  assert.equal((await next.getPendingSummary()).body, '- Next version changes.');
  assert.equal(next.acknowledge('3.3.9'), false);
});

test('notes normalization strips private metadata comments and bounds remote content', () => {
  const notes = normalizeReleaseNotes({ version: '3.3.9', title: 'A title', body: '<!-- metadata\nsecret -->\n- Visible improvement.' }, '3.3.9');
  assert.equal(notes.body, '- Visible improvement.');
  assert.ok(normalizeReleaseNotes({ body: 'x'.repeat(100000) }, '3.3.9').body.length <= 64000);
});

test('the bundled changelog has a summary for the version actually being packaged', () => {
  const version = require('../package.json').version;
  assert.ok(readBundledReleaseNotes(path.join(__dirname, '../CHANGELOG.md'), version)?.body);
});
