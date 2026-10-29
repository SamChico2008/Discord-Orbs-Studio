'use strict';

const fs = require('node:fs');
const path = require('node:path');

function normalizeReleaseNotes(notes, version) {
  const clean = (value, limit) => String(value || '').replace(/<!--[\s\S]*?(?:-->|$)/g, '').slice(0, limit).trim();
  const lines = clean(notes?.body, 64000).split(/\r?\n/);
  const details = lines.findIndex((line) => /^#{1,6}\s+(?:installation|download verification|download checksums|checksums|educational purpose(?: disclaimer)?|vérification du téléchargement|utilisation)\s*#*\s*$/i.test(line.trim()));
  const summary = (details < 0 ? lines : lines.slice(0, details))
    .filter((line) => !/^#\s+Discord Orb Studio(?:\s+v?\d+\.\d+\.\d+.*)?\s*$/i.test(line.trim()))
    .join('\n').trim();
  return {
    version,
    title: clean(notes?.title, 300) || `Discord Orb Studio ${version}`,
    body: summary
  };
}

function readBundledReleaseNotes(filename, version) {
  try {
    const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
    const start = lines.findIndex((line) => line.trim() === `## ${version}`);
    if (start < 0) return null;
    const remainder = lines.slice(start + 1);
    const end = remainder.findIndex((line) => /^##\s/.test(line));
    return normalizeReleaseNotes({ body: (end < 0 ? remainder : remainder.slice(0, end)).join('\n') }, version);
  } catch {
    return null;
  }
}

function createReleaseNotesStore({ filePath, bundledPath, currentVersion, fetchNotes }) {
  let state = {};
  try {
    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) state = saved;
  } catch {}

  function save(next) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporary = `${filePath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, filePath);
    state = next;
  }

  return {
    initialize({ updated = false } = {}) {
      const previous = state.lastRunVersion;
      const advanced = typeof previous === 'string' && currentVersion.localeCompare(previous, 'en', { numeric: true }) > 0;
      const pending = state.pending?.version === currentVersion ? state.pending : null;
      const shouldShow = state.dismissedVersion !== currentVersion && (advanced || pending || (updated && !previous));
      save({
        ...state,
        lastRunVersion: currentVersion,
        pending: shouldShow ? (pending || { version: currentVersion, previousVersion: previous || null }) : null
      });
    },
    stageUpdate(update) {
      if (!/^\d+\.\d+\.\d+$/.test(update.latest || '')) throw new Error('Invalid update version for release notes');
      save({ ...state, pending: {
        version: update.latest,
        previousVersion: currentVersion,
        notes: normalizeReleaseNotes(update.release?.notes?.version === update.latest ? update.release.notes : {}, update.latest)
      } });
    },
    cancelUpdate(version) {
      if (state.pending?.version === version) save({ ...state, pending: null });
    },
    async getPendingSummary() {
      const pending = state.pending;
      if (!pending || pending.version !== currentVersion || state.dismissedVersion === currentVersion) return null;
      let notes = normalizeReleaseNotes(pending.notes, currentVersion);
      if (!notes.body) notes = readBundledReleaseNotes(bundledPath, currentVersion) || notes;
      if (!notes.body && fetchNotes) {
        try { notes = normalizeReleaseNotes(await fetchNotes(currentVersion), currentVersion); } catch {}
      }
      if (!notes.body) return null;
      save({ ...state, pending: { ...pending, notes } });
      return { ...notes, previousVersion: pending.previousVersion || null };
    },
    acknowledge(version) {
      if (version !== currentVersion || state.pending?.version !== currentVersion) return false;
      save({ ...state, dismissedVersion: currentVersion, pending: null });
      return true;
    }
  };
}

module.exports = { normalizeReleaseNotes, readBundledReleaseNotes, createReleaseNotesStore };
