import { qsa } from './utils.js';

const COMPONENT_LABELS = {
  header: 'navigation',
  footer: 'footer',
  breadcrumbs: 'breadcrumbs',
  'scroll-to-top': 'scroll controls'
};

function fallbackMarkup(name) {
  const message = `The shared ${COMPONENT_LABELS[name] || name} could not load.`;
  const retry = `<button class="btn btn--ghost btn--sm" type="button" data-retry-components>Retry</button>`;

  if (name === 'header') {
    return `
      <header class="component-fallback component-fallback--header">
        <div class="container component-fallback__inner">
          <a class="brand" href="index.html"><span class="brand__wordmark">John<span aria-hidden="true">.</span></span></a>
          <div class="component-fallback__copy">
            <strong>${message}</strong>
            <span>Run the site through a local server so shared components can be fetched.</span>
          </div>
          <nav class="component-fallback__links" aria-label="Fallback navigation">
            <a href="index.html">Home</a>
            <a href="about.html">About</a>
            <a href="projects.html">Portfolio</a>
            <a href="contact.html">Contact</a>
          </nav>
          ${retry}
        </div>
      </header>`;
  }

  if (name === 'footer') {
    return `
      <footer class="site-footer site-footer--fallback">
        <div class="container">
          <p>${message} <a href="index.html">Return home</a>.</p>
        </div>
      </footer>`;
  }

  return '';
}

function bindFallbackActions(root) {
  qsa('[data-retry-components]', root).forEach((button) => {
    button.addEventListener('click', () => window.location.reload());
  });
}

async function loadComponent(slot) {
  const name = slot.getAttribute('data-component');
  if (!name) return;

  const url = new URL(`components/${name}.html`, document.baseURI);
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Component "${name}" failed with status ${response.status}`);
  }

  const markup = await response.text();
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const component = template.content.firstElementChild;

  if (!component) {
    throw new Error(`Component "${name}" did not contain valid markup`);
  }

  component.setAttribute('data-component-name', name);
  slot.replaceWith(component);
}

export async function loadComponents() {
  const slots = qsa('[data-component]');
  const results = await Promise.allSettled(slots.map((slot) => loadComponent(slot)));

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const name = slots[index]?.getAttribute('data-component') || 'component';
      console.error(result.reason);
      const fallback = fallbackMarkup(name);
      if (fallback) {
        const holder = document.createElement('div');
        holder.innerHTML = fallback.trim();
        const fallbackElement = holder.firstElementChild;
        slots[index].replaceWith(fallbackElement);
        bindFallbackActions(fallbackElement);
      }
    }
  });

  document.documentElement.classList.add('components-ready');
  window.dispatchEvent(new CustomEvent('components:ready'));
}
