import { escapeHTML, escapeAttr, formatDate, slugify } from './utils.js';

export function demoBadge(label = 'Sample') {
  return `<span class="badge badge--demo">${escapeHTML(label)}</span>`;
}

export function chipList(items, label = 'Disciplines') {
  if (!Array.isArray(items) || !items.length) return '';
  return `<ul class="chip-list" aria-label="${escapeAttr(label)}">${items
    .map((item) => `<li class="chip">${escapeHTML(item)}</li>`)
    .join('')}</ul>`;
}

export function projectCard(project, index = 0) {
  const url = `project-details.html?slug=${encodeURIComponent(project.slug)}`;
  return `
    <article class="project-card" data-reveal data-delay="${index % 3}" data-project-category="${escapeAttr(project.category)}">
      <a class="project-card__media" href="${url}" tabindex="-1" aria-hidden="true">
        <img src="${escapeAttr(project.image)}" alt="${escapeAttr(project.imageAlt)}" width="1200" height="800" loading="lazy" decoding="async">
        <span class="project-card__category">${escapeHTML(project.category)}</span>
      </a>
      <div class="project-card__body">
        <div class="project-card__meta">
          <span>${escapeHTML(project.year)}</span>
          <span class="meta-dot" aria-hidden="true"></span>
          ${demoBadge(project.category || 'Case Study')}
        </div>
        <h3 class="project-card__title"><a href="${url}">${escapeHTML(project.title)}</a></h3>
        <p class="project-card__summary">${escapeHTML(project.summary)}</p>
        ${chipList(project.tech.slice(0, 4), 'Disciplines')}
        <a class="link-arrow" href="${url}">View case study <i class="ri-arrow-right-line" aria-hidden="true"></i></a>
      </div>
    </article>`;
}

export function serviceCard(service, index = 0, options = {}) {
  const compact = Boolean(options.compact);
  return `
    <article class="service-card${compact ? ' service-card--compact' : ''}" id="${escapeAttr(service.slug)}" data-reveal data-delay="${index % 3}">
      <span class="icon-tile" aria-hidden="true"><i class="${escapeAttr(service.icon)}"></i></span>
      <h3>${escapeHTML(service.title)}</h3>
      <p>${escapeHTML(compact ? service.short : service.description)}</p>
      ${compact ? '' : `
        <ul class="check-list">
          ${service.deliverables.slice(0, 4).map((item) => `<li>${escapeHTML(item)}</li>`).join('')}
        </ul>
        <p class="service-card__best"><strong>Best for:</strong> ${escapeHTML(service.bestFor)}</p>
      `}
      <a class="link-arrow" href="${compact ? `services.html#${escapeAttr(service.slug)}` : 'contact.html#contact-form'}">
        ${compact ? 'Explore this service' : 'Discuss this service'}
        <i class="ri-arrow-right-line" aria-hidden="true"></i>
      </a>
    </article>`;
}

export function skillGroup(group, index = 0) {
  return `
    <article class="skill-card" data-reveal data-delay="${index % 3}">
      <header class="skill-card__head">
        <span class="icon-tile icon-tile--sm" aria-hidden="true"><i class="${escapeAttr(group.icon)}"></i></span>
        <div>
          <h3>${escapeHTML(group.title)}</h3>
          <p>${escapeHTML(group.description)}</p>
        </div>
      </header>
      <ul class="meter-list">
        ${group.items.map((item) => `
          <li class="meter-item">
            <div class="meter-label">
              <span>${escapeHTML(item.name)}</span>
              <span>${Number(item.level)}%</span>
            </div>
            <div class="meter" role="progressbar" aria-label="${escapeAttr(item.name)} proficiency" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Number(item.level)}">
              <span class="meter__fill" data-level="${Number(item.level)}"></span>
            </div>
          </li>`).join('')}
      </ul>
    </article>`;
}

export function testimonialCard(item, index = 0) {
  return `
    <figure class="testimonial-card" data-reveal data-delay="${index % 3}">
      <div class="testimonial-card__top">
        <i class="ri-double-quotes-l testimonial-card__quote-icon" aria-hidden="true"></i>
        ${demoBadge('Sample testimonial')}
      </div>
      <blockquote>
        <p>${escapeHTML(item.quote)}</p>
      </blockquote>
      <figcaption>
        <img src="${escapeAttr(item.avatar)}" alt="${escapeAttr(item.name)}" width="256" height="256" loading="lazy" decoding="async">
        <span>
          <strong>${escapeHTML(item.name)}</strong>
          <span>${escapeHTML(item.role)}, ${escapeHTML(item.company)}</span>
        </span>
      </figcaption>
    </figure>`;
}

export function blogCard(post, index = 0, options = {}) {
  const url = `blog-details.html?slug=${encodeURIComponent(post.slug)}`;
  const featured = Boolean(options.featured);
  return `
    <article class="post-card${featured ? ' post-card--featured' : ''}" data-reveal data-delay="${index % 3}" data-post-category="${escapeAttr(post.category)}" data-post-search="${escapeAttr([post.title, post.excerpt, post.category, ...post.tags].join(' ').toLowerCase())}">
      <a class="post-cover" data-category="${escapeAttr(post.category)}" href="${url}" tabindex="-1" aria-hidden="true">
        <span class="post-cover__grid"></span>
        <span class="post-cover__icon"><i class="${escapeAttr(post.icon)}"></i></span>
        <span class="post-cover__label">${escapeHTML(post.category)}</span>
      </a>
      <div class="post-card__body">
        <div class="post-card__meta">
          <time datetime="${escapeAttr(post.date)}">${formatDate(post.date)}</time>
          <span class="meta-dot" aria-hidden="true"></span>
          <span>${escapeHTML(post.readingTime)}</span>
          ${demoBadge('Sample article')}
        </div>
        <h3 class="post-card__title"><a href="${url}">${escapeHTML(post.title)}</a></h3>
        <p class="post-card__excerpt">${escapeHTML(post.excerpt)}</p>
        <div class="post-card__footer">
          <a class="link-arrow" href="${url}">Read article <i class="ri-arrow-right-line" aria-hidden="true"></i></a>
          <span class="post-card__tag">${escapeHTML(post.tags[0] || post.category)}</span>
        </div>
      </div>
    </article>`;
}

export function experienceItem(item, index = 0) {
  return `
    <article class="timeline-item" data-reveal data-delay="${index % 3}">
      <div class="timeline-marker" aria-hidden="true"><span></span></div>
      <div class="timeline-card">
        <div class="timeline-card__head">
          <div>
            <p class="eyebrow">${escapeHTML(item.period)}</p>
            <h3>${escapeHTML(item.role)}</h3>
            <p class="timeline-card__company">${escapeHTML(item.company)} · ${escapeHTML(item.type)} · ${escapeHTML(item.location)}</p>
          </div>
          ${demoBadge('Sample role')}
        </div>
        <p>${escapeHTML(item.summary)}</p>
        <ul class="check-list">
          ${item.highlights.map((highlight) => `<li>${escapeHTML(highlight)}</li>`).join('')}
        </ul>
        ${chipList(item.tech, 'Technologies used')}
      </div>
    </article>`;
}

export function educationCard(item) {
  return `
    <article class="mini-card" data-reveal>
      <p class="eyebrow">${escapeHTML(item.period)}</p>
      <h3>${escapeHTML(item.degree)}</h3>
      <p class="mini-card__meta">${escapeHTML(item.institution)}</p>
      <p>${escapeHTML(item.summary)}</p>
      ${item.sample ? demoBadge('Sample education') : ''}
    </article>`;
}

export function learningCard(item, index = 0) {
  return `
    <article class="mini-card" data-reveal data-delay="${index % 3}">
      <span class="icon-tile icon-tile--sm" aria-hidden="true"><i class="ri-book-open-line"></i></span>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.text)}</p>
    </article>`;
}

export function principleCard(item, index = 0) {
  return `
    <article class="principle-card" data-reveal data-delay="${index % 3}">
      <span class="principle-card__number">${String(index + 1).padStart(2, '0')}</span>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.text)}</p>
    </article>`;
}

export function socialLinks(socials = []) {
  return socials.map((social) => {
    const placeholderText = social.placeholder ? ' (demo link)' : '';
    const title = social.placeholder ? 'Demo link — update in site-config.json' : social.label;
    return `
      <li>
        <a class="social-link${social.placeholder ? ' social-link--placeholder' : ''}" href="${escapeAttr(social.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(social.label + placeholderText)}" title="${escapeAttr(title)}">
          <i class="${escapeAttr(social.icon)}" aria-hidden="true"></i>
        </a>
      </li>`;
  }).join('');
}

export function skeletonCards(type = 'project', count = 3) {
  const labels = {
    project: 'Loading project card',
    post: 'Loading article card',
    service: 'Loading service card',
    testimonial: 'Loading testimonial'
  };
  return Array.from({ length: count }, () => `
    <div class="skeleton-card skeleton-card--${type}" role="status" aria-label="${labels[type] || 'Loading content'}">
      <div class="skeleton skeleton--media"></div>
      <div class="skeleton-card__body">
        <div class="skeleton skeleton--line skeleton--short"></div>
        <div class="skeleton skeleton--line"></div>
        <div class="skeleton skeleton--line skeleton--medium"></div>
      </div>
    </div>`).join('');
}

export function errorState(title, message, options = {}) {
  const action = options.href && options.label
    ? `<a class="btn btn--primary" href="${escapeAttr(options.href)}">${escapeHTML(options.label)}</a>`
    : '';
  return `
    <div class="empty-state empty-state--error" role="status">
      <span class="icon-tile" aria-hidden="true"><i class="ri-error-warning-line"></i></span>
      <h2>${escapeHTML(title)}</h2>
      <p>${escapeHTML(message)}</p>
      ${action}
    </div>`;
}

export function emptyState(title, message, options = {}) {
  const action = options.href && options.label
    ? `<a class="btn btn--ghost" href="${escapeAttr(options.href)}">${escapeHTML(options.label)}</a>`
    : '';
  return `
    <div class="empty-state" role="status">
      <span class="icon-tile" aria-hidden="true"><i class="ri-search-line"></i></span>
      <h2>${escapeHTML(title)}</h2>
      <p>${escapeHTML(message)}</p>
      ${action}
    </div>`;
}

export function categoryFilters(categories, activeCategory = 'All') {
  const all = ['All', ...categories];
  return all.map((category) => `
    <button class="filter-button${category === activeCategory ? ' is-active' : ''}" type="button" data-filter="${escapeAttr(category)}" aria-pressed="${category === activeCategory}">
      ${escapeHTML(category)}
    </button>`).join('');
}

export function articleBody(post) {
  return post.content.map((section, index) => `
    <section class="article-section" aria-labelledby="section-${index + 1}">
      <h2 id="section-${index + 1}">${escapeHTML(section.heading)}</h2>
      ${section.paragraphs.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join('')}
      ${Array.isArray(section.list) ? `<ul>${section.list.map((item) => `<li>${escapeHTML(item)}</li>`).join('')}</ul>` : ''}
    </section>`).join('');
}

export function tableOfContents(post) {
  return post.content.map((section, index) => `
    <li><a href="#section-${index + 1}">${escapeHTML(section.heading)}</a></li>`).join('');
}

export function relatedProjects(projects, currentSlug, limit = 2) {
  return projects
    .filter((project) => project.slug !== currentSlug)
    .slice(0, limit)
    .map((project, index) => projectCard(project, index))
    .join('');
}

export function relatedPosts(posts, currentSlug, limit = 3) {
  return posts
    .filter((post) => post.slug !== currentSlug)
    .slice(0, limit)
    .map((post, index) => blogCard(post, index))
    .join('');
}

export function categorySlug(category) {
  return slugify(category);
}
