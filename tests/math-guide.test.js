import test from 'node:test';
import assert from 'node:assert/strict';
import { VISUAL_GUIDE } from '../src/host.js';
test('math guidance preserves TeX commands and delegates equations to native Markdown', () => {
  assert.ok(VISUAL_GUIDE.includes('\\boxed{...}'));
  assert.ok(VISUAL_GUIDE.includes('\\frac{...}{...}'));
  assert.ok(VISUAL_GUIDE.includes('\\( ... \\)'));
  assert.ok(VISUAL_GUIDE.includes('\\[ ... \\]'));
  assert.ok(VISUAL_GUIDE.includes('Keep LaTeX out of visual fences'));
  assert.equal(VISUAL_GUIDE.includes('There is no boxed/card/callout renderer'), false);
});
