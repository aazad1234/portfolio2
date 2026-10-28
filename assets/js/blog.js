import { loadBlog, loadSiteConfig } from './data.js';
import { copyText, debounce, escapeAttr, escapeHTML, formatDate, qs, qsa } from './utils.js';
import {
  articleBody,
  blogCard,
  categoryFilters,
  chipList,
  demoBadge,
  emptyState,
  errorState,
  relatedPosts,
  skeletonCards,
  tableOfContents
} from './renderers.js';
import { setDetailMetadata } from './seo-manager.js';
import { renderBreadcrumbs } from './navigation.js';

function sortPosts(posts) {
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function setBlogCount(element, visible, total) {
  if (!element) return;
  element.textContent = visible === total
    ? `${total} sample ${total === 1 ? 'article' : 'articles'}`
    : `Showing ${visible} of ${total} sample articles`;
}

function applyBlogFilters(grid, activeCategory, query, emptySlot, countElement, filterButtons) {
  const normalizedQuery = query.trim().toLowerCase();
  const cards = qsa('.post-card', grid);
  let visible = 0;

  cards.forEach((card) => {
    const categoryMatch = activeCategory === 'All' || card.getAttribute('data-post-category') === activeCategory;
    const searchMatch = !normalizedQuery || (card.getAttribute('data-post-search') || '').includes(normalizedQuery);
    const matches = categoryMatch && searchMatch;
    card.hidden = !matches;
    if (matches) visible += 1;
  });

  filterButtons.forEach((button) => {
    const isActive = button.getAttribute('data-filter') === activeCategory;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  if (emptySlot) {
    emptySlot.hidden = visible !== 0;
    emptySlot.innerHTML = emptyState(
      'No articles match that search',
      'Try a different keyword or clear the filters to see all sample articles.',
      { href: 'blog.html', label: 'Reset the archive' }
    );
  }

  setBlogCount(countElement, visible, cards.length);
}

export async function initBlogPage() {
  const grid = qs('#blog-grid');
  if (!grid) return;

  const filterBar = qs('#blog-filters');
  const searchInput = qs('#blog-search');
  const clearSearch = qs('[data-clear-search]');
  const countElement = qs('#blog-count');
  const emptySlot = qs('#blog-empty');
  let activeCategory = 'All';
  let filterButtons = [];
  let visibleQuery = '';

  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = skeletonCards('post', 3);

  try {
    const posts = sortPosts(await loadBlog());
    const categories = [...new Set(posts.map((post) => post.category))];

    if (filterBar) {
      filterBar.innerHTML = categoryFilters(categories, 'All');
      filterBar.hidden = false;
    }

    grid.innerHTML = posts.map((post, index) => blogCard(post, index, { featured: index === 0 })).join('');
    grid.setAttribute('aria-busy', 'false');
    setBlogCount(countElement, posts.length, posts.length);

    filterButtons = qsa('[data-filter]', filterBar || document);
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        activeCategory = button.getAttribute('data-filter');
        applyBlogFilters(grid, activeCategory, visibleQuery, emptySlot, countElement, filterButtons);
      });
    });

    if (searchInput) {
      const filterBySearch = debounce(() => {
        visibleQuery = searchInput.value;
        if (clearSearch) clearSearch.hidden = !visibleQuery.trim();
        applyBlogFilters(grid, activeCategory, visibleQuery, emptySlot, countElement, filterButtons);
      }, 120);
      searchInput.addEventListener('input', filterBySearch);
      clearSearch?.addEventListener('click', () => {
        searchInput.value = '';
        visibleQuery = '';
        clearSearch.hidden = true;
        applyBlogFilters(grid, activeCategory, visibleQuery, emptySlot, countElement, filterButtons);
        searchInput.focus();
      });
    }
  } catch (error) {
    console.error(error);
    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = `<div class="grid-full">${errorState(
      'The article archive could not load',
      'The blog data request failed. Please check your connection or return to the archive.',
      { href: 'blog.html', label: 'Try again' }
    )}</div>`;
  }
}

function blogSkeleton() {
  return `
    <div class="container detail-loading" aria-hidden="true">
      <div class="skeleton skeleton--line skeleton--short"></div>
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton skeleton--line skeleton--medium"></div>
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

function articleNotFound() {
  return `
    <section class="section">
      <div class="container">
        <h1 class="sr-only">Article not found</h1>
        ${errorState(
          'Article not found',
          'The article you requested does not exist or its link is out of date. The archive is still available.',
          { href: 'blog.html', label: 'Browse all articles' }
        )}
      </div>
    </section>`;
}

function articleHero(post, authorName) {
  return `
    <header class="article-hero">
      <div class="container article-hero__inner">
        <div class="meta-line">
          ${demoBadge('Sample article')}
          <span>${escapeHTML(post.category)}</span>
          <span class="meta-dot" aria-hidden="true"></span>
          <time datetime="${escapeAttr(post.date)}">${formatDate(post.date)}</time>
          <span class="meta-dot" aria-hidden="true"></span>
          <span>${escapeHTML(post.readingTime)}</span>
        </div>
        <h1>${escapeHTML(post.title)}</h1>
        <p class="lede">${escapeHTML(post.excerpt)}</p>
        <div class="article-hero__bottom">
          <div class="article-author">
            <img src="assets/images/portrait.jpg" alt="${escapeAttr(authorName)}" width="512" height="512" loading="eager" decoding="async">
            <span>
              <strong>${escapeHTML(authorName)}</strong>
              <span>Full Stack Developer</span>
            </span>
          </div>
          <div class="article-actions">
            <button class="btn btn--ghost btn--sm" type="button" data-share-article>
              <i class="ri-link" aria-hidden="true"></i>
              Copy article link
            </button>
            <span class="share-status" data-share-status role="status" aria-live="polite"></span>
          </div>
        </div>
      </div>
    </header>`;
}

function articleLayout(post) {
  return `
    <div class="section">
      <div class="container article-layout">
        <aside class="article-sidebar">
          <div class="case-study__aside-card">
            <h2>In this article</h2>
            <nav aria-label="Article contents">
              <ol class="toc-list">${tableOfContents(post)}</ol>
            </nav>
            <hr>
            <p class="sidebar-note">Written as a practical field note for this demo portfolio.</p>
            <a class="btn btn--ghost btn--sm btn--block" href="contact.html">Ask a question</a>
          </div>
        </aside>
        <div class="prose article-content">
          ${articleBody(post)}
          <div class="article-tags">
            <span class="eyebrow">Filed under</span>
            ${chipList(post.tags, 'Article tags')}
          </div>
          <div class="author-card">
            <img src="assets/images/portrait.jpg" alt="John Anderson" width="512" height="512" loading="lazy" decoding="async">
            <div>
              <p class="eyebrow">About the author</p>
              <h2>John Anderson</h2>
              <p>Full stack developer focused on fast, accessible, and maintainable web products. This article is sample content for the portfolio.</p>
              <a class="link-arrow" href="about.html">More about John <i class="ri-arrow-right-line" aria-hidden="true"></i></a>
            </div>
          </div>
          <div class="demo-note demo-note--large">
            <i class="ri-information-line" aria-hidden="true"></i>
            <p><strong>Sample article:</strong> This article was written for demonstration purposes. It contains no client data, invented research, or verified performance claims.</p>
          </div>
        </div>
      </div>
    </div>`;
}

export async function initBlogDetails() {
  const root = qs('#blog-detail');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  let requestedSlug = params.get('slug');
  root.setAttribute('aria-busy', 'true');
  root.innerHTML = blogSkeleton();

  try {
    const [postsData, config] = await Promise.all([loadBlog(), loadSiteConfig()]);
    const posts = sortPosts(postsData);
    const authorName = config?.brand?.name || 'John Anderson';

    if (!requestedSlug) {
      const fallback = posts.find((post) => post.featured) || posts[0];
      requestedSlug = fallback?.slug || '';
      if (requestedSlug) {
        const nextUrl = `${window.location.pathname}?slug=${encodeURIComponent(requestedSlug)}${window.location.hash}`;
        window.history.replaceState(null, '', nextUrl);
      }
    }

    const post = posts.find((item) => item.slug === requestedSlug);

    if (!post) {
      root.setAttribute('aria-busy', 'false');
      root.innerHTML = articleNotFound();
      renderBreadcrumbs([
        { label: 'Home', href: 'index.html' },
        { label: 'Blog', href: 'blog.html' },
        { label: 'Article not found' }
      ]);
      await setDetailMetadata({ kind: 'article', item: null, slug: requestedSlug });
      return;
    }

    root.innerHTML = `
      <article class="article">
        ${articleHero(post, authorName)}
        ${articleLayout(post)}
        <section class="section section--soft" aria-labelledby="related-articles-heading">
          <div class="container">
            <div class="section-heading">
              <div>
                <p class="eyebrow"><span class="eyebrow__line" aria-hidden="true"></span> Keep reading</p>
                <h2 id="related-articles-heading">More field notes</h2>
              </div>
              <a class="link-arrow" href="blog.html">Browse the archive <i class="ri-arrow-right-line" aria-hidden="true"></i></a>
            </div>
            <div class="card-grid card-grid--posts">
              ${relatedPosts(posts, post.slug, 3)}
            </div>
          </div>
        </section>
        <section class="section">
          <div class="container">
            <div class="cta-panel">
              <span class="cta-panel__glow" aria-hidden="true"></span>
              <div>
                <p class="eyebrow eyebrow--light">Have a tricky interface to solve?</p>
                <h2>Let's make it clearer together.</h2>
                <p>Bring the rough edges, the slow page, or the design that never quite made it to production.</p>
              </div>
              <div class="cta-panel__actions">
                <a class="btn btn--light" href="contact.html">Get in touch</a>
                <a class="btn btn--ghost-light" href="projects.html">See the portfolio</a>
              </div>
            </div>
          </div>
        </section>
      </article>`;

    root.setAttribute('aria-busy', 'false');
    renderBreadcrumbs([
      { label: 'Home', href: 'index.html' },
      { label: 'Blog', href: 'blog.html' },
      { label: post.title }
    ]);
    await setDetailMetadata({ kind: 'article', item: post, slug: post.slug });

    const shareButton = qs('[data-share-article]', root);
    const shareStatus = qs('[data-share-status]', root);
    shareButton?.addEventListener('click', async () => {
      const copied = await copyText(window.location.href);
      if (shareStatus) {
        shareStatus.textContent = copied ? 'Link copied to clipboard.' : 'The link could not be copied.';
        window.setTimeout(() => {
          shareStatus.textContent = '';
        }, 3000);
      }
    });
  } catch (error) {
    console.error(error);
    root.setAttribute('aria-busy', 'false');
    root.innerHTML = `
      <section class="section">
        <div class="container">
          <h1 class="sr-only">Article unavailable</h1>
          ${errorState(
            'The article could not load',
            'The article data request failed. This usually means the site is not being served correctly.',
            { href: 'blog.html', label: 'Back to the blog' }
          )}
        </div>
      </section>`;
  }
}
