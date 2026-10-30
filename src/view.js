import * as React from 'react';
import { parseVisual, splitVisuals } from './model.js';
import { MermaidDiagram, validateMermaid } from './mermaid.js';
const h = React.createElement;
export const en = { source: 'Source', copy: 'Copy source', copied: 'Copied', export: 'Export SVG', data: 'View data', apply: 'Apply preview', cancel: 'Cancel', reset: 'Reset', edit: 'Edit visual source', preview: 'Edits affect this preview only. The conversation stays unchanged.', error: 'Could not apply this source', exportError: 'Export failed', copyError: 'Copy failed', label: 'Label', value: 'Value', note: 'Note', total: 'Total', point: 'Point', gallery: 'Visuals', galleryIntro: 'Charts and diagrams, right where the explanation needs them.', empty: 'Choose a visual to explore its design.' };
Object.assign(en, { save: 'Applying…', diagram: 'Diagram', rendering: 'Drawing diagram…', diagramError: 'Check the diagram syntax below.', from: 'From', to: 'To', condition: 'Condition' });
export const zh = { ...en };
const defaultT = key => en[key] || key;
const palette = ['#3976e8', '#13998d', '#c68a22', '#8873ca', '#c86883', '#5b8b40'];
const fmt = n => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2, notation: Math.abs(n) >= 1e7 ? 'compact' : 'standard' }).format(n);
const color = i => palette[i % palette.length];
function words(text, size = 20) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const token of paragraph.split(/\s+/)) {
      if ((line + ' ' + token).length > size && line) { lines.push(line); line = ''; }
      // Break an exceptionally long token instead of overflowing the diagram.
      for (let i = 0; i < token.length; i += size) {
        const part = token.slice(i, i + size);
        if (i) { lines.push(line); line = part; }
        else line += (line ? ' ' : '') + part;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}
function textLines(text, x, y, width = 20, props = {}) {
  const lines = words(text, width);
  return h('text', { x, y, ...props }, lines.map((line, i) => h('tspan', { key: i, x, dy: i ? 17 : 0 }, line)));
}
function svgRoot(title, W, H, children, description) {
  return h('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': title || description, className: 'dv-svg', xmlns: 'http://www.w3.org/2000/svg' },
    h('title', null, title || description), h('desc', null, description), children);
}
function spark(values, width = 90, height = 26) {
  if (values.length < 2) return '';
  const low = Math.min(...values), high = Math.max(...values), span = high - low || 1;
  return values.map((v, i) => `${i ? 'L' : 'M'}${i / (values.length - 1) * width},${height - (v - low) / span * (height - 4) - 2}`).join(' ');
}
function Metrics({ model, width = 720 }) {
  const count = model.rows.length, W = Math.max(280, width), cols = Math.min(count, W < 480 ? 1 : W < 650 ? 2 : 3), cell = W / cols;
  const layouts = model.rows.map(r => ({ label: words(r.label, Math.floor(cell / 8) - 2), note: words(r.note, Math.floor(cell / 7) - 2) }));
  const heights = Array.from({ length: Math.ceil(count / cols) }, (_, row) => Math.max(135, ...layouts.slice(row * cols, (row + 1) * cols).map(l => 110 + Math.max(0, l.label.length - 1) * 17 + Math.min(2, l.note.length) * 17)));
  const offsets = heights.map((_, row) => heights.slice(0, row).reduce((sum, v) => sum + v, 0));
  const H = heights.reduce((sum, v) => sum + v, 0);
  return svgRoot(model.title, W, H, model.rows.map((r, i) => {
    const row = Math.floor(i / cols), x = i % cols * cell, y = offsets[row];
    const { label, note } = layouts[i], valueY = y + 52 + Math.max(0, label.length - 1) * 17;
    return h('g', { key: i, className: 'dv-metric' },
      h('line', { x1: x + 3, y1: y + 8, x2: x + 3, y2: y + heights[row] - 22, stroke: color(i), strokeWidth: 3, strokeLinecap: 'round' }),
      textLines(label.join('\n'), x + 17, y + 21, 100, { className: 'dv-muted', fontSize: 13 }),
      h('text', { x: x + 17, y: valueY, fontSize: r.raw.length > 12 ? 23 : 32, fontWeight: 600, letterSpacing: '-0.6' }, r.raw.length > 22 ? r.raw.slice(0, 21) + '…' : r.raw),
      textLines(note.slice(0, 2).join('\n'), x + 17, valueY + 28, 100, { className: 'dv-muted', fontSize: 12 }),
      r.trend.length > 1 && h('path', { d: spark(r.trend, cell - 30, 19), transform: `translate(${x + 17} ${y + heights[row] - 28})`, stroke: color(i), fill: 'none', strokeWidth: 2 }));
  }), 'Key figures. Exact values are available in the data table.');
}
function Bars({ model, width = 720 }) {
  const W = Math.max(280, width), compact = W < 520, L = compact ? 0 : Math.min(192, W * .3), R = W - (compact ? 0 : 84);
  const layouts = model.rows.map(r => ({ label: words(r.label, compact ? Math.floor((W - 82) / 7) : Math.floor((L - 14) / 7)), note: words(r.note, Math.floor((R - L) / 6)) }));
  const heights = layouts.map(l => Math.max(58, (compact ? l.label.length * 17 + 36 : l.label.length * 17 + 16) + l.note.length * 16));
  const offsets = heights.map((_, i) => heights.slice(0, i).reduce((a, b) => a + b, 0)), H = heights.reduce((a, b) => a + b, 0) + 34;
  const min = Math.min(0, ...model.rows.map(r => r.value)), max = Math.max(0, ...model.rows.map(r => r.value));
  const span = max - min || 1, x = v => L + (v - min) / span * (R - L), zero = x(0);
  return svgRoot(model.title, W, H, [
    h('line', { key: 'zero', x1: zero, x2: zero, y1: 4, y2: H - 27, className: 'dv-axis' }),
    ...model.rows.map((r, i) => {
      const y = offsets[i] + 12, endpoint = x(r.value), barY = compact ? y + layouts[i].label.length * 17 + 4 : y + 1;
      return h('g', { key: i }, textLines(r.label, 0, y + 14, compact ? Math.floor((W - 82) / 7) : Math.floor((L - 14) / 7), { fontSize: 13, fontWeight: 500 }),
        h('rect', { x: L, y: barY, width: R - L, height: 24, rx: 4, className: 'dv-track' }),
        h('rect', { x: Math.min(zero, endpoint), y: barY, width: Math.max(1, Math.abs(endpoint - zero)), height: 24, rx: 4, fill: color(i), className:'dv-bar-fill', style:{transformOrigin:`${zero}px ${barY}px`, transformBox:'view-box'} }, h('title', null, `${r.label}: ${fmt(r.value)} ${model.unit}`)),
        h('text', { x: W - 2, y: y + 18, textAnchor: 'end', fontSize: 13, fontWeight: 600 }, fmt(r.value)),
        r.note && textLines(r.note, L, barY + 41, Math.floor((R - L) / 6), { fontSize: 11, className: 'dv-muted' }));
    }), h('text', { key: 'min', x: L, y: H - 4, fontSize: 11, className: 'dv-muted' }, `${fmt(min)} ${model.unit}`),
    h('text', { key: 'max', x: R, y: H - 4, textAnchor: 'end', fontSize: 11, className: 'dv-muted' }, `${fmt(max)} ${model.unit}`),
  ], 'Values compared on a shared scale, including negative values.');
}
function Lines({ model, width = 720 }) {
  const [active, setActive] = React.useState(null);
  const W = Math.max(280, width), H = W < 480 ? 290 : 310, L = 55, R = W - 20, T = 18, B = H - 65;
  const all = model.series.flatMap(s => s.values), low = Math.min(0, ...all), high = Math.max(0, ...all);
  const range = high - low || 1, min = low === high ? low - 0.5 : (low === 0 ? 0 : low - range * .08), max = low === high ? high + .5 : high + range * .08;
  const x = i => model.labels.length === 1 ? (L + R) / 2 : L + i / (model.labels.length - 1) * (R - L);
  const y = v => B - (v - min) / (max - min) * (B - T);
  const step = Math.max(1, Math.ceil(model.labels.length / Math.max(2, Math.floor((R - L) / 74))));
  const labels = Array.from({ length: 5 }, (_, i) => min + i / 4 * (max - min));
  return h('div', null, svgRoot(model.title, W, H, [
    ...labels.map((v, i) => h('g', { key: `grid-${i}` },
      h('line', { x1: L, x2: R, y1: y(v), y2: y(v), className: 'dv-grid' }),
      h('text', { x: L - 10, y: y(v) + 4, textAnchor: 'end', fontSize: 11, className: 'dv-muted' }, fmt(v)))),
    ...model.labels.map((label, i) => i % step && i !== model.labels.length - 1 ? null : h('text', { key: `x-${i}`, x: x(i), y: B + 24, textAnchor: 'middle', fontSize: 11, className: 'dv-muted' }, label.length > 13 ? label.slice(0, 12) + '…' : label)),
    ...model.series.map((s, j) => h('g', { key: j },
      s.type === 'bar' ? s.values.map((v, i) => h('rect', { key: i, x: x(i) - 7 + j * 10, y: Math.min(y(0), y(v)), width: 8, height: Math.max(1, Math.abs(y(v) - y(0))), fill: color(j), opacity: .7 }))
        : h('path', { d: s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' '), stroke: color(j), strokeWidth: 2.5, fill: 'none', strokeLinejoin: 'round', strokeLinecap: 'round', strokeDasharray: j === 1 ? '6 4' : j === 2 ? '2 4' : undefined }),
      ...s.values.map((v, i) => h('circle', { key: `point-${i}`, cx: x(i), cy: y(v), r: active?.j === j && active?.i === i ? 6 : 3.5,
        fill: color(j), stroke: 'var(--dv-paper)', strokeWidth: 2, tabIndex: 0, role: 'button', 'aria-label': `${s.name}, ${model.labels[i]}: ${fmt(v)} ${model.unit}`,
        onMouseEnter: () => setActive({ i, j }), onMouseLeave: () => setActive(null), onFocus: () => setActive({ i, j }), onBlur: () => setActive(null),
        onClick: () => setActive({ i, j }), onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive({ i, j }); } },
      }, h('title', null, `${s.name}, ${model.labels[i]}: ${fmt(v)} ${model.unit}`))))),
  ], 'Series compared across the horizontal axis. Focus or hover a point for its exact value.'),
    h('div', { className: 'dv-legend' }, model.series.map((s, i) => h('span', { key: i }, h('i', { style: { background: color(i) } }), s.name))),
    h('div', { className: 'dv-point-readout', 'aria-live': 'polite' }, active ? `${model.series[active.j].name} · ${model.labels[active.i]}: ${fmt(model.series[active.j].values[active.i])} ${model.unit}` : '\u00a0'));
}
function Flow({ model, id }) {
  // Kahn ranks keep branches together; the remaining cycle nodes occupy successive ranks.
  const indegree = new Map(model.nodes.map(n => [n.id, 0])), ranks = new Map(model.nodes.map(n => [n.id, 0]));
  for (const e of model.edges) indegree.set(e.to, indegree.get(e.to) + 1);
  const queue = model.nodes.filter(n => !indegree.get(n.id)).map(n => n.id), visited = new Set();
  while (queue.length) {
    const from = queue.shift(); visited.add(from);
    for (const e of model.edges.filter(e => e.from === from)) {
      ranks.set(e.to, Math.max(ranks.get(e.to), ranks.get(from) + 1));
      indegree.set(e.to, indegree.get(e.to) - 1);
      if (!indegree.get(e.to)) queue.push(e.to);
    }
  }
  let rank = Math.max(0, ...ranks.values());
  for (const n of model.nodes) if (!visited.has(n.id)) ranks.set(n.id, rank++);
  const grouped = new Map();
  for (const n of model.nodes) { const r = ranks.get(n.id); if (!grouped.has(r)) grouped.set(r, []); grouped.get(r).push(n); }
  const LR = model.direction === 'LR', nodeW = 174, nodeH = Math.max(66, ...model.nodes.map(n => words(n.label, 20).length * 17 + 28));
  const rankGap = LR ? 230 : nodeH + 70, breadthGap = LR ? nodeH + 64 : 215;
  const breadth = Math.max(...[...grouped.values()].map(g => g.length));
  const maxRank = Math.max(...ranks.values());
  const W = LR ? (maxRank + 1) * rankGap + 40 : breadth * breadthGap + 40;
  const H = LR ? breadth * breadthGap + 80 : (maxRank + 1) * rankGap + 70;
  const positions = new Map();
  for (const [r, group] of grouped) group.forEach((n, i) => positions.set(n.id, { x: LR ? 30 + r * rankGap : 30 + i * breadthGap + (breadth - group.length) * breadthGap / 2,
    y: LR ? 50 + i * breadthGap + (breadth - group.length) * breadthGap / 2 : 35 + r * rankGap }));
  return h('div', { className: 'dv-flow-scroll', style:{'--dv-flow-width':`${Math.max(280, W)}px`} }, svgRoot(model.title, W, H, [
    h('defs', { key: 'defs' }, h('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#8090a5' }))),
    ...model.edges.map((e, i) => {
      const a = positions.get(e.from), b = positions.get(e.to);
      let x1 = a.x + (LR ? nodeW : nodeW / 2), y1 = a.y + (LR ? nodeH / 2 : nodeH), x2 = b.x + (LR ? 0 : nodeW / 2), y2 = b.y + (LR ? nodeH / 2 : 0);
      const back = ranks.get(e.to) <= ranks.get(e.from);
      let d, lx, ly;
      if (back && LR) { y1 = a.y; y2 = b.y; x1 = a.x + nodeW / 2; x2 = b.x + nodeW / 2; const top = Math.max(8, Math.min(a.y, b.y) - 28 - i % 3 * 8); d = `M${x1},${y1} V${top} H${x2} V${y2}`; lx = (x1 + x2) / 2; ly = top - 5; }
      else if (back) { const right = W - 10 - i % 3 * 8; x1 = a.x + nodeW; x2 = b.x + nodeW; y1 = a.y + nodeH / 2; y2 = b.y + nodeH / 2; d = `M${x1},${y1} H${right} V${y2} H${x2}`; lx = right - 8; ly = (y1 + y2) / 2; }
      else if (LR) { const mid = (x1 + x2) / 2; d = `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`; lx = mid; ly = (y1 + y2) / 2 - 9; }
      else { const mid = (y1 + y2) / 2; d = `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`; lx = (x1 + x2) / 2 + 12; ly = mid; }
      return h('g', { key: `edge-${i}` }, h('path', { d, fill: 'none', stroke: '#8090a5', strokeWidth: 1.5, markerEnd: `url(#${id})` }), e.label && h('text', { x: lx, y: ly, textAnchor: 'middle', fontSize: 11, className: 'dv-edge-label' }, e.label));
    }),
    ...model.nodes.map((n, i) => {
      const p = positions.get(n.id), lines = words(n.label, 20);
      return h('g', { key: n.id }, h('rect', { x: p.x, y: p.y, width: nodeW, height: nodeH, rx: n.decision ? 22 : 9, className: 'dv-node', stroke: n.decision ? color(2) : color(i % 2), strokeWidth: n.decision ? 2 : 1 }),
        textLines(n.label, p.x + nodeW / 2, p.y + nodeH / 2 - (lines.length - 1) * 8.5 + 4, 20, { fontSize: 13, fontWeight: 500, textAnchor: 'middle' }));
    }),
  ], 'Directed process. Arrows indicate the direction; labelled connections describe decisions.'));
}
function Timeline({ model, width = 720 }) {
  const W = Math.max(280, width), compact = W < 520, spine = compact ? 8 : 137, X = spine + 22;
  const labelWidth = Math.max(16, Math.floor((W - X - 8) / 8)), noteWidth = Math.max(18, Math.floor((W - X - 8) / 6.4));
  let cursor = 20;
  const points = model.rows.map(r => {
    const y = cursor, label = words(r.label, labelWidth), note = words(r.note, noteWidth);
    cursor += Math.max(80, (label.length + note.length) * 17 + (compact ? 52 : 35));
    return { ...r, y, labelLines:label };
  });
  return svgRoot(model.title, W, cursor, [h('line', { key: 'spine', x1: spine, x2: spine, y1: 19, y2: points.at(-1).y + 10, className: 'dv-axis' }),
    ...points.map((r, i) => h('g', { key: i }, h('circle', { cx: spine, cy: r.y + 8, r: 5, fill: color(i) }),
      h('text', { x: compact ? X : spine - 20, y: r.y + 13, textAnchor: compact ? 'start' : 'end', fontSize: 12, className: 'dv-muted' }, r.raw.slice(0, 16)),
      textLines(r.label, X, r.y + (compact ? 36 : 13), labelWidth, { fontSize: 15, fontWeight: 600 }),
      textLines(r.note, X, r.y + (compact ? 62 : 39) + (r.labelLines.length - 1) * 17, noteWidth, { fontSize: 12, className: 'dv-muted' }))),
  ], 'Milestones in the order shown, with their dates and descriptions.');
}
function Steps({ model, width = 720 }) {
  const W = Math.max(280, width), compact = W < 520;
  const labelWidth = Math.max(16, Math.floor((W - 55 - (compact ? 0 : 100)) / 8)), noteWidth = Math.max(18, Math.floor((W - 55) / 6.4));
  let y = 12;
  const rows = model.rows.map((r, i) => {
    const label = words(r.label, labelWidth), note = words(r.note, noteWidth), p = { ...r, y, i, labelLines:label };
    y += Math.max(82, label.length * 17 + note.length * 17 + (compact ? 58 : 45)); return p;
  });
  return svgRoot(model.title, W, y, rows.map(r => h('g', { key: r.i },
    h('circle', { cx: 18, cy: r.y + 14, r: 16, className: 'dv-step-disc' }), h('text', { x: 18, y: r.y + 19, textAnchor: 'middle', fontSize: 12, fontWeight: 600, fill: color(r.i) }, r.i + 1),
    textLines(r.label, 50, r.y + 19, labelWidth, { fontSize: 15, fontWeight: 600 }),
    h('text', { x: compact ? 50 : W - 8, y: compact ? r.y + 23 + r.labelLines.length * 17 : r.y + 18, textAnchor: compact ? 'start' : 'end', fontSize: 11, className: 'dv-muted' }, r.raw.slice(0, 14)),
    textLines(r.note, 50, r.y + (compact ? 62 : 44) + (r.labelLines.length - 1) * 17, noteWidth, { fontSize: 12, className: 'dv-muted' }),
  )), 'An ordered procedure with time estimates and details.');
}
function Donut({ model, t, width = 720 }) {
  const W = Math.max(280, width), compact = W < 560, cx = compact ? W / 2 : 125;
  const total = model.rows.reduce((s, r) => s + r.value, 0), radius = 76, circumference = 2 * Math.PI * radius;
  let offset = 0, cursor = compact ? 255 : 26;
  const labelX = compact ? 16 : 257, valueX = W - 67;
  const labelWidth = Math.max(12, Math.floor((valueX - labelX - 60) / 7));
  const rows = model.rows.map(r => { const y = cursor, label = words(r.label, labelWidth); cursor += Math.max(37, label.length * 17 + 15); return {...r, y}; });
  return svgRoot(model.title, W, Math.max(250, cursor + 8), [
    h('circle', {key:'track', cx, cy:120, r:radius, fill:'none', stroke:'var(--dv-wash)', strokeWidth:22}),
    ...model.rows.map((r, i) => { const start = offset; offset += r.value / total * circumference; return h('circle', { key: i, cx, cy: 120, r: radius,
      fill: 'none', stroke: color(i), strokeWidth: 22, strokeDasharray: `${Math.max(0, r.value / total * circumference - (model.rows.length > 1 ? 2 : 0))} ${circumference}`, strokeDashoffset: -start,
      transform: `rotate(-90 ${cx} 120)` }, h('title', null, `${r.label}: ${fmt(r.value)} (${fmt(r.value / total * 100)}%)`)); }),
    h('text', { key: 'total', x: cx, y: 116, textAnchor: 'middle', fontSize: total > 1e6 ? 23 : 29, fontWeight: 600 }, fmt(total)),
    h('text', { key: 'unit', x: cx, y: 140, textAnchor: 'middle', fontSize: 12, className: 'dv-muted' }, model.unit || t('total')),
    ...rows.map((r, i) => h('g', { key: `label-${i}` }, h('circle', { cx: labelX - 10, cy: r.y - 4, r: 4, fill: color(i) }),
      textLines(r.label, labelX, r.y, labelWidth, {fontSize:13}),
      h('text', { x: valueX, y: r.y, textAnchor: 'end', fontSize: 13, fontWeight: 600 }, fmt(r.value)),
      h('text', { x: W - 2, y: r.y, textAnchor: 'end', fontSize: 12, className: 'dv-muted' }, `${fmt(r.value / total * 100)}%`))),
  ], 'Parts of a whole. Labels give exact amounts and percentages.');
}
function tableData(model) {
  if (model.kind === 'line') return { headers: ['Point', ...model.series.map(s => s.name)], rows: model.labels.map((l, i) => [l, ...model.series.map(s => fmt(s.values[i]))]) };
  if (model.kind === 'flowchart') return { headers: ['From', 'To', 'Condition'], rows: model.edges.map(e => [model.nodes.find(n => n.id === e.from).label, model.nodes.find(n => n.id === e.to).label, e.label]) };
  return { headers: ['Label', 'Value', 'Note'], rows: model.rows.map(r => [r.label, r.raw, r.note]) };
}
export function exportSVG(svg) {
  const clone = svg.cloneNode(true), originals = [svg, ...svg.querySelectorAll('*')], copies = [clone, ...clone.querySelectorAll('*')];
  originals.forEach((el, i) => {
    const computed = getComputedStyle(el);
    for (const prop of ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'opacity', 'paint-order']) copies[i].style.setProperty(prop, computed.getPropertyValue(prop));
    copies[i].removeAttribute('tabindex'); copies[i].removeAttribute('role');
  });
  const box = (svg.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number);
  if (box.length !== 4 || box.some(v => !Number.isFinite(v)) || box[2] <= 0 || box[3] <= 0) throw new Error('The SVG has no valid dimensions.');
  clone.setAttribute('width', box[2]); clone.setAttribute('height', box[3]);
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('width', '100%'); background.setAttribute('height', '100%');
  background.setAttribute('fill', getComputedStyle(svg.closest('.dv-figure')).backgroundColor || '#ffffff');
  clone.insertBefore(background, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}
/** A self-contained graphic with local editing, accessible data and export. */
export function VisualFigure({ source, language = 'visual', t = defaultT }) {
  const [edited, setEdited] = React.useState(null), [draft, setDraft] = React.useState(source), [editing, setEditing] = React.useState(false), [error, setError] = React.useState(''), [notice, setNotice] = React.useState('');
  const root = React.useRef(null), sourceButton = React.useRef(null), id = 'dv-' + React.useId().replace(/:/g, '');
  const [width, setWidth] = React.useState(720), [applying, setApplying] = React.useState(false), [diagramReady, setDiagramReady] = React.useState(false);
  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !root.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(280, Math.min(720, entries[0].contentRect.width))));
    observer.observe(root.current); return () => observer.disconnect();
  }, []);
  React.useEffect(() => { setEdited(null); setDraft(source); setError(''); setNotice(''); setEditing(false); }, [source]);
  const value = edited ?? source;
  const closeEditor = () => { setEditing(false); setError(''); sourceButton.current?.focus(); };
  React.useEffect(() => {
    if (editing) root.current?.querySelector('textarea')?.focus();
  }, [editing]);
  React.useEffect(() => {
    const canvas = root.current?.querySelector('.dv-canvas');
    if (!canvas || !globalThis.matchMedia?.('(prefers-reduced-motion: no-preference)').matches || !canvas.animate) return;
    let animation, observer, revealed = false; const barAnimations = [];
    const reveal = () => { if (revealed) return; revealed = true; animation = canvas.animate([{opacity:.35, clipPath:'inset(0 0 12px 0)'}, {opacity:1, clipPath:'inset(0)'}], {duration:280, easing:'cubic-bezier(.2,.7,.2,1)'}); observer?.disconnect(); canvas.querySelectorAll('.dv-bar-fill').forEach((bar, i) => {if(bar.animate) barAnimations.push(bar.animate([{transform:'scaleX(.02)'},{transform:'scaleX(1)'}], {duration:420, delay:Math.min(i * 35, 245), easing:'cubic-bezier(.16,1,.3,1)'}));}); };
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) reveal(); }, {threshold:.12});
      observer.observe(canvas);
    } else reveal();
    return () => {observer?.disconnect(); animation?.cancel(); barAnimations.forEach(item => item.cancel());};
  }, [value]);
  const onDiagramReady = React.useCallback(ready => setDiagramReady(ready), []);
  let model;
  try { model = parseVisual(value, language); } catch (cause) { return h('pre', { className: 'dv-fallback' }, value); }
  const tables = model.kind === 'mermaid' ? null : tableData(model);
  const charts = { metrics: Metrics, bars: Bars, line: Lines, flowchart: Flow, timeline: Timeline, steps: Steps, donut: Donut, mermaid: MermaidDiagram };
  const copy = async () => { try { await navigator.clipboard.writeText(value); setNotice(t('copied')); } catch { setNotice(t('copyError')); } };
  const download = () => {
    try {
      const svg = root.current.querySelector('svg');
      const blob = new Blob([exportSVG(svg)], { type: 'image/svg+xml' }), url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = (model.title || model.kind).replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 80) + '.svg'; document.body.append(a); a.click(); a.remove();
      // Keep the object alive until the browser has consumed the download.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setNotice(t('exportError')); }
  };
  return h('figure', { ref: root, className: 'dv-figure', 'data-visual-kind': model.kind, 'aria-labelledby': id + '-title' },
    h('div', { className: 'dv-heading' }, h('figcaption', {id: id + '-title'}, null, model.title || ({metrics:'Key figures', bars:'Comparison', line:'Trend', flowchart:'Process', timeline:'Timeline', steps:'Steps', donut:'Distribution', mermaid:t('diagram')})[model.kind]), h('div', { className: 'dv-actions' },
      h('button', { ref:sourceButton, type: 'button', 'aria-expanded':editing, 'aria-controls':id + '-editor', onClick: () => { setDraft(value); setEditing(!editing); setError(''); } }, t('source')),
      h('button', { type: 'button', onClick: copy }, t('copy')), h('button', { type: 'button', disabled:model.kind === 'mermaid' && !diagramReady, onClick: download }, t('export')))),
    h('div', { className: 'dv-canvas' }, h(charts[model.kind], { model, id, t, width, onReady:onDiagramReady })),
    model.caption && h('p', { className: 'dv-caption' }, model.caption),
    tables && h('details', { className: 'dv-data' }, h('summary', null, t('data')), h('div', { className: 'dv-table-scroll' }, h('table', null,
      h('thead', null, h('tr', null, tables.headers.map((s, i) => h('th', { key: i, scope: 'col' }, ({ Label: t('label'), Value: t('value'), Note: t('note'), Point: t('point'), From: t('from'), To: t('to'), Condition: t('condition') })[s] || s)))),
      h('tbody', null, tables.rows.map((r, i) => h('tr', { key: i }, r.map((s, j) => h(j ? 'td' : 'th', { key: j, ...(j ? {} : { scope: 'row' }) }, s)))))))),
    editing && h('div', { className: 'dv-editor', id:id + '-editor', onKeyDown:e => {if (e.key === 'Escape' && !applying) {e.preventDefault(); closeEditor();}} }, h('label', { htmlFor: id + '-source' }, t('edit')), h('textarea', { id: id + '-source', value: draft, spellCheck: false, onChange: e => setDraft(e.target.value), rows: 9 }),
      h('p', null, t('preview')), error && h('p', { role: 'alert', className: 'dv-error' }, `${t('error')}: ${error}`),
      h('div', { className: 'dv-editor-actions' }, h('button', {type:'button', disabled:applying, onClick: async () => { setApplying(true); try { const parsed = parseVisual(draft, language); if (parsed.kind === 'mermaid') await validateMermaid(draft); setEdited(draft); setNotice(''); closeEditor(); } catch (e) { setError(e.message); } finally {setApplying(false);} } }, applying ? t('save') : t('apply')),
        h('button', {type:'button', disabled:applying, onClick:closeEditor }, t('cancel')), edited !== null && h('button', {type:'button', disabled:applying, onClick: () => { setEdited(null); setDraft(source); closeEditor(); } }, t('reset')))),
    h('span', { className: 'dv-notice', role: 'status', 'aria-live':'polite' }, notice));
}

/** Preserve native UI behaviour while placing visuals between native prose segments. */
export function makeAssistantWrapper(Native, useTranslate = () => defaultT) {
  return function VisualAssistant(props) {
    const t = useTranslate();
    const { data } = props.node;
    if (props.groupPart === 'reasoning') return h(Native, props);
    const pieces = []; let pending = [], index = 0, hasVisual = false;
    const flush = () => { if (pending.length) { pieces.push({ type: 'native', blocks: pending, key: `native-${index++}` }); pending = []; } };
    for (const block of data.blocks) {
      if (block.kind !== 'text') { pending.push(block); continue; }
      for (const part of splitVisuals(block.text, data.status === 'running')) {
        if (part.type === 'prose') pending.push({ ...block, text: part.text });
        else { flush(); hasVisual = true; pieces.push({ ...part, key: `visual-${index++}` }); }
      }
    }
    flush();
    if (!hasVisual) return h('div', { className: 'dv-answer' }, h(Native, { ...props, key: 'native-0' }));
    // An interrupted reply ending in a graphic still gets the native stopped marker once.
    if (data.status === 'interrupted' && pieces.at(-1)?.type !== 'native') pieces.push({ type: 'native', blocks: [], key: 'terminal' });
    return h('div', { className: 'dv-answer' }, pieces.map((piece, i) => piece.type === 'visual'
      ? h(VisualFigure, { key: piece.key, source: piece.source, language: piece.language, t })
      : h(Native, { ...props, key: piece.key, node: { ...props.node, data: { ...data, blocks: piece.blocks,
        status: data.status === 'interrupted' && i !== pieces.length - 1 ? 'settled' : data.status } } })));
  };
}
