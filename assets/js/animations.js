import { prefersReducedMotion, qsa, readingProgress } from './utils.js';

const observedReveals = new WeakSet();
const observedMeters = new WeakSet();
const observedCounters = new WeakSet();
let revealObserver = null;
let meterObserver = null;
let counterObserver = null;
let progressBound = false;
let progressFrame = null;

function createObservers(reduceMotion) {
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  revealObserver = revealObserver || new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  meterObserver = meterObserver || new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const level = Number(entry.target.getAttribute('data-level') || 0);
      entry.target.style.setProperty('--level', `${Math.min(100, Math.max(0, level))}%`);
      entry.target.classList.add('is-filled');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.3 });

  counterObserver = counterObserver || new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.6 });
}

function animateCounter(element) {
  const target = Number(element.getAttribute('data-target') || 0);
  const suffix = element.getAttribute('data-suffix') || '';
  const prefix = element.getAttribute('data-prefix') || '';
  const duration = Number(element.getAttribute('data-duration') || 900);
  const start = performance.now();

  if (!Number.isFinite(target)) {
    element.textContent = `${prefix}0${suffix}`;
    return;
  }

  const tick = (now) => {
    const elapsed = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    const value = Math.round(target * eased);
    element.textContent = `${prefix}${value}${suffix}`;
    if (elapsed < 1) window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
}

function observeReveals(reduceMotion) {
  qsa('[data-reveal]').forEach((element) => {
    if (observedReveals.has(element)) return;
    observedReveals.add(element);

    if (reduceMotion || !revealObserver) {
      element.classList.add('is-visible');
    } else {
      revealObserver.observe(element);
    }
  });
}

function observeMeters(reduceMotion) {
  qsa('[data-level]').forEach((element) => {
    if (observedMeters.has(element)) return;
    observedMeters.add(element);
    const level = Number(element.getAttribute('data-level') || 0);

    if (reduceMotion || !meterObserver) {
      element.style.setProperty('--level', `${Math.min(100, Math.max(0, level))}%`);
      element.classList.add('is-filled');
    } else {
      meterObserver.observe(element);
    }
  });
}

function observeCounters(reduceMotion) {
  qsa('[data-counter]').forEach((element) => {
    if (observedCounters.has(element)) return;
    observedCounters.add(element);

    if (reduceMotion || !counterObserver) {
      const target = Number(element.getAttribute('data-target') || 0);
      const suffix = element.getAttribute('data-suffix') || '';
      const prefix = element.getAttribute('data-prefix') || '';
      element.textContent = `${prefix}${target}${suffix}`;
    } else {
      counterObserver.observe(element);
    }
  });
}

function bindReadingProgress() {
  const progress = document.querySelector('[data-reading-progress]');
  if (!progress || progressBound) return;
  progressBound = true;
  const bar = progress.querySelector('[data-reading-progress-bar]');

  const update = () => {
    const value = readingProgress();
    progress.style.setProperty('--progress', String(value));
    if (bar) bar.style.transform = `scaleX(${value / 100})`;
    progressFrame = null;
  };

  update();
  window.addEventListener('scroll', () => {
    if (progressFrame) return;
    progressFrame = window.requestAnimationFrame(update);
  }, { passive: true });
  window.addEventListener('resize', update);
}

export function initAnimations() {
  const reduceMotion = prefersReducedMotion();
  createObservers(reduceMotion);
  observeReveals(reduceMotion);
  observeMeters(reduceMotion);
  observeCounters(reduceMotion);
  bindReadingProgress();
}
