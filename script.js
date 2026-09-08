const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const explorerTabs = document.querySelectorAll('[data-degree-view]');
const rankingPanels = document.querySelectorAll('[data-ranking-panel]');

explorerTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const selectedView = tab.dataset.degreeView;

    explorerTabs.forEach((item) => {
      const isSelected = item === tab;
      item.classList.toggle('is-active', isSelected);
      item.setAttribute('aria-selected', String(isSelected));
    });

    rankingPanels.forEach((panel) => {
      panel.classList.toggle('is-hidden', panel.dataset.rankingPanel !== selectedView);
    });
  });
});

const networkExplorer = document.querySelector('[data-network-explorer]');

if (networkExplorer) {
  const svg = networkExplorer.querySelector('[data-network-svg]');
  const canvas = networkExplorer.querySelector('[data-network-canvas]');
  const edgeLayer = networkExplorer.querySelector('[data-network-edges]');
  const nodeLayer = networkExplorer.querySelector('[data-network-nodes]');
  const search = networkExplorer.querySelector('[data-network-search]');
  const options = networkExplorer.querySelector('#marvel-character-options');
  const nameOutput = networkExplorer.querySelector('[data-network-name]');
  const inOutput = networkExplorer.querySelector('[data-network-in]');
  const outOutput = networkExplorer.querySelector('[data-network-out]');
  const totalOutput = networkExplorer.querySelector('[data-network-total]');
  const statusOutput = networkExplorer.querySelector('[data-network-status]');
  const inList = networkExplorer.querySelector('[data-network-in-list]');
  const outList = networkExplorer.querySelector('[data-network-out-list]');
  const resetButton = networkExplorer.querySelector('[data-network-reset]');
  const nodes = new Map();
  const edges = [];
  let selectedId = null;
  let transform = { x: 0, y: 0, scale: 1 };
  let drag = null;

  const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]);
  const parseTsv = (text) => text.split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => line.split('\t'));
  const displayName = (node) => node.name || node.id.replaceAll('_', ' ');
  const createNode = (id, name, description) => ({ id, name, description, incoming: [], outgoing: [], x: 0, y: 0 });

  const renderNeighbors = (list, ids) => {
    list.replaceChildren();
    if (!ids.length) {
      const item = document.createElement('li');
      item.textContent = 'None in this snapshot';
      item.className = 'neighbor-empty';
      list.append(item);
      return;
    }
    ids.forEach((id) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.networkNeighbor = id;
      button.textContent = displayName(nodes.get(id));
      item.append(button);
      list.append(item);
    });
  };

  const applyTransform = () => {
    canvas.setAttribute('transform', `translate(${transform.x} ${transform.y}) scale(${transform.scale})`);
  };

  const focusNode = (id, shouldZoom = true) => {
    if (!nodes.has(id)) return;
    selectedId = id;
    const selected = nodes.get(id);
    if (shouldZoom) {
      transform.scale = Math.max(transform.scale, 1.25);
      transform.x = 450 - (selected.x * transform.scale);
      transform.y = 280 - (selected.y * transform.scale);
      applyTransform();
    }
    const related = new Set([id, ...selected.incoming, ...selected.outgoing]);
    edgeLayer.querySelectorAll('[data-edge-id]').forEach((element) => {
      const edge = edges[Number(element.dataset.edgeId)];
      element.classList.toggle('is-incoming', edge.target === id);
      element.classList.toggle('is-outgoing', edge.source === id);
      element.classList.toggle('is-related', edge.source === id || edge.target === id);
      element.classList.toggle('is-dimmed', !related.has(edge.source) || !related.has(edge.target));
    });
    nodeLayer.querySelectorAll('[data-node-id]').forEach((element) => {
      const nodeId = element.dataset.nodeId;
      element.classList.toggle('is-selected', nodeId === id);
      element.classList.toggle('is-neighbor', related.has(nodeId) && nodeId !== id);
      element.classList.toggle('is-dimmed', !related.has(nodeId));
    });
    nameOutput.textContent = displayName(selected);
    inOutput.textContent = selected.incoming.length;
    outOutput.textContent = selected.outgoing.length;
    totalOutput.textContent = selected.incoming.length + selected.outgoing.length;
    statusOutput.textContent = `${selected.incoming.length + selected.outgoing.length} direct connection${selected.incoming.length + selected.outgoing.length === 1 ? '' : 's'} highlighted.`;
    renderNeighbors(inList, selected.incoming);
    renderNeighbors(outList, selected.outgoing);
    search.value = displayName(selected);
  };

  const renderGraph = () => {
    edgeLayer.replaceChildren();
    nodeLayer.replaceChildren();
    edges.forEach((edge, index) => {
      const source = nodes.get(edge.source);
      const target = nodes.get(edge.target);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', source.x); line.setAttribute('y1', source.y);
      line.setAttribute('x2', target.x); line.setAttribute('y2', target.y);
      line.dataset.edgeId = index;
      line.classList.add('network-edge');
      edgeLayer.append(line);
    });
    [...nodes.values()].forEach((node) => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.dataset.nodeId = node.id;
      group.classList.add('network-node');
      group.setAttribute('tabindex', '0');
      group.setAttribute('role', 'button');
      group.setAttribute('aria-label', `${displayName(node)}, ${node.incoming.length} incoming and ${node.outgoing.length} outgoing links`);
      group.addEventListener('click', (event) => { event.stopPropagation(); focusNode(node.id); });
      group.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); focusNode(node.id); } });
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x); circle.setAttribute('cy', node.y); circle.setAttribute('r', String(Math.min(9, 3.5 + ((node.incoming.length + node.outgoing.length) / 25))));
      circle.classList.add('network-node-dot');
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', node.x + 8); label.setAttribute('y', node.y - 8); label.textContent = displayName(node);
      label.classList.add('network-node-label');
      if (node.incoming.length + node.outgoing.length < 18) label.classList.add('is-hidden-label');
      group.append(circle, label);
      nodeLayer.append(group);
    });
    const defaultNode = [...nodes.values()].sort((a, b) => (b.incoming.length + b.outgoing.length) - (a.incoming.length + a.outgoing.length))[0];
    if (defaultNode) focusNode(defaultNode.id, false);
  };

  const loadNetwork = async () => {
    try {
      const [nodeResponse, edgeResponse] = await Promise.all([fetch('week1_nodes.tsv'), fetch('week1_edges.tsv')]);
      if (!nodeResponse.ok || !edgeResponse.ok) throw new Error('The course data files could not be loaded.');
      const nodeRows = parseTsv(await nodeResponse.text());
      const edgeRows = parseTsv(await edgeResponse.text());
      nodeRows.slice(1).forEach((row) => { if (row[0]) nodes.set(row[0], createNode(row[0], row[1], row[5])); });
      edgeRows.slice(1).forEach((row) => {
        if (!nodes.has(row[0]) || !nodes.has(row[1])) return;
        edges.push({ source: row[0], target: row[1] });
        nodes.get(row[0]).outgoing.push(row[1]);
        nodes.get(row[1]).incoming.push(row[0]);
      });
      const ordered = [...nodes.values()].sort((a, b) => (b.incoming.length + b.outgoing.length) - (a.incoming.length + a.outgoing.length));
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      ordered.forEach((node, index) => {
        const radius = 24 + Math.sqrt(index / ordered.length) * 238;
        const angle = index * goldenAngle;
        node.x = 450 + Math.cos(angle) * radius;
        node.y = 280 + Math.sin(angle) * radius * 0.78;
        const option = document.createElement('option');
        option.value = displayName(node);
        options.append(option);
      });
      renderGraph();
      statusOutput.textContent = `${nodes.size} pages and ${edges.length} directed links loaded from the course snapshot.`;
    } catch (error) {
      nameOutput.textContent = 'Network unavailable';
      statusOutput.textContent = error.message;
    }
  };

  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    const match = [...nodes.values()].find((node) => displayName(node).toLowerCase() === query) || [...nodes.values()].find((node) => displayName(node).toLowerCase().includes(query));
    if (match) focusNode(match.id);
  });
  networkExplorer.addEventListener('click', (event) => {
    const neighbor = event.target.closest('[data-network-neighbor]');
    if (neighbor) focusNode(neighbor.dataset.networkNeighbor);
  });
  resetButton.addEventListener('click', () => { transform = { x: 0, y: 0, scale: 1 }; applyTransform(); if (nodes.has('Spider-Man')) focusNode('Spider-Man', false); });
  svg.addEventListener('wheel', (event) => { event.preventDefault(); transform.scale = Math.min(2.8, Math.max(0.55, transform.scale * (event.deltaY < 0 ? 1.1 : 0.9))); applyTransform(); }, { passive: false });
  svg.addEventListener('pointerdown', (event) => { if (event.target.closest('[data-node-id]')) return; drag = { x: event.clientX, y: event.clientY, originX: transform.x, originY: transform.y }; svg.setPointerCapture(event.pointerId); });
  svg.addEventListener('pointermove', (event) => { if (!drag) return; transform.x = drag.originX + event.clientX - drag.x; transform.y = drag.originY + event.clientY - drag.y; applyTransform(); });
  svg.addEventListener('pointerup', () => { drag = null; });
  loadNetwork();
}
