import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVisual, splitVisuals } from '../src/model.js';

test('signed bars retain negative values and reject non-finite values', () => {
  assert.deepEqual(parseVisual('bars\ntitle Budget\nIncome | 1200\nCost | -800').rows.map(r => r.value), [1200, -800]);
  assert.throws(() => parseVisual('bars\nBad | Infinity'));
  assert.throws(() => parseVisual('bars\nBad | 1e999'));
});
test('line data must match its categories', () => {
  const model = parseVisual('xychart-beta\nx-axis [Jan, Feb, Mar]\nline "Revenue" [1, 0, -2]');
  assert.equal(model.kind, 'line');
  assert.deepEqual(model.series[0].values, [1, 0, -2]);
  assert.throws(() => parseVisual('line\nx-axis [A, B]\nline "Run" [1]'));
});
test('flowchart preserves directed branches and cycles', () => {
  const model = parseVisual('flowchart LR\nA[Start] --> B{Ready?}\nB -->|Yes| C[Run]\nC --> A');
  assert.equal(model.nodes.length, 3);
  assert.equal(model.edges.length, 3);
  assert.equal(model.edges[1].label, 'Yes');
});
test('only supported top-level fences become visuals, including tilde fences', () => {
  const text = 'Before\n\n~~~visual\nmetrics\nUsers | 42\n~~~\n\nAfter\n\n```js\nconst s = "visual";\n```';
  const parts = splitVisuals(text);
  assert.equal(parts.filter(p => p.type === 'visual').length, 1);
  assert.ok(parts.at(-1).text.includes('const s'));
  assert.equal(splitVisuals('```visual\nmetrics\nUsers | 42', true).some(p => p.type === 'visual'), false);
  assert.equal(splitVisuals('```mermaid\nsequenceDiagram\nA->>B: Hi\n```')[0].type, 'visual');
});
test('references on either side of visuals retain definitions', () => {
  const parts = splitVisuals('[A][ref]\n\n```visual\nbars\nA | 2\n```\n\n[B][ref]\n\n[ref]: https://example.com');
  assert.ok(parts[0].text.includes('[ref]: https://example.com'));
});
test('literal hostile labels stay text and oversized inputs are refused', () => {
  assert.equal(parseVisual('metrics\n<script>alert(1)</script> | 42').rows[0].label, '<script>alert(1)</script>');
  assert.throws(() => parseVisual('metrics\n' + 'X'.repeat(70000)));
  assert.throws(() => parseVisual('donut\nA | -1'));
});
test('all Mermaid families reach the full engine, including grouped flowcharts', () => {
  for (const head of ['sequenceDiagram', 'erDiagram', 'stateDiagram-v2', 'classDiagram', 'mindmap', 'gantt', 'sankey-beta', 'architecture-beta', 'radar-beta', 'treemap-beta', 'zenuml']) {
    assert.equal(parseVisual(head + '\nExample', 'mermaid').kind, 'mermaid');
  }
  assert.equal(parseVisual('flowchart TD\nsubgraph Service\nA --> B\nend').kind, 'mermaid');
});
