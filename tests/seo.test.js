import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');
const readJSON = (relativePath) => JSON.parse(read(relativePath));

const seo = readJSON('assets/data/seo.json');
const projects = readJSON('assets/data/projects.json');
const blog = readJSON('assets/data/blog.json');
const base = readJSON('assets/data/site-config.json').url.replace(/\/+$/, '');

test('the generated sitemap lists every indexable URL once', () => {
  const sitemap = read('sitemap.xml');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const expectedStatic = Object.entries(seo)
    .filter(([, meta]) => meta.sitemap)
    .map(([page, meta]) => (meta.canonicalPath ? `${base}/${meta.canonicalPath}` : `${base}/`));
  const expectedDynamic = [
    ...projects.map((project) => `${base}/project-details.html?slug=${project.slug}`),
    ...blog.map((post) => `${base}/blog-details.html?slug=${post.slug}`)
  ];

  assert.equal(new Set(locs).size, locs.length, 'sitemap URLs should be unique');
  assert.equal(locs.length, expectedStatic.length + expectedDynamic.length);
  expectedStatic.concat(expectedDynamic).forEach((url) => {
    assert.ok(locs.includes(url), `sitemap should include ${url}`);
  });
  locs.forEach((url) => assert.ok(url.startsWith(`${base}/`), `sitemap URL should use the configured domain: ${url}`));
  assert.ok(!sitemap.includes('404.html'));
  assert.ok(!sitemap.includes('resume.html'));

  const robots = read('robots.txt');
  assert.match(robots, new RegExp(`Sitemap: ${base}/sitemap\\.xml`));
  assert.match(robots, /User-agent: \*/);
});

test('static JSON-LD is present where expected and parses cleanly', () => {
  Object.entries(seo).forEach(([page, meta]) => {
    const html = read(page);
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => match[1]);
    const expected = !meta.runtimeSchema && !meta.robots?.includes('noindex') && meta.canonicalPath !== null;

    assert.equal(schemas.length, expected ? 1 : 0, `${page}: unexpected JSON-LD count`);

    schemas.forEach((json) => {
      const payload = JSON.parse(json);
      assert.equal(payload['@context'], 'https://schema.org');
      assert.ok(Array.isArray(payload['@graph']) && payload['@graph'].length >= 3);
      const types = payload['@graph'].map((node) => node['@type']);
      assert.ok(types.includes('Person'));
      assert.ok(types.includes('WebSite'));
    });
  });

  const indexSchema = JSON.parse(read('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(indexSchema['@graph'].some((node) => node['@type'] === 'ProfilePage'));
});

test('runtime detail pages omit static canonical and JSON-LD', () => {
  ['project-details.html', 'blog-details.html'].forEach((page) => {
    const html = read(page);
    assert.ok(!/<link rel="canonical"/i.test(html), `${page} should let runtime SEO set the canonical`);
    assert.ok(!/<script type="application\/ld\+json">/i.test(html), `${page} should let runtime SEO set schema`);
  });
});

test('canonical URLs, titles, and descriptions are unique and absolute', () => {
  const titles = new Set();
  const descriptions = new Set();

  Object.entries(seo).forEach(([page, meta]) => {
    const html = read(page);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    const description = html.match(/<meta name="description" content="([^"]*)"/i)?.[1];

    assert.ok(title, `${page} should have a title`);
    assert.ok(!titles.has(title), `${page} title should be unique`);
    titles.add(title);

    assert.ok(description, `${page} should have a description`);
    assert.ok(!descriptions.has(description), `${page} description should be unique`);
    descriptions.add(description);

    if (meta.canonicalPath !== null) {
      assert.ok(canonical, `${page} should have a canonical URL`);
      assert.ok(canonical.startsWith(`${base}/`), `${page} canonical should use the configured domain`);
    } else {
      assert.equal(canonical, undefined, `${page} should not have a static canonical`);
    }
  });
});

test('Open Graph metadata points at the real social image', () => {
  Object.keys(seo).forEach((page) => {
    const html = read(page);
    const image = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
    assert.equal(image, `${base}/assets/images/og-image.png`, `${page} should use the configured OG image`);
    assert.match(html, /<meta name="twitter:card"/i);
  });
});
