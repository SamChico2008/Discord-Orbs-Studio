'use strict';

(() => {
  const dialog = document.getElementById('app-update-modal');
  const install = document.getElementById('app-update-install');
  const later = document.getElementById('app-update-later');
  const close = document.getElementById('app-update-close');
  if (!dialog || !window.electronAPI?.getApplicationUpdateState) return;
  let state = { phase: 'idle' };
  let enabled = false;
  let sending = false;
  let previousFocus = null;
  let receivedState = false;

  function render() {
    if (!enabled) return false;
    if (state.phase === 'idle') {
      if (dialog.open) {
        dialog.close();
        if (previousFocus?.isConnected) previousFocus.focus();
      }
      return false;
    }
    if (!['available', 'installing', 'restarting', 'failed'].includes(state.phase)) return false;
    if (!dialog.open && document.querySelector('dialog[open]')) return false;
    const busy = sending || ['installing', 'restarting'].includes(state.phase);
    document.getElementById('app-update-current').textContent = `v${state.current}`;
    document.getElementById('app-update-latest').textContent = `v${state.latest}`;
    const messages = {
      available: ['A new version is ready', 'Choose Update now to install, or Later to keep using the studio.'],
      installing: ['Updating your studio', 'Downloading and checking the update. Please keep the app open.'],
      restarting: ['Your update is ready', 'The studio will close and restart after installation.'],
      failed: ['The update did not finish', 'Your current version is still available. Try again, or choose Later.']
    };
    document.getElementById('app-update-title').textContent = messages[state.phase][0];
    document.getElementById('app-update-status').textContent = messages[state.phase][1];
    install.textContent = state.phase === 'failed' ? 'Try again' : busy ? 'Updating…' : 'Update now';
    install.disabled = busy;
    later.disabled = busy;
    close.disabled = busy;
    if (!dialog.open) {
      previousFocus = document.activeElement;
      dialog.showModal();
      later.focus();
    }
    return true;
  }

  async function choose(choice) {
    if (sending || !['available', 'failed'].includes(state.phase)) return;
    sending = true;
    render();
    try {
      const result = await window.electronAPI.applicationUpdateChoice(choice);
      if (result.state) state = result.state;
      else state = await window.electronAPI.getApplicationUpdateState();
    } catch {
      state = { ...state, phase: 'failed' };
    } finally {
      sending = false;
      render();
    }
  }

  install.addEventListener('click', () => choose('install'));
  later.addEventListener('click', () => choose('later'));
  close.addEventListener('click', () => choose('later'));
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); choose('later'); });
  document.addEventListener('close', render, true);
  window.enableApplicationUpdatePrompts = () => { enabled = true; return render(); };
  window.electronAPI.onApplicationUpdateState((next) => { receivedState = true; state = next; render(); });
  window.electronAPI.getApplicationUpdateState().then((initial) => {
    if (!receivedState) { state = initial; render(); }
  }).catch(() => {});
})();
