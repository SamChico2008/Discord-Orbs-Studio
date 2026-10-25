'use strict';

const stateIds = {
  checking: 'state-checking',
  upToDate: 'state-up-to-date',
  offline: 'state-offline',
  unavailable: 'state-unavailable',
  updateAvailable: 'state-update',
  installing: 'state-installing',
  restarting: 'state-restarting',
  failed: 'state-failed'
};

function renderUpdates(updates) {
  const list = document.getElementById('update-list');
  list.replaceChildren();
  for (const update of updates || []) {
    const row = document.createElement('div');
    row.className = 'update-row';
    const name = document.createElement('span');
    name.className = 'update-name';
    name.textContent = update.name;
    const versions = document.createElement('span');
    versions.className = 'update-versions';
    const oldVersion = document.createElement('span');
    oldVersion.textContent = update.current || 'non installé';
    const arrow = document.createTextNode('  →  ');
    const newVersion = document.createElement('strong');
    newVersion.textContent = update.latest;
    versions.append(oldVersion, arrow, newVersion);
    row.append(name, versions);
    list.append(row);
  }
}

window.setStartupState = (state = {}) => {
  document.querySelectorAll('.launch-state').forEach((panel) => panel.classList.add('is-hidden'));
  const id = stateIds[state.mode] || stateIds.checking;
  document.getElementById(id).classList.remove('is-hidden');
  if (state.mode === 'updateAvailable') renderUpdates(state.updates);
  if (state.mode === 'failed') document.getElementById('error-detail').textContent = state.message || '';
};

document.querySelectorAll('[data-choice]').forEach((button) => {
  button.addEventListener('click', async () => {
    document.querySelectorAll('[data-choice]').forEach((item) => { item.disabled = true; });
    try { await window.electronAPI.startupUpdateChoice(button.dataset.choice); } catch (_) {}
  });
});
