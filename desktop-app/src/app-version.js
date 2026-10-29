'use strict';

(async () => {
  const badge = document.getElementById('app-version');
  if (!badge || !window.electronAPI?.getAppVersion) return;
  try {
    const version = await window.electronAPI.getAppVersion();
    badge.textContent = `v${version}`;
    badge.title = `Discord Orb Studio ${version}`;
  } catch (error) {
    console.error('Could not read the installed application version:', error);
  }
})();
