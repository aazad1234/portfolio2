import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');
const seo = JSON.parse(read('assets/data/seo.json'));
const pages = Object.keys(seo);

test('skip links point at a real main landmark', () => {
  pages.forEach((page) => {
    const html = read(page);
    const skip = html.match(/<a class="skip-link" href="#([^"]+)"/i)?.[1];
    assert.ok(skip, `${page} should have a skip link`);
    assert.ok(new RegExp(`id="${skip}"`).test(html), `${page} skip link target #${skip} should exist`);
  });
});

test('no positive tabindex values or keyboard traps are introduced', () => {
  pages.forEach((page) => {
    const html = read(page);
    const values = [...html.matchAll(/\btabindex="(-?\d+)"/gi)].map((match) => Number(match[1]));
    values.forEach((value) => assert.ok(value <= 0, `${page} should not use a positive tabindex (${value})`));
    assert.ok(!/autoplay/i.test(html), `${page} should not autoplay media`);
  });
});

test('all buttons are explicitly typed and have an accessible name', () => {
  pages.forEach((page) => {
    const html = read(page);
    const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];

    buttons.forEach(([, attributes, content]) => {
      assert.match(attributes, /\btype="(button|submit|reset)"/i, `${page} has an untyped button`);
      const text = content
        .replace(/<i\b[^>]*>[\s\S]*?<\/i>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&[a-z#0-9]+;/gi, '')
        .trim();
      const labelled = /\baria-label="[^"]+"/i.test(attributes) || /\baria-labelledby="[^"]+"/i.test(attributes);
      assert.ok(text || labelled, `${page} has a button without an accessible name`);
    });
  });
});

test('every form control has a programmatic label', () => {
  pages.forEach((page) => {
    const html = read(page);
    const labels = new Set([...html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/gi)].map((match) => match[1]));
    const controls = [...html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)];

    controls.forEach(([, tag, attributes]) => {
      if (/\btype="(hidden|submit|button|reset)"/i.test(attributes)) return;
      const id = attributes.match(/\bid="([^"]+)"/i)?.[1];
      const named = /\baria-label="[^"]+"/i.test(attributes) || /\baria-labelledby="[^"]+"/i.test(attributes);
      assert.ok(id || named, `${page} has an unlabeled ${tag}`);
      if (id) assert.ok(labels.has(id) || named, `${page} ${tag}#${id} has no matching label`);
    });
  });
});

test('external links include safe rel attributes', () => {
  pages.forEach((page) => {
    const html = read(page);
    [...html.matchAll(/<a\b([^>]*)>/gi)].forEach(([, attributes]) => {
      if (!/\btarget="_blank"/i.test(attributes)) return;
      assert.match(attributes, /\brel="[^"]*noopener/i, `${page} has a target="_blank" link without noopener`);
      assert.match(attributes, /\brel="[^"]*noreferrer/i, `${page} has a target="_blank" link without noreferrer`);
    });
  });
});

test('forms do not claim a backend that does not exist', () => {
  const contact = read('contact.html');
  const config = JSON.parse(read('assets/data/site-config.json'));

  assert.match(contact, /novalidate/);
  assert.match(contact, /no backend connected/i);
  assert.match(contact, /no message is sent until/i);
  assert.equal(config.contactForm.endpoint, '');
});
