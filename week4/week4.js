const state = { nodes: new Map(), edges: [], adjacency: new Map(), degree: new Map(), totalWeight: 0, community: new Map(), positions: new Map(), selected: null, filter: null, revealed: false, palette: ['#4cc9f0','#ffd25a','#e85d75','#88c999','#be8bff','#ff9f68','#77d8b7','#83a6ff'] };
const $ = (selector) => document.querySelector(selector);

function parseTsv(text) { return text.split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => line.split('\t')); }
function seededOrder(ids, seed) { return [...ids].sort((left, right) => ((hash(left, seed) - hash(right, seed)) || left.localeCompare(right))); }
function hash(value, seed = 0) { let result = 2166136261 ^ seed; for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619); return result >>> 0; }
function nameOf(id) { return state.nodes.get(id)?.name || id.replaceAll('_', ' '); }

async function loadNetwork() {
  const [nodeResponse, edgeResponse] = await Promise.all([fetch('week4_philosophers_nodes.tsv'), fetch('week4_philosophers_edges.tsv')]);
  if (!nodeResponse.ok || !edgeResponse.ok) throw new Error('The supplied TSV files could not be loaded.');
  const nodeRows = parseTsv(await nodeResponse.text());
  const edgeRows = parseTsv(await edgeResponse.text());
  const nodeHeaders = nodeRows.shift();
  const nodeIndex = Object.fromEntries(nodeHeaders.map((header, index) => [header, index]));
  nodeRows.forEach((row) => { const node = Object.fromEntries(nodeHeaders.map((header, index) => [header, row[index] || ''])); state.nodes.set(node.node_id, node); state.adjacency.set(node.node_id, new Map()); state.degree.set(node.node_id, 0); });
  const projected = new Map();
  edgeRows.slice(1).forEach((row) => {
    const [source, target, rawWeight] = row;
    if (!state.nodes.has(source) || !state.nodes.has(target) || source === target) return;
    const key = source < target ? `${source}\u0000${target}` : `${target}\u0000${source}`;
    projected.set(key, (projected.get(key) || 0) + Number(rawWeight));
  });
  projected.forEach((weight, key) => { const [source, target] = key.split('\u0000'); state.edges.push({ source, target, weight }); state.adjacency.get(source).set(target, weight); state.adjacency.get(target).set(source, weight); state.degree.set(source, state.degree.get(source) + weight); state.degree.set(target, state.degree.get(target) + weight); state.totalWeight += weight; });
  $('#network-status').textContent = `${state.nodes.size.toLocaleString()} philosophers loaded. Projecting ${state.edges.length.toLocaleString()} weighted links...`;
}

function localMove(seed = 0) {
  const ids = [...state.nodes.keys()]; const community = new Map(ids.map((id) => [id, id])); const totals = new Map(ids.map((id) => [id, state.degree.get(id)])); const m2 = state.totalWeight * 2;
  for (let pass = 0; pass < 18; pass += 1) {
    let moved = false;
    seededOrder(ids, seed + pass).forEach((id) => {
      const own = community.get(id); const degree = state.degree.get(id); totals.set(own, totals.get(own) - degree);
      const neighborWeights = new Map();
      state.adjacency.get(id).forEach((weight, neighbor) => { const label = community.get(neighbor); neighborWeights.set(label, (neighborWeights.get(label) || 0) + weight); });
      let best = own; let bestGain = 0;
      neighborWeights.forEach((internalWeight, label) => { const gain = internalWeight - degree * (totals.get(label) || 0) / m2; if (gain > bestGain + 1e-9 || (Math.abs(gain - bestGain) < 1e-9 && label < best)) { best = label; bestGain = gain; } });
      community.set(id, best); totals.set(best, (totals.get(best) || 0) + degree); if (best !== own) moved = true;
    });
    if (!moved) break;
  }
  return compactCommunities(community);
}

function compactCommunities(assignment) {
  const groups = new Map(); assignment.forEach((label, id) => { if (!groups.has(label)) groups.set(label, []); groups.get(label).push(id); });
  const labels = [...groups.entries()].sort((left, right) => right[1].length - left[1].length || String(left[0]).localeCompare(String(right[0]))).map(([label]) => label);
  const remap = new Map(labels.map((label, index) => [label, index + 1])); return new Map([...assignment.entries()].map(([id, label]) => [id, remap.get(label)]));
}

function modularity(assignment) {
  const totals = new Map(); const internal = new Map();
  state.nodes.forEach((_, id) => totals.set(assignment.get(id), (totals.get(assignment.get(id)) || 0) + state.degree.get(id)));
  state.edges.forEach((edge) => { if (assignment.get(edge.source) === assignment.get(edge.target)) internal.set(assignment.get(edge.source), (internal.get(assignment.get(edge.source)) || 0) + edge.weight); });
  let score = 0; totals.forEach((degree, label) => { score += (internal.get(label) || 0) / state.totalWeight - (degree / (2 * state.totalWeight)) ** 2; }); return score;
}

function nmi(first, second) {
  const countA = new Map(), countB = new Map(), joint = new Map(); const n = state.nodes.size;
  state.nodes.forEach((_, id) => { const a = first.get(id), b = second.get(id), key = `${a}|${b}`; countA.set(a, (countA.get(a) || 0) + 1); countB.set(b, (countB.get(b) || 0) + 1); joint.set(key, (joint.get(key) || 0) + 1); });
  let mutual = 0, entropyA = 0, entropyB = 0;
  joint.forEach((count, key) => { const [a, b] = key.split('|'); mutual += count / n * Math.log((count * n) / (countA.get(Number(a)) * countB.get(Number(b)))); });
  countA.forEach((count) => { const probability = count / n; entropyA -= probability * Math.log(probability); }); countB.forEach((count) => { const probability = count / n; entropyB -= probability * Math.log(probability); });
  return entropyA && entropyB ? mutual / Math.sqrt(entropyA * entropyB) : 1;
}

function setPositions() {
  const groups = new Map(); state.community.forEach((label, id) => { if (!groups.has(label)) groups.set(label, []); groups.get(label).push(id); });
  const ordered = [...groups.entries()].sort((left, right) => right[1].length - left[1].length);
  ordered.forEach(([label, ids], groupIndex) => { const angle = groupIndex / ordered.length * Math.PI * 2 - Math.PI / 2; const centerX = 550 + Math.cos(angle) * (ordered.length < 3 ? 0 : 240); const centerY = 350 + Math.sin(angle) * (ordered.length < 3 ? 0 : 155); ids.sort((a, b) => state.degree.get(b) - state.degree.get(a)).forEach((id, index) => { const ring = 18 + Math.sqrt((index + 1) / ids.length) * 132; const nodeAngle = index * 2.399963229728653; state.positions.set(id, { x: centerX + Math.cos(nodeAngle) * ring, y: centerY + Math.sin(nodeAngle) * ring * .72 }); }); });
}

function communityStats(label) {
  const ids = [...state.community].filter(([, value]) => value === label).map(([id]) => id); const set = new Set(ids); let internal = 0, external = 0;
  state.edges.forEach((edge) => { const left = set.has(edge.source), right = set.has(edge.target); if (left && right) internal += 1; else if (left || right) external += 1; });
  return { ids, internal, external };
}

function drawNetwork() {
  const canvas = $('#community-canvas'); const context = canvas.getContext('2d'); const scaleX = canvas.width / canvas.clientWidth || 1; const scaleY = canvas.height / canvas.clientHeight || 1;
  context.clearRect(0, 0, canvas.width, canvas.height); const active = state.revealed ? state.filter : null; const selectedCommunity = state.selected ? state.community.get(state.selected) : active;
  state.edges.forEach((edge) => { const source = state.positions.get(edge.source), target = state.positions.get(edge.target); const sameActive = !active || (state.community.get(edge.source) === active && state.community.get(edge.target) === active); if (!source || !target || !sameActive) return; context.beginPath(); context.globalAlpha = selectedCommunity && state.community.get(edge.source) === selectedCommunity && state.community.get(edge.target) === selectedCommunity ? .32 : .085; context.strokeStyle = selectedCommunity && state.community.get(edge.source) === selectedCommunity && state.community.get(edge.target) === selectedCommunity ? '#4cc9f0' : '#9aabb5'; context.lineWidth = Math.min(2.6, .35 + edge.weight * .18); context.moveTo(source.x, source.y); context.lineTo(target.x, target.y); context.stroke(); });
  state.nodes.forEach((_, id) => { const point = state.positions.get(id); if (!point) return; const label = state.community.get(id); const visible = !active || label === active; const selected = id === state.selected; context.beginPath(); context.globalAlpha = visible ? (selected || label === selectedCommunity ? 1 : .55) : .045; context.fillStyle = selected ? '#ffd25a' : state.palette[(label - 1) % state.palette.length]; context.arc(point.x, point.y, selected ? 6.5 : Math.min(4.8, 1.7 + Math.sqrt(state.degree.get(id) || 0) / 3.5), 0, Math.PI * 2); context.fill(); }); context.globalAlpha = 1;
  canvas.dataset.scaleX = scaleX; canvas.dataset.scaleY = scaleY;
}

function drawBackbone() {
  const threshold = Number($('#weight-threshold').value); const canvas = $('#backbone-canvas'); const context = canvas.getContext('2d'); context.clearRect(0, 0, canvas.width, canvas.height); const kept = state.edges.filter((edge) => edge.weight >= threshold); const points = new Map(); const ids = new Set(); kept.forEach((edge) => { ids.add(edge.source); ids.add(edge.target); }); [...ids].sort().forEach((id, index) => { const angle = index * 2.399963; const radius = 25 + Math.sqrt((index + 1) / Math.max(ids.size, 1)) * 146; points.set(id, { x: 500 + Math.cos(angle) * radius, y: 180 + Math.sin(angle) * radius * .7 }); });
  kept.forEach((edge) => { const source = points.get(edge.source), target = points.get(edge.target); context.globalAlpha = .14 + Math.min(.45, edge.weight / 22); context.strokeStyle = edge.weight >= threshold + 2 ? '#ffd25a' : '#70808e'; context.lineWidth = Math.min(3, .4 + edge.weight * .22); context.beginPath(); context.moveTo(source.x, source.y); context.lineTo(target.x, target.y); context.stroke(); }); points.forEach((point) => { context.globalAlpha = .8; context.fillStyle = '#4cc9f0'; context.beginPath(); context.arc(point.x, point.y, 2.3, 0, Math.PI * 2); context.fill(); }); context.globalAlpha = 1; $('#threshold-value').textContent = threshold; $('#threshold-stats').textContent = `${kept.length.toLocaleString()} links / ${ids.size.toLocaleString()} connected nodes`;
}

function renderInspector() {
  const node = state.nodes.get(state.selected); const label = state.selected ? state.community.get(state.selected) : state.filter;
  if (!label) { $('#inspector-kicker').textContent = 'NETWORK'; $('#inspector-name').textContent = 'Choose a philosopher'; $('#inspector-description').textContent = 'Search, click a node, or choose a detected community.'; $('#inspector-metrics').innerHTML = `<div><span>Nodes</span><strong>${state.nodes.size.toLocaleString()}</strong></div><div><span>Weighted links</span><strong>${state.edges.length.toLocaleString()}</strong></div>`; return; }
  const stats = communityStats(label); const degree = node ? [...state.adjacency.get(state.selected).values()].reduce((sum, value) => sum + value, 0) : 0; const internalDegree = node ? [...state.adjacency.get(state.selected)].filter(([id]) => state.community.get(id) === label).reduce((sum, [, weight]) => sum + weight, 0) : 0;
  $('#inspector-kicker').textContent = `COMMUNITY ${String(label).padStart(2, '0')}`; $('#inspector-name').textContent = node ? node.name : `${stats.ids.length} philosophers`; $('#inspector-description').textContent = node ? `${node.era || 'Era unavailable'}${node.subfields ? ` · ${node.subfields}` : ''}` : 'A detected group in the weighted network projection.';
  $('#inspector-metrics').innerHTML = node ? `<div><span>Degree</span><strong>${degree}</strong></div><div><span>Community</span><strong>${String(label).padStart(2, '0')}</strong></div><div><span>Internal degree</span><strong>${internalDegree}</strong></div><div><span>External degree</span><strong>${degree - internalDegree}</strong></div>` : `<div><span>Size</span><strong>${stats.ids.length}</strong></div><div><span>Internal links</span><strong>${stats.internal}</strong></div><div><span>External links</span><strong>${stats.external}</strong></div><div><span>Internal / external</span><strong>${(stats.internal / Math.max(stats.external, 1)).toFixed(2)}</strong></div>`;
}

function selectNode(id) { if (!state.nodes.has(id)) return; state.selected = id; state.filter = state.community.get(id); $('#community-filter').value = state.filter; renderInspector(); drawNetwork(); }
function bindInteractions() {
  $('#philosopher-search').addEventListener('change', (event) => { const query = event.target.value.trim().toLocaleLowerCase(); const id = [...state.nodes].find(([, node]) => node.name.toLocaleLowerCase() === query || node.node_id.toLocaleLowerCase() === query); if (id) selectNode(id[0]); });
  $('#community-filter').addEventListener('change', (event) => { state.filter = event.target.value ? Number(event.target.value) : null; state.selected = null; state.revealed = Boolean(state.filter); renderInspector(); drawNetwork(); });
  $('#reveal-community').addEventListener('click', () => { if (state.selected) state.filter = state.community.get(state.selected); state.revealed = Boolean(state.filter); renderInspector(); drawNetwork(); });
  $('#reset-community').addEventListener('click', () => { state.selected = null; state.filter = null; state.revealed = false; $('#community-filter').value = ''; $('#philosopher-search').value = ''; renderInspector(); drawNetwork(); });
  $('#community-canvas').addEventListener('click', (event) => { const canvas = event.currentTarget, rect = canvas.getBoundingClientRect(), x = (event.clientX - rect.left) * canvas.width / rect.width, y = (event.clientY - rect.top) * canvas.height / rect.height; let closest = null, distance = 15; state.positions.forEach((point, id) => { const current = Math.hypot(point.x - x, point.y - y); if (current < distance) { closest = id; distance = current; } }); if (closest) selectNode(closest); });
  $('#weight-threshold').addEventListener('input', drawBackbone);
  const overlap = () => $('#overlap-demo').classList.toggle('revealed'); $('#overlap-demo').addEventListener('click', overlap); $('#overlap-demo').addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); overlap(); } });
  $('#bridge-step').addEventListener('click', () => { const removed = $('#bridge-svg').classList.toggle('bridges-removed'); document.querySelectorAll('.bridge-edge').forEach((edge) => edge.classList.toggle('is-removed', removed)); $('#bridge-copy').textContent = removed ? 'With the high-betweenness bridge removed, the two regions no longer share a route.' : 'The highlighted links are bridge-like routes between otherwise denser neighborhoods.'; $('#bridge-step').textContent = removed ? 'Restore bridge' : 'Remove bridge'; });
}

async function renderStability(reference) { const container = $('#stability-runs'); container.replaceChildren(); for (let run = 1; run <= 5; run += 1) { await new Promise((resolve) => setTimeout(resolve, 0)); const assignment = run === 1 ? reference : localMove(run * 97); const row = document.createElement('div'); row.className = 'stability-row'; row.innerHTML = `<span>Run ${String(run).padStart(2, '0')}</span><strong>${modularity(assignment).toFixed(3)}</strong><strong>${nmi(reference, assignment).toFixed(3)}</strong>`; container.append(row); } }

async function initialize() {
  try {
    await loadNetwork(); state.community = localMove(11); setPositions();
    const score = modularity(state.community); $('#modularity-score').textContent = score.toFixed(3); $('#graph-summary').textContent = state.edges.length.toLocaleString(); $('#network-status').textContent = `${state.nodes.size.toLocaleString()} nodes · ${state.edges.length.toLocaleString()} undirected weighted links · ${new Set(state.community.values()).size} detected communities`;
    [...state.nodes.entries()].sort((left, right) => left[1].name.localeCompare(right[1].name)).forEach(([id, node]) => { const option = document.createElement('option'); option.value = node.name; option.dataset.id = id; $('#philosopher-options').append(option); });
    const communities = [...new Set(state.community.values())]; communities.forEach((label) => { const option = document.createElement('option'); option.value = label; option.textContent = `Community ${String(label).padStart(2, '0')} · ${communityStats(label).ids.length} nodes`; $('#community-filter').append(option); });
    renderInspector(); drawNetwork(); drawBackbone(); bindInteractions(); window.addEventListener('resize', () => { drawNetwork(); drawBackbone(); }); renderStability(state.community);
  } catch (error) { $('#network-status').textContent = `Data loading failed: ${error.message}`; $('#modularity-score').textContent = 'Unavailable'; console.error(error); }
}
document.addEventListener('DOMContentLoaded', initialize);