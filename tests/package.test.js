import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { JSDOM } from 'jsdom';

test('prebuilt Harness factory activates and disposes client styles, locales and slots', async () => {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  let client;
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
  runInNewContext(bundle, { window: { __ModuleLoader__: { load(record) {
    assert.equal(record.id, '@local/dsh-visuals');
    client = record.factory(name => { assert.equal(name, 'react'); return React; });
  } } }, document: dom.window.document, console, TextDecoder, TextEncoder, URL, setTimeout, clearTimeout });
  assert.deepEqual(Array.from(client.inject), ['slots', 'locale']);
  const native = { options: { key: 'assistant-step', priority: 0 }, component: () => null };
  const entries = [native], callbacks = new Set(), cleanup = [];
  let localeActive = false;
  const slots = {
    entries: () => entries,
    subscribe: (_, fn) => { callbacks.add(fn); return () => callbacks.delete(fn); },
    register: (options, component) => {
      const entry = { options, component }; entries.push(entry);
      for (const fn of callbacks) fn();
      return () => { entries.splice(entries.indexOf(entry), 1); for (const fn of callbacks) fn(); };
    },
    inject: (_, fn) => { cleanup.push(fn()); },
  };
  client.apply({ slots, effect(fn) { cleanup.push(fn()); }, locale: {
    register: () => { localeActive = true; return () => { localeActive = false; }; },
    bind: () => key => key, subscribe: () => () => {}, getSnapshot: () => ({ revision: 0 }),
  } });
  assert.equal(dom.window.document.querySelectorAll('style[data-plugin="@local/dsh-visuals"]').length, 1);
  assert.equal(localeActive, true);
  assert.equal(entries.filter(e => e.options.key === 'assistant-step').length, 2);
  assert.equal(entries.filter(e => e.options.key === '@local/dsh-visuals').length, 1);
  for (const dispose of cleanup.reverse()) dispose?.();
  assert.equal(localeActive, false);
  assert.equal(callbacks.size, 0);
  assert.equal(entries.length, 1);
  assert.equal(dom.window.document.querySelector('style'), null);
  dom.window.close();
});
