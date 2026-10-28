import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = (relativePath) => JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
const exists = (relativePath) => existsSync(path.join(root, relativePath));

test('site configuration keeps the demo honest and contact details explicit', () => {
  const config = readJSON('assets/data/site-config.json');

  assert.equal(config.url, 'https://johnanderson.dev');
  assert.equal(config.demoMode, true);
  assert.match(config.demoNotice, /illustrative/i);
  assert.match(config.contact.responseNote, /does not send email/i);
  assert.equal(config.contactForm.endpoint, '');
  assert.ok(config.resume.endsWith('.pdf'));

  assert.ok(config.socials.length >= 3);
  config.socials.forEach((social) => {
    assert.equal(social.placeholder, true, `${social.label} should be marked as a placeholder`);
    assert.match(social.url, /^https:\/\//);
  });
});

test('SEO flags preserve runtime detail pages and exclude utility pages', () => {
  const seo = readJSON('assets/data/seo.json');

  assert.equal(seo['project-details.html'].canonicalPath, null);
  assert.equal(seo['project-details.html'].runtimeSchema, true);
  assert.equal(seo['project-details.html'].sitemap, false);
  assert.equal(seo['blog-details.html'].canonicalPath, null);
  assert.equal(seo['blog-details.html'].runtimeSchema, true);
  assert.equal(seo['blog-details.html'].sitemap, false);

  assert.equal(seo['404.html'].canonicalPath, null);
  assert.match(seo['404.html'].robots, /noindex/);
  assert.equal(seo['404.html'].sitemap, false);
  assert.match(seo['resume.html'].robots, /noindex/);
  assert.equal(seo['resume.html'].sitemap, false);

  Object.keys(seo).forEach((page) => {
    assert.ok(exists(page), `${page} should exist`);
    assert.ok(seo[page].title.length > 10, `${page} should have a title`);
    assert.ok(seo[page].description.length > 40, `${page} should have a description`);
  });
});

test('project and article content is complete and uniquely addressable', () => {
  const projects = readJSON('assets/data/projects.json');
  const blog = readJSON('assets/data/blog.json');
  const projectSlugs = new Set();
  const articleSlugs = new Set();

  assert.equal(projects.length, 6);
  projects.forEach((project) => {
    assert.ok(project.title);
    assert.ok(project.slug);
    assert.ok(!projectSlugs.has(project.slug), `duplicate project slug: ${project.slug}`);
    projectSlugs.add(project.slug);
    assert.ok(exists(project.image), `missing project image: ${project.image}`);
    assert.ok(project.imageAlt.length > 5);
    assert.ok(project.tech.length >= 3);
    assert.ok(project.features.length >= 3);
    assert.ok(project.approach.length >= 3);
    assert.equal(typeof project.featured, 'boolean');
  });

  assert.equal(blog.length, 6);
  blog.forEach((post) => {
    assert.ok(post.title);
    assert.ok(post.slug);
    assert.ok(!articleSlugs.has(post.slug), `duplicate article slug: ${post.slug}`);
    articleSlugs.add(post.slug);
    assert.match(post.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!Number.isNaN(new Date(post.date).getTime()));
    assert.ok(post.content.length >= 3);
    assert.ok(post.content.every((section) => section.heading && section.paragraphs.length));
  });
});

test('navigation and footer links point at real local pages', () => {
  const navigation = readJSON('assets/data/navigation.json');
  const primaryLinks = navigation.primary.flatMap((item) => [item, ...(item.children || [])]);
  const footerLinks = navigation.footerGroups.flatMap((group) => group.links);

  assert.ok(primaryLinks.length >= 10);
  assert.ok(footerLinks.length >= 8);

  [...primaryLinks, ...footerLinks].forEach((link) => {
    assert.ok(link.label);
    assert.ok(exists(link.href), `missing navigation target: ${link.href}`);
  });
});

test('all JSON data files are UTF-8 without a byte-order mark', () => {
  const dataDir = path.join(root, 'assets', 'data');
  const files = ['site-config.json', 'navigation.json', 'seo.json', 'projects.json', 'skills.json', 'experience.json', 'services.json', 'testimonials.json', 'blog.json'];

  files.forEach((file) => {
    const bytes = readFileSync(path.join(dataDir, file));
    assert.ok(!(bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF), `${file} should not start with a BOM`);
  });
});

test('printable CV exists and is a valid PDF', () => {
  const pdfPath = path.join(root, 'assets', 'files', 'john-anderson-cv.pdf');
  assert.ok(existsSync(pdfPath), 'CV PDF should exist');
  assert.ok(statSync(pdfPath).size > 10000, 'CV PDF should not be a stub');
  assert.equal(readFileSync(pdfPath).subarray(0, 5).toString('utf8'), '%PDF-');
});
