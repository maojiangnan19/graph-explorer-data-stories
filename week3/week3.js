const state = {
  nodes: new Map(),
  edges: [],
  adjacency: new Map(),
  positions: new Map(),
  alive: new Set(),
  removed: [],
  budget: 5,
  hintId: null,
  hoverId: null,
  transform: { x: 0, y: 0, scale: 1 },
  drag: null,
  metrics: null,
  initialMetrics: null,
  directedEdgeCount: 0,
  loaded: false,
  sequences: new Map(),
  activeSequence: null,
  currentStep: 0,
  currentCandidate: null,
  animation: { timer: null, phase: 'idle', token: 0 }
};

const $ = (selector) => document.querySelector(selector);
const svgNS = 'http://www.w3.org/2000/svg';
const els = {
  svg: $('#breaker-svg'), canvas: $('#breaker-canvas'), edges: $('#breaker-edges'), nodes: $('#breaker-nodes'),
  budgetButtons: [...document.querySelectorAll('[data-breaker-budget]')], play: $('#play-button'), pause: $('#pause-button'), step: $('#step-button'), restart: $('#restart-button'), gameStatus: $('#game-status'),
  remaining: $('#remaining-nodes'), core: $('#largest-core'), currentStep: $('#current-step'), components: $('#component-count'),
  readoutBudget: $('#readout-budget'), readoutStep: $('#readout-step'), readoutCore: $('#readout-core'), readoutComponents: $('#readout-components'), selected: $('#selected-node'), detail: $('#selected-detail'), sequence: $('#removal-sequence'),
  resultYou: $('#result-you'), resultHub: $('#result-hub'), resultBroker: $('#result-broker'), resultRandom: $('#result-random'),
  comparison: $('#comparison-status'), runComparison: $('#run-comparison')
};

function parseTsv(text) {
  return text.split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => line.split('\t'));
}

function nameOf(id) { return state.nodes.get(id)?.name || id.replaceAll('_', ' '); }

async function fetchFrom(paths) {
  for (const path of paths) {
    const response = await fetch(path);
    if (response.ok) return response.text();
  }
  throw new Error('The Marvel course data files could not be loaded.');
}

function addEdge(source, target) {
  if (!state.adjacency.has(source)) state.adjacency.set(source, new Set());
  if (!state.adjacency.has(target)) state.adjacency.set(target, new Set());
  state.adjacency.get(source).add(target);
  state.adjacency.get(target).add(source);
}

function sortedIds(ids) { return [...ids].sort((a, b) => nameOf(a).localeCompare(nameOf(b))); }

function components(alive = state.alive) {
  const unseen = new Set(alive);
  const result = [];
  while (unseen.size) {
    const start = unseen.values().next().value;
    const component = [start];
    unseen.delete(start);
    for (let index = 0; index < component.length; index += 1) {
      const id = component[index];
      for (const neighbor of state.adjacency.get(id) || []) {
        if (unseen.has(neighbor)) { unseen.delete(neighbor); component.push(neighbor); }
      }
    }
    result.push(component);
  }
  return result.sort((a, b) => b.length - a.length);
}

function distancesFrom(source, alive) {
  const distances = new Map([[source, 0]]);
  const queue = [source];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const neighbor of state.adjacency.get(current) || []) {
      if (alive.has(neighbor) && !distances.has(neighbor)) {
        distances.set(neighbor, distances.get(current) + 1);
        queue.push(neighbor);
      }
    }
  }
  return distances;
}

function degreeScores(alive) {
  return new Map([...alive].map((id) => [id, [...(state.adjacency.get(id) || [])].filter((neighbor) => alive.has(neighbor)).length]));
}

function closenessScores(alive) {
  const scores = new Map();
  alive.forEach((id) => {
    const distances = distancesFrom(id, alive);
    const sum = [...distances.values()].reduce((total, distance) => total + distance, 0);
    scores.set(id, sum ? (distances.size - 1) / sum : 0);
  });
  return scores;
}

function betweennessScores(alive) {
  const score = new Map([...alive].map((id) => [id, 0]));
  alive.forEach((source) => {
    const stack = [];
    const predecessors = new Map([...alive].map((id) => [id, []]));
    const sigma = new Map([...alive].map((id) => [id, 0]));
    const distance = new Map([...alive].map((id) => [id, -1]));
    sigma.set(source, 1); distance.set(source, 0);
    const queue = [source];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      stack.push(current);
      for (const neighbor of state.adjacency.get(current) || []) {
        if (!alive.has(neighbor)) continue;
        if (distance.get(neighbor) < 0) { queue.push(neighbor); distance.set(neighbor, distance.get(current) + 1); }
        if (distance.get(neighbor) === distance.get(current) + 1) { sigma.set(neighbor, sigma.get(neighbor) + sigma.get(current)); predecessors.get(neighbor).push(current); }
      }
    }
    const dependency = new Map([...alive].map((id) => [id, 0]));
    while (stack.length) {
      const current = stack.pop();
      predecessors.get(current).forEach((previous) => dependency.set(previous, dependency.get(previous) + (sigma.get(previous) / sigma.get(current)) * (1 + dependency.get(current))));
      if (current !== source) score.set(current, score.get(current) + dependency.get(current));
    }
  });
  const scale = alive.size > 2 ? 1 / ((alive.size - 1) * (alive.size - 2)) : 1;
  score.forEach((value, id) => score.set(id, value * scale));
  return score;
}

function pageRankScores(alive) {
  const scores = new Map([...alive].map((id) => [id, 1 / Math.max(alive.size, 1)]));
  for (let iteration = 0; iteration < 55; iteration += 1) {
    const next = new Map([...alive].map((id) => [id, .15 / Math.max(alive.size, 1)]));
    alive.forEach((id) => {
      const neighbors = [...(state.adjacency.get(id) || [])].filter((neighbor) => alive.has(neighbor));
      const share = neighbors.length ? scores.get(id) * .85 / neighbors.length : 0;
      neighbors.forEach((neighbor) => next.set(neighbor, next.get(neighbor) + share));
    });
    next.forEach((value, id) => scores.set(id, value));
  }
  return scores;
}

function metricsFor(alive) {
  return { degree: degreeScores(alive), closeness: closenessScores(alive), betweenness: betweennessScores(alive), pagerank: pageRankScores(alive) };
}

function rankingFor(metric, limit = 5) {
  return [...metric.entries()].sort((a, b) => b[1] - a[1] || nameOf(a[0]).localeCompare(nameOf(b[0]))).slice(0, limit);
}

function renderMeasure(metricName = 'degree') {
  const text = {
    degree: ['How many direct connections does this node have?', 'Degree finds hubs: nodes with many immediate neighbors.'],
    closeness: ['How close is this node to everyone else?', 'Closeness rewards short average paths to other reachable nodes.'],
    betweenness: ['How often is this node on shortest paths?', 'Betweenness highlights brokers and bridges between regions.'],
    pagerank: ['Are this node’s neighbors important?', 'PageRank passes importance through the network instead of counting links equally.']
  }[metricName];
  $('[data-measure-question]').textContent = text[0];
  $('[data-measure-description]').textContent = text[1];
  const list = $('[data-measure-ranking]');
  list.replaceChildren();
  rankingFor(state.initialMetrics[metricName]).forEach(([id, value]) => {
    const item = document.createElement('li');
    item.innerHTML = `<span>${nameOf(id)}</span><strong>${metricName === 'degree' ? value : value.toFixed(3)}</strong>`;
    list.append(item);
  });
}

function layout() {
  const ids = [...state.nodes.keys()].sort((a, b) => (state.initialMetrics.degree.get(b) - state.initialMetrics.degree.get(a)) || nameOf(a).localeCompare(nameOf(b)));
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  ids.forEach((id, index) => {
    const radius = 22 + Math.sqrt((index + 1) / ids.length) * 242;
    const angle = index * goldenAngle;
    state.positions.set(id, { x: 450 + Math.cos(angle) * radius, y: 282 + Math.sin(angle) * radius * .78 });
  });
}

function applyTransform() { els.canvas.setAttribute('transform', `translate(${state.transform.x} ${state.transform.y}) scale(${state.transform.scale})`); }

function stateSnapshot(alive, nodeId = null) {
  const groups = components(alive);
  return {
    alive: new Set(alive),
    core: groups[0]?.length || 0,
    components: groups.length,
    nodeId
  };
}

function candidateIds(alive, metrics) {
  const ranked = rankingFor(metrics.betweenness, Math.min(28, alive.size));
  return ranked.map(([id]) => id);
}

function calculateSequence(budget) {
  let alive = new Set(state.nodes.keys());
  const sequence = [{ ...stateSnapshot(alive), step: 0 }];
  for (let step = 1; step <= budget && alive.size > 1; step += 1) {
    const currentMetrics = metricsFor(alive);
    const candidates = candidateIds(alive, currentMetrics);
    let best = null;
    candidates.forEach((id) => {
      const nextAlive = new Set(alive); nextAlive.delete(id);
      const nextGroups = components(nextAlive);
      const nextCore = nextGroups[0]?.length || 0;
      const fragmentationGain = (components(alive)[0]?.length || 0) - nextCore;
      const score = [nextCore, nextGroups.length * -1, -fragmentationGain];
      if (!best || score[0] < best.score[0] || (score[0] === best.score[0] && score[1] < best.score[1]) || (score[0] === best.score[0] && score[1] === best.score[1] && score[2] < best.score[2])) {
        best = { id, nextAlive, score, metrics: currentMetrics };
      }
    });
    if (!best) break;
    alive = best.nextAlive;
    const snapshot = stateSnapshot(alive, best.id);
    sequence.push({ ...snapshot, step, degree: best.metrics.degree.get(best.id) || 0, betweenness: best.metrics.betweenness.get(best.id) || 0 });
  }
  return sequence;
}

function currentFrame() { return state.activeSequence?.[state.currentStep] || null; }

function updateReadout(frame = currentFrame()) {
  if (!frame) return;
  const total = state.activeSequence.length - 1;
  const displayStep = state.currentCandidate ? state.currentStep + 1 : state.currentStep;
  els.remaining.textContent = frame.alive.size;
  els.core.textContent = frame.core;
  els.currentStep.textContent = `${displayStep} / ${total}`;
  els.components.textContent = frame.components;
  els.readoutBudget.textContent = `${total} hits`;
  els.readoutStep.textContent = `${displayStep} / ${total}`;
  els.readoutCore.textContent = frame.core;
  els.readoutComponents.textContent = `${frame.components} connected component${frame.components === 1 ? '' : 's'}`;
  if (state.currentCandidate && state.currentStep < total) {
    els.selected.textContent = nameOf(state.currentCandidate.nodeId);
    els.detail.textContent = `Degree ${state.currentCandidate.degree} · betweenness ${state.currentCandidate.betweenness.toFixed(3)}. Highlighted before removal.`;
  } else if (frame.nodeId && state.currentStep > 0) {
    els.selected.textContent = nameOf(frame.nodeId);
    els.detail.textContent = `Degree ${frame.degree} · betweenness ${frame.betweenness.toFixed(3)}. Removed at step ${state.currentStep}.`;
  } else {
    els.selected.textContent = 'Full network';
    els.detail.textContent = 'Press Play to see the calculated sequence unfold.';
  }
  els.gameStatus.textContent = state.animation.phase === 'playing' ? `Step ${state.currentStep + 1} is being prepared.` : state.currentStep >= total ? 'Final network state reached. The full removal sequence is shown at right.' : state.currentStep ? `After removal ${state.currentStep}, the network has ${frame.components} connected components.` : 'Network intact. Press Play to watch the calculated sequence unfold.';
  renderSequence();
}

function renderSequence() {
  els.sequence.replaceChildren();
  const frames = state.activeSequence || [];
  frames.slice(1).forEach((frame, index) => {
    const item = document.createElement('li');
    const status = index + 1 < state.currentStep ? 'complete' : index + 1 === state.currentStep ? 'current' : 'future';
    item.className = `sequence-item ${status}`;
    item.innerHTML = `<span class="sequence-number">${String(index + 1).padStart(2, '0')}</span><span class="sequence-copy"><strong>${nameOf(frame.nodeId)}</strong><span>Degree ${frame.degree} · Betweenness ${frame.betweenness.toFixed(3)}</span></span>`;
    els.sequence.append(item);
  });
}

function renderGraph() {
  els.edges.replaceChildren(); els.nodes.replaceChildren();
  state.edges.forEach((edge) => {
    const source = state.positions.get(edge.source); const target = state.positions.get(edge.target);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', source.x); line.setAttribute('y1', source.y); line.setAttribute('x2', target.x); line.setAttribute('y2', target.y);
    line.dataset.source = edge.source; line.dataset.target = edge.target; line.classList.add('breaker-edge');
    els.edges.append(line);
  });
  [...state.nodes.values()].forEach((node) => {
    const position = state.positions.get(node.id); const group = document.createElementNS(svgNS, 'g');
    group.dataset.nodeId = node.id; group.classList.add('breaker-node'); group.setAttribute('aria-label', node.name);
    const title = document.createElementNS(svgNS, 'title'); title.textContent = node.name;
    const circle = document.createElementNS(svgNS, 'circle'); circle.setAttribute('cx', position.x); circle.setAttribute('cy', position.y); circle.setAttribute('r', String(Math.min(10, 3.5 + (state.initialMetrics.degree.get(node.id) / 24)))); circle.classList.add('breaker-node-dot');
    const label = document.createElementNS(svgNS, 'text'); label.setAttribute('x', position.x + 8); label.setAttribute('y', position.y - 8); label.textContent = node.name; label.classList.add('breaker-node-label');
    if (state.initialMetrics.degree.get(node.id) < 18) label.classList.add('is-hidden-label');
    group.append(title, circle, label); els.nodes.append(group);
  });
  updateVisualState();
}

function updateVisualState() {
  const frame = currentFrame();
  const core = new Set(frame?.alive ? (components(frame.alive)[0] || []) : []);
  const visible = frame?.alive || state.alive;
  els.edges.querySelectorAll('.breaker-edge').forEach((line) => {
    const active = visible.has(line.dataset.source) && visible.has(line.dataset.target);
    line.style.display = active ? '' : 'none';
    line.classList.toggle('is-core', active && core.has(line.dataset.source) && core.has(line.dataset.target));
  });
  els.nodes.querySelectorAll('.breaker-node').forEach((group) => {
    const id = group.dataset.nodeId;
    group.classList.toggle('is-removed', !visible.has(id));
    group.classList.toggle('is-core', core.has(id));
    group.classList.toggle('is-current', state.currentCandidate?.nodeId === id);
  });
}

function stopAnimation() {
  if (state.animation.timer) window.clearTimeout(state.animation.timer);
  state.animation.timer = null;
  state.animation.phase = 'paused';
  state.animation.token += 1;
}

function loadBudget(budget) {
  stopAnimation();
  state.budget = budget;
  state.activeSequence = state.sequences.get(budget);
  state.currentStep = 0;
  state.currentCandidate = null;
  state.alive = new Set(state.activeSequence[0].alive);
  state.metrics = state.initialMetrics;
  els.budgetButtons.forEach((button) => button.classList.toggle('is-active', Number(button.dataset.breakerBudget) === budget));
  updateReadout(); updateVisualState();
}

function restart() {
  if (!state.loaded) return;
  loadBudget(state.budget);
  state.animation.phase = 'idle';
}

function showCandidate() {
  const next = state.activeSequence?.[state.currentStep + 1];
  if (!next) return false;
  state.animation.phase = 'highlight';
  state.currentCandidate = next;
  els.selected.textContent = nameOf(next.nodeId);
  els.detail.textContent = `Degree ${next.degree} · betweenness ${next.betweenness.toFixed(3)}. Highlighted before removal.`;
  els.gameStatus.textContent = `Step ${next.step} / ${state.activeSequence.length - 1}: ${nameOf(next.nodeId)} is highlighted before removal.`;
  updateVisualState(); renderSequence();
  return true;
}

function commitCandidate() {
  const next = state.activeSequence?.[state.currentStep + 1];
  if (!next) return false;
  state.animation.phase = 'settling';
  state.currentStep = next.step;
  state.currentCandidate = null;
  state.alive = new Set(next.alive);
  updateReadout(); updateVisualState();
  return true;
}

function scheduleNext(token, delay) {
  state.animation.timer = window.setTimeout(() => { if (token === state.animation.token) playStep(token); }, delay);
}

function playStep(token = state.animation.token) {
  if (token !== state.animation.token || state.animation.phase === 'paused') return;
  const total = state.activeSequence.length - 1;
  if (state.currentStep >= total) { state.animation.phase = 'complete'; updateReadout(); return; }
  if (state.animation.phase === 'highlight') {
    commitCandidate();
    if (state.currentStep < total) { state.animation.phase = 'settling'; scheduleNext(token, 1350); }
    else { state.animation.phase = 'complete'; updateReadout(); }
  } else if (state.animation.phase === 'settling') {
    state.animation.phase = 'playing';
    if (showCandidate()) scheduleNext(token, 1100);
  }
}

function play() {
  if (!state.loaded || state.currentStep >= state.activeSequence.length - 1) return;
  stopAnimation();
  state.animation.phase = 'playing';
  state.animation.token += 1;
  const token = state.animation.token;
  if (!showCandidate()) return;
  scheduleNext(token, 1100);
}

function pause() { stopAnimation(); updateReadout(); }

function stepOnce() {
  if (!state.loaded || state.currentStep >= state.activeSequence.length - 1) return;
  const wasHighlighting = state.animation.phase === 'highlight' && state.currentCandidate;
  stopAnimation();
  if (!wasHighlighting) { showCandidate(); return; }
  commitCandidate();
  state.animation.phase = state.currentStep >= state.activeSequence.length - 1 ? 'complete' : 'paused';
  updateReadout();
}

function chooseBest(alive, metricName) {
  const metric = metricName === 'degree' ? degreeScores(alive) : betweennessScores(alive);
  return rankingFor(metric, 1)[0]?.[0];
}

function simulate(strategy, budget) {
  const alive = new Set(state.nodes.keys());
  for (let step = 0; step < budget && alive.size; step += 1) {
    let id;
    if (strategy === 'random') id = sortedIds(alive)[Math.floor(Math.random() * alive.size)];
    else id = chooseBest(alive, strategy);
    if (!id) break;
    alive.delete(id);
  }
  return components(alive)[0]?.length || 0;
}

function runComparison() {
  if (state.currentStep < state.activeSequence.length - 1) { els.comparison.textContent = 'Play the full calculated sequence first, then compare the final state.'; return; }
  els.resultYou.textContent = currentFrame().core;
  els.resultHub.textContent = simulate('degree', state.budget);
  els.resultBroker.textContent = simulate('betweenness', state.budget);
  const trials = Array.from({ length: 20 }, () => simulate('random', state.budget));
  els.resultRandom.textContent = (trials.reduce((sum, value) => sum + value, 0) / trials.length).toFixed(1);
  els.comparison.textContent = 'Same starting network, same number of removals. Compare the outcomes, then question what each measure captures.';
}

function wireInteractions() {
  document.querySelectorAll('[data-measure]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-measure]').forEach((item) => { const active = item === button; item.classList.toggle('is-active', active); item.setAttribute('aria-selected', String(active)); });
    renderMeasure(button.dataset.measure);
  }));
  els.budgetButtons.forEach((button) => button.addEventListener('click', () => loadBudget(Number(button.dataset.breakerBudget))));
  els.play.addEventListener('click', play); els.pause.addEventListener('click', pause); els.step.addEventListener('click', stepOnce); els.restart.addEventListener('click', restart); els.runComparison.addEventListener('click', runComparison);
  els.svg.addEventListener('wheel', (event) => { event.preventDefault(); state.transform.scale = Math.min(2.5, Math.max(.65, state.transform.scale * (event.deltaY < 0 ? 1.1 : .9))); applyTransform(); }, { passive: false });
  els.svg.addEventListener('pointerdown', (event) => { if (event.target.closest('.breaker-node')) return; state.drag = { x: event.clientX, y: event.clientY, originX: state.transform.x, originY: state.transform.y }; els.svg.setPointerCapture(event.pointerId); });
  els.svg.addEventListener('pointermove', (event) => { if (!state.drag) return; state.transform.x = state.drag.originX + event.clientX - state.drag.x; state.transform.y = state.drag.originY + event.clientY - state.drag.y; applyTransform(); });
  els.svg.addEventListener('pointerup', () => { state.drag = null; }); els.svg.addEventListener('pointercancel', () => { state.drag = null; });
}

async function loadNetwork() {
  const [nodeText, edgeText] = await Promise.all([
    fetchFrom(['../week2/week1_nodes.tsv', '../week1_nodes.tsv']),
    fetchFrom(['../week2/week1_edges.tsv', '../week1_edges.tsv'])
  ]);
  const nodeRows = parseTsv(nodeText); const edgeRows = parseTsv(edgeText);
  nodeRows.slice(1).forEach((row) => { if (row[0]) { state.nodes.set(row[0], { id: row[0], name: row[1] || nameOf(row[0]) }); state.adjacency.set(row[0], new Set()); } });
  const seenEdges = new Set();
  edgeRows.slice(1).forEach((row) => {
    if (!state.nodes.has(row[0]) || !state.nodes.has(row[1]) || row[0] === row[1]) return;
    state.directedEdgeCount += 1;
    addEdge(row[0], row[1]);
    const edgeKey = [row[0], row[1]].sort().join('::');
    if (!seenEdges.has(edgeKey)) { seenEdges.add(edgeKey); state.edges.push({ source: row[0], target: row[1] }); }
  });
  state.initialMetrics = metricsFor(new Set(state.nodes.keys())); state.metrics = state.initialMetrics; layout(); state.alive = new Set(state.nodes.keys());
  const fullSequence = calculateSequence(8);
  [3, 5, 8].forEach((budget) => state.sequences.set(budget, fullSequence.slice(0, budget + 1)));
  state.loaded = true; renderMeasure(); renderGraph(); loadBudget(5); els.gameStatus.textContent = `${state.nodes.size} nodes and ${state.directedEdgeCount.toLocaleString()} directed links loaded. The removal sequences were calculated from the graph.`;
}

wireInteractions();
loadNetwork().catch((error) => { els.gameStatus.textContent = error.message; els.comparison.textContent = 'The comparison is unavailable until the data loads.'; });
