(() => {
  window.confirmVaultClear = () => new Promise(resolve => {
    const dialog = document.getElementById('confirm-clear-vault');
    dialog.returnValue = 'cancel';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), {once:true});
    dialog.showModal();
  });
  const controls = document.querySelectorAll('.clickable-stat, .preset-card, .panel-user-clickable');
  controls.forEach(control => {
    control.tabIndex = 0;
    control.setAttribute('role', 'button');
    control.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        control.click();
      }
    });
  });
  document.querySelectorAll('button[title]').forEach(button => {
    if (!button.textContent.trim()) button.setAttribute('aria-label', button.title);
  });
  document.querySelectorAll('.setting-item').forEach(row => {
    const input = row.querySelector('input');
    const title = row.querySelector('.setting-title');
    if (input && title) input.setAttribute('aria-label', title.textContent);
  });
  const syncStates = () => {
    document.querySelectorAll('.nav-btn').forEach(button => {
      button.setAttribute('aria-controls', button.dataset.tab);
      if (button.classList.contains('active')) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('.preset-card, .pill, .theme-dot, .theme-quick-btn').forEach(control => control.setAttribute('aria-pressed', String(control.classList.contains('active'))));
    document.querySelectorAll('.login-tab-btn').forEach(button => {
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', button.dataset.loginTab);
      button.setAttribute('aria-selected', String(button.classList.contains('active')));
    });
    document.querySelectorAll('.login-tab-content').forEach(panel => panel.setAttribute('role', 'tabpanel'));
    document.querySelectorAll('.quest-card').forEach(card => {
      card.tabIndex = 0;
      card.setAttribute('role', 'group');
      const title = card.querySelector('.quest-title');
      card.setAttribute('aria-label', (title ? title.textContent : 'Quest') + (card.classList.contains('selected') ? ', selected' : ''));
    });
  };
  document.querySelector('.login-tabs').setAttribute('role', 'tablist');
  document.querySelectorAll('.nav-btn, .preset-card, .pill, .theme-dot, .theme-quick-btn, .login-tab-btn').forEach(control => new MutationObserver(syncStates).observe(control, { attributes: true, attributeFilter: ['class'] }));
  new MutationObserver(syncStates).observe(document.getElementById('quests-container'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  document.getElementById('quests-container').addEventListener('keydown', event => {
    if (event.target.classList.contains('quest-card') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      event.target.click();
      syncStates();
    }
  });
  document.querySelectorAll('.login-tab-btn').forEach(button => button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...document.querySelectorAll('.login-tab-btn')];
    const next = tabs[(tabs.indexOf(button) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.click();
    next.focus();
  }));
  const focusableSelector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]';
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    let previousFocus;
    let wasOpen = false;
    new MutationObserver(() => {
      const isOpen = modal.style.display !== 'none';
      if (isOpen && !wasOpen) {
        previousFocus = document.activeElement;
        modal.querySelector('button').focus();
      } else if (!isOpen && wasOpen && previousFocus) previousFocus.focus();
      wasOpen = isOpen;
    }).observe(modal, {attributes: true, attributeFilter:['style']});
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') modal.querySelector('.modal-close-btn').click();
      if (event.key !== 'Tab') return;
      const elements = [...modal.querySelectorAll(focusableSelector)].filter(element => element.getClientRects().length);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  });
  syncStates();
})();
