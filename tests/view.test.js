import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VisualFigure, makeAssistantWrapper } from '../src/view.js';
import { examples } from '../src/examples.js';
const h = React.createElement;
test('every design renders an accessible SVG and source controls', () => {
  for (const item of examples) {
    const html = renderToStaticMarkup(h(VisualFigure, { source: item.source }));
    assert.ok(html.includes('<svg'), item.name);
    assert.ok(html.includes('role="img"'), item.name);
    assert.ok(html.includes('Export SVG'), item.name);
    assert.ok(html.includes('<table'), item.name);
    assert.equal(/(?:NaN|Infinity)/.test(html), false, item.name);
  }
});
test('hostile text never creates executable elements', () => {
  const html = renderToStaticMarkup(h(VisualFigure, { source: 'metrics\n<script>alert(1)</script> | 42' }));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.equal(html.includes('<script'), false);
});
test('native reasoning and image blocks survive inline splitting', () => {
  const seen = [];
  const Native = props => { seen.push(props.node.data.blocks); return h('p', null, 'Native'); };
  const Wrapper = makeAssistantWrapper(Native);
  renderToStaticMarkup(h(Wrapper, { node: { data: { status: 'settled', blocks: [
    { kind: 'reasoning', text: 'Thinking' },
    { kind: 'text', text: 'Before\n\n```visual\nmetrics\nUsers | 42\n```\n\nAfter' },
    { kind: 'image', attachment: { id: 'image-1' } },
  ] } } }));
  assert.ok(seen.flat().some(b => b.kind === 'reasoning'));
  assert.ok(seen.flat().some(b => b.kind === 'image'));
  assert.ok(seen.flat().some(b => b.text?.includes('Before')));
  assert.ok(seen.flat().some(b => b.text?.includes('After')));
});

test('SVG export preserves exact geometry, text, styles and a resolved background', async () => {
  const { JSDOM } = await import('jsdom');
  const { exportSVG } = await import('../src/view.js');
  const dom = new JSDOM(renderToStaticMarkup(h(VisualFigure, { source: examples[0].source })));
  const originalDocument = globalThis.document, originalStyle = globalThis.getComputedStyle, originalSerializer = globalThis.XMLSerializer;
  globalThis.document = dom.window.document;
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.XMLSerializer = dom.window.XMLSerializer;
  try {
    const figure = document.querySelector('figure'), svg = figure.querySelector('svg');
    figure.style.backgroundColor = '#202733';
    svg.style.fill = '#e6edf6'; svg.style.fontFamily = 'system-ui';
    const serialized = exportSVG(svg), exported = new dom.window.DOMParser().parseFromString(serialized, 'image/svg+xml');
    assert.equal(exported.querySelector('parsererror'), null);
    assert.equal(exported.documentElement.getAttribute('viewBox'), svg.getAttribute('viewBox'));
    assert.equal(exported.documentElement.getAttribute('width'), '720');
    assert.equal(exported.querySelector('rect').getAttribute('fill'), 'rgb(32, 39, 51)');
    assert.ok(exported.documentElement.textContent.includes('99.98%'));
    assert.ok(exported.documentElement.getAttribute('style').includes('system-ui'));
    assert.equal(exported.querySelector('[tabindex]'), null);
    assert.equal(serialized.includes('NaN'), false);
  } finally {
    globalThis.document = originalDocument; globalThis.getComputedStyle = originalStyle; globalThis.XMLSerializer = originalSerializer;
    dom.window.close();
  }
});
