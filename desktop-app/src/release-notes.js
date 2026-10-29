'use strict';

(() => {
  const dialog = document.getElementById('release-notes-modal');
  const continueButton = document.getElementById('release-notes-continue');
  const closeButton = document.getElementById('release-notes-close');
  let summary = null;
  let previousFocus = null;
  let requested = false;
  let dismissing = false;

  function renderBody(body) {
    const container = document.getElementById('release-notes-body');
    container.replaceChildren();
    let list = null;
    let paragraph = null;
    for (const line of body.split(/\r?\n/)) {
      const text = line.trim().replace(/\*\*(.*?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
      if (!text) { list = null; paragraph = null; continue; }
      const heading = text.match(/^#{1,6}\s+(.+)$/);
      const bullet = text.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/);
      if (heading) {
        const element = document.createElement('h3');
        element.textContent = heading[1];
        container.append(element);
        list = null;
        paragraph = null;
      } else if (bullet) {
        if (!list) { list = document.createElement('ul'); container.append(list); }
        const item = document.createElement('li');
        item.textContent = bullet[1];
        list.append(item);
        paragraph = null;
      } else {
        if (!paragraph) { paragraph = document.createElement('p'); container.append(paragraph); }
        paragraph.textContent += `${paragraph.textContent ? ' ' : ''}${text}`;
        list = null;
      }
    }
  }

  async function dismiss() {
    if (!summary || dismissing) return;
    dismissing = true;
    continueButton.disabled = true;
    closeButton.disabled = true;
    try {
      await window.electronAPI.acknowledgeReleaseNotes(summary.version);
    } catch (error) {
      console.error('Could not acknowledge release notes:', error);
    } finally {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    }
  }

  continueButton?.addEventListener('click', dismiss);
  closeButton?.addEventListener('click', dismiss);
  dialog?.addEventListener('cancel', (event) => { event.preventDefault(); dismiss(); });

  window.showReleaseNotes = async () => {
    if (!dialog || !window.electronAPI?.getReleaseNotes || requested) return false;
    requested = true;
    try {
      summary = await window.electronAPI.getReleaseNotes();
      if (!summary?.body) return false;
      document.getElementById('release-notes-title').textContent = `What's new in v${summary.version}`;
      document.getElementById('release-notes-subtitle').textContent = summary.title;
      document.getElementById('release-notes-version').textContent = summary.previousVersion
        ? `v${summary.previousVersion} → v${summary.version}` : `v${summary.version}`;
      renderBody(summary.body);
      previousFocus = document.activeElement;
      dialog.showModal();
      continueButton.focus();
      return true;
    } catch (error) {
      console.error('Could not show release notes:', error);
      return false;
    }
  };
})();
