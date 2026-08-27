/**
 * DIAGRAM ENGINE
 *
 * Layout algorithms and mermaid rendering for the diagram system.
 * Extracted from index.js for modularity.
 */

const diagramCache = {};

function layoutCycle(nodes, radius, center) {
  const angleStep = (2 * Math.PI) / nodes.length;
  return nodes.map((node, i) => ({
    ...node,
    x: center.x + radius * Math.cos(i * angleStep - Math.PI / 2),
    y: center.y + radius * Math.sin(i * angleStep - Math.PI / 2),
    shape: node.shape || 'circle',
  }));
}

function layoutFlowchart(nodes, edges, startX, startY, width) {
  const inDegree = {};
  nodes.forEach((n) => {
    inDegree[n.id] = 0;
  });
  edges.forEach((e) => {
    inDegree[e.to] = (inDegree[e.to] || 0) + 1;
  });

  const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
  const visited = new Set();
  let currentLayer = queue;
  let layerIdx = 0;
  const layerMap = [];

  while (currentLayer.length > 0) {
    layerMap[layerIdx] = currentLayer;
    const nextLayer = [];
    currentLayer.forEach((id) => {
      visited.add(id);
      edges
        .filter((e) => e.from === id)
        .forEach((e) => {
          if (!visited.has(e.to)) {
            nextLayer.push(e.to);
          }
        });
    });
    currentLayer = [...new Set(nextLayer)];
    layerIdx++;
  }

  const remaining = nodes.filter((n) => !visited.has(n.id)).map((n) => n.id);
  if (remaining.length > 0) layerMap.push(remaining);

  const verticalGap = 100;
  const results = [];
  layerMap.forEach((layerIds, lIdx) => {
    const layerWidth = layerIds.length * 150;
    const xBase = startX + (width - layerWidth) / 2 + 75;
    layerIds.forEach((id, i) => {
      const node = nodes.find((n) => n.id === id);
      if (!node) return;
      results.push({ ...node, x: xBase + i * 150, y: startY + lIdx * verticalGap, shape: node.shape || 'box' });
    });
  });
  return results;
}

function layoutHierarchy(nodes, edges, startX, startY, width, height) {
  const childMap = {};
  const parentMap = {};
  nodes.forEach((n) => {
    childMap[n.id] = [];
  });
  edges.forEach((e) => {
    childMap[e.from] = childMap[e.from] || [];
    childMap[e.from].push(e.to);
    parentMap[e.to] = e.from;
  });

  const roots = nodes.filter((n) => !parentMap[n.id]);
  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0]);

  const results = [];
  const levelGap = height / (nodes.length || 1);
  const visited = new Set();

  function layoutNode(nodeId, level, left, right) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const x = (left + right) / 2;
    const y = startY + level * levelGap + levelGap / 2;
    results.push({ ...node, x, y, w: 100, h: 40, shape: node.shape || 'box' });
    const children = childMap[nodeId] || [];
    const segW = (right - left) / (children.length || 1);
    children.forEach((cid, i) => {
      layoutNode(cid, level + 1, left + i * segW, left + (i + 1) * segW);
    });
  }

  const segW = width / roots.length;
  roots.forEach((r, i) => {
    layoutNode(r.id, 0, startX + i * segW, startX + (i + 1) * segW);
  });

  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      results.push({ ...n, x: startX + width / 2, y: startY + height / 2, w: 100, h: 40, shape: n.shape || 'box' });
    }
  });
  return results;
}

function getDiagramImage(content, debounceRender) {
  if (diagramCache[content]) {
    return diagramCache[content].ready ? diagramCache[content] : { ready: false };
  }

  const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
  const entry = { ready: false, img: new Image(), width: 0, height: 0, content };
  diagramCache[content] = entry;

  if (typeof mermaid !== 'undefined') {
    mermaid
      .render(id, content)
      .then(({ svg }) => {
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (!svgEl) {
          entry.error = true;
          return;
        }
        const viewbox = svgEl.getAttribute('viewBox');
        if (viewbox) {
          const parts = viewbox.split(' ');
          entry.width = parseFloat(parts[2]);
          entry.height = parseFloat(parts[3]);
        } else {
          entry.width = parseFloat(svgEl.getAttribute('width')) || 400;
          entry.height = parseFloat(svgEl.getAttribute('height')) || 300;
        }
        entry.img.onload = () => {
          URL.revokeObjectURL(url);
          entry.ready = true;
          if (debounceRender) debounceRender();
        };
        entry.img.src = url;
      })
      .catch((err) => {
        console.error('Mermaid render failed', err);
        entry.error = true;
        entry.ready = true;
      });
  }

  return entry;
}

function parseDiagramJSON(content) {
  try {
    const data = JSON.parse(content);
    if (!data || !data.nodes) throw new Error('Missing nodes');
    return data;
  } catch (e) {
    console.error('Failed to parse diagram JSON', e);
    return null;
  }
}

function positionDiagramNodes(data, activeZoneX, y, activeZoneWidth, dHeight) {
  const cx = activeZoneX + activeZoneWidth / 2;
  const cy = y + dHeight / 2;
  const r = Math.min(activeZoneWidth, dHeight) / 2 - 60;

  if (data.type === 'flowchart') {
    return layoutFlowchart(data.nodes, data.edges || [], activeZoneX, y, activeZoneWidth);
  } else if (data.type === 'hierarchy') {
    return layoutHierarchy(data.nodes, data.edges || [], activeZoneX, y, activeZoneWidth, dHeight);
  } else if (data.type === 'pyramid') {
    const layerH = dHeight / data.nodes.length;
    return data.nodes.map((n, i) => ({
      ...n,
      x: cx,
      y: y + i * layerH + layerH / 2,
      w: Math.max(80, 200 - i * 40),
      h: layerH * 0.7,
    }));
  }
  return layoutCycle(data.nodes, r, { x: cx, y: cy });
}

// Export for Node.js/test environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    layoutCycle,
    layoutFlowchart,
    layoutHierarchy,
    getDiagramImage,
    parseDiagramJSON,
    positionDiagramNodes,
    diagramCache,
  };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.DiagramEngine = {
    layoutCycle,
    layoutFlowchart,
    layoutHierarchy,
    getDiagramImage,
    parseDiagramJSON,
    positionDiagramNodes,
    diagramCache,
  };
}
