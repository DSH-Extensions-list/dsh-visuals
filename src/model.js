import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';

export const MAX_SOURCE = 65536;
const TYPES = /^(metrics|bars|line|xychart-beta|flowchart|graph|timeline|steps|donut|pie)\b/i;
export const MERMAID_TYPES = /^(sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|mindmap|gantt|journey|quadrantChart|requirementDiagram|gitGraph|C4\w+|sankey(?:-beta)?|block(?:-beta)?|packet(?:-beta)?|kanban|architecture(?:-beta)?|radar(?:-beta)?|treemap(?:-beta)?|zenuml|flowchart|graph|xychart(?:-beta)?|pie|timeline|swimlane|agentflow|eventmodeling|usecaseDiagram|venn(?:-beta)?|ishikawa(?:-beta)?|wardley(?:-beta)?|cynefin|treeView|railroad)\b/i;
const unquote = s => s.trim().replace(/^"(.*)"$/, '$1');
const cleanLabel = s => unquote(s).replace(/<br\s*\/?\s*>/gi, '\n').replace(/\*\*/g, '').slice(0, 500);
function number(value) {
  const text = value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) throw new Error('Use a plain number, such as 1200 or -42.5.');
  const n = Number(text);
  if (!Number.isFinite(n) || Math.abs(n) > 1e15) throw new Error('Values must be finite and no larger than 10¹⁵.');
  return n;
}
function rows(lines) {
  if (lines.length > 60) throw new Error('Use at most 60 rows in one visual.');
  return lines.map(line => {
    const cells = line.split('|').map(s => s.trim());
    if (cells.length < 2 || !cells[0] || !cells[1]) throw new Error('Each row needs a label and a value, separated by |.');
    return { label: cleanLabel(cells[0]), raw: cells[1].slice(0, 200), note: (cells[2] || '').slice(0, 500), cells: cells.slice(3) };
  });
}
/** Parse the deliberately limited, bounded visual vocabulary. Text is never executable. */
export function parseVisual(source, language = 'visual') {
  if (source.length > MAX_SOURCE) throw new Error('This visual is too large. Split it into smaller visuals.');
  const nativeSource = source.replace(/^\s*---\s*\n[\s\S]*?\n---\s*\n/, '');
  const meaningful = nativeSource.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('%%'));
  const names = { sequenceDiagram: 'Sequence diagram', erDiagram: 'Database relationships', classDiagram: 'Class diagram', 'stateDiagram-v2': 'State diagram', stateDiagram: 'State diagram', mindmap: 'Mind map', gantt: 'Schedule', journey: 'User journey', quadrantChart: 'Priority matrix', requirementDiagram: 'Requirements', gitGraph: 'Git branches', 'sankey-beta': 'Flow allocation', 'block-beta': 'Block diagram', 'packet-beta': 'Packet layout', kanban: 'Kanban board', 'architecture-beta': 'Infrastructure', 'radar-beta': 'Radar comparison', 'treemap-beta': 'Treemap', zenuml: 'Sequence diagram', flowchart: 'Process diagram', graph: 'Process diagram', 'xychart-beta': 'Data chart', pie: 'Distribution', timeline: 'Timeline' };
  const mermaidModel = () => {
    const family = meaningful[0]?.split(/\s/)[0] || '';
    const authoredTitle = meaningful.find(l => /^title(?:\s|:)/.test(l))?.replace(/^title[:\s]+/, '');
    return { kind: 'mermaid', source, title: cleanLabel(authoredTitle || names[family] || (family.startsWith('C4') ? 'Software architecture' : 'Diagram')), unit: '', caption: '' };
  };
  if (language === 'mermaid' || (MERMAID_TYPES.test(meaningful[0] || '') && !TYPES.test(meaningful[0] || ''))) return mermaidModel();
  const lines = [...meaningful];
  const head = lines.shift() || '';
  if (!TYPES.test(head)) throw new Error('Supported types: metrics, bars, line, flowchart, timeline, steps and donut.');
  let title = '', unit = '', caption = '';
  const body = lines.filter(line => {
    for (const key of ['title', 'unit', 'caption']) {
      if (line.startsWith(key + ' ')) {
        const value = cleanLabel(line.slice(key.length + 1));
        if (key === 'title') title = value;
        else if (key === 'unit') unit = value;
        else caption = value;
        return false;
      }
    }
    return true;
  });
  const meta = { title, unit, caption };
  const type = head.split(/\s/)[0].toLowerCase();
  if (['flowchart', 'graph'].includes(type)) {
    try { return { ...meta, ...parseFlow(body), direction: /\b(LR|RL)\b/.test(head) ? 'LR' : 'TD' }; }
    catch { return mermaidModel(); }
  }
  if (type === 'timeline' && body.some(l => !l.includes('|'))) return mermaidModel();
  if (['line', 'xychart-beta'].includes(type)) {
    const axis = body.find(l => /^x-axis\s+\[/.test(l));
    const labels = axis?.slice(axis.indexOf('[') + 1, axis.lastIndexOf(']')).split(',').map(cleanLabel);
    const series = body.filter(l => /^(line|bar)\s/.test(l)).map(line => {
      const match = /^(line|bar)\s+(?:"([^"]+)"\s+)?\[([^\]]+)\]$/.exec(line);
      if (!match) throw new Error('A series is line "Name" [1, 2, 3].');
      return { name: cleanLabel(match[2] || 'Series'), type: match[1], values: match[3].split(',').map(number) };
    });
    if (!labels?.length || labels.length > 60 || !series.length || series.length > 6
      || series.some(s => s.values.length !== labels.length)) throw new Error('Use 1–6 series with one value per x-axis label (up to 60).');
    if (body.some(l => !/^(x-axis|line|bar)\b/.test(l))) throw new Error('This chart option is not supported.');
    return { ...meta, kind: 'line', labels, series };
  }
  if (['donut', 'pie'].includes(type)) {
    const entries = rows(body.map(l => l.includes('|') ? l : l.replace(/^"([^"]+)"\s*:\s*(.+)$/, '$1 | $2'))).map(r => ({ ...r, value: number(r.raw) }));
    if (!entries.length || entries.length > 8 || entries.some(r => r.value < 0) || !entries.some(r => r.value > 0)) throw new Error('A donut needs 1–8 nonnegative values and a positive total.');
    return { ...meta, kind: 'donut', rows: entries };
  }
  const entries = rows(body);
  if (!entries.length) throw new Error('Add at least one row.');
  if (type === 'metrics' && entries.length > 8) throw new Error('Use at most eight metrics.');
  if (type === 'bars') return { ...meta, kind: 'bars', rows: entries.map(r => ({ ...r, value: number(r.raw) })) };
  if (type === 'metrics') return { ...meta, kind: type, rows: entries.map(r => ({ ...r, trend: r.cells[0] ? r.cells[0].split(',').map(number) : [] })) };
  return { ...meta, kind: type, rows: entries };
}
function parseFlow(lines) {
  const nodes = new Map(), edges = [];
  function node(text) {
    const match = /^([\w-]+)\s*(?:\[([\s\S]*)\]|\{([\s\S]*)\}|\(([\s\S]*)\))?$/.exec(text.trim());
    if (!match) throw new Error('Use simple nodes such as A[Start] or B{Ready?}.');
    const id = match[1], prior = nodes.get(id);
    nodes.set(id, { id, label: cleanLabel(match[2] ?? match[3] ?? match[4] ?? prior?.label ?? id), decision: match[3] !== undefined || prior?.decision === true });
    return id;
  }
  for (const line of lines) {
    if (/^(subgraph|end|style|classDef|class|click)\b/.test(line)) throw new Error('Groups, styles and actions are not supported; use labelled nodes and arrows.');
    const parts = line.split(/\s*-->(?:\|([^|]*)\|)?\s*/);
    if (parts.length === 1) { node(line); continue; }
    let from = node(parts[0]);
    for (let i = 1; i < parts.length; i += 2) {
      const to = node(parts[i + 1]);
      edges.push({ from, to, label: cleanLabel(parts[i] || '') });
      from = to;
    }
  }
  if (!nodes.size || nodes.size > 24 || edges.length > 48) throw new Error('Use 1–24 nodes and at most 48 arrows.');
  return { kind: 'flowchart', nodes: [...nodes.values()], edges };
}

/** Split only top-level mdast code nodes, preserving other fences and reference targets. */
export function splitVisuals(text, streaming = false) {
  if (!/(?:^|\n) {0,3}(?:`{3,}|~{3,})(?:visual|dsh-visual|mermaid)\b/.test(text)) return [{ type: 'prose', text, key: 0 }];
  const root = fromMarkdown(text, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  const definitions = root.children.filter(n => n.type === 'definition').map(n => text.slice(n.position.start.offset, n.position.end.offset)).join('\n');
  const parts = [];
  let cursor = 0;
  for (const node of root.children) {
    if (node.type !== 'code' || !['visual', 'dsh-visual', 'mermaid'].includes(node.lang)) continue;
    if (node.lang !== 'mermaid' && !TYPES.test(node.value.trim()) && !MERMAID_TYPES.test(node.value.trim())) continue;
    const start = node.position.start.offset, end = node.position.end.offset;
    const original = text.slice(start, end);
    const opener = /^ {0,3}(`{3,}|~{3,})/.exec(original)?.[1];
    const last = original.split(/\r?\n/).at(-1);
    const closed = opener && new RegExp('^ {0,3}' + opener[0] + '{' + opener.length + ',}\\s*$').test(last);
    if (streaming && !closed) continue;
    try { parseVisual(node.value, node.lang); } catch { continue; }
    if (start > cursor && text.slice(cursor, start).trim()) parts.push({ type: 'prose', text: text.slice(cursor, start), key: cursor });
    parts.push({ type: 'visual', source: node.value, language: node.lang, key: start });
    cursor = end;
  }
  if (!parts.length) return [{ type: 'prose', text, key: 0 }];
  if (text.slice(cursor).trim()) parts.push({ type: 'prose', text: text.slice(cursor), key: cursor });
  if (definitions) for (const part of parts) if (part.type === 'prose' && !part.text.includes(definitions)) part.text += '\n\n' + definitions;
  return parts;
}
