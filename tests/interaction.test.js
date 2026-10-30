import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { VisualFigure } from '../src/view.js';

async function mounted(run) {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
  const saved = new Map();
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(document.getElementById('root'));
  try { await run(root, dom.window); }
  finally {
    await act(() => root.unmount());
    for (const [key, value] of saved) value ? Object.defineProperty(globalThis, key, value) : delete globalThis[key];
    dom.window.close();
  }
}

test('source disclosure exposes state, Escape closes it and restores keyboard focus', async () => {
  await mounted(async (root, win) => {
    await act(() => root.render(React.createElement(VisualFigure, {source:'bars\ntitle Budget\nHosting | 1200'})));
    const source = document.querySelector('button');
    assert.equal(source.getAttribute('aria-expanded'), 'false');
    await act(() => source.click());
    assert.equal(source.getAttribute('aria-expanded'), 'true');
    const editor = document.getElementById(source.getAttribute('aria-controls'));
    assert.ok(editor?.querySelector('textarea'));
    await act(() => editor.querySelector('textarea').dispatchEvent(new win.KeyboardEvent('keydown', {key:'Escape', bubbles:true})));
    assert.equal(document.querySelector('textarea'), null);
    assert.equal(document.activeElement, source);
  });
});

test('simple charts fit a narrow panel without forced horizontal scrolling', async () => {
  await mounted(async root => {
    let resize;
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {constructor(callback){resize=callback;} observe(){} disconnect(){}};
    try {
      for (const source of ['bars\nHosting | 1200\nCredits | -200', 'line\nx-axis [0, 1, 2]\nline "Loss" [2, 1, 0]', 'timeline\nVerify | Oct 11 | Check the UI', 'steps\nVerify | 5 min | Check the UI', 'donut\nBuild | 60\nVerify | 40']) {
        await act(() => root.render(React.createElement(VisualFigure, {source})));
        await act(() => resize([{contentRect:{width:320}}]));
        const width = Number(document.querySelector('svg').getAttribute('viewBox').split(' ')[2]);
        assert.equal(width, 320, source);
      }
    } finally {globalThis.ResizeObserver = original;}
  });
});

test('reduced motion suppresses reveals and normal updates do not replay them', async () => {
  await mounted(async (root, win) => {
    const saved = {matchMedia:globalThis.matchMedia};
    let allowed = false, animations = 0, cancels = 0;
    globalThis.matchMedia = () => ({matches:allowed});
    win.Element.prototype.animate = () => {animations++; return {cancel(){cancels++;}};};
    try {
      const source = 'bars\nHosting | 1200';
      await act(() => root.render(React.createElement(VisualFigure, {source})));
      assert.equal(animations, 0);
      allowed = true;
      await act(() => root.render(React.createElement(VisualFigure, {source:source + '\nCredits | -200'})));
      assert.ok(animations >= 1);
      const count = animations;
      await act(() => document.querySelector('button').click());
      assert.equal(animations, count);
      await act(() => root.unmount());
      assert.equal(cancels, animations);
    } finally {globalThis.matchMedia = saved.matchMedia;}
  });
});
