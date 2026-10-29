import { loadSEO, loadSiteConfig } from './data.js';
import { currentFileName, siteBaseUrl } from './utils.js';

let cachedConfig = null;

function metaSelector(attribute, value) {
  const safeValue = window.CSS && typeof window.CSS.escape === 'function'
    ? window.CSS.escape(value)
    : value.replace(/["\\]/g, '\\$&');
  return `meta[${attribute}="${safeValue}"]`;
}

function upsertMeta(attribute, key, content) {
  const selector = metaSelector(attribute, key);
  const existing = Array.from(document.head.querySelectorAll(selector));

  if (content === null || content === undefined || content === '') {
    existing.forEach((tag) => tag.remove());
    return;
  }

  let tag = existing[0];
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', String(content));
  existing.slice(1).forEach((extra) => extra.remove());
}

function upsertCanonical(href) {
  const links = Array.from(document.head.querySelectorAll('link[rel="canonical"]'));
  if (!href) {
    links.forEach((link) => link.remove());
    return;
  }

  let canonical = links[0];
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', href);
  links.slice(1).forEach((extra) => extra.remove());
}

function absoluteUrl(path) {
  if (!path) return '';
  try {
    return new URL(path, `${siteBaseUrl(cachedConfig)}/`).href;
  } catch (error) {
    return path;
  }
}

function canonicalFor(path) {
  if (path === null || path === undefined) return null;
  return absoluteUrl(path);
}

function applyMetadata(metadata) {
  if (!metadata) return;

  document.title = metadata.title;

  upsertMeta('name', 'description', metadata.description);
  upsertMeta('name', 'keywords', Array.isArray(metadata.keywords) ? metadata.keywords.join(', ') : metadata.keywords);
  upsertMeta('name', 'robots', metadata.robots || 'index,follow');
  upsertMeta('name', 'author', cachedConfig?.brand?.name || 'John Anderson');

  const canonical = metadata.canonicalPath === null ? null : canonicalFor(metadata.canonicalPath);
  upsertCanonical(canonical);

  const image = metadata.ogImage ? absoluteUrl(metadata.ogImage) : absoluteUrl(cachedConfig?.defaultOgImage);
  const ogUrl = canonical || '';

  upsertMeta('property', 'og:title', metadata.ogTitle || metadata.title);
  upsertMeta('property', 'og:description', metadata.ogDescription || metadata.description);
  upsertMeta('property', 'og:type', metadata.ogType || 'website');
  upsertMeta('property', 'og:url', ogUrl);
  upsertMeta('property', 'og:site_name', cachedConfig?.brand?.name || 'John Anderson');
  upsertMeta('property', 'og:locale', 'en_US');
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:image:alt', metadata.ogImageAlt || '');
  upsertMeta('property', 'og:image:width', image ? '1200' : '');
  upsertMeta('property', 'og:image:height', image ? '630' : '');

  upsertMeta('name', 'twitter:card', metadata.twitterCard || 'summary_large_image');
  upsertMeta('name', 'twitter:title', metadata.twitterTitle || metadata.ogTitle || metadata.title);
  upsertMeta('name', 'twitter:description', metadata.twitterDescription || metadata.ogDescription || metadata.description);
  upsertMeta('name', 'twitter:image', image);
  upsertMeta('name', 'twitter:image:alt', metadata.ogImageAlt || '');

  upsertMeta('property', 'article:published_time', metadata.articlePublished || '');
  upsertMeta('property', 'article:author', metadata.articleAuthor || '');

  document.head.querySelectorAll('meta[property="og:url"]').forEach((tag, index) => {
    if (index > 0) tag.remove();
  });
}

function structuredDataScript(payload) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'seo-detail-schema';
  script.textContent = JSON.stringify(payload).replace(/</g, '\\u003c');
  return script;
}

function removeDynamicSchema() {
  document.getElementById('seo-detail-schema')?.remove();
}

function personNode() {
  const base = siteBaseUrl(cachedConfig);
  return {
    '@type': 'Person',
    '@id': `${base}/#person`,
    name: cachedConfig?.brand?.name || 'John Anderson',
    jobTitle: cachedConfig?.brand?.role || 'Graphic Designer & Art Director',
    url: `${base}/`
  };
}

function websiteNode() {
  const base = siteBaseUrl(cachedConfig);
  return {
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    url: `${base}/`,
    name: `${cachedConfig?.brand?.name || 'John Anderson'} Portfolio`,
    inLanguage: 'en'
  };
}

function breadcrumbNode(items = []) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.href ? absoluteUrl(item.href) : item.url
    }))
  };
}

export async function initSEO() {
  const page = document.body.getAttribute('data-page') || currentFileName();

  try {
    const [config, seo] = await Promise.all([loadSiteConfig(), loadSEO()]);
    cachedConfig = config;
    const metadata = seo[page];
    if (!metadata) {
      console.warn(`No SEO metadata configured for ${page}.`);
      return;
    }
    applyMetadata(metadata);
  } catch (error) {
    console.warn('Runtime SEO metadata could not be applied. Static metadata remains in place.', error);
  }
}

function metadataForDetail({ kind, item, slug }) {
  const isProject = kind === 'project';
  const baseTitle = item?.title || (isProject ? 'Project' : 'Article');
  const baseDescription = item?.summary || item?.excerpt || '';
  const label = isProject ? 'Project Case Study' : 'Article';
  const detailPage = isProject ? 'project-details.html' : 'blog-details.html';
  const canonicalPath = item
    ? `${detailPage}?slug=${encodeURIComponent(slug || item.slug)}`
    : detailPage;

  return {
    title: item ? `${baseTitle} | ${label} | John Anderson` : `${isProject ? 'Project' : 'Article'} Not Found | John Anderson`,
    description: item
      ? baseDescription
      : `The requested ${isProject ? 'project' : 'article'} could not be found. Browse the full archive instead.`,
    keywords: item ? (isProject ? item.tech : item.tags) : [],
    canonicalPath: item ? canonicalPath : null,
    robots: item ? 'index,follow' : 'noindex,follow',
    ogTitle: item ? `${baseTitle} | ${label}` : 'Page not found',
    ogDescription: baseDescription,
    ogType: item ? 'article' : 'website',
    ogImage: item?.image && /\.(png|jpe?g|webp)$/i.test(item.image)
      ? item.image
      : cachedConfig?.defaultOgImage,
    ogImageAlt: item ? baseTitle : 'John Anderson portfolio',
    twitterCard: 'summary_large_image',
    articlePublished: !isProject && item ? item.date : '',
    articleAuthor: !isProject && item ? cachedConfig?.brand?.name : ''
  };
}

export async function setDetailMetadata(details) {
  if (!cachedConfig) {
    try {
      cachedConfig = await loadSiteConfig();
    } catch (error) {
      console.warn('SEO details could not be resolved without site configuration.', error);
      return;
    }
  }

  const metadata = metadataForDetail(details);
  applyMetadata(metadata);

  if (!details.item) {
    removeDynamicSchema();
    return;
  }

  const item = details.item;
  const canonical = canonicalFor(`${details.kind === 'project' ? 'project-details.html' : 'blog-details.html'}?slug=${encodeURIComponent(item.slug)}`);
  const breadcrumbItems = details.kind === 'project'
    ? [
        { label: 'Home', href: 'index.html' },
        { label: 'Portfolio', href: 'projects.html' },
        { label: item.title, url: canonical }
      ]
    : [
        { label: 'Home', href: 'index.html' },
        { label: 'Blog', href: 'blog.html' },
        { label: item.title, url: canonical }
      ];

  const webpage = {
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: metadata.title,
    description: metadata.description,
    isPartOf: { '@id': `${siteBaseUrl(cachedConfig)}/#website` },
    about: { '@id': `${siteBaseUrl(cachedConfig)}/#person` },
    breadcrumb: { '@id': `${canonical}#breadcrumb` }
  };

  const mainEntity = details.kind === 'project'
    ? {
        '@type': 'CreativeWork',
        name: item.title,
        description: item.summary,
        genre: item.category,
        keywords: item.tech.join(', '),
        url: canonical,
        creator: { '@id': `${siteBaseUrl(cachedConfig)}/#person` },
        about: item.intro
      }
    : {
        '@type': 'BlogPosting',
        headline: item.title,
        description: item.excerpt,
        datePublished: item.date,
        dateModified: item.date,
        articleSection: item.category,
        keywords: item.tags.join(', '),
        url: canonical,
        author: { '@id': `${siteBaseUrl(cachedConfig)}/#person` },
        publisher: { '@id': `${siteBaseUrl(cachedConfig)}/#person` },
        mainEntityOfPage: { '@id': `${canonical}#webpage` }
      };

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      personNode(),
      websiteNode(),
      webpage,
      mainEntity,
      { ...breadcrumbNode(breadcrumbItems), '@id': `${canonical}#breadcrumb` }
    ]
  };

  removeDynamicSchema();
  document.head.appendChild(structuredDataScript(graph));
}


