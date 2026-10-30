import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { prepareMermaid, sanitizeSVG } from '../src/mermaid.js';

test('diagram configuration cannot change the app-owned security policy', () => {
  const source = '---\nconfig:\n  securityLevel: loose\n---\n%%{init: {"securityLevel":"loose"}}%%\nflowchart TD\nA --> B';
  assert.equal(prepareMermaid(source).trim(), 'flowchart TD\nA --> B');
});
test('sanitization removes executable HTML, external references and network CSS', async () => {
  const dom = new JSDOM('');
  const { default: createPurify } = await import('dompurify');
  const purify = createPurify(dom.window);
  const saved = { DOMParser: globalThis.DOMParser };
  globalThis.DOMParser = dom.window.DOMParser;
  try {
    const svg = sanitizeSVG(purify, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><foreignObject><p>HTML</p></foreignObject><image href="https://example.com/x"/><a href="javascript:alert(1)"><text>Link</text></a><style>@import "https://example.com/style"; .node{fill:url(https://example.com/x)}</style><rect fill="url(https://example.com/x)" onload="alert(1)"/></svg>');
    const text = new dom.window.XMLSerializer().serializeToString(svg);
    assert.equal(/<script|foreignObject|<image|javascript:|https:\/\/|onload=/.test(text), false);
  } finally { globalThis.DOMParser = saved.DOMParser; dom.window.close(); }
});
