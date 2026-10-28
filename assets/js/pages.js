import {
  loadBlog,
  loadExperience,
  loadProjects,
  loadServices,
  loadSiteConfig,
  loadSkills,
  loadTestimonials
} from './data.js';
import { escapeHTML, qs, qsa } from './utils.js';
import {
  blogCard,
  chipList,
  educationCard,
  errorState,
  experienceItem,
  learningCard,
  principleCard,
  projectCard,
  serviceCard,
  skeletonCards,
  skillGroup,
  testimonialCard
} from './renderers.js';
import { initProjectDetails, initProjectsPage } from './projects.js';
import { initBlogDetails, initBlogPage } from './blog.js';

function setBusy(container, busy) {
  if (container) container.setAttribute('aria-busy', String(busy));
}

function renderError(container, title, message, href, label) {
  if (!container) return;
  container.innerHTML = `<div class="grid-full">${errorState(title, message, { href, label })}</div>`;
  setBusy(container, false);
}

function renderToolbelt(container, toolbelt = []) {
  if (!container) return;
  container.innerHTML = chipList(toolbelt, 'Tools and technologies');
}

function capabilityCard(group, index) {
  return `
    <article class="capability-card" data-reveal data-delay="${index % 4}">
      <span class="icon-tile" aria-hidden="true"><i class="${escapeHTML(group.icon)}"></i></span>
      <h3>${escapeHTML(group.title)}</h3>
      <p>${escapeHTML(group.description)}</p>
      <span class="capability-card__meta">${group.items.length} tracked skills</span>
    </article>`;
}

async function initHomePage() {
  const projectGrid = qs('#home-projects');
  const serviceGrid = qs('#home-services');
  const testimonialGrid = qs('#home-testimonials');
  const postGrid = qs('#home-posts');
  const capabilityGrid = qs('#home-capabilities');
  const toolbelt = qs('#home-toolbelt');

  [projectGrid, serviceGrid, testimonialGrid, postGrid].forEach((container) => {
    if (!container) return;
    container.setAttribute('aria-busy', 'true');
    const type = container === serviceGrid ? 'service' : container === postGrid ? 'post' : container === testimonialGrid ? 'testimonial' : 'project';
    container.innerHTML = skeletonCards(type, 3);
  });
  if (capabilityGrid) capabilityGrid.setAttribute('aria-busy', 'true');

  const [projectsResult, servicesResult, skillsResult, testimonialsResult, blogResult] = await Promise.allSettled([
    loadProjects(),
    loadServices(),
    loadSkills(),
    loadTestimonials(),
    loadBlog()
  ]);

  if (projectsResult.status === 'fulfilled' && projectGrid) {
    const featured = projectsResult.value.filter((project) => project.featured).slice(0, 3);
    const selected = featured.length ? featured : projectsResult.value.slice(0, 3);
    projectGrid.innerHTML = selected.map((project, index) => projectCard(project, index)).join('');
    setBusy(projectGrid, false);
  } else if (projectGrid) {
    renderError(projectGrid, 'Featured projects could not load', 'The project data request failed. You can still browse the full portfolio page.', 'projects.html', 'Open the portfolio');
  }

  if (servicesResult.status === 'fulfilled' && serviceGrid) {
    serviceGrid.innerHTML = servicesResult.value.filter((service) => service.featured).slice(0, 3)
      .map((service, index) => serviceCard(service, index, { compact: true }))
      .join('');
    setBusy(serviceGrid, false);
  } else if (serviceGrid) {
    renderError(serviceGrid, 'Services could not load', 'The service data request failed. Visit the services page for details.', 'services.html', 'View services');
  }

  if (skillsResult.status === 'fulfilled') {
    if (capabilityGrid) {
      capabilityGrid.innerHTML = skillsResult.value.groups.slice(0, 4).map((group, index) => capabilityCard(group, index)).join('');
      setBusy(capabilityGrid, false);
    }
    renderToolbelt(toolbelt, skillsResult.value.toolbelt);
  } else if (capabilityGrid) {
    renderError(capabilityGrid, 'Skills could not load', 'The skills data request failed. Visit the skills page for a full overview.', 'skills.html', 'View skills');
  }

  if (testimonialsResult.status === 'fulfilled' && testimonialGrid) {
    testimonialGrid.innerHTML = testimonialsResult.value.items.slice(0, 3).map((item, index) => testimonialCard(item, index)).join('');
    setBusy(testimonialGrid, false);
  } else if (testimonialGrid) {
    renderError(testimonialGrid, 'Testimonials could not load', 'The testimonial data request failed. Visit the testimonials page to try again.', 'testimonials.html', 'Read testimonials');
  }

  if (blogResult.status === 'fulfilled' && postGrid) {
    const latest = [...blogResult.value].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    postGrid.innerHTML = latest.map((post, index) => blogCard(post, index)).join('');
    setBusy(postGrid, false);
  } else if (postGrid) {
    renderError(postGrid, 'Latest articles could not load', 'The blog data request failed. Visit the blog for the full archive.', 'blog.html', 'Read the blog');
  }
}

async function initAboutPage() {
  const testimonialContainer = qs('#about-testimonial');
  const toolbelt = qs('#about-toolbelt');

  if (testimonialContainer) {
    testimonialContainer.setAttribute('aria-busy', 'true');
    testimonialContainer.innerHTML = skeletonCards('testimonial', 1);
  }

  const [testimonialsResult, skillsResult] = await Promise.allSettled([
    loadTestimonials(),
    loadSkills()
  ]);

  if (testimonialsResult.status === 'fulfilled' && testimonialContainer) {
    const item = testimonialsResult.value.items[0];
    testimonialContainer.innerHTML = item ? testimonialCard(item, 0) : '';
    setBusy(testimonialContainer, false);
  } else if (testimonialContainer) {
    renderError(testimonialContainer, 'Testimonial could not load', 'The sample testimonial data request failed.', 'testimonials.html', 'View testimonials');
  }

  if (skillsResult.status === 'fulfilled') {
    renderToolbelt(toolbelt, skillsResult.value.toolbelt);
  }
}

async function initSkillsPage() {
  const grid = qs('#skills-grid');
  const toolbelt = qs('#skills-toolbelt');
  const principles = qs('#skills-principles');
  if (!grid) return;

  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = skeletonCards('service', 3);

  try {
    const skills = await loadSkills();
    grid.innerHTML = skills.groups.map((group, index) => skillGroup(group, index)).join('');
    setBusy(grid, false);
    renderToolbelt(toolbelt, skills.toolbelt);
    if (principles) {
      principles.innerHTML = skills.principles.map((principle, index) => principleCard(principle, index)).join('');
    }
  } catch (error) {
    console.error(error);
    renderError(grid, 'Skills could not load', 'The skills data request failed. Please refresh the page to try again.', 'skills.html', 'Try again');
  }
}

async function initExperiencePage() {
  const timeline = qs('#experience-timeline');
  const education = qs('#education-grid');
  const learning = qs('#learning-grid');
  if (!timeline) return;

  timeline.setAttribute('aria-busy', 'true');
  timeline.innerHTML = skeletonCards('service', 3);

  try {
    const experience = await loadExperience();
    timeline.innerHTML = experience.experience.map((item, index) => experienceItem(item, index)).join('');
    setBusy(timeline, false);
    if (education) {
      education.innerHTML = experience.education.map(educationCard).join('');
    }
    if (learning) {
      learning.innerHTML = experience.learning.map((item, index) => learningCard(item, index)).join('');
    }
  } catch (error) {
    console.error(error);
    renderError(timeline, 'Experience could not load', 'The experience data request failed. Please refresh the page to try again.', 'experience.html', 'Try again');
  }
}

async function initServicesPage() {
  const grid = qs('#services-grid');
  if (!grid) return;

  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = skeletonCards('service', 6);

  try {
    const services = await loadServices();
    grid.innerHTML = services.map((service, index) => serviceCard(service, index)).join('');
    setBusy(grid, false);
  } catch (error) {
    console.error(error);
    renderError(grid, 'Services could not load', 'The service data request failed. Please refresh the page to try again.', 'services.html', 'Try again');
  }
}

async function initTestimonialsPage() {
  const grid = qs('#testimonials-grid');
  if (!grid) return;

  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = skeletonCards('testimonial', 3);

  try {
    const testimonials = await loadTestimonials();
    grid.innerHTML = testimonials.items.map((item, index) => testimonialCard(item, index)).join('');
    setBusy(grid, false);
  } catch (error) {
    console.error(error);
    renderError(grid, 'Testimonials could not load', 'The testimonial data request failed. Please refresh the page to try again.', 'testimonials.html', 'Try again');
  }
}

async function initContactPage() {
  try {
    const config = await loadSiteConfig();
    const email = config?.contact?.email;
    const phone = config?.contact?.phone;

    qsa('[data-contact-email]').forEach((element) => {
      if (!email) return;
      element.textContent = email;
      const link = element.closest('a');
      if (link) link.href = `mailto:${email}`;
    });

    qsa('[data-contact-phone]').forEach((element) => {
      if (!phone) return;
      element.textContent = phone;
      const link = element.closest('a');
      if (link) link.href = `tel:${phone.replace(/[^\d+]/g, '')}`;
    });

    qsa('[data-contact-location]').forEach((element) => {
      if (config?.contact?.location) element.textContent = config.contact.location;
    });

    qsa('[data-contact-availability]').forEach((element) => {
      if (config?.contact?.availability) element.textContent = config.contact.availability;
    });

    qsa('[data-resume-link]').forEach((link) => {
      if (config?.resume) link.href = config.resume;
    });
  } catch (error) {
    console.warn('Contact details could not be enhanced.', error);
  }
}

export async function initPage(page = document.body.getAttribute('data-page')) {
  switch (page) {
    case 'index.html':
      await initHomePage();
      break;
    case 'about.html':
      await initAboutPage();
      break;
    case 'skills.html':
      await initSkillsPage();
      break;
    case 'experience.html':
      await initExperiencePage();
      break;
    case 'services.html':
      await initServicesPage();
      break;
    case 'testimonials.html':
      await initTestimonialsPage();
      break;
    case 'projects.html':
      await initProjectsPage();
      break;
    case 'project-details.html':
      await initProjectDetails();
      break;
    case 'blog.html':
      await initBlogPage();
      break;
    case 'blog-details.html':
      await initBlogDetails();
      break;
    case 'contact.html':
      await initContactPage();
      break;
    default:
      break;
  }
}
