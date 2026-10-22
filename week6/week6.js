const $ = (selector) => document.querySelector(selector);
const svg = (name, attributes = {}) => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
};

const state = { data: null, character: 'Spider-Man', group: 0, topic: 0, networkSelection: null };

function byName(name) {
  return state.data.documents.find((document) => document.name === name);
}

function populateCharacters() {
  const options = $('#character-options');
  state.data.documents.forEach((record) => {
    const option = document.createElement('option');
    option.value = record.name;
    options.append(option);
  });
}

function renderCharacter() {
  const selectedDocument = byName(state.character) || state.data.documents[0];
  state.character = selectedDocument.name;
  $('#character-select').value = selectedDocument.name;
  $('#selected-character').textContent = selectedDocument.name;
  $('#character-note').textContent = `${state.data.meta.documentCount} course-snapshot texts · ${state.data.meta.vocabularySize.toLocaleString()} TF-IDF terms · real local calculation`;
  $('#term-list').replaceChildren(...selectedDocument.terms.map(({ term, score }) => {
    const item = document.createElement('li');
    item.innerHTML = `<span>${term}</span><b>${score.toFixed(3)}</b>`;
    return item;
  }));
  $('#neighbour-list').replaceChildren(...selectedDocument.closest.map(({ name, score }, index) => {
    const item = document.createElement('div');
    item.className = 'neighbour';
    item.innerHTML = `<span>0${index + 1}</span><strong>${name}</strong><b>${score.toFixed(3)}</b>`;
    return item;
  }));
}

function renderGroups() {
  const tabs = $('#group-tabs');
  tabs.replaceChildren(...state.data.groups.map((group, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.role = 'tab';
    button.textContent = `${group.label} (${group.count})`;
    button.setAttribute('aria-selected', index === state.group ? 'true' : 'false');
    button.addEventListener('click', () => { state.group = index; renderGroups(); });
    return button;
  }));
  const group = state.data.groups[state.group];
  $('#group-label').textContent = `GROUP COMPARISON / ${group.count} DOCUMENTS`;
  $('#group-heading').textContent = group.label;
  $('#group-explainer').textContent = 'Positive values identify terms with a higher normalized rate inside this group than in every other course document.';
  $('#comparison-list').replaceChildren(...group.terms.map(({ term, score, count }) => {
    const item = document.createElement('li');
    item.innerHTML = `<span>${term} <small>×${count}</small></span><b>+${score.toFixed(2)}</b>`;
    return item;
  }));
}

function renderTopics() {
  const tabs = $('#topic-tabs');
  tabs.replaceChildren(...state.data.topics.map((topic, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.role = 'tab';
    button.textContent = `Topic ${index + 1}`;
    button.setAttribute('aria-selected', index === state.topic ? 'true' : 'false');
    button.addEventListener('click', () => { state.topic = index; renderTopics(); });
    return button;
  }));
  const topic = state.data.topics[state.topic];
  $('#topic-label').textContent = `TOPIC ${state.topic + 1} / NMF COMPONENT`;
  $('#topic-terms').replaceChildren(...topic.terms.map((term) => { const tag = document.createElement('span'); tag.textContent = term; return tag; }));
  $('#topic-documents').replaceChildren(...topic.documents.map((name) => { const item = document.createElement('li'); item.textContent = name; return item; }));
}

function networkCoordinates(nodes) {
  const center = { x: 360, y: 235 };
  return new Map(nodes.map((node, index) => {
    const angle = (Math.PI * 2 * index / nodes.length) - Math.PI / 2;
    const radius = index % 2 ? 176 : 142;
    return [node.id, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }];
  }));
}

function renderNetwork() {
  const graph = state.data.network;
  const canvas = $('#word-network');
  const positions = networkCoordinates(graph.nodes);
  canvas.replaceChildren();
  graph.edges.forEach((edge) => {
    const start = positions.get(edge.source);
    const end = positions.get(edge.target);
    const line = svg('line', { x1: start.x, y1: start.y, x2: end.x, y2: end.y, class: 'network-edge', 'data-source': edge.source, 'data-target': edge.target, 'stroke-width': Math.min(5, 1 + edge.weight) });
    canvas.append(line);
  });
  graph.nodes.forEach((node) => {
    const point = positions.get(node.id);
    const group = svg('g', { class: 'network-node', 'data-word': node.id, tabindex: '0', role: 'button', 'aria-label': `Inspect ${node.id}` });
    group.append(svg('circle', { cx: point.x, cy: point.y, r: 25 }));
    const label = svg('text', { x: point.x, y: point.y + 4 });
    label.textContent = node.id;
    group.append(label);
    const select = () => { state.networkSelection = node.id; updateNetworkSelection(); };
    group.addEventListener('click', select);
    group.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
    canvas.append(group);
  });
  updateNetworkSelection();
}

function updateNetworkSelection() {
  const selected = state.networkSelection;
  const related = new Map();
  if (selected) state.data.network.edges.forEach((edge) => {
    if (edge.source === selected) related.set(edge.target, edge);
    if (edge.target === selected) related.set(edge.source, edge);
  });
  document.querySelectorAll('.network-node').forEach((node) => {
    const word = node.dataset.word;
    node.classList.toggle('is-selected', word === selected);
    node.classList.toggle('is-related', related.has(word));
    node.classList.toggle('is-muted', Boolean(selected && word !== selected && !related.has(word)));
  });
  document.querySelectorAll('.network-edge').forEach((edge) => edge.classList.toggle('is-muted', Boolean(selected && edge.dataset.source !== selected && edge.dataset.target !== selected)));
  const reset = $('#clear-network');
  reset.disabled = !selected;
  if (!selected) {
    $('#network-title').textContent = 'Select a word';
    $('#network-copy').textContent = 'Click a word to focus its document-level PPMI neighbourhood. Unrelated words fade so the selected association can be inspected.';
    return;
  }
  const strongest = [...related.entries()].sort((first, second) => second[1].weight - first[1].weight)[0];
  $('#network-title').textContent = selected;
  $('#network-copy').textContent = strongest
    ? `The strongest visible association is with “${strongest[0]}” (PPMI ${strongest[1].weight.toFixed(3)}; together in ${strongest[1].jointDocuments} character documents). This is co-occurrence association, not semantic similarity.`
    : `No positive PPMI edge among the displayed terms. This does not mean the word has no meaning; only that this small network contains no positive association for it.`;
}

function revealSections() {
  const sections = document.querySelectorAll('.reveal');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return sections.forEach((section) => section.classList.add('is-visible'));
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
  sections.forEach((section) => observer.observe(section));
}

async function initialise() {
  try {
    const response = await fetch('data/processed/marvel_text_analysis.json');
    if (!response.ok) throw new Error('Analysis data could not be loaded.');
    state.data = await response.json();
    populateCharacters();
    renderCharacter();
    renderGroups();
    renderTopics();
    renderNetwork();
    $('#character-select').addEventListener('change', (event) => { if (byName(event.target.value)) { state.character = event.target.value; renderCharacter(); } });
    $('#clear-network').addEventListener('click', () => { state.networkSelection = null; updateNetworkSelection(); });
  } catch (error) {
    $('#character-note').textContent = `Data error: ${error.message}`;
  }
  revealSections();
  $('.menu-toggle').addEventListener('click', () => { const open = $('#site-nav').classList.toggle('is-open'); $('.menu-toggle').setAttribute('aria-expanded', String(open)); });
}

initialise();