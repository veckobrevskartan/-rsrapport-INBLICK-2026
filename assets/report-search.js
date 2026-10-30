(() => {
  'use strict';
  const form = document.getElementById('report-search-form');
  const input = document.getElementById('report-search-input');
  const results = document.getElementById('report-search-results');
  const status = document.getElementById('report-search-status');
  const list = document.getElementById('report-search-list');
  const more = document.getElementById('report-search-more');
  const normalize = text => text.toLocaleLowerCase('sv').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const clean = text => text.replace(/\s+/g, ' ').trim();
  const entries = [];
  let heading = 'Rapporten';
  document.querySelectorAll('main h2, main h3, main h4, main h5, main h6, main dt, main dd, main caption, main p, main li, main td, main th, main figcaption, main summary').forEach((node, index) => {
    if (node.closest('script, style, nav, [aria-hidden="true"]')) return;
    if (/^H[23456]$/.test(node.tagName)) heading = clean(node.textContent);
    if (node.parentElement.closest('p, li, td, th, figcaption, summary')) return;
    const text = clean(node.textContent);
    if (text.length < 3) return;
    if (!node.id) node.id = 'report-search-hit-' + index;
    entries.push({ node, text, normalized: normalize(text), heading });
  });
  let matches = [], terms = [], shown = 0, timer, focusedTarget;
  function snippet(entry) {
    const first = Math.min(...terms.map(term => entry.normalized.indexOf(term)).filter(i => i >= 0));
    const start = Math.max(0, first - 85);
    const text = (start ? '…' : '') + entry.text.slice(start, start + 270) + (entry.text.length > start + 270 ? '…' : '');
    const paragraph = document.createElement('p');
    const normalized = normalize(text);
    let position = 0;
    while (position < text.length) {
      const next = terms.map(term => ({ index: normalized.indexOf(term, position), length: term.length })).filter(hit => hit.index >= 0).sort((a,b) => a.index - b.index || b.length - a.length)[0];
      if (!next) { paragraph.append(document.createTextNode(text.slice(position))); break; }
      paragraph.append(document.createTextNode(text.slice(position, next.index)));
      const mark = document.createElement('mark');
      mark.textContent = text.slice(next.index, next.index + next.length);
      paragraph.append(mark);
      position = next.index + next.length;
    }
    return paragraph;
  }
  function reveal(entry) {
    const caseCard = entry.node.closest('.fall-card');
    if (caseCard && caseCard.hidden) {
      const root = caseCard.closest('.fall-explorer');
      if (root) {
        for (const name of ['case-country', 'case-theme', 'case-query', 'case-period']) {
          const control = root.querySelector('[name="' + name + '"]');
          if (control) control.value = name === 'case-period' ? 'all' : '';
        }
        root.querySelector('[name="case-period"]')?.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    let ancestor = entry.node.parentElement;
    while (ancestor) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
      if (ancestor.dataset.scenarioPanel) document.getElementById('scenario-' + ancestor.dataset.scenarioPanel)?.click();
      if (ancestor.hasAttribute('data-space-service-panel')) {
        const key = ancestor.dataset.spaceServicePanel;
        const tab = [...document.querySelectorAll('[data-space-service]')].find(item => item.dataset.spaceService === key);
        if (tab) tab.click();
      }
      ancestor = ancestor.parentElement;
    }
    if (focusedTarget) focusedTarget.classList.remove('report-search-target');
    focusedTarget = entry.node;
    entry.node.classList.add('report-search-target');
    entry.node.setAttribute('tabindex', '-1');
    requestAnimationFrame(() => {
      entry.node.focus({ preventScroll: true });
      entry.node.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  }
  function appendPage() {
    const end = Math.min(shown + 20, matches.length);
    for (; shown < end; shown++) {
      const entry = matches[shown];
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#' + entry.node.id;
      link.textContent = entry.heading;
      link.addEventListener('click', () => reveal(entry));
      item.append(link, snippet(entry));
      list.append(item);
    }
    more.hidden = shown >= matches.length;
    more.textContent = 'Visa fler träffar (' + shown + ' av ' + matches.length + ' visas)';
  }
  function search() {
    clearTimeout(timer);
    const query = clean(input.value);
    terms = [...new Set(normalize(query).split(/\s+/).filter(Boolean))];
    list.replaceChildren(); shown = 0;
    results.hidden = !terms.length;
    if (!terms.length) { more.hidden = true; status.textContent = ''; return; }
    matches = entries.filter(entry => terms.every(term => entry.normalized.includes(term)));
    status.textContent = matches.length ? matches.length + ' textträffar för ”' + query + '”' : 'Inga träffar för ”' + query + '”. Prova ett annat ord eller färre sökord.';
    appendPage();
  }
  form.addEventListener('submit', event => { event.preventDefault(); search(); });
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 180); });
  more.addEventListener('click', appendPage);
  function revealSearchHash() {
    const id = location.hash.slice(1);
    if (!id.startsWith('report-search-hit-')) return;
    const entry = entries.find(item => item.node.id === id);
    if (entry) reveal(entry);
  }
  addEventListener('hashchange', revealSearchHash);
  revealSearchHash();
})();
