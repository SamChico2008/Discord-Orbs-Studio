'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function renderer(summary) {
  const elements = new Map();
  const acknowledged = [];
  let requested = 0;
  let focused;
  function element(tag = 'div') {
    return {
      tag, children: [], listeners: new Map(), textContent: '', isConnected: true, disabled: false,
      append(child) { this.children.push(child); },
      replaceChildren() { this.children = []; },
      addEventListener(name, callback) { this.listeners.set(name, callback); },
      focus() { focused = this; },
      showModal() { this.open = true; },
      close() { this.open = false; },
      set innerHTML(value) { throw new Error('Remote notes must never be interpreted as HTML'); }
    };
  }
  const initialFocus = element('button');
  focused = initialFocus;
  const document = {
    get activeElement() { return focused; },
    getElementById: (id) => {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    createElement: element
  };
  const window = { electronAPI: {
    getReleaseNotes: async () => { requested += 1; return summary; },
    acknowledgeReleaseNotes: async (version) => { acknowledged.push(version); return true; }
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/release-notes.js'), 'utf8'), { window, document, console });
  return { window, elements, acknowledged, initialFocus, focus: () => focused, requested: () => requested };
}

test('the main menu dialog renders installed-version headings and lists without executing release HTML', async () => {
  const subject = renderer({ version: '3.3.9', previousVersion: '3.3.8', title: 'A release',
    body: '### Improvements\n- Useful change\n\n<img src=x onerror=alert(1)>' });
  assert.equal(await subject.window.showReleaseNotes(), true);
  const body = subject.elements.get('release-notes-body');
  assert.deepEqual(body.children.map((child) => child.tag), ['h3', 'ul', 'p']);
  assert.equal(body.children[2].textContent, '<img src=x onerror=alert(1)>');
  assert.equal(subject.elements.get('release-notes-title').textContent, "What's new in v3.3.9");
  assert.equal(subject.elements.get('release-notes-version').textContent, 'v3.3.8 → v3.3.9');
  assert.equal(subject.elements.get('release-notes-modal').open, true);
  assert.equal(subject.focus(), subject.elements.get('release-notes-continue'));
  assert.deepEqual(subject.acknowledged, []);
});

test('summary links display readable labels without URLs or Markdown punctuation', async () => {
  const subject = renderer({ version: '3.3.12', title: 'Clearer summaries',
    body: '### Improvements\n- Open the [update settings](https://github.com/example/settings).\nRead the **[release notes](https://github.com/example/release)**.\n<img src=x onerror=alert(1)>' });
  assert.equal(await subject.window.showReleaseNotes(), true);
  const children = subject.elements.get('release-notes-body').children;
  assert.equal(children[1].children[0].textContent, 'Open the update settings.');
  assert.equal(children[2].textContent, 'Read the release notes. <img src=x onerror=alert(1)>');
  assert.doesNotMatch(children.map((child) => child.textContent).join(' '), /https:|\]\(/);
});

test('Continue acknowledges only the displayed version, closes the popup and restores focus', async () => {
  const subject = renderer({ version: '3.3.9', title: 'Notes', body: '- A change' });
  await subject.window.showReleaseNotes();
  await subject.elements.get('release-notes-continue').listeners.get('click')();
  assert.deepEqual(subject.acknowledged, ['3.3.9']);
  assert.equal(subject.elements.get('release-notes-modal').open, false);
  assert.equal(subject.focus(), subject.initialFocus);
});

test('Escape follows the same dismissal flow and repeated startup requests do not reopen the dialog', async () => {
  const subject = renderer({ version: '3.3.9', title: 'Notes', body: '- A change' });
  await subject.window.showReleaseNotes();
  let prevented = false;
  subject.elements.get('release-notes-modal').listeners.get('cancel')({ preventDefault() { prevented = true; } });
  await new Promise(setImmediate);
  assert.equal(prevented, true);
  assert.deepEqual(subject.acknowledged, ['3.3.9']);
  assert.equal(subject.elements.get('release-notes-modal').open, false);
  assert.equal(await subject.window.showReleaseNotes(), false);
  assert.equal(subject.requested(), 1);
});

test('a launch without pending update notes leaves the main menu unobstructed', async () => {
  const subject = renderer(null);
  assert.equal(await subject.window.showReleaseNotes(), false);
  assert.equal(subject.elements.get('release-notes-modal').open, undefined);
  assert.deepEqual(subject.acknowledged, []);
});

test('the real main menu loads the summary stylesheet and script and gives the summary priority over beta', () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/index.html'), 'utf8');
  assert.match(html, /<dialog[^>]*id="release-notes-modal"[^>]*aria-labelledby="release-notes-title"/);
  assert.match(html, /href="release-notes.css"/);
  assert.ok(html.indexOf('src="release-notes.js"') < html.indexOf('src="app.js"'));
  const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  const boot = source.slice(source.indexOf('function bootApp()'));
  assert.match(boot, /await window.showReleaseNotes\?\.\(\)/);
  assert.match(boot, /if \(!showedReleaseNotes\) checkBetaNotice\(\)/);
});
