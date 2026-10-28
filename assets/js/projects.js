import { loadProjects } from './data.js';
import { escapeAttr, escapeHTML, qs, qsa } from './utils.js';
import {
  categoryFilters,
  chipList,
  demoBadge,
  emptyState,
  errorState,
  projectCard,
  relatedProjects,
  skeletonCards
} from './renderers.js';
import { setDetailMetadata } from './seo-manager.js';
import { renderBreadcrumbs } from './navigation.js';

function setCount(element, visible, total) {
  if (!element) return;
  element.textContent = visible === total
    ? `${total} sample ${total === 1 ? 'project' : 'projects'}`
    : `Showing ${visible} of ${total} sample projects`;
}

function applyProjectFilter(grid, buttons, activeCategory, emptySlot, countElement) {
  const cards = qsa('.project-card', grid);
  let visible = 0;

  cards.forEach((card) => {
    const matches = activeCategory === 'All' || card.getAttribute('data-project-category') === activeCategory;
    card.hidden = !matches;
    if (matches) visible += 1;
  });

  buttons.forEach((button) => {
    const isActive = button.getAttribute('data-filter') === activeCategory;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  if (emptySlot) emptySlot.hidden = visible !== 0;
  setCount(countElement, visible, cards.length);
}

export async function initProjectsPage() {
  const grid = qs('#projects-grid');
  if (!grid) return;

  const filterBar = qs('#project-filters');
  const countElement = qs('#project-count');
  const emptySlot = qs('#projects-empty');

  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = skeletonCards('project', 3);

  try {
    const projects = await loadProjects();
    const categories = [...new Set(projects.map((project) => project.category))];

    if (filterBar) {
      filterBar.innerHTML = categoryFilters(categories, 'All');
      filterBar.hidden = false;
    }

    grid.innerHTML = projects.map((project, index) => projectCard(project, index)).join('');
    grid.setAttribute('aria-busy', 'false');
    setCount(countElement, projects.length, projects.length);

    const buttons = qsa('[data-filter]', filterBar || document);
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        applyProjectFilter(grid, buttons, button.getAttribute('data-filter'), emptySlot, countElement);
      });
    });

    if (emptySlot) {
      emptySlot.innerHTML = emptyState(
        'No projects in this category yet',
        'Try another category or browse the full collection.',
        { href: 'projects.html', label: 'Show all projects' }
      );
    }
  } catch (error) {
    console.error(error);
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = `<div class="grid-full">${errorState(
      'The project archive could not load',
      'The project data request failed. Please check your connection or open the portfolio again.',
      { href: 'projects.html', label: 'Try the portfolio again' }
    )}</div>`;
  }
}

function detailSkeleton() {
  return `
    <div class="container detail-loading" aria-hidden="true">
      <div class="skeleton skeleton--line skeleton--short"></div>
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton skeleton--line skeleton--medium"></div>
      <div class="skeleton skeleton--hero"></div>
      <div class="detail-loading__columns">
        <div>
          <div class="skeleton skeleton--line"></div>
          <div class="skeleton skeleton--line"></div>
          <div class="skeleton skeleton--line skeleton--medium"></div>
        </div>
        <div class="skeleton skeleton--card"></div>
      </div>
    </div>`;
}

function projectNotFound() {
  return `
    <section class="section">
      <div class="container">
        <h1 class="sr-only">Project not found</h1>
        ${errorState(
          'Project not found',
          'The project you requested does not exist or its link is out of date. The archive is still available.',
          { href: 'projects.html', label: 'Browse all projects' }
        )}
      </div>
    </section>`;
}

function projectHero(project) {
  return `
    <header class="case-study__hero">
      <div class="container">
        <div class="case-study__hero-grid">
          <div class="case-study__hero-copy">
            <div class="meta-line">
              ${demoBadge('Sample project')}
              <span>${escapeHTML(project.category)}</span>
              <span class="meta-dot" aria-hidden="true"></span>
              <span>${escapeHTML(project.year)}</span>
            </div>
            <h1>${escapeHTML(project.title)}</h1>
            <p class="lede">${escapeHTML(project.summary)}</p>
            ${chipList(project.tech, 'Project technologies')}
            <div class="page-intro__actions">
              <a class="btn btn--primary" href="contact.html">Discuss a similar project</a>
              <a class="btn btn--ghost" href="projects.html"><i class="ri-arrow-left-line" aria-hidden="true"></i> All projects</a>
            </div>
          </div>
          <aside class="case-study__facts" aria-label="Project facts">
            <dl>
              <div><dt>Role</dt><dd>${escapeHTML(project.role)}</dd></div>
              <div><dt>Timeline</dt><dd>${escapeHTML(project.timeline)}</dd></div>
              <div><dt>Year</dt><dd>${escapeHTML(project.year)}</dd></div>
              <div><dt>Category</dt><dd>${escapeHTML(project.category)}</dd></div>
            </dl>
            <p class="demo-note"><i class="ri-information-line" aria-hidden="true"></i> This is a sample case study created for the portfolio. Client, metrics, and links are intentionally illustrative or omitted.</p>
          </aside>
        </div>
        <figure class="case-study__media">
          <img src="${escapeAttr(project.image)}" alt="${escapeAttr(project.imageAlt)}" width="1200" height="800" fetchpriority="high" decoding="async">
        </figure>
      </div>
    </header>`;
}

function projectBody(project) {
  return `
    <div class="section">
      <div class="container case-study__body">
        <div class="prose">
          <section aria-labelledby="overview-heading">
            <p class="eyebrow"><span class="eyebrow__line" aria-hidden="true"></span> Overview</p>
            <h2 id="overview-heading">The brief</h2>
            <p class="article-lede">${escapeHTML(project.intro)}</p>
            ${project.overview.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join('')}
          </section>

          <section aria-labelledby="built-heading">
            <h2 id="built-heading">What I built</h2>
            <div class="feature-grid">
              ${project.features.map((feature) => `
                <article class="feature-card">
                  <h3>${escapeHTML(feature.title)}</h3>
                  <p>${escapeHTML(feature.text)}</p>
                </article>`).join('')}
            </div>
          </section>

          <section aria-labelledby="approach-heading">
            <h2 id="approach-heading">Approach</h2>
            <ol class="approach-list">
              ${project.approach.map((step, index) => `
                <li>
                  <span class="approach-list__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>${escapeHTML(step.title)}</h3>
                    <p>${escapeHTML(step.text)}</p>
                  </div>
                </li>`).join('')}
            </ol>
          </section>

          <section aria-labelledby="notes-heading">
            <h2 id="notes-heading">Project notes</h2>
            <p>This case study demonstrates how I think about product structure, interface behavior, and implementation. It is not a claim of a real client engagement, and no performance or business metrics are presented.</p>
            <div class="demo-note demo-note--large">
              <i class="ri-information-line" aria-hidden="true"></i>
              <p><strong>About this demo:</strong> Live screenshots and repository links are not configured. The artwork and product scenario are illustrative examples for this portfolio.</p>
            </div>
          </section>
        </div>

        <aside class="case-study__sidebar" aria-label="Case study details">
          <div class="case-study__aside-card">
            <h2>On this page</h2>
            <nav aria-label="Case study sections">
              <ul class="toc-list">
                <li><a href="#overview-heading">The brief</a></li>
                <li><a href="#built-heading">What I built</a></li>
                <li><a href="#approach-heading">Approach</a></li>
                <li><a href="#notes-heading">Project notes</a></li>
              </ul>
            </nav>
            <hr>
            <h2>Stack</h2>
            ${chipList(project.tech, 'Stack')}
            <p class="sidebar-note">Interested in a similar build? Start with a short project brief.</p>
            <a class="btn btn--primary btn--sm btn--block" href="contact.html">Start a conversation</a>
          </div>
        </aside>
      </div>
    </div>`;
}

function projectPagination(projects, index) {
  if (projects.length < 2) return '';
  const previous = projects[(index - 1 + projects.length) % projects.length];
  const next = projects[(index + 1) % projects.length];
  return `
    <nav class="project-pagination" aria-label="Project pagination">
      <a class="project-pagination__link project-pagination__link--previous" href="project-details.html?slug=${encodeURIComponent(previous.slug)}">
        <span><i class="ri-arrow-left-line" aria-hidden="true"></i> Previous project</span>
        <strong>${escapeHTML(previous.title)}</strong>
      </a>
      <a class="project-pagination__link project-pagination__link--next" href="project-details.html?slug=${encodeURIComponent(next.slug)}">
        <span>Next project <i class="ri-arrow-right-line" aria-hidden="true"></i></span>
        <strong>${escapeHTML(next.title)}</strong>
      </a>
    </nav>`;
}

export async function initProjectDetails() {
  const root = qs('#project-detail');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  let requestedSlug = params.get('slug');
  root.setAttribute('aria-busy', 'true');
  root.innerHTML = detailSkeleton();

  try {
    const projects = await loadProjects();
    if (!requestedSlug) {
      const fallback = projects.find((project) => project.featured) || projects[0];
      requestedSlug = fallback?.slug || '';
      if (requestedSlug) {
        const nextUrl = `${window.location.pathname}?slug=${encodeURIComponent(requestedSlug)}${window.location.hash}`;
        window.history.replaceState(null, '', nextUrl);
      }
    }

    const index = projects.findIndex((project) => project.slug === requestedSlug);
    const project = projects[index];

    if (!project) {
      root.setAttribute('aria-busy', 'false');
      root.innerHTML = projectNotFound();
      renderBreadcrumbs([
        { label: 'Home', href: 'index.html' },
        { label: 'Portfolio', href: 'projects.html' },
        { label: 'Project not found' }
      ]);
      await setDetailMetadata({ kind: 'project', item: null, slug: requestedSlug });
      return;
    }

    const related = projects.filter((item) => item.slug !== project.slug);
    root.innerHTML = `
      <article class="case-study">
        ${projectHero(project)}
        ${projectBody(project)}
        <section class="section section--soft" aria-labelledby="related-projects-heading">
          <div class="container">
            <div class="section-heading">
              <div>
                <p class="eyebrow"><span class="eyebrow__line" aria-hidden="true"></span> Keep exploring</p>
                <h2 id="related-projects-heading">More sample work</h2>
              </div>
              <a class="link-arrow" href="projects.html">View all projects <i class="ri-arrow-right-line" aria-hidden="true"></i></a>
            </div>
            <div class="card-grid card-grid--projects">
              ${relatedProjects(related, project.slug, 2)}
            </div>
            ${projectPagination(projects, index)}
          </div>
        </section>
        <section class="section">
          <div class="container">
            <div class="cta-panel">
              <span class="cta-panel__glow" aria-hidden="true"></span>
              <div>
                <p class="eyebrow eyebrow--light">Have a project in mind?</p>
                <h2>Let's make the next one thoughtful.</h2>
                <p>Tell me what you are building, what is getting in the way, and what a good outcome looks like.</p>
              </div>
              <div class="cta-panel__actions">
                <a class="btn btn--light" href="contact.html">Start a conversation</a>
                <a class="btn btn--ghost-light" href="services.html">Explore services</a>
              </div>
            </div>
          </div>
        </section>
      </article>`;

    root.setAttribute('aria-busy', 'false');
    renderBreadcrumbs([
      { label: 'Home', href: 'index.html' },
      { label: 'Portfolio', href: 'projects.html' },
      { label: project.title }
    ]);
    await setDetailMetadata({ kind: 'project', item: project, slug: project.slug });
  } catch (error) {
    console.error(error);
    root.setAttribute('aria-busy', 'false');
    root.innerHTML = `
      <section class="section">
        <div class="container">
          <h1 class="sr-only">Project case study unavailable</h1>
          ${errorState(
            'The case study could not load',
            'The project data request failed. This usually means the site is not being served correctly.',
            { href: 'projects.html', label: 'Back to the portfolio' }
          )}
        </div>
      </section>`;
  }
}
