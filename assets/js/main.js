import { loadComponents } from './component-loader.js';
import { initBreadcrumbs, initNavigation, initScrollTop } from './navigation.js';
import { initTheme } from './theme.js';
import { initSEO } from './seo-manager.js';
import { initPage } from './pages.js';
import { initAnimations } from './animations.js';
import { initContactForm } from './form-validation.js';

const page = document.body.getAttribute('data-page') || 'index.html';

async function boot() {
  document.documentElement.classList.add('js');

  const seoPromise = initSEO().catch((error) => {
    console.warn('SEO initialization failed.', error);
  });
  const componentsPromise = loadComponents();

  initAnimations();

  await componentsPromise;
  initTheme();
  await Promise.allSettled([initNavigation(), initBreadcrumbs(page)]);
  await seoPromise;

  try {
    await initPage(page);
  } catch (error) {
    console.error(`The page content for ${page} could not be initialized.`, error);
  }

  initContactForm();
  initScrollTop();
  initAnimations();

  document.documentElement.classList.add('is-ready');
  window.dispatchEvent(new CustomEvent('portfolio:ready', { detail: { page } }));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
