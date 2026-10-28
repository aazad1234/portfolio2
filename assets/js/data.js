const cache = new Map();
const REQUEST_TIMEOUT = 12000;

async function requestJSON(path) {
  const url = new URL(path, document.baseURI).href;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-cache'
    });
    if (!response.ok) {
      throw new Error(`Could not load ${path} (${response.status})`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

export function loadJSON(path) {
  const url = new URL(path, document.baseURI).href;
  if (!cache.has(url)) {
    const request = requestJSON(path).catch((error) => {
      cache.delete(url);
      throw error;
    });
    cache.set(url, request);
  }
  return cache.get(url);
}

export function loadSiteConfig() {
  return loadJSON('assets/data/site-config.json');
}

export function loadNavigation() {
  return loadJSON('assets/data/navigation.json');
}

export function loadSEO() {
  return loadJSON('assets/data/seo.json');
}

export function loadProjects() {
  return loadJSON('assets/data/projects.json');
}

export function loadSkills() {
  return loadJSON('assets/data/skills.json');
}

export function loadExperience() {
  return loadJSON('assets/data/experience.json');
}

export function loadServices() {
  return loadJSON('assets/data/services.json');
}

export function loadTestimonials() {
  return loadJSON('assets/data/testimonials.json');
}

export function loadBlog() {
  return loadJSON('assets/data/blog.json');
}

export function clearDataCache() {
  cache.clear();
}
