import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const startMarker = '<!-- SEO:START -->';
const endMarker = '<!-- SEO:END -->';

function readJSON(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
}

function escapeHTML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeBaseUrl(url) {
  const base = String(url || '').replace(/\/+$/, '');
  if (!/^https?:\/\/[^/]+/i.test(base)) {
    throw new Error('site-config.json must contain a valid absolute "url" value.');
  }
  return base;
}

function absoluteUrl(base, pathname) {
  if (pathname === null || pathname === undefined) return null;
  if (/^https?:\/\//i.test(pathname)) return pathname;
  const clean = String(pathname).replace(/^\/+/, '');
  return clean ? `${base}/${clean}` : `${base}/`;
}

function metaTag(attribute, key, content) {
  if (content === null || content === undefined || content === '') return '';
  return `<meta ${attribute}="${escapeHTML(key)}" content="${escapeHTML(content)}">`;
}

function buildSchema({ base, config, meta, canonical, skills }) {
  if (meta.robots?.includes('noindex') || meta.runtimeSchema || !canonical) return null;

  const personId = `${base}/#person`;
  const websiteId = `${base}/#website`;
  const webpageId = `${canonical}#webpage`;
  const crumbs = [
    { label: 'Home', href: 'index.html' },
    ...(meta.breadcrumb || [])
  ];
  const hasBreadcrumb = Array.isArray(meta.breadcrumb) && meta.breadcrumb.length > 0;
  const breadcrumbId = `${canonical}#breadcrumb`;

  const locationParts = String(config.contact?.location || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const person = {
    '@type': 'Person',
    '@id': personId,
    name: config.brand?.name || 'John Anderson',
    jobTitle: config.brand?.role || 'Graphic Designer & Art Director',
    description: config.brand?.shortBio || '',
    url: `${base}/`
  };

  if (config.contact?.email) person.email = config.contact.email;
  if (locationParts.length) {
    person.address = {
      '@type': 'PostalAddress',
      addressLocality: locationParts[0],
      addressRegion: locationParts[1] || '',
      addressCountry: 'US'
    };
  }

  const sameAs = (config.socials || [])
    .filter((social) => !social.placeholder && /^https?:\/\//.test(social.url || ''))
    .map((social) => social.url);
  if (sameAs.length) person.sameAs = sameAs;

  const knowsAbout = [
    ...(skills?.groups || []).map((group) => group.title),
    ...(skills?.toolbelt || [])
  ].filter(Boolean);
  if (knowsAbout.length) person.knowsAbout = [...new Set(knowsAbout)];

  const website = {
    '@type': 'WebSite',
    '@id': websiteId,
    url: `${base}/`,
    name: `${config.brand?.name || 'John Anderson'} Portfolio`,
    description: config.brand?.tagline || '',
    inLanguage: 'en',
    publisher: { '@id': personId }
  };

  const webpage = {
    '@type': meta.pageType || 'WebPage',
    '@id': webpageId,
    url: canonical,
    name: meta.title,
    description: meta.description,
    inLanguage: 'en',
    isPartOf: { '@id': websiteId },
    about: { '@id': personId }
  };

  if (meta.ogImage) {
    webpage.primaryImageOfPage = {
      '@type': 'ImageObject',
      url: absoluteUrl(base, meta.ogImage),
      width: 1200,
      height: 630
    };
  }

  if (hasBreadcrumb) {
    webpage.breadcrumb = { '@id': breadcrumbId };
  }

  const graph = [person, website, webpage];

  if (hasBreadcrumb) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: crumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: item.href ? absoluteUrl(base, item.href) : canonical
      }))
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

function buildHeadBlock({ base, config, meta, page, skills }) {
  const canonicalPath = meta.canonicalPath === undefined ? '' : meta.canonicalPath;
  const canonical = canonicalPath === null ? null : absoluteUrl(base, canonicalPath);
  const image = absoluteUrl(base, meta.ogImage || config.defaultOgImage);
  const lines = [];

  lines.push(`<title>${escapeHTML(meta.title)}</title>`);
  lines.push(metaTag('name', 'description', meta.description));
  if (Array.isArray(meta.keywords) && meta.keywords.length) {
    lines.push(metaTag('name', 'keywords', meta.keywords.join(', ')));
  }
  lines.push(metaTag('name', 'robots', meta.robots || 'index,follow'));
  lines.push(metaTag('name', 'author', config.brand?.name || 'John Anderson'));
  lines.push('<meta name="theme-color" content="#FFEAD3">');
  lines.push('<meta name="color-scheme" content="light">');
  if (canonical) lines.push(`<link rel="canonical" href="${escapeHTML(canonical)}">`);

  lines.push(metaTag('property', 'og:title', meta.ogTitle || meta.title));
  lines.push(metaTag('property', 'og:description', meta.ogDescription || meta.description));
  lines.push(metaTag('property', 'og:type', meta.ogType || 'website'));
  if (canonical) lines.push(metaTag('property', 'og:url', canonical));
  lines.push(metaTag('property', 'og:site_name', config.brand?.name || 'John Anderson'));
  lines.push(metaTag('property', 'og:locale', 'en_US'));
  lines.push(metaTag('property', 'og:image', image));
  lines.push(metaTag('property', 'og:image:alt', meta.ogImageAlt));
  lines.push(metaTag('property', 'og:image:type', 'image/png'));
  lines.push(metaTag('property', 'og:image:width', '1200'));
  lines.push(metaTag('property', 'og:image:height', '630'));
  if (meta.articlePublished) lines.push(metaTag('property', 'article:published_time', meta.articlePublished));
  if (meta.articleAuthor) lines.push(metaTag('property', 'article:author', meta.articleAuthor));

  lines.push(metaTag('name', 'twitter:card', meta.twitterCard || 'summary_large_image'));
  lines.push(metaTag('name', 'twitter:title', meta.twitterTitle || meta.ogTitle || meta.title));
  lines.push(metaTag('name', 'twitter:description', meta.twitterDescription || meta.ogDescription || meta.description));
  lines.push(metaTag('name', 'twitter:image', image));
  lines.push(metaTag('name', 'twitter:image:alt', meta.ogImageAlt));

  const schema = buildSchema({ base, config, meta, canonical, skills });
  if (schema) {
    const json = JSON.stringify(schema).replace(/</g, '\\u003c');
    lines.push(`<script type="application/ld+json">${json}</script>`);
  }

  if (meta.title.length > 70) {
    console.warn(`  ! ${page}: title is ${meta.title.length} characters (recommended under 65).`);
  }
  if (meta.description.length > 170) {
    console.warn(`  ! ${page}: description is ${meta.description.length} characters (recommended under 165).`);
  }

  return lines.filter(Boolean);
}

function injectSeo(html, lines, page) {
  const pattern = /<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/;
  if (!pattern.test(html)) {
    throw new Error(`${page} is missing the SEO:START / SEO:END markers.`);
  }
  const body = lines.map((line) => `  ${line}`).join('\n');
  return html.replace(pattern, `${startMarker}\n${body}\n  ${endMarker}`);
}

function buildSitemap({ base, seo, projects, blog }) {
  const entries = [];

  Object.entries(seo).forEach(([page, meta]) => {
    if (!meta.sitemap) return;
    const loc = absoluteUrl(base, meta.canonicalPath === null ? page : meta.canonicalPath);
    entries.push({
      loc,
      changeFrequency: meta.changeFrequency || 'monthly',
      priority: typeof meta.priority === 'number' ? meta.priority : 0.5
    });
  });

  projects.forEach((project) => {
    entries.push({
      loc: absoluteUrl(base, `project-details.html?slug=${encodeURIComponent(project.slug)}`),
      changeFrequency: 'monthly',
      priority: 0.6
    });
  });

  blog.forEach((post) => {
    entries.push({
      loc: absoluteUrl(base, `blog-details.html?slug=${encodeURIComponent(post.slug)}`),
      changeFrequency: 'yearly',
      priority: 0.55,
      lastModified: post.date
    });
  });

  const body = entries.map((entry) => {
    const parts = [
      '  <url>',
      `    <loc>${escapeXML(entry.loc)}</loc>`,
      entry.lastModified ? `    <lastmod>${escapeXML(entry.lastModified)}</lastmod>` : '',
      `    <changefreq>${escapeXML(entry.changeFrequency)}</changefreq>`,
      `    <priority>${entry.priority.toFixed(1)}</priority>`,
      '  </url>'
    ].filter(Boolean);
    return parts.join('\n');
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function buildRobots(base) {
  return [
    '# Generated by scripts/generate-seo.js',
    'User-agent: *',
    'Allow: /',
    'Disallow: /components/',
    'Disallow: /scripts/',
    'Disallow: /tests/',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    ''
  ].join('\n');
}

function main() {
  const config = readJSON('assets/data/site-config.json');
  const seo = readJSON('assets/data/seo.json');
  const projects = readJSON('assets/data/projects.json');
  const blog = readJSON('assets/data/blog.json');
  const skills = readJSON('assets/data/skills.json');
  const base = normalizeBaseUrl(config.url);

  const pages = Object.keys(seo);
  let updated = 0;

  pages.forEach((page) => {
    const filePath = path.join(root, page);
    const html = readFileSync(filePath, 'utf8');
    const meta = seo[page];
    const lines = buildHeadBlock({ base, config, meta, page, skills });
    const output = injectSeo(html, lines, page);

    if (output === html) {
      console.log(`  = ${page} (unchanged)`);
    } else {
      writeFileSync(filePath, output, 'utf8');
      console.log(`  + ${page}`);
      updated += 1;
    }
  });

  writeFileSync(path.join(root, 'sitemap.xml'), buildSitemap({ base, seo, projects, blog }), 'utf8');
  writeFileSync(path.join(root, 'robots.txt'), buildRobots(base), 'utf8');

  console.log(`\nSEO generation complete. ${updated} of ${pages.length} pages updated.`);
  console.log(`Sitemap: ${base}/sitemap.xml (${Object.values(seo).filter((meta) => meta.sitemap).length + projects.length + blog.length} URLs)`);
  console.log(`Robots:  ${base}/robots.txt`);
}

main();
