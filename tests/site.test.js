import test from 'node:test';
import assert from 'node:assert/strict';
import { runValidation } from '../scripts/validate-site.js';

test('the generated site passes content, link, SEO, and accessibility validation', () => {
  const result = runValidation({ quiet: true });
  assert.deepEqual(result.errors, [], result.errors.join('\n'));
  assert.equal(result.checkedPages, 13);
  assert.equal(result.projects, 6);
  assert.equal(result.articles, 6);
  assert.equal(result.sitemapUrls, 21);
});
