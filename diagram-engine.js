/**
 * DIAGRAM ENGINE
 *
 * Layout algorithms and mermaid rendering for the diagram system.
 * Extracted from index.js for modularity.
 */

// ponytail: LRU cache — evicts oldest entry when exceeding 100
const diagramCache = new Map();
const DIAGRAM_CACHE_MAX = 100;

function layoutCycle(nodes, radius, center) {
  const angleStep = (2 * Math.PI) / nodes.length;
  return nodes.map((node, i) => {
    const label = node.label || '';
    const approxW = Math.max(90, Math.min(135, label.length * 8.5 + 24));
    return {
      ...node,
      x: center.x + radius * Math.cos(i * angleStep - Math.PI / 2),
      y: center.y + radius * Math.sin(i * angleStep - Math.PI / 2),
      shape: node.shape || 'circle',
      w: node.w || approxW,
      h: node.h || approxW,
    };
  });
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
  if (diagramCache.has(content)) {
    const cached = diagramCache.get(content);
    return cached.ready ? cached : { ready: false };
  }

  if (diagramCache.size >= DIAGRAM_CACHE_MAX) {
    const oldest = diagramCache.keys().next().value;
    diagramCache.delete(oldest);
  }

  const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
  const entry = { ready: false, img: new Image(), width: 0, height: 0, content };
  diagramCache.set(content, entry);

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
          URL.revokeObjectURL(url);
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

/**
 * Computes the intersection point between a shape's perimeter and a ray from node center
 * towards (targetX, targetY).
 * Adds padding so connectors lift cleanly off the shape boundary like hand drawing.
 */
function getNodePerimeterPoint(node, targetX, targetY, padding = 6) {
  const dx = targetX - node.x;
  const dy = targetY - node.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { x: node.x, y: node.y, angle: 0 };
  const ux = dx / dist;
  const uy = dy / dist;
  const angle = Math.atan2(dy, dx);
  const shape = node.shape || 'circle';

  let offset = 0;
  if (shape === 'circle') {
    const radius = Math.max(node.w || 100, node.h || 100) / 2;
    offset = radius + padding;
  } else if (shape === 'diamond') {
    const hw = (node.w || 100) / 2;
    const hh = (node.h || 60) / 2;
    const denom = Math.abs(ux) / hw + Math.abs(uy) / hh;
    offset = 1 / (denom || 1) + padding;
  } else {
    // box, rect, rounded, pill
    const hw = (node.w || 100) / 2;
    const hh = (node.h || 40) / 2;
    const scaleX = Math.abs(ux) > 0.0001 ? hw / Math.abs(ux) : Infinity;
    const scaleY = Math.abs(uy) > 0.0001 ? hh / Math.abs(uy) : Infinity;
    offset = Math.min(scaleX, scaleY) + padding;
  }

  return {
    x: node.x + ux * offset,
    y: node.y + uy * offset,
    angle,
  };
}

/**
 * Calculates connecting edges with perimeter clipping and natural organic curves for cycles.
 * Never cuts through node borders or text!
 */
function calculateDiagramEdges(data, positionedNodes, activeZoneX, y, activeZoneWidth, dHeight) {
  const edges = data.edges && data.edges.length > 0 ? data.edges : [];

  // If cycle diagram has no edges declared, synthesize circular flow n[i] -> n[(i+1)%len]
  let edgeList = edges;
  if (data.type === 'cycle' && edgeList.length === 0 && positionedNodes.length > 1) {
    edgeList = positionedNodes.map((n, i) => ({
      from: n.id,
      to: positionedNodes[(i + 1) % positionedNodes.length].id,
    }));
  }

  const cx = activeZoneX + activeZoneWidth / 2;
  const cy = y + dHeight / 2;

  const resultEdges = [];
  edgeList.forEach((e) => {
    const fromNode = positionedNodes.find((n) => n.id === e.from);
    const toNode = positionedNodes.find((n) => n.id === e.to);
    if (!fromNode || !toNode) return;

    if (data.type === 'cycle') {
      // Natural curved arrow for cycle diagrams
      const rawFrom = getNodePerimeterPoint(fromNode, toNode.x, toNode.y, 6);
      const rawTo = getNodePerimeterPoint(toNode, fromNode.x, fromNode.y, 6);

      const midX = (rawFrom.x + rawTo.x) / 2;
      const midY = (rawFrom.y + rawTo.y) / 2;

      // Vector from cycle center to midpoint of chord
      const vcx = midX - cx;
      const vcy = midY - cy;
      const vDist = Math.hypot(vcx, vcy);

      let control;
      if (vDist > 1) {
        const uOutX = vcx / vDist;
        const uOutY = vcy / vDist;
        // Bulge outward along the orbit so the arrow forms a smooth circular arc
        const cycleRadius = Math.hypot(fromNode.x - cx, fromNode.y - cy);
        const bulge = Math.max(16, (cycleRadius - vDist) * 1.35);
        control = {
          x: midX + uOutX * bulge,
          y: midY + uOutY * bulge,
        };
      } else {
        control = { x: midX, y: midY };
      }

      // Re-anchor start and end towards the control point for seamless curve entry/exit
      const fromPt = getNodePerimeterPoint(fromNode, control.x, control.y, 6);
      const toPt = getNodePerimeterPoint(toNode, control.x, control.y, 6);

      resultEdges.push({
        from: fromPt,
        to: toPt,
        control,
        isCurved: true,
        label: e.label || '',
      });
    } else {
      // Flowchart / hierarchy / general: clean perimeter-to-perimeter connector
      const fromPt = getNodePerimeterPoint(fromNode, toNode.x, toNode.y, 6);
      const toPt = getNodePerimeterPoint(toNode, fromNode.x, fromNode.y, 6);

      resultEdges.push({
        from: fromPt,
        to: toPt,
        isCurved: false,
        label: e.label || '',
      });
    }
  });

  return resultEdges;
}

function positionDiagramNodes(data, activeZoneX, y, activeZoneWidth, dHeight) {
  const cx = activeZoneX + activeZoneWidth / 2;
  const cy = y + dHeight / 2;

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

  // Cycle diagram
  const nodes = data.nodes || [];
  const maxLabelLen = Math.max(...nodes.map((n) => (n.label ? n.label.length : 1)), 1);
  const approxNodeRadius = Math.max(45, Math.min(65, (maxLabelLen * 8.5 + 24) / 2));
  const maxOrbit = Math.min(
    (activeZoneWidth - approxNodeRadius * 2 - 20) / 2,
    (dHeight - approxNodeRadius * 2 - 20) / 2
  );
  const r = Math.max(approxNodeRadius + 30, Math.min(maxOrbit, Math.min(activeZoneWidth, dHeight) / 2 - 45));

  return layoutCycle(nodes, r, { x: cx, y: cy });
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
    getNodePerimeterPoint,
    calculateDiagramEdges,
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
    getNodePerimeterPoint,
    calculateDiagramEdges,
    diagramCache,
  };
}
