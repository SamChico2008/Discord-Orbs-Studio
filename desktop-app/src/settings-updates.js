'use strict';

(() => {
  const button = document.getElementById('btn-check-updates');
  const status = document.getElementById('update-check-status');
  if (!button || !status) return;

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Checking…';
    status.textContent = 'Checking GitHub for updates…';
    try {
      const result = await window.electronAPI.checkForUpdates();
      switch (result.status) {
        case 'available':
          status.textContent = `Version ${result.latest} is available. Choose Update now or Later in the update window.`;
          break;
        case 'upToDate':
          status.textContent = `You're up to date! Version ${result.version} is the latest release.`;
          break;
        case 'deferred':
          status.textContent = `Version ${result.latest} is available. Check again whenever you're ready to update.`;
          break;
        case 'restarting':
          status.textContent = `Restarting to install version ${result.latest}…`;
          break;
        case 'pending':
          status.textContent = 'A new release is being prepared. Please try again later.';
          break;
        case 'busy':
          status.textContent = 'An update check or installation is already in progress. Please try again shortly.';
          break;
        case 'unsupported':
          status.textContent = 'Update checks are available in the installed Windows application.';
          break;
        case 'failed':
          status.textContent = 'The update could not be installed. You can try again.';
          break;
        case 'cancelled':
          status.textContent = 'The update check was cancelled. You can try again.';
          break;
        default:
          status.textContent = 'The update service is unavailable. Please try again.';
      }
    } catch {
      status.textContent = 'The update service is unavailable. Please try again.';
    } finally {
      button.disabled = false;
      button.textContent = 'Check for updates';
    }
  });
})();
