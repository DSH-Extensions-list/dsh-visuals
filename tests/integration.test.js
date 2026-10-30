import test from 'node:test';
import assert from 'node:assert/strict';
import { installAssistantWrapper } from '../src/integration.js';

function registry() {
  let entries = [], listeners = new Set();
  const notify = () => [...listeners].forEach(fn => fn());
  return {
    entries: () => entries,
    subscribe: (_, fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    register: (options, component) => { const entry = { options, component, inject: options.inject, locale: options.locale }; entries.push(entry); notify(); return () => { entries = entries.filter(e => e !== entry); notify(); }; },
    count: () => listeners.size,
  };
}
test('late native registration is wrapped, injected hooks preserved and disposal restores it', () => {
  const slots = registry(), Native = () => null;
  let cleanup;
  const ctx = { slots, effect: fn => { cleanup = fn(); } };
  const makeWrapper = component => ({ wrapped: component });
  installAssistantWrapper(ctx, makeWrapper);
  assert.equal(slots.entries().length, 0);
  const inject = () => ({ hooks: { presentation: {} } });
  slots.register({ key: 'assistant-step', locale: 'chat', inject }, Native);
  const wrapper = slots.entries().find(e => e.component.wrapped);
  assert.equal(wrapper.component.wrapped, Native);
  assert.equal(wrapper.inject, inject);
  assert.equal(wrapper.locale, 'chat');
  assert.ok(wrapper.options.priority < 0);
  cleanup();
  assert.equal(slots.entries().length, 1);
  assert.equal(slots.count(), 0);
});
