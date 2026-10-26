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
  const setAttributeIfChanged = (element, name, value) => {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  };
  const controlSelector = '.nav-btn, .preset-card, .pill, .theme-dot, .theme-quick-btn, .login-tab-btn';
  const syncControl = control => {
    const active = control.classList.contains('active');
    if (control.matches('.nav-btn')) {
      setAttributeIfChanged(control, 'aria-controls', control.dataset.tab);
      if (active) setAttributeIfChanged(control, 'aria-current', 'page');
      else if (control.hasAttribute('aria-current')) control.removeAttribute('aria-current');
    } else if (control.matches('.login-tab-btn')) {
      setAttributeIfChanged(control, 'role', 'tab');
      setAttributeIfChanged(control, 'aria-controls', control.dataset.loginTab);
      setAttributeIfChanged(control, 'aria-selected', String(active));
    } else {
      setAttributeIfChanged(control, 'aria-pressed', String(active));
    }
  };
  const syncCard = card => {
    setAttributeIfChanged(card, 'tabindex', '0');
    setAttributeIfChanged(card, 'role', 'group');
    const title = card.querySelector('.quest-title');
    setAttributeIfChanged(card, 'aria-label', (title ? title.textContent : 'Quest') + (card.classList.contains('selected') ? ', selected' : ''));
  };
  document.querySelector('.login-tabs').setAttribute('role', 'tablist');
  document.querySelectorAll('.login-tab-content').forEach(panel => panel.setAttribute('role', 'tabpanel'));
  const stateObserver = new MutationObserver(records => {
    const changedControls = new Set();
    const changedCards = new Set();
    records.forEach(record => {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (record.type === 'attributes') {
        if (target.matches(controlSelector)) changedControls.add(target);
        if (target.matches('.quest-card')) changedCards.add(target);
      } else {
        const card = target.closest('.quest-card');
        if (card) changedCards.add(card);
        record.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches('.quest-card')) changedCards.add(node);
          node.querySelectorAll('.quest-card').forEach(addedCard => changedCards.add(addedCard));
        });
      }
    });
    changedControls.forEach(syncControl);
    changedCards.forEach(card => { if (card.isConnected) syncCard(card); });
  });
  document.querySelectorAll(controlSelector).forEach(control => {
    syncControl(control);
    stateObserver.observe(control, { attributes: true, attributeFilter: ['class'] });
  });
  document.querySelectorAll('.quest-card').forEach(syncCard);
  stateObserver.observe(document.getElementById('quests-container'), { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  document.getElementById('quests-container').addEventListener('keydown', event => {
    if (event.target.classList.contains('quest-card') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      event.target.click();
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
})();
