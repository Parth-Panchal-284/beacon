(() => {
  'use strict';

  const state = {
    cases: [],
    sources: {},
    current: null,
    selectedMatch: null,
    step: 1
  };

  const $ = (id) => document.getElementById(id);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  async function loadData() {
    const [casesRes, sourcesRes] = await Promise.all([
      fetch('data/cases.json'),
      fetch('data/sources.json')
    ]);
    if (!casesRes.ok || !sourcesRes.ok) throw new Error('Could not load product data.');
    state.cases = (await casesRes.json()).cases;
    state.sources = (await sourcesRes.json()).sources;
  }

  function normalize(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function findCase(query) {
    const q = normalize(query);
    if (!q) return null;
    return state.cases.find((item) =>
      item.aliases.some((alias) => {
        const a = normalize(alias);
        return q === a || q.includes(a) || a.includes(q);
      })
    ) || null;
  }

  function startCase(item) {
    state.current = item;
    state.selectedMatch = item.matches[0];
    $('product').hidden = false;
    $('searchMessage').textContent = '';
    renderOverview();
    renderMatches();
    renderTreatment();
    showStep(1, false);
    $('product').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showStep(step, scroll = true) {
    state.step = step;
    qsa('.stage-panel').forEach((el) => {
      el.hidden = el.id !== `step${step}`;
    });
    qsa('.step').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });
    if (step === 2) renderSelectedMatch();
    if (step === 3) renderTreatment();
    if (scroll) $('product').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderOverview() {
    const item = state.current;
    $('overviewTitle').textContent = item.display_name;
    $('overviewSubtitle').textContent = item.subtitle;
    $('overviewText').textContent = item.overview;

    const stats = $('overviewStats');
    stats.innerHTML = '';
    item.stats.forEach((stat) => {
      const card = document.createElement('article');
      card.className = 'stat-card';
      card.innerHTML = `<strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span>`;
      stats.appendChild(card);
    });

    const list = $('landscapeList');
    list.innerHTML = '';
    item.current_landscape.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    });
  }

  function renderMatches() {
    const host = $('matchCards');
    host.innerHTML = '';
    state.current.matches.forEach((match) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'match-card';
      button.dataset.id = match.id;
      button.innerHTML = `
        <div class="match-card-top">
          <span class="rank">#${match.rank}</span>
          <span class="evidence-badge ${confidenceClass(match.evidence)}">${escapeHtml(match.evidence)} evidence</span>
        </div>
        <div class="match-score-line"><strong>${match.score}</strong><span>/100</span></div>
        <h3>${escapeHtml(match.name)}</h3>
        <p>${escapeHtml(match.summary)}</p>
      `;
      button.addEventListener('click', () => selectMatch(match.id));
      host.appendChild(button);
    });
    selectMatch(state.current.matches[0].id, false);
  }

  function selectMatch(id, scroll = false) {
    const match = state.current.matches.find((m) => m.id === id);
    if (!match) return;
    state.selectedMatch = match;
    qsa('.match-card').forEach((el) => {
      el.classList.toggle('selected', el.dataset.id === id);
    });
    renderSelectedMatch();
    if (scroll) document.querySelector('.selected-match-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderSelectedMatch() {
    const match = state.selectedMatch;
    if (!match) return;
    $('selectedName').textContent = match.name;
    $('selectedScore').textContent = match.score;
    $('selectedSummary').textContent = match.summary;
    $('graphTitle').textContent = `${state.current.display_name} → ${match.name}`;

    const bars = $('componentBars');
    bars.innerHTML = '';
    Object.entries(match.components).forEach(([label, score]) => {
      bars.appendChild(makeBar(label, score));
    });

    renderGraph(match);
  }

  function makeBar(label, score) {
    const row = document.createElement('div');
    row.className = 'component-row';
    row.innerHTML = `
      <div class="component-label"><span>${escapeHtml(label)}</span><strong>${score}</strong></div>
      <div class="bar-track"><i style="width:${Math.max(0, Math.min(100, score))}%"></i></div>
    `;
    return row;
  }

  function renderGraph(match) {
    const svg = $('graphSvg');
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const points = [
      { x: 78, y: 165, label: shortLabel(match.path[0]), kind: 'start' },
      { x: 228, y: 95, label: shortLabel(match.path[1]), kind: 'mechanism' },
      { x: 380, y: 165, label: shortLabel(match.path[2]), kind: 'mechanism' },
      { x: 532, y: 235, label: shortLabel(match.path[3]), kind: 'phenotype' },
      { x: 682, y: 165, label: shortLabel(match.path[4]), kind: 'target' }
    ];

    const defs = svgEl('defs');
    const marker = svgEl('marker', {
      id: 'arrow', markerWidth: 8, markerHeight: 8,
      refX: 6, refY: 3, orient: 'auto'
    });
    marker.appendChild(svgEl('path', { d: 'M0,0 L0,6 L7,3 z', fill: '#b1b7c3' }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      svg.appendChild(svgEl('line', {
        x1: a.x + 42, y1: a.y, x2: b.x - 42, y2: b.y,
        stroke: '#b1b7c3', 'stroke-width': 2, 'marker-end': 'url(#arrow)'
      }));
    }

    points.forEach((p) => {
      const colors = graphColors(p.kind);
      const g = svgEl('g');
      g.appendChild(svgEl('circle', {
        cx: p.x, cy: p.y, r: 46,
        fill: colors.fill, stroke: colors.stroke, 'stroke-width': 2
      }));
      const lines = wrapNodeLabel(p.label);
      lines.forEach((line, idx) => {
        const text = svgEl('text', {
          x: p.x,
          y: p.y + ((idx - (lines.length - 1) / 2) * 14),
          'text-anchor': 'middle',
          fill: '#172033',
          'font-size': 10.5,
          'font-weight': 750
        });
        text.textContent = line;
        g.appendChild(text);
      });
      svg.appendChild(g);
    });
  }

  function renderTreatment() {
    const path = state.current.treatment_path;
    $('treatmentTitle').textContent = path.title;
    $('treatmentFrom').textContent = `Suggested from the strongest match: ${path.from_match}`;
    $('treatmentConfidence').textContent = path.confidence;
    $('treatmentConfidenceLabel').textContent = path.confidence_label;
    $('treatmentSummary').textContent = path.summary;
    $('expertNote').textContent = path.expert_note;

    const basis = $('treatmentBasis');
    basis.innerHTML = '';
    path.basis.forEach((item) => basis.appendChild(makeBar(item.label, item.score)));

    renderBullets('transferList', path.transferable, 'check');
    renderBullets('noTransferList', path.not_transferable, 'caution');
  }

  function renderBullets(id, items) {
    const host = $(id);
    host.innerHTML = '';
    items.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      host.appendChild(li);
    });
  }

  function openEvidence(scope) {
    if (!state.current) return;
    let ids = [];
    let title = 'Sources';
    if (scope === 'overview') {
      ids = state.current.overview_sources;
      title = `${state.current.display_name} evidence`;
    } else if (scope === 'match') {
      ids = state.selectedMatch.sources;
      title = `${state.selectedMatch.name} match evidence`;
    } else if (scope === 'treatment') {
      ids = state.current.treatment_path.sources;
      title = 'Treatment-path evidence';
    }

    $('evidenceTitle').textContent = title;
    const host = $('evidenceBody');
    host.innerHTML = '';

    Array.from(new Set(ids)).forEach((id) => {
      const source = state.sources[id];
      if (!source) return;
      const card = document.createElement('article');
      card.className = 'source-item';
      card.innerHTML = `
        <div class="source-meta"><span>${escapeHtml(source.type)}</span><code>${escapeHtml(id)}</code></div>
        <h4>${escapeHtml(source.title)}</h4>
        <p>${escapeHtml(source.supports)}</p>
        <a href="${escapeAttr(source.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>
      `;
      host.appendChild(card);
    });

    $('evidenceDrawer').hidden = false;
    $('evidenceDrawer').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function confidenceClass(label) {
    const value = String(label).toLowerCase();
    if (value === 'high') return 'high';
    if (value.includes('medium')) return 'medium';
    return 'neutral';
  }

  function shortLabel(value) {
    return String(value)
      .replace('SCN2A-related epilepsy', 'SCN2A')
      .replace('SCN8A-related epilepsy', 'SCN8A')
      .replace('SCN3A-related epilepsy', 'SCN3A')
      .replace('Cardiofaciocutaneous', 'CFC');
  }

  function wrapNodeLabel(label) {
    const words = String(label).split(/\s+/);
    if (label.length <= 12) return [label];
    const lines = [];
    let current = '';
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > 14 && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current) lines.push(current);
    return lines.slice(0, 3);
  }

  function graphColors(kind) {
    if (kind === 'start' || kind === 'target') return { fill: '#eef2ff', stroke: '#5368dc' };
    if (kind === 'phenotype') return { fill: '#eef9f5', stroke: '#38936f' };
    return { fill: '#f6f1ff', stroke: '#8468c7' };
  }

  function svgEl(name, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
    return el;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function bindEvents() {
    $('searchForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const item = findCase($('searchInput').value);
      if (!item) {
        $('searchMessage').textContent = 'This prototype currently includes SCN2A-related epilepsy and Noonan syndrome.';
        return;
      }
      startCase(item);
    });

    qsa('[data-example]').forEach((button) => {
      button.addEventListener('click', () => {
        $('searchInput').value = button.dataset.example;
        const item = findCase(button.dataset.example);
        if (item) startCase(item);
      });
    });

    qsa('.step').forEach((button) => {
      button.addEventListener('click', () => showStep(Number(button.dataset.step)));
    });

    qsa('[data-next]').forEach((button) => {
      button.addEventListener('click', () => showStep(Number(button.dataset.next)));
    });

    qsa('[data-evidence]').forEach((button) => {
      button.addEventListener('click', () => openEvidence(button.dataset.evidence));
    });

    $('scoreInfoBtn').addEventListener('click', () => $('scoreDialog').showModal());
    $('closeDrawer').addEventListener('click', () => { $('evidenceDrawer').hidden = true; });
  }

  async function init() {
    try {
      await loadData();
      bindEvents();
    } catch (error) {
      $('searchMessage').textContent = error.message || 'Could not start the app.';
    }
  }

  init();
})();
