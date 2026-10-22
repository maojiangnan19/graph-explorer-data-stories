const state = {
  graph: null,
  renderer: null,
  nodes: new Map(),
  undirected: new Map(),
  directedDegree: new Map(),
  names: new Map(),
  selectedId: null,
  mainComponent: new Set(),
  defaultCamera: null,
  cameraLimits: { min: .2, max: .9 }
};

const $ = (selector) => document.querySelector(selector);
const displayName = (id) => state.names.get(id) || id.replaceAll('_', ' ');

function parseTsv(text) {
  return text.split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('\t'));
}

function addUndirectedEdge(source, target) {
  if (!state.undirected.has(source)) state.undirected.set(source, new Set());
  if (!state.undirected.has(target)) state.undirected.set(target, new Set());
  state.undirected.get(source).add(target);
  state.undirected.get(target).add(source);
}

function shortestDistances(source) {
  const distances = new Map([[source, 0]]);
  const queue = [source];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const neighbor of state.undirected.get(current) || []) {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, distances.get(current) + 1);
        queue.push(neighbor);
      }
    }
  }
  return distances;
}

function clusteringCoefficient(id) {
  const neighbors = [...(state.undirected.get(id) || [])];
  if (neighbors.length < 2) return 0;
  let links = 0;
  for (let i = 0; i < neighbors.length; i += 1) {
    for (let j = i + 1; j < neighbors.length; j += 1) {
      if (state.undirected.get(neighbors[i])?.has(neighbors[j])) links += 1;
    }
  }
  return (2 * links) / (neighbors.length * (neighbors.length - 1));
}

function averageDistance(id) {
  const distances = [...shortestDistances(id).values()].filter((distance) => distance > 0);
  if (!distances.length) return null;
  return distances.reduce((sum, distance) => sum + distance, 0) / distances.length;
}

function setOptions(select, ids) {
  select.replaceChildren();
  ids.forEach((id) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = displayName(id);
    select.append(option);
  });
}

function components() {
  const unseen = new Set(state.nodes.keys());
  const result = [];
  while (unseen.size) {
    const start = unseen.values().next().value;
    const component = [];
    const queue = [start];
    unseen.delete(start);
    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];
      component.push(id);
      for (const neighbor of state.undirected.get(id) || []) {
        if (unseen.has(neighbor)) {
          unseen.delete(neighbor);
          queue.push(neighbor);
        }
      }
    }
    result.push(component);
  }
  return result.sort((a, b) => b.length - a.length);
}

function layoutNodes(componentList) {
  const positions = new Map();
  const main = componentList[0] || [];
  const mainSorted = [...main].sort((a, b) => (state.directedDegree.get(b) || 0) - (state.directedDegree.get(a) || 0));
  const mainRadius = Math.min(.92, .32 + Math.sqrt(mainSorted.length) * .03);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  mainSorted.forEach((id, index) => {
    const radius = mainRadius * Math.sqrt((index + 1) / mainSorted.length);
    const angle = index * goldenAngle;
    positions.set(id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * .78 });
  });
  state.mainComponent = new Set(main);

  const secondary = componentList.slice(1).flat();
  secondary.forEach((id, index) => {
    const angle = index * goldenAngle;
    const radius = 1.45 + (index % 4) * .08;
    positions.set(id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  });
  return positions;
}

function updateNetworkPanel(id) {
  if (!id) {
    $('#network-name').textContent = 'Explore the graph';
    $('#network-prompt').textContent = 'Select a hero to see who they connect to.';
    $('#network-degree').textContent = '—';
    $('#network-clustering').textContent = '—';
    $('#network-distance').textContent = '—';
    return;
  }
  $('#network-name').textContent = displayName(id);
  $('#network-prompt').textContent = `${(state.undirected.get(id) || new Set()).size} direct neighbors highlighted.`;
  $('#network-degree').textContent = state.directedDegree.get(id) || 0;
  $('#network-clustering').textContent = clusteringCoefficient(id).toFixed(3);
  const distance = averageDistance(id);
  $('#network-distance').textContent = distance === null ? 'N/A' : distance.toFixed(2);
}

function updateHero(id) {
  const degree = state.directedDegree.get(id) || 0;
  const clustering = clusteringCoefficient(id);
  const distance = averageDistance(id);
  $('#hero-degree').textContent = degree;
  $('#hero-clustering').textContent = clustering.toFixed(3);
  $('#hero-distance').textContent = distance === null ? 'N/A' : distance.toFixed(2);
  $('#hero-note').textContent = distance === null ? 'N/A - disconnected' : `${shortestDistances(id).size - 1} reachable pages in the undirected projection.`;
  updateNetworkPanel(id);
}

function tooltipForNode(id, event) {
  const tooltip = $('#network-tooltip');
  const target = event?.event || event;
  const x = target?.x || 0;
  const y = target?.y || 0;
  tooltip.innerHTML = `<strong>${displayName(id)}</strong><span>Degree ${state.directedDegree.get(id) || 0}</span>`;
  tooltip.style.left = `${Math.min(x + 14, $('#network').clientWidth - 205)}px`;
  tooltip.style.top = `${Math.max(y - 14, 12)}px`;
  tooltip.classList.add('is-visible');
  tooltip.setAttribute('aria-hidden', 'false');
}

function hideTooltip() {
  const tooltip = $('#network-tooltip');
  tooltip.classList.remove('is-visible');
  tooltip.setAttribute('aria-hidden', 'true');
}

function refreshRenderer() {
  state.renderer?.refresh();
}

function calculateMainCamera() {
  const displayData = [...state.mainComponent]
    .map((id) => state.renderer.getNodeDisplayData(id))
    .filter(Boolean);
  if (!displayData.length) return { x: .5, y: .5, ratio: .7 };

  const bounds = displayData.reduce((result, data) => ({
    minX: Math.min(result.minX, data.x),
    maxX: Math.max(result.maxX, data.x),
    minY: Math.min(result.minY, data.y),
    maxY: Math.max(result.maxY, data.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const spanX = Math.max(bounds.maxX - bounds.minX, .04);
  const spanY = Math.max(bounds.maxY - bounds.minY, .04);
  const ratio = Math.max(spanX / .78, spanY / .74);
  const defaultRatio = Math.max(.36, Math.min(.76, ratio));

  return { x: centerX, y: centerY, ratio: defaultRatio };
}

function configureCamera() {
  state.defaultCamera = calculateMainCamera();
  state.cameraLimits = {
    min: Math.max(.16, state.defaultCamera.ratio * .42),
    max: Math.min(.92, Math.max(state.defaultCamera.ratio * 1.28, state.defaultCamera.ratio + .12))
  };
  state.renderer.setSetting('minCameraRatio', state.cameraLimits.min);
  state.renderer.setSetting('maxCameraRatio', state.cameraLimits.max);
  state.renderer.getCamera().setState(state.defaultCamera);
}

function resetCameraToDefault() {
  if (!state.renderer || !state.defaultCamera) return;
  state.renderer.getCamera().animate(state.defaultCamera, { duration: 400 });
}

function focusNode(id, shouldZoom = true) {
  if (!state.renderer || !state.nodes.has(id)) return;
  state.selectedId = id;
  const related = new Set([id, ...(state.undirected.get(id) || [])]);
  refreshRenderer();
  $('#hero-select').value = id;
  $('#hero-search').value = displayName(id);
  updateHero(id);
  $('#network-status').textContent = `${displayName(id)} selected; ${related.size - 1} direct neighbors highlighted.`;
  if (shouldZoom) {
    const data = state.renderer.getNodeDisplayData(id);
    if (data) {
      const ratio = Math.max(state.cameraLimits.min, Math.min(state.cameraLimits.max, state.defaultCamera.ratio * .78));
      state.renderer.getCamera().animate({ x: data.x, y: data.y, ratio }, { duration: 450 });
    }
  }
}

function resetNetwork() {
  if (!state.renderer) return;
  state.selectedId = null;
  hideTooltip();
  refreshRenderer();
  $('#hero-search').value = '';
  $('#network-status').textContent = '303 pages loaded. Main network in view; zoom, pan, or select a hero.';
  updateNetworkPanel(null);
  resetCameraToDefault();
}

function findPath() {
  const source = $('#path-from').value;
  const target = $('#path-to').value;
  const result = $('#path-result');
  if (source === target) {
    result.textContent = 'Choose two different heroes.';
    return;
  }
  const distances = shortestDistances(source);
  if (!distances.has(target)) {
    result.textContent = 'No path exists.';
    return;
  }
  const path = [target];
  let current = target;
  while (current !== source) {
    const previous = [...(state.undirected.get(current) || [])].find((id) => distances.get(id) === distances.get(current) - 1);
    if (!previous) break;
    path.unshift(previous);
    current = previous;
  }
  focusNode(source);
  result.textContent = `${path.length - 1} hops: ${path.map((id) => displayName(id)).join(' → ')}`;
}

function zoomNetwork(factor) {
  if (!state.renderer) return;
  const camera = state.renderer.getCamera();
  const stateNow = camera.getState();
  camera.animate({ ratio: stateNow.ratio * factor }, { duration: 220 });
}

async function loadNetwork() {
  const [nodeResponse, edgeResponse] = await Promise.all([
    fetch('../week1_nodes.tsv'),
    fetch('../week1_edges.tsv')
  ]);
  if (!nodeResponse.ok || !edgeResponse.ok) throw new Error('The Week 1 TSV data could not be loaded.');
  const nodeRows = parseTsv(await nodeResponse.text());
  const edgeRows = parseTsv(await edgeResponse.text());

  nodeRows.slice(1).forEach((row) => {
    if (!row[0]) return;
    state.names.set(row[0], row[1] || displayName(row[0]));
    state.nodes.set(row[0], { id: row[0], name: row[1] || displayName(row[0]) });
    state.undirected.set(row[0], new Set());
    state.directedDegree.set(row[0], 0);
  });
  edgeRows.slice(1).forEach((row) => {
    if (!state.nodes.has(row[0]) || !state.nodes.has(row[1])) return;
    addUndirectedEdge(row[0], row[1]);
    state.directedDegree.set(row[0], state.directedDegree.get(row[0]) + 1);
    state.directedDegree.set(row[1], state.directedDegree.get(row[1]) + 1);
  });

  const componentList = components();
  const positions = layoutNodes(componentList);
  const Graph = window.graphology?.Graph;
  if (!Graph || !window.Sigma) throw new Error('Sigma.js or Graphology could not be loaded.');
  state.graph = new Graph({ type:'undirected', multi:false, allowSelfLoops:false });
  state.nodes.forEach((node, id) => {
    const position = positions.get(id) || { x:0, y:0 };
    state.graph.addNode(id, { x:position.x, y:position.y, size:5 + ((state.directedDegree.get(id) || 0) / 115) * 17, label:displayName(id), degree:state.directedDegree.get(id) || 0, color:'#65727f' });
  });
  const seenEdges = new Set();
  edgeRows.slice(1).forEach((row) => {
    if (!state.nodes.has(row[0]) || !state.nodes.has(row[1])) return;
    const edgeId = [row[0], row[1]].sort().join('::');
    if (seenEdges.has(edgeId)) return;
    seenEdges.add(edgeId);
    state.graph.addEdge(row[0], row[1], { size:.35, color:'#4d5a68' });
  });

  state.renderer = new window.Sigma(state.graph, $('#network'), {
    renderLabels:true,
    labelFont:'DM Sans',
    labelColor:{ color:'#f3f5f7' },
    labelRenderedSizeThreshold:9,
    minCameraRatio:.2,
    maxCameraRatio:.9,
    defaultNodeColor:'#65727f',
    defaultEdgeColor:'#4d5a68',
    nodeReducer:(node, data) => {
      const next = { ...data };
      const related = state.selectedId && (state.undirected.get(state.selectedId)?.has(node) || node === state.selectedId);
      next.color = node === state.selectedId ? '#e62429' : related ? '#d96b5f' : '#65727f';
      next.size = node === state.selectedId ? Math.max(data.size * 1.35, 11) : data.size;
      next.label = node === state.selectedId || related ? data.label : '';
      next.forceLabel = node === state.selectedId;
      next.zIndex = node === state.selectedId ? 3 : related ? 2 : 1;
      next.hidden = false;
      if (state.selectedId && !related) next.color = '#1b242e';
      return next;
    },
    edgeReducer:(edge, data) => {
      const next = { ...data };
      const source = state.graph.source(edge);
      const target = state.graph.target(edge);
      const related = state.selectedId && (source === state.selectedId || target === state.selectedId);
      next.color = related ? '#e62429' : '#34404d';
      next.size = related ? 1.3 : .28;
      if (state.selectedId && !related) next.hidden = false;
      return next;
    }
  });
  configureCamera();
  state.renderer.on('clickNode', ({ node }) => focusNode(node));
  state.renderer.on('clickStage', resetNetwork);
  state.renderer.on('enterNode', ({ node, event }) => tooltipForNode(node, event));
  state.renderer.on('leaveNode', hideTooltip);
  const resizeObserver = new ResizeObserver(() => {
    if (!state.selectedId) configureCamera();
  });
  resizeObserver.observe($('#network'));

  const ids = [...state.nodes.keys()].sort((a, b) => displayName(a).localeCompare(displayName(b)));
  const datalist = $('#hero-options');
  ids.forEach((id) => {
    const option = document.createElement('option');
    option.value = displayName(id);
    datalist.append(option);
  });
  setOptions($('#hero-select'), ids);
  setOptions($('#path-from'), ids);
  setOptions($('#path-to'), ids);
  $('#path-from').value = ids.find((id) => displayName(id) === 'Spider-Man') || ids[0];
  $('#path-to').value = ids.find((id) => displayName(id) === 'Hulk') || ids[1];
  updateNetworkPanel(null);
  $('#network-status').textContent = `303 pages loaded. Main network in view; ${seenEdges.size.toLocaleString()} connections available.`;
}

async function renderComparison() {
  const response = await fetch('data/comparison.json');
  if (!response.ok) throw new Error('The comparison data could not be loaded.');
  const comparison = await response.json();
  const values = comparison.metrics.flatMap((row) => [
    { metric:row.metric, network:'Marvel', value:row.Marvel },
    { metric:row.metric, network:'Random G(n,m)', value:row.Random }
  ]);
  await vegaEmbed('#comparison-chart', {
    width:'container',
    height:300,
    data:{ values },
    mark:{ type:'bar', cornerRadiusTopLeft:2, cornerRadiusTopRight:2 },
    encoding:{
      x:{ field:'network', type:'nominal', axis:{ title:null, labelAngle:0 } },
      y:{ field:'value', type:'quantitative', axis:{ title:'Value' } },
      xOffset:{ field:'metric' },
      color:{ field:'metric', type:'nominal', legend:{ title:null } },
      tooltip:[{ field:'metric', type:'nominal' }, { field:'network', type:'nominal' }, { field:'value', type:'quantitative', format:'.3f' }]
    },
    config:{ view:{ stroke:null }, axis:{ labelFont:'DM Sans', titleFont:'DM Sans' }, legend:{ labelFont:'DM Sans' } }
  }, { actions:false });
}

function wireControls() {
  $('#hero-select').addEventListener('change', (event) => focusNode(event.target.value));
  $('#hero-search').addEventListener('input', (event) => {
    const query = event.target.value.trim().toLowerCase();
    const match = [...state.names.entries()].find(([, name]) => name.toLowerCase() === query)
      || [...state.names.entries()].find(([, name]) => name.toLowerCase().includes(query));
    if (match) focusNode(match[0]);
  });
  $('#zoom-in').addEventListener('click', () => zoomNetwork(.78));
  $('#zoom-out').addEventListener('click', () => zoomNetwork(1.28));
  $('#reset-network').addEventListener('click', () => resetNetwork());
  $('#find-path').addEventListener('click', findPath);
}

async function start() {
  try {
    await Promise.all([loadNetwork(), renderComparison()]);
    wireControls();
  } catch (error) {
    $('#network-status').textContent = error.message;
    $('#hero-note').textContent = error.message;
    $('#path-result').textContent = error.message;
  }
}

start();
