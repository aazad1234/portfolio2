import { loadNavigation, loadSEO, loadSiteConfig } from './data.js';
import {
  currentFileName,
  escapeHTML,
  escapeAttr,
  prefersReducedMotion,
  qs,
  qsa,
  setText,
  slugify
} from './utils.js';
import { socialLinks } from './renderers.js';

const MOBILE_BREAKPOINT = '(min-width: 1024px)';

function pageFile() {
  return document.body.getAttribute('data-page') || currentFileName();
}

function activeTarget() {
  return document.body.getAttribute('data-nav') || pageFile();
}

function isExternalUrl(url = '') {
  return /^(https?:|mailto:|tel:)/i.test(url);
}

function desktopNavMarkup(items, currentFile, activeFile) {
  return items.map((item) => {
    const children = Array.isArray(item.children) ? item.children : [];
    const childActive = children.some((child) => child.href === currentFile || child.href === activeFile);
    const isActive = item.href === activeFile || item.href === currentFile || childActive;
    const isCurrent = item.href === currentFile;
    const classes = ['nav-item'];

    if (children.length) classes.push('nav-item--has-children');
    if (isActive) classes.push('is-active');

    const link = `
      <a class="nav-link" href="${escapeAttr(item.href)}"${isCurrent ? ' aria-current="page"' : ''}>
        ${escapeHTML(item.label)}
      </a>`;

    if (!children.length) {
      return `<li class="${classes.join(' ')}">${link}</li>`;
    }

    const id = `submenu-${slugify(item.label)}`;
    const childMarkup = children.map((child) => {
      const childCurrent = child.href === currentFile && child.href !== item.href;
      return `
        <li>
          <a href="${escapeAttr(child.href)}"${childCurrent ? ' aria-current="page"' : ''}>
            <span>${escapeHTML(child.label)}</span>
            ${child.description ? `<small>${escapeHTML(child.description)}</small>` : ''}
          </a>
        </li>`;
    }).join('');

    return `
      <li class="${classes.join(' ')}" data-dropdown>
        ${link}
        <button class="nav-caret" type="button" data-dropdown-toggle aria-expanded="false" aria-controls="${id}" aria-haspopup="true" aria-label="Toggle ${escapeAttr(item.label)} submenu">
          <i class="ri-arrow-down-s-line" aria-hidden="true"></i>
        </button>
        <ul class="dropdown" id="${id}">
          ${childMarkup}
        </ul>
      </li>`;
  }).join('');
}

function mobileNavMarkup(items, currentFile, activeFile) {
  return items.map((item) => {
    const children = Array.isArray(item.children) ? item.children : [];
    const isCurrent = item.href === currentFile;
    const isActive = item.href === activeFile || item.href === currentFile || children.some((child) => child.href === currentFile);
    const classes = ['mobile-nav__item'];
    if (children.length) classes.push('mobile-nav__item--has-children');
    if (isActive) classes.push('is-active');

    if (!children.length) {
      return `<li class="${classes.join(' ')}"><a class="mobile-nav__link" href="${escapeAttr(item.href)}"${isCurrent ? ' aria-current="page"' : ''}>${escapeHTML(item.label)}</a></li>`;
    }

    const id = `mobile-submenu-${slugify(item.label)}`;
    return `
      <li class="${classes.join(' ')}">
        <div class="mobile-nav__row">
          <a class="mobile-nav__link" href="${escapeAttr(item.href)}"${isCurrent ? ' aria-current="page"' : ''}>${escapeHTML(item.label)}</a>
          <button class="mobile-nav__sub-toggle" type="button" data-mobile-submenu aria-expanded="false" aria-controls="${id}" aria-label="Toggle ${escapeAttr(item.label)} submenu">
            <i class="ri-add-line" aria-hidden="true"></i>
          </button>
        </div>
        <ul class="mobile-nav__sub" id="${id}" hidden>
          ${children.map((child) => `
            <li>
              <a href="${escapeAttr(child.href)}"${child.href === currentFile && child.href !== item.href ? ' aria-current="page"' : ''}>
                <span>${escapeHTML(child.label)}</span>
                ${child.description ? `<small>${escapeHTML(child.description)}</small>` : ''}
              </a>
            </li>`).join('')}
        </ul>
      </li>`;
  }).join('');
}

function initDropdowns() {
  const dropdownItems = qsa('[data-dropdown]');
  if (!dropdownItems.length) return;

  const hoverQuery = window.matchMedia('(hover: hover)');
  const desktopQuery = window.matchMedia(MOBILE_BREAKPOINT);
  let closeTimer = null;

  const close = (item) => {
    item.classList.remove('is-open');
    const toggle = qs('[data-dropdown-toggle]', item);
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  };

  const open = (item) => {
    window.clearTimeout(closeTimer);
    dropdownItems.forEach((other) => {
      if (other !== item) close(other);
    });
    item.classList.add('is-open');
    const toggle = qs('[data-dropdown-toggle]', item);
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  };

  const closeAll = () => dropdownItems.forEach(close);

  dropdownItems.forEach((item) => {
    const toggle = qs('[data-dropdown-toggle]', item);

    toggle?.addEventListener('click', () => {
      if (item.classList.contains('is-open')) {
        close(item);
      } else {
        open(item);
      }
    });

    item.addEventListener('mouseenter', () => {
      if (hoverQuery.matches && desktopQuery.matches) open(item);
    });

    item.addEventListener('mouseleave', () => {
      if (!hoverQuery.matches || !desktopQuery.matches) return;
      closeTimer = window.setTimeout(() => {
        if (!item.contains(document.activeElement)) close(item);
      }, 160);
    });

    item.addEventListener('focusout', (event) => {
      if (!item.contains(event.relatedTarget)) close(item);
    });

    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!item.classList.contains('is-open')) return;
      close(item);
      toggle?.focus();
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-dropdown]')) closeAll();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll();
  });
}

function initMobileNavigation() {
  const header = qs('[data-site-header]');
  const toggle = qs('[data-nav-toggle]');
  const mobileNav = qs('#mobile-nav');
  if (!header || !toggle || !mobileNav) return;

  const panel = qs('.mobile-nav__panel', mobileNav);
  const closeButtons = qsa('[data-nav-close]', mobileNav);
  const desktopQuery = window.matchMedia(MOBILE_BREAKPOINT);
  let lastFocused = null;
  let hideTimer = null;

  const focusableElements = () => qsa(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    panel
  ).filter((element) => !element.hidden && !element.closest('[hidden]'));

  const open = () => {
    window.clearTimeout(hideTimer);
    lastFocused = document.activeElement;
    mobileNav.hidden = false;
    document.body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
    window.requestAnimationFrame(() => mobileNav.classList.add('is-open'));
    const closeButton = qs('.mobile-nav__close', mobileNav);
    closeButton?.focus();
  };

  const close = (returnFocus = true) => {
    if (mobileNav.hidden) return;
    mobileNav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');

    const finish = () => {
      mobileNav.hidden = true;
      if (returnFocus) {
        (lastFocused instanceof HTMLElement ? lastFocused : toggle).focus();
      }
    };

    if (prefersReducedMotion()) {
      finish();
    } else {
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(finish, 220);
    }
  };

  toggle.addEventListener('click', () => {
    if (mobileNav.hidden) {
      open();
    } else {
      close();
    }
  });

  closeButtons.forEach((button) => button.addEventListener('click', () => close()));

  mobileNav.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (link) close(false);
  });

  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = focusableElements();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  qsa('[data-mobile-submenu]', mobileNav).forEach((button) => {
    button.addEventListener('click', () => {
      const submenu = document.getElementById(button.getAttribute('aria-controls'));
      if (!submenu) return;
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isOpen));
      submenu.hidden = isOpen;
      const icon = qs('i', button);
      if (icon) icon.className = isOpen ? 'ri-add-line' : 'ri-subtract-line';
    });
  });

  const handleBreakpoint = (event) => {
    if (event.matches) close(false);
  };

  if (typeof desktopQuery.addEventListener === 'function') {
    desktopQuery.addEventListener('change', handleBreakpoint);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !mobileNav.hidden) close();
  });
}

function initHeaderState() {
  const header = qs('[data-site-header]');
  if (!header) return;

  let ticking = false;
  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
    ticking = false;
  };

  update();
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });
}

function renderFooterGroups(groups = []) {
  const container = qs('[data-footer-groups]');
  if (!container || !groups.length) return;

  container.innerHTML = groups.map((group) => `
    <div class="footer-group">
      <h2 class="footer-title">${escapeHTML(group.title)}</h2>
      <ul>
        ${group.links.map((link) => `<li><a href="${escapeAttr(link.href)}">${escapeHTML(link.label)}</a></li>`).join('')}
      </ul>
    </div>`).join('');
}

function populateSiteDetails(config) {
  if (!config) return;

  const { brand, contact } = config;
  setText('[data-site-name]', brand?.name || 'John Anderson');
  setText('[data-footer-tagline]', brand?.tagline || '');
  setText('[data-footer-location]', contact?.location || '');
  setText('[data-demo-notice]', config.demoNotice || '');
  setText('[data-current-year]', String(new Date().getFullYear()));

  const emailLinks = qsa('[data-footer-email]');
  emailLinks.forEach((link) => {
    if (!contact?.email) return;
    link.href = `mailto:${contact.email}`;
    link.textContent = contact.email;
  });

  const phoneLinks = qsa('[data-footer-phone]');
  phoneLinks.forEach((link) => {
    if (!contact?.phone) return;
    link.href = `tel:${contact.phone.replace(/[^\d+]/g, '')}`;
    link.textContent = contact.phone;
  });

  const socialMarkup = socialLinks(config.socials || []);
  qsa('[data-footer-socials]').forEach((list) => {
    list.innerHTML = socialMarkup;
  });

  qsa('[data-mobile-socials]').forEach((container) => {
    container.innerHTML = `<ul class="social-list social-list--mobile">${socialMarkup}</ul>`;
  });

  qsa('[data-socials]').forEach((container) => {
    container.innerHTML = container.tagName === 'UL' ? socialMarkup : `<ul class="social-list">${socialMarkup}</ul>`;
  });

  qsa('[data-resume-link]').forEach((link) => {
    if (config.resume) link.href = config.resume;
  });

  const contactFormNote = qs('[data-contact-form-note]');
  if (contactFormNote && contact?.responseNote) {
    contactFormNote.textContent = contact.responseNote;
  }
}

export function renderBreadcrumbs(items = []) {
  const list = qs('[data-breadcrumbs]');
  if (!list) return;

  const crumbs = items.length ? items : [{ label: 'Home', href: 'index.html' }];
  list.innerHTML = crumbs.map((item, index) => {
    const isLast = index === crumbs.length - 1;
    if (isLast) {
      return `<li class="breadcrumbs__item breadcrumbs__item--current"><span aria-current="page">${escapeHTML(item.label)}</span></li>`;
    }
    if (!item.href) {
      return `<li class="breadcrumbs__item"><span>${escapeHTML(item.label)}</span></li>`;
    }
    return `<li class="breadcrumbs__item"><a href="${escapeAttr(item.href)}">${escapeHTML(item.label)}</a></li>`;
  }).join('');
}

export async function initBreadcrumbs(page = pageFile()) {
  try {
    const seo = await loadSEO();
    const metadata = seo[page];
    if (!metadata) return;
    const crumbs = [
      { label: 'Home', href: 'index.html' },
      ...(metadata.breadcrumb || [])
    ];
    renderBreadcrumbs(crumbs);
  } catch (error) {
    console.warn('Breadcrumbs could not be enhanced.', error);
  }
}

export async function initNavigation() {
  const currentFile = pageFile();
  const activeFile = activeTarget();

  const [navigationResult, configResult] = await Promise.allSettled([
    loadNavigation(),
    loadSiteConfig()
  ]);

  if (navigationResult.status === 'fulfilled') {
    const navigation = navigationResult.value;
    const desktopList = qs('#primary-nav-list');
    const mobileList = qs('#mobile-nav-list');

    if (desktopList) {
      desktopList.innerHTML = desktopNavMarkup(navigation.primary || [], currentFile, activeFile);
    }
    if (mobileList) {
      mobileList.innerHTML = mobileNavMarkup(navigation.primary || [], currentFile, activeFile);
    }
    renderFooterGroups(navigation.footerGroups || []);
  } else {
    console.warn('Navigation data could not be loaded.', navigationResult.reason);
  }

  if (configResult.status === 'fulfilled') {
    populateSiteDetails(configResult.value);
  } else {
    console.warn('Site configuration could not be loaded.', configResult.reason);
  }

  initDropdowns();
  initMobileNavigation();
  initHeaderState();
}

export function initScrollTop() {
  const button = qs('[data-scroll-top]');
  if (!button) return;

  let ticking = false;
  const update = () => {
    button.hidden = window.scrollY < 480;
    ticking = false;
  };

  update();
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });

  button.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    });
  });

  qsa('[data-back-to-top]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
      });
    });
  });
}

export { isExternalUrl };

