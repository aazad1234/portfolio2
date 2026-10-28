import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const pageRequirements = {
  'index.html': ['home-projects', 'home-services', 'home-capabilities', 'home-toolbelt', 'home-testimonials', 'home-posts'],
  'about.html': ['about-testimonial', 'about-toolbelt'],
  'skills.html': ['skills-grid', 'skills-toolbelt', 'skills-principles'],
  'experience.html': ['experience-timeline', 'education-grid', 'learning-grid'],
  'services.html': ['services-grid'],
  'testimonials.html': ['testimonials-grid'],
  'projects.html': ['projects-grid', 'project-filters', 'project-count', 'projects-empty'],
  'project-details.html': ['project-detail'],
  'blog.html': ['blog-grid', 'blog-filters', 'blog-search', 'blog-count', 'blog-empty'],
  'blog-details.html': ['blog-detail'],
  'contact.html': ['contact-form', 'form-status']
};

const componentPages = new Set([
  'index.html',
  'about.html',
  'skills.html',
  'experience.html',
  'services.html',
  'testimonials.html',
  'projects.html',
  'project-details.html',
  'blog.html',
  'blog-details.html',
  'contact.html',
  '404.html'
]);

function readJSON(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
}

function rel(relativePath) {
  return path.join(root, relativePath);
}

function decodeEntities(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function attributeValue(tag, attribute) {
  const match = tag.match(new RegExp(`\\b${attribute}="([^"]*)"`, 'i'));
  return match ? match[1] : null;
}

function normalizeLocalPath(value) {
  if (!value) return null;
  const clean = value.split('#')[0].split('?')[0];
  if (!clean) return null;
  if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(clean)) return null;
  if (clean.startsWith('//')) return null;
  return decodeEntities(clean).replace(/^\/+/, '');
}

export function runValidation({ quiet = false } = {}) {
  const errors = [];
  const warnings = [];
  const checked = [];

  const seo = readJSON('assets/data/seo.json');
  const config = readJSON('assets/data/site-config.json');
  const projects = readJSON('assets/data/projects.json');
  const blog = readJSON('assets/data/blog.json');
  const services = readJSON('assets/data/services.json');
  const testimonials = readJSON('assets/data/testimonials.json');
  const skills = readJSON('assets/data/skills.json');
  const navigation = readJSON('assets/data/navigation.json');
  const base = String(config.url || '').replace(/\/+$/, '');

  if (!/^https:\/\//i.test(base)) {
    errors.push('site-config.json: url must be an absolute https URL.');
  }

  const requirePage = (page) => {
    if (!existsSync(rel(page))) errors.push(`Missing page: ${page}`);
  };

  Object.keys(seo).forEach(requirePage);
  requirePage('resume.html');
  requirePage('sitemap.xml');
  requirePage('robots.txt');
  requirePage('assets/files/john-anderson-cv.pdf');

  const slugs = new Set();
  projects.forEach((project, index) => {
    const label = `projects.json[${index}]`;
    ['slug', 'title', 'category', 'summary', 'image', 'imageAlt', 'role', 'timeline', 'year', 'intro'].forEach((key) => {
      if (!project[key]) errors.push(`${label}: missing ${key}.`);
    });
    if (project.slug && slugs.has(project.slug)) errors.push(`${label}: duplicate slug "${project.slug}".`);
    slugs.add(project.slug);
    if (project.image && !existsSync(rel(project.image))) errors.push(`${label}: image not found at ${project.image}.`);
    ['tech', 'overview', 'features', 'approach'].forEach((key) => {
      if (!Array.isArray(project[key]) || !project[key].length) errors.push(`${label}: ${key} must be a non-empty array.`);
    });
    if (typeof project.featured !== 'boolean') errors.push(`${label}: featured must be a boolean.`);
  });

  const blogSlugs = new Set();
  blog.forEach((post, index) => {
    const label = `blog.json[${index}]`;
    ['slug', 'title', 'category', 'date', 'excerpt', 'readingTime', 'icon'].forEach((key) => {
      if (!post[key]) errors.push(`${label}: missing ${key}.`);
    });
    if (post.slug && blogSlugs.has(post.slug)) errors.push(`${label}: duplicate slug "${post.slug}".`);
    blogSlugs.add(post.slug);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date || '')) errors.push(`${label}: date must use YYYY-MM-DD.`);
    if (!Array.isArray(post.tags) || !post.tags.length) errors.push(`${label}: tags must be a non-empty array.`);
    if (!Array.isArray(post.content) || !post.content.length) errors.push(`${label}: content must be a non-empty array.`);
  });

  services.forEach((service, index) => {
    if (!service.slug || !service.title || !Array.isArray(service.deliverables)) {
      errors.push(`services.json[${index}]: missing slug, title, or deliverables.`);
    }
  });

  if (!Array.isArray(testimonials.items) || !testimonials.items.length) {
    errors.push('testimonials.json: items must be a non-empty array.');
  }

  if (!Array.isArray(skills.groups) || !skills.groups.length || !Array.isArray(skills.toolbelt)) {
    errors.push('skills.json: groups and toolbelt are required.');
  }

  if (!Array.isArray(navigation.primary) || navigation.primary.length < 5) {
    errors.push('navigation.json: primary navigation is incomplete.');
  }

  Object.entries(seo).forEach(([page, meta]) => {
    if (!existsSync(rel(page))) return;

    const html = readFileSync(rel(page), 'utf8');
    checked.push(page);

    if (!html.startsWith('<!DOCTYPE html>')) errors.push(`${page}: missing HTML5 doctype.`);
    if (!/<html lang="en"/i.test(html)) errors.push(`${page}: missing lang="en" on <html>.`);
    if (!/<meta charset="utf-8">/i.test(html)) errors.push(`${page}: missing UTF-8 meta charset.`);
    if (!/<meta name="viewport"/i.test(html)) errors.push(`${page}: missing viewport meta tag.`);
    if (!html.includes('<!-- SEO:START -->') || !html.includes('<!-- SEO:END -->')) {
      errors.push(`${page}: missing SEO markers.`);
    }
    if (!html.includes('assets/js/theme-init.js')) errors.push(`${page}: theme-init.js must load in head.`);
    if (page !== 'resume.html') {
      if (!html.includes('assets/css/style.css')) errors.push(`${page}: style.css is not linked.`);
      if (!html.includes('assets/css/components.css')) errors.push(`${page}: components.css is not linked.`);
      if (!html.includes('assets/css/responsive.css')) errors.push(`${page}: responsive.css is not linked.`);
    }

    const h1Count = (html.match(/<h1\b/gi) || []).length;
    if (h1Count !== 1) errors.push(`${page}: expected exactly one h1, found ${h1Count}.`);
    if (page === 'resume.html') {
      if (!/id="resume"/.test(html)) errors.push(`${page}: missing main#resume.`);
    } else if (!/id="main-content"/.test(html)) {
      errors.push(`${page}: missing main#main-content.`);
    }
    if (!page.includes('404') && !html.includes('skip-link')) errors.push(`${page}: missing skip link.`);

    const dataPage = html.match(/<body[^>]*data-page="([^"]+)"/i)?.[1];
    if (page !== 'resume.html' && dataPage !== page) {
      errors.push(`${page}: body data-page should be "${page}" (found "${dataPage || 'none'}").`);
    }

    if (componentPages.has(page)) {
      if (!html.includes('data-component="header"')) errors.push(`${page}: missing header component slot.`);
      if (!html.includes('data-component="footer"')) errors.push(`${page}: missing footer component slot.`);
      if (!html.includes('data-component="scroll-to-top"')) errors.push(`${page}: missing scroll-to-top component slot.`);
      if (!html.includes('assets/js/main.js')) errors.push(`${page}: main.js is not loaded.`);
    }

    (pageRequirements[page] || []).forEach((id) => {
      if (!new RegExp(`id="${id}"`).test(html)) errors.push(`${page}: missing required container #${id}.`);
    });

    if (/cdn\.tailwindcss\.com|tailwind\.config/i.test(html)) {
      errors.push(`${page}: Tailwind CDN references should be removed.`);
    }
    if (/\sstyle="/i.test(html)) errors.push(`${page}: inline style attributes are not allowed.`);
    if (/\son(?:click|load|error|change|submit|input|mouseover|focus)="/i.test(html)) {
      errors.push(`${page}: inline event handler attributes are not allowed.`);
    }

    const title = decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
    if (!title) {
      errors.push(`${page}: missing title.`);
    } else {
      if (title !== meta.title) errors.push(`${page}: title does not match seo.json.`);
      if (title.length > 70) warnings.push(`${page}: title is ${title.length} characters.`);
    }

    const description = decodeEntities(html.match(/<meta name="description" content="([^"]*)"/i)?.[1] || '');
    if (!description) {
      errors.push(`${page}: missing meta description.`);
    } else {
      if (description !== meta.description) errors.push(`${page}: description does not match seo.json.`);
      if (description.length > 170) warnings.push(`${page}: description is ${description.length} characters.`);
    }

    const robots = html.match(/<meta name="robots" content="([^"]*)"/i)?.[1];
    if (robots !== meta.robots) errors.push(`${page}: robots meta does not match seo.json.`);

    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/i)?.[1] || null;
    if (meta.canonicalPath === null) {
      if (canonical) errors.push(`${page}: detail/utility page should omit a static canonical.`);
    } else {
      const expected = meta.canonicalPath ? `${base}/${String(meta.canonicalPath).replace(/^\/+/, '')}` : `${base}/`;
      if (canonical !== expected) errors.push(`${page}: canonical should be ${expected} (found ${canonical || 'none'}).`);
    }

    if (!/<meta property="og:title"/i.test(html)) errors.push(`${page}: missing og:title.`);
    if (!/<meta property="og:image"/i.test(html)) errors.push(`${page}: missing og:image.`);
    if (!/<meta name="twitter:card"/i.test(html)) errors.push(`${page}: missing twitter:card.`);

    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    scripts.forEach((match) => {
      const attributes = match[1];
      const content = match[2].trim();
      const isJsonLd = /type="application\/ld\+json"/i.test(attributes);
      if (!isJsonLd && !/\bsrc="/i.test(attributes)) {
        errors.push(`${page}: inline scripts are not allowed except JSON-LD.`);
      }
      if (isJsonLd) {
        try {
          const parsed = JSON.parse(content);
          if (!parsed['@context'] || !parsed['@graph']) errors.push(`${page}: JSON-LD is missing @context or @graph.`);
        } catch (error) {
          errors.push(`${page}: JSON-LD does not parse (${error.message}).`);
        }
      }
    });

    const expectsSchema = !meta.runtimeSchema && !meta.robots?.includes('noindex') && meta.canonicalPath !== null;
    const hasSchema = /<script type="application\/ld\+json">/i.test(html);
    if (expectsSchema && !hasSchema) errors.push(`${page}: expected static JSON-LD.`);
    if (!expectsSchema && hasSchema) errors.push(`${page}: static JSON-LD should be skipped for this page.`);

    const ids = [...html.matchAll(/\sid="([^"]+)"/gi)].map((match) => match[1]);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length) errors.push(`${page}: duplicate id(s): ${[...new Set(duplicateIds)].join(', ')}.`);

    const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
    imageTags.forEach((tag) => {
      if (!/\balt="/i.test(tag)) errors.push(`${page}: image is missing alt text: ${tag.slice(0, 90)}.`);
      if (!/\bwidth="\d+"/i.test(tag) || !/\bheight="\d+"/i.test(tag)) {
        errors.push(`${page}: image is missing width/height attributes: ${tag.slice(0, 90)}.`);
      }
    });

    const linkPattern = /\b(?:href|src)="([^"]+)"/gi;
    [...html.matchAll(linkPattern)].forEach((match) => {
      const value = match[1];
      const localPath = normalizeLocalPath(value);
      if (!localPath) return;
      if (localPath === '#' || value.startsWith('#')) return;
      const target = path.resolve(root, localPath);
      if (!target.startsWith(root)) {
        errors.push(`${page}: link escapes the site root: ${value}.`);
        return;
      }
      if (!existsSync(target)) errors.push(`${page}: local link target not found: ${value}.`);
    });
  });

  const sitemap = existsSync(rel('sitemap.xml')) ? readFileSync(rel('sitemap.xml'), 'utf8') : '';
  if (sitemap) {
    Object.entries(seo).forEach(([page, meta]) => {
      if (!meta.sitemap) {
        const exactLoc = `<loc>${base}/${page}</loc>`;
        if (sitemap.includes(exactLoc)) errors.push(`sitemap.xml: ${page} should not be listed.`);
        return;
      }
      const expected = meta.canonicalPath ? `${base}/${String(meta.canonicalPath).replace(/^\/+/, '')}` : `${base}/`;
      if (!sitemap.includes(`<loc>${expected}</loc>`)) errors.push(`sitemap.xml: missing ${expected}.`);
    });
    if (!sitemap.includes(`project-details.html?slug=${projects[0]?.slug || ''}`)) {
      errors.push('sitemap.xml: project detail URLs are missing.');
    }
    if (!sitemap.includes(`blog-details.html?slug=${blog[0]?.slug || ''}`)) {
      errors.push('sitemap.xml: article detail URLs are missing.');
    }
  }

  const robotsFile = existsSync(rel('robots.txt')) ? readFileSync(rel('robots.txt'), 'utf8') : '';
  if (robotsFile && !robotsFile.includes(`Sitemap: ${base}/sitemap.xml`)) {
    errors.push('robots.txt: sitemap URL is missing.');
  }

  const result = {
    errors,
    warnings,
    checkedPages: checked.length,
    projects: projects.length,
    articles: blog.length,
    sitemapUrls: (sitemap.match(/<url>/g) || []).length
  };

  if (!quiet) {
    console.log(`Checked ${result.checkedPages} pages, ${result.projects} projects, and ${result.articles} articles.`);
    if (result.sitemapUrls) console.log(`Sitemap URLs: ${result.sitemapUrls}.`);
    result.warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
    if (result.errors.length) {
      result.errors.forEach((error) => console.error(`Error: ${error}`));
      console.error(`\nValidation failed with ${result.errors.length} error(s).`);
    } else {
      console.log('\nValidation passed.');
    }
  }

  return result;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const result = runValidation();
  process.exitCode = result.errors.length ? 1 : 0;
}
