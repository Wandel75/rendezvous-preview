/* Busca do RENDEZVOUS: autocompletar e resultados ao vivo na barra de menu.
   O índice (busca.json) é gerado por scripts/build_busca.py e só é baixado quando a pessoa
   chega perto da busca. Tudo acontece no navegador: sem servidor, sem rastreamento. */
(() => {
  const form = document.querySelector('form[data-busca]');
  if (!form) return;
  const script = document.currentScript || document.querySelector('script[src*="busca.js"]');
  const BASE = new URL('.', script.src);
  const input = form.querySelector('input');
  const field = form.querySelector('.rdv-busca-field');
  const page = document.querySelector('[data-busca-pagina]');

  const TYPES = {
    filme: ['Filme', 'Filmes'], serie: ['Série', 'Séries'], reportagem: ['Reportagem', 'Reportagens'],
    curta: ['Curta', 'Curtas do Instagram'], momento: ['Trecho de áudio', 'Momentos das entrevistas'],
    fala: ['Fala no filme', 'Falas nos filmes'],
  };
  const PRIOR = { filme: 1, serie: 1.08, reportagem: 1.05, curta: .95, momento: .85, fala: .7 };
  const STOP = new Set(('a o e as os de da do das dos em no na nos nas um uma uns umas para por com que se ao aos ' +
    'sua seu mais como foi ser the of and to in on for le les du des et en un une au aux est pour sur par').split(' '));
  const SYN = {
    borgonha: ['bourgogne', 'burgundy'], bourgogne: ['borgonha'], burgundy: ['borgonha'], champanhe: ['champagne'],
    st: ['saint'], ste: ['sainte'], leilao: ['vente', 'encheres', 'auction'], vinho: ['vin', 'wine'], vin: ['vinho'],
    wine: ['vinho'], degustacao: ['tasting', 'degustation'], tasting: ['degustacao'], safra: ['millesime', 'vintage'],
    vindima: ['vendanges', 'harvest'], vinhedo: ['vignoble', 'vinha'], bordeus: ['bordeaux'],
  };
  const FIELDS = [['t', 10], ['w', 5], ['s', 4], ['h', 3], ['b', 1]];

  const fold = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const words = (text) => fold(text).split(/[^a-z0-9@]+/).filter(Boolean);
  const tokens = (text) => words(text).filter((word) => !STOP.has(word));
  const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const href = (url) => /^https?:/.test(url) ? url : new URL(url, BASE).href;

  // ------------------------------------------------------------------ índice
  let index = null;
  let loading = null;
  function load() {
    loading ||= fetch(new URL('busca.json?v=' + (new URL(script.src).searchParams.get('v') || '1'), BASE)).then((r) => r.json()).then((data) => {
      const postings = new Map();
      data.docs.forEach((doc, id) => {
        const seen = new Map();
        // numa fala só conta o que foi dito; o título do filme aparece, mas não responde à busca
        for (const [key, weight] of doc.k === 'fala' ? [['b', 1]] : FIELDS) {
          for (const term of tokens(doc[key])) {
            const count = (seen.get(term + key) || 0) + 1;
            seen.set(term + key, count);
            if (count > 3) continue; // um termo repetido no texto não deve dominar
            let list = postings.get(term);
            if (!list) postings.set(term, list = new Map());
            list.set(id, (list.get(id) || 0) + weight / count);
          }
        }
        doc.ft = fold(doc.t);
      });
      const N = data.docs.length;
      const idf = new Map([...postings].map(([term, list]) => [term, Math.log(1 + N / list.size)]));
      index = { ...data, postings, idf, vocab: [...postings.keys()], phrases: data.suggest.map(([p, n]) => [p, fold(p), n]) };
      return index;
    });
    return loading;
  }

  function distance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      let best = i;
      for (let j = 1; j <= b.length; j++) {
        row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], prev[j - 2] + 1);
        best = Math.min(best, row[j]);
      }
      if (best > max) return max + 1;
      prev = row;
    }
    return prev[b.length];
  }

  // termos do índice que respondem a uma palavra digitada: exata, sinônimo, começo (enquanto digita) ou com erro
  function expand(token, typing) {
    const found = new Map();
    const take = (term, factor) => { if (index.postings.has(term) && factor > (found.get(term) || 0)) found.set(term, factor); };
    take(token, 1);
    for (const synonym of SYN[token] || []) take(synonym, .9);
    if (typing || token.length >= 3) {
      for (const term of index.vocab) if (term.length > token.length && term.startsWith(token)) take(term, typing ? .85 : .6);
    }
    if (token.length >= 4 && found.size === 0) {
      const max = token.length >= 7 ? 2 : 1;
      for (const term of index.vocab) {
        if (distance(token, term, max) <= max) take(term, .55);
        else if (typing && term.length > token.length && distance(token, term.slice(0, token.length), 1) <= 1) take(term, .45);
      }
    }
    return found;
  }

  function search(query) {
    const raw = tokens(query);
    if (!raw.length) return { hits: [], terms: [] };
    const typing = !/\s$/.test(query);
    const matches = raw.map((token, i) => expand(token, typing && i === raw.length - 1));
    const scores = new Map();
    const required = matches.filter((m) => m.size).length;
    matches.forEach((terms) => {
      const best = new Map();
      for (const [term, factor] of terms) {
        const idf = index.idf.get(term);
        for (const [id, weight] of index.postings.get(term)) best.set(id, Math.max(best.get(id) || 0, factor * idf * weight));
      }
      for (const [id, score] of best) {
        const entry = scores.get(id) || { score: 0, hit: 0 };
        entry.score += score; entry.hit += 1;
        scores.set(id, entry);
      }
    });
    const phrase = fold(query).trim();
    let hits = [...scores].filter(([, e]) => e.hit === required).map(([id, e]) => {
      const doc = index.docs[id];
      let score = e.score * PRIOR[doc.k];
      if (doc.ft === phrase) score *= 3;
      else if (doc.ft.startsWith(phrase)) score *= 2.4;
      else if (phrase.length > 2 && doc.ft.includes(phrase)) score *= 1.8;
      return { doc, score };
    }).sort((a, b) => b.score - a.score);
    const terms = [...new Set([...raw, ...matches.flatMap((m) => [...m.keys()])])];
    return { hits, terms };
  }

  function suggestions(query) {
    const phrase = fold(query).trim();
    if (phrase.length < 2) return [];
    const parts = phrase.split(/\s+/);
    return index.phrases.map(([text, folded, weight]) => {
      let score = 0;
      if (folded.startsWith(phrase)) score = 3;
      else {
        const list = folded.split(/[^a-z0-9]+/);
        if (parts.every((part) => list.some((w) => w.startsWith(part)))) score = 2;
        // com erro de digitação: "pontalier" → Paul Pontallier, "margo" → Margaux
        else if (parts.every((part) => part.length >= 4 && list.some((w) => distance(part, w.slice(0, part.length + 1), 1) <= 1 || distance(part, w.slice(0, part.length), 1) <= 1))) score = 2;
      }
      return [text, folded, score + Math.min(weight, 20) / 40];
    }).filter((s) => s[2] >= 2 && s[1] !== phrase).sort((a, b) => b[2] - a[2]).slice(0, 4);
  }

  // ------------------------------------------------------------------ desenho dos resultados
  function mark(text, terms) {
    if (!terms.length) return esc(text);
    return String(text).split(/([\p{L}\p{N}@]+)/u).map((part, i) => {
      if (i % 2 === 0) return esc(part);
      const f = fold(part);
      return terms.some((t) => t.length > 1 && f.startsWith(t)) ? `<mark>${esc(part)}</mark>` : esc(part);
    }).join('');
  }

  function snippet(doc, terms) {
    const body = doc.b || '';
    if (!body) return '';
    const folded = fold(body);
    let at = -1;
    for (const term of terms) {
      const match = new RegExp(`(^|[^a-z0-9])${term.replace(/[^a-z0-9]/g, '')}`).exec(folded);
      if (match && (at < 0 || match.index < at)) at = match.index;
    }
    if (at < 0) return mark(body.slice(0, 150) + (body.length > 150 ? '…' : ''), terms);
    let start = Math.max(0, at - 50);
    start = start ? body.indexOf(' ', start) + 1 : 0;
    const piece = body.slice(start, start + 170).replace(/\n/g, ' · ');
    return (start ? '…' : '') + mark(piece, terms) + (start + 170 < body.length ? '…' : '');
  }

  function meta(doc) {
    const bits = [TYPES[doc.k][0], doc.s && !doc.s.startsWith('Série') && !doc.s.startsWith('Curta') ? doc.s : doc.s?.split(' · ').slice(1).join(' · ')];
    if (doc.k === 'fala') return [TYPES.fala[0], '▶ ' + doc.m, doc.s].join(' · ');
    if (doc.m) bits.push(doc.k === 'momento' ? '▶ ' + doc.m : doc.m);
    else if (doc.d && !String(doc.s).includes(doc.d)) bits.push(doc.d);
    return bits.filter(Boolean).join(' · ');
  }

  let uid = 0;
  function row(doc, terms, big) {
    const external = /^https?:/.test(doc.u);
    const id = `busca-op-${++uid}`;
    const image = doc.i ? `<img src="${esc(href(doc.i))}" alt="" loading="lazy" decoding="async">` : '<span class="rdv-r-noimg"></span>';
    return `<a class="rdv-r${big ? ' rdv-r-top' : ''}${doc.x ? ' is-vertical' : ''}" id="${id}" role="option" href="${esc(href(doc.u))}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''} data-kind="${doc.k}">
      <span class="rdv-r-img">${image}${doc.k === 'momento' || doc.k === 'filme' || doc.k === 'fala' ? '<i aria-hidden="true">▶</i>' : ''}</span>
      <span class="rdv-r-txt"><small>${esc(meta(doc))}</small><strong>${mark(doc.t, terms)}${external ? ' <em aria-label="abre no Instagram">↗</em>' : ''}</strong>
      <span class="rdv-r-snip">${snippet(doc, terms)}</span></span></a>`;
  }

  function grouped(hits, terms, filter, limit) {
    const groups = new Map();
    for (const hit of hits) {
      if (filter && hit.doc.k !== filter) continue;
      if (!groups.has(hit.doc.k)) groups.set(hit.doc.k, []);
      groups.get(hit.doc.k).push(hit.doc);
    }
    return [...groups].map(([kind, docs]) => `<div role="group" aria-label="${TYPES[kind][1]}" class="rdv-group">
      <p class="rdv-group-head" aria-hidden="true">${TYPES[kind][1]}<span>${docs.length}</span></p>
      ${docs.slice(0, limit).map((doc) => row(doc, terms)).join('')}</div>`).join('');
  }

  function facets(hits, filter) {
    const counts = {};
    for (const { doc } of hits) counts[doc.k] = (counts[doc.k] || 0) + 1;
    const chip = (kind, label, n) => `<button type="button" data-facet="${kind}" aria-pressed="${filter === kind}">${label}<span>${n}</span></button>`;
    return `<div class="rdv-facets" aria-label="Filtrar por tipo">${chip('', 'Tudo', hits.length)}${Object.keys(TYPES).filter((k) => counts[k]).map((k) => chip(k, TYPES[k][1].split(' ')[0], counts[k])).join('')}</div>`;
  }

  // ------------------------------------------------------------------ painel
  const panel = document.createElement('div');
  panel.className = 'rdv-busca-panel';
  panel.hidden = true;
  panel.innerHTML = '<div class="rdv-busca-scroll"><div class="rdv-busca-list" role="listbox" id="rdv-busca-list" aria-label="Resultados da busca"></div></div><p class="rdv-busca-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>↵</kbd> abrir</span><span><kbd>tab</kbd> completar</span><span><kbd>esc</kbd> fechar</span></p>';
  form.append(panel);
  const list = panel.querySelector('[role=listbox]');
  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  form.append(live);
  const ghost = document.createElement('span');
  ghost.className = 'rdv-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  field.append(ghost);
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'rdv-busca-cancel';
  cancel.textContent = 'Fechar';
  form.append(cancel);

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-controls', 'rdv-busca-list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'both');

  let filter = '';
  let active = -1;
  let completion = '';

  const RECENT = 'rdv-busca-recentes';
  const recent = () => { try { return JSON.parse(localStorage.getItem(RECENT)) || []; } catch { return []; } };
  const remember = (q) => {
    q = q.trim();
    if (q.length < 2) return;
    try { localStorage.setItem(RECENT, JSON.stringify([q, ...recent().filter((r) => fold(r) !== fold(q))].slice(0, 5))); } catch { /* sem armazenamento */ }
  };

  function home() {
    const past = recent();
    const newest = index.docs.filter((d) => d.k === 'curta').sort((a, b) => (b.n || '').localeCompare(a.n || ''))[0];
    const picks = [newest, ...index.docs.filter((d) => d.k === 'reportagem' || d.k === 'filme').sort((a, b) => (b.d || '').localeCompare(a.d || '')).slice(0, 2)].filter(Boolean);
    return (past.length ? `<div class="rdv-group" role="group" aria-label="Buscas recentes"><p class="rdv-group-head" aria-hidden="true">Buscas recentes<button type="button" data-clear>Limpar</button></p>${past.map((q) => `<a class="rdv-s" role="option" id="busca-op-${++uid}" href="#" data-q="${esc(q)}"><span aria-hidden="true">↺</span><span>${esc(q)}</span></a>`).join('')}</div>` : '')
      + `<div class="rdv-explore"><p class="rdv-group-head">Explorar por região</p><div class="rdv-chips">${index.regions.map(([r, n]) => `<button type="button" data-q="${esc(r)}">${esc(r)}<span>${n}</span></button>`).join('')}</div></div>`
      + `<div class="rdv-group" role="group" aria-label="Novidades"><p class="rdv-group-head" aria-hidden="true">Novidades</p>${picks.map((d) => row(d, [])).join('')}</div>`;
  }

  function render() {
    if (!index) return;
    uid = 0; active = -1;
    const query = input.value;
    completion = '';
    if (!query.trim()) {
      list.innerHTML = home();
      ghost.innerHTML = '';
      live.textContent = '';
      return;
    }
    const { hits, terms } = search(query);
    const tips = suggestions(query);
    const first = tips.find(([, folded]) => folded.startsWith(fold(query)) && !/\s$/.test(query));
    if (first && document.activeElement === input && input.selectionStart === query.length) {
      completion = first[0].slice(query.length);
      ghost.innerHTML = `<i>${esc(query)}</i>${esc(completion)}`;
    } else ghost.innerHTML = '';
    if (filter && !hits.some((h) => h.doc.k === filter)) filter = '';
    const tipRows = tips.map(([text]) => {
      const cut = fold(text).startsWith(fold(query)) ? query.length : 0;
      return `<a class="rdv-s" role="option" id="busca-op-${++uid}" href="#" data-q="${esc(text)}"><span aria-hidden="true">⌕</span><span>${cut ? esc(text.slice(0, cut)) + '<b>' + esc(text.slice(cut)) + '</b>' : mark(text, terms)}</span></a>`;
    }).join('');
    let html = tipRows ? `<div class="rdv-group rdv-tips" role="group" aria-label="Sugestões">${tipRows}</div>` : '';
    if (hits.length) {
      html += facets(hits, filter);
      const top = !filter && hits[0];
      if (top) html += `<div class="rdv-group" role="group" aria-label="Melhor resultado"><p class="rdv-group-head" aria-hidden="true">Melhor resultado</p>${row(top.doc, terms, true)}</div>`;
      html += grouped(filter ? hits : hits.slice(1), terms, filter, filter ? 12 : 3);
      html += `<a class="rdv-all" role="option" id="busca-op-${++uid}" href="${esc(new URL('busca/?q=' + encodeURIComponent(query.trim()), BASE).href)}">${hits.length === 1 ? 'Abrir a página de resultados' : `Ver todos os ${hits.length} resultados`} para “${esc(query.trim())}” →</a>`;
    } else {
      html += `<div class="rdv-empty"><p>Nada encontrado para “${esc(query.trim())}”.</p><p>Experimente o nome de um château, de uma pessoa ou de uma região:</p><div class="rdv-chips">${index.regions.map(([r]) => `<button type="button" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>`;
    }
    list.innerHTML = html;
    live.textContent = hits.length ? `${hits.length} resultados` : 'Nenhum resultado';
  }

  function options() { return [...list.querySelectorAll('[role=option]')]; }
  function move(step) {
    const all = options();
    if (!all.length) return;
    // -1 é o próprio campo de busca: as setas circulam campo → opções → campo
    active += step;
    if (active >= all.length) active = -1;
    else if (active < -1) active = all.length - 1;
    all.forEach((el, i) => el.classList.toggle('is-active', i === active));
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', all[active].id);
      all[active].scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }

  function open() {
    if (page) return;
    if (panel.hidden) {
      panel.hidden = false;
      form.classList.add('is-open');
      document.documentElement.classList.add('rdv-busca-aberta');
      input.setAttribute('aria-expanded', 'true');
    }
    load().then(render);
  }
  function close() {
    panel.hidden = true;
    form.classList.remove('is-open');
    document.documentElement.classList.remove('rdv-busca-aberta');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    ghost.innerHTML = '';
  }
  function setQuery(q) {
    input.value = q;
    filter = '';
    input.focus();
    if (page) renderPage(); else render();
  }

  // ------------------------------------------------------------------ eventos
  form.addEventListener('pointerenter', load, { once: true });
  input.addEventListener('focus', () => { open(); if (page) load(); });
  input.addEventListener('input', () => { filter = ''; if (page) load().then(renderPage); else open(); });
  cancel.addEventListener('click', () => { input.value = ''; close(); input.blur(); });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (page) return;
      event.preventDefault();
      if (panel.hidden) open();
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if ((event.key === 'Tab' || event.key === 'ArrowRight') && completion && input.selectionStart === input.value.length) {
      event.preventDefault();
      setQuery(input.value + completion);
    } else if (event.key === 'Escape') {
      if (input.value) { input.value = ''; page ? renderPage() : render(); } else { close(); input.blur(); }
    } else if (event.key === 'Enter') {
      const chosen = options()[active];
      if (chosen && !page) { event.preventDefault(); chosen.click(); }
    }
  });

  form.addEventListener('submit', (event) => {
    remember(input.value);
    if (page) { event.preventDefault(); renderPage(); }
  });

  form.addEventListener('click', (event) => {
    const q = event.target.closest('[data-q]');
    const facet = event.target.closest('[data-facet]');
    if (event.target.closest('[data-clear]')) {
      try { localStorage.removeItem(RECENT); } catch { /* sem armazenamento */ }
      render(); input.focus();
    } else if (q) {
      event.preventDefault();
      setQuery(q.dataset.q);
    } else if (facet) {
      filter = facet.dataset.facet;
      render(); input.focus();
    } else if (event.target.closest('.rdv-r, .rdv-all')) {
      remember(input.value);
      if (event.target.closest('.rdv-r')?.target !== '_blank') close();
    }
  });
  list.addEventListener('mousemove', (event) => {
    const option = event.target.closest('[role=option]');
    if (!option) return;
    const all = options();
    active = all.indexOf(option);
    all.forEach((el, i) => el.classList.toggle('is-active', i === active));
  });

  document.addEventListener('pointerdown', (event) => { if (!panel.hidden && !form.contains(event.target)) close(); });
  form.addEventListener('focusout', (event) => { if (event.relatedTarget && !form.contains(event.relatedTarget)) close(); });
  document.addEventListener('keydown', (event) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !typing)) {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });
  const kbd = form.querySelector('kbd');
  if (kbd && !/Mac|iPhone|iPad/.test(navigator.platform)) kbd.textContent = 'Ctrl K';

  // ------------------------------------------------------------------ página de resultados completos
  function renderPage() {
    if (!index) return;
    const target = page.querySelector('[data-busca-resultados]');
    const query = input.value.trim();
    const url = new URL(location.href);
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    const title = page.querySelector('[data-busca-titulo]');
    if (!query) {
      title.textContent = 'Tudo o que o RENDEZVOUS filmou, gravou e escreveu';
      document.title = 'Busca | RENDEZVOUS';
      target.innerHTML = `<div class="rdv-chips rdv-page-chips">${index.regions.map(([r, n]) => `<button type="button" data-q="${esc(r)}">${esc(r)}<span>${n}</span></button>`).join('')}</div>`
        + `<div class="rdv-grid">${index.docs.filter((d) => d.k !== 'momento' && d.k !== 'fala').map((d) => row(d, [])).join('')}</div>`;
      return;
    }
    const { hits, terms } = search(query);
    if (filter && !hits.some((h) => h.doc.k === filter)) filter = '';
    title.innerHTML = `${hits.length} ${hits.length === 1 ? 'resultado' : 'resultados'} para “${esc(query)}”`;
    document.title = `${query} · Busca | RENDEZVOUS`;
    target.innerHTML = hits.length
      ? facets(hits, filter) + `<div class="rdv-grid">${hits.filter((h) => !filter || h.doc.k === filter).map((h) => row(h.doc, terms)).join('')}</div>`
      : `<div class="rdv-empty"><p>Nada encontrado. Experimente uma região:</p><div class="rdv-chips">${index.regions.map(([r]) => `<button type="button" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>`;
  }
  if (page) {
    page.addEventListener('click', (event) => {
      const q = event.target.closest('[data-q]');
      const facet = event.target.closest('[data-facet]');
      if (q) setQuery(q.dataset.q);
      else if (facet) { filter = facet.dataset.facet; renderPage(); }
      else if (event.target.closest('.rdv-r')) remember(input.value);
    });
    input.value = new URLSearchParams(location.search).get('q') || '';
    load().then(renderPage);
  }
})();
