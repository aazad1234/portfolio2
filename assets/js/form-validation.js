import { loadSiteConfig } from './data.js';
import { copyText, escapeAttr, escapeHTML, prefersReducedMotion, qs, qsa } from './utils.js';
import { buildEmailDraft, validateContact } from './validation.js';

const FIELD_LABELS = {
  name: 'name',
  email: 'email',
  subject: 'subject',
  message: 'message',
  consent: 'consent'
};

function readForm(form) {
  return {
    name: form.elements.namedItem('name')?.value || '',
    email: form.elements.namedItem('email')?.value || '',
    subject: form.elements.namedItem('subject')?.value || '',
    message: form.elements.namedItem('message')?.value || '',
    consent: Boolean(form.elements.namedItem('consent')?.checked),
    website: form.elements.namedItem('website')?.value || ''
  };
}

function fieldWrapper(form, fieldName) {
  return qs(`[data-field="${fieldName}"]`, form);
}

function errorElement(form, fieldName) {
  return qs(`[data-error-for="${fieldName}"]`, form);
}

function showFieldError(form, fieldName, message) {
  const wrapper = fieldWrapper(form, fieldName);
  const error = errorElement(form, fieldName);
  const input = form.elements.namedItem(fieldName);

  if (wrapper) {
    wrapper.classList.toggle('field--invalid', Boolean(message));
    wrapper.classList.toggle('field--valid', !message && wrapper.dataset.touched === 'true');
  }

  if (error) {
    error.textContent = message || '';
    error.hidden = !message;
  }

  if (input) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) {
      input.setAttribute('aria-describedby', error?.id || '');
    } else {
      input.removeAttribute('aria-describedby');
    }
  }
}

function renderFieldErrors(form, errors, fields = Object.keys(FIELD_LABELS)) {
  fields.forEach((field) => showFieldError(form, field, errors[field] || ''));
}

function firstInvalidField(form, errors) {
  return Object.keys(errors).find((field) => FIELD_LABELS[field]);
}

function setStatus(status, type, markup) {
  if (!status) return;
  status.hidden = false;
  status.className = `form-status form-status--${type}`;
  status.innerHTML = markup;
}

function clearStatus(status) {
  if (!status) return;
  status.hidden = true;
  status.className = 'form-status';
  status.innerHTML = '';
}

function renderEmailDraft(form, status, draft, recipient) {
  setStatus(status, 'info', `
    <strong>Your message is ready to send.</strong>
    <p>No email service is connected to this demo, so nothing has been sent automatically. Open your email app with the message filled in, or copy the text below.</p>
    <div class="form-status__actions">
      <a class="btn btn--primary btn--sm" href="${escapeAttr(draft.mailto)}">Open email draft <i class="ri-mail-send-line" aria-hidden="true"></i></a>
      <button class="btn btn--ghost btn--sm" type="button" data-copy-message>Copy message</button>
    </div>
    <p class="form-status__meta">Intended recipient: <a href="mailto:${escapeAttr(recipient)}">${escapeHTML(recipient)}</a>. Nothing leaves this page until you send it yourself.</p>
  `);

  const copyButton = qs('[data-copy-message]', status);
  copyButton?.addEventListener('click', async () => {
    const copied = await copyText(draft.copyText);
    copyButton.textContent = copied ? 'Copied' : 'Copy failed';
    window.setTimeout(() => {
      copyButton.textContent = 'Copy message';
    }, 2400);
  });

}

export function initContactForm() {
  const form = qs('#contact-form');
  if (!form) return;

  const status = qs('#form-status');
  const submit = qs('[data-submit-button]', form);
  const submitLabel = qs('[data-submit-label]', form);
  const messageInput = form.elements.namedItem('message');
  const count = qs('[data-message-count]');
  let config = null;
  let endpoint = '';

  const configPromise = loadSiteConfig()
    .then((value) => {
      config = value;
      endpoint = String(value?.contactForm?.endpoint || '').trim();
      if (submitLabel) {
        submitLabel.textContent = endpoint ? 'Send message' : 'Prepare message';
      }
    })
    .catch((error) => {
      console.warn('Contact form configuration could not be loaded.', error);
    });

  const fields = ['name', 'email', 'subject', 'message', 'consent'];

  const updateCounter = () => {
    if (!count || !messageInput) return;
    count.textContent = `${messageInput.value.length} / 2000`;
  };

  const validateField = (fieldName) => {
    const result = validateContact(readForm(form));
    showFieldError(form, fieldName, result.errors[fieldName] || '');
    return !result.errors[fieldName];
  };

  fields.forEach((fieldName) => {
    const input = form.elements.namedItem(fieldName);
    const wrapper = fieldWrapper(form, fieldName);
    if (!input) return;

    input.addEventListener('focus', () => {
      if (wrapper) wrapper.dataset.touched = 'true';
    });

    input.addEventListener('blur', () => {
      if (wrapper) wrapper.dataset.touched = 'true';
      validateField(fieldName);
    });

    input.addEventListener('input', () => {
      if (wrapper?.dataset.touched === 'true') validateField(fieldName);
      if (fieldName === 'message') updateCounter();
      clearStatus(status);
    });

    if (fieldName === 'consent') {
      input.addEventListener('change', () => {
        if (wrapper) wrapper.dataset.touched = 'true';
        validateField(fieldName);
        clearStatus(status);
      });
    }
  });

  updateCounter();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await configPromise;
    const result = validateContact(readForm(form));
    fields.forEach((fieldName) => {
      const wrapper = fieldWrapper(form, fieldName);
      if (wrapper) wrapper.dataset.touched = 'true';
    });
    renderFieldErrors(form, result.errors);
    updateCounter();

    if (!result.valid) {
      const invalidName = firstInvalidField(form, result.errors);
      if (invalidName) form.elements.namedItem(invalidName)?.focus();
      setStatus(status, 'error', '<strong>Please check the highlighted fields.</strong><p>Nothing has been sent.</p>');
      return;
    }

    if (!endpoint) {
      const recipient = config?.contact?.email || 'john@example.com';
      const draft = buildEmailDraft(result.data, recipient);
      renderEmailDraft(form, status, draft, recipient);
      status?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
      return;
    }

    if (submit) submit.disabled = true;
    setStatus(status, 'pending', '<strong>Preparing your message...</strong><p>Please wait a moment.</p>');

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          ...result.data,
          source: window.location.href
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`The form endpoint responded with ${response.status}.`);
      }

      form.reset();
      updateCounter();
      qsa('.field--valid, .field--invalid', form).forEach((wrapper) => {
        wrapper.classList.remove('field--valid', 'field--invalid');
        wrapper.dataset.touched = 'false';
      });
      renderFieldErrors(form, {});
      setStatus(status, 'success', '<strong>Message sent.</strong><p>Thanks for getting in touch. I will reply using the email address you provided.</p>');
    } catch (error) {
      console.error(error);
      const recipient = config?.contact?.email || 'john@example.com';
      const draft = buildEmailDraft(result.data, recipient);
      setStatus(status, 'error', `
        <strong>The form endpoint could not be reached.</strong>
        <p>Your message was not sent. You can still open an email draft or copy your message.</p>
        <div class="form-status__actions">
          <a class="btn btn--primary btn--sm" href="${escapeAttr(draft.mailto)}">Open email draft</a>
          <button class="btn btn--ghost btn--sm" type="button" data-copy-message>Copy message</button>
        </div>
      `);
      const copyButton = qs('[data-copy-message]', status);
      copyButton?.addEventListener('click', async () => {
        const copied = await copyText(draft.copyText);
        copyButton.textContent = copied ? 'Copied' : 'Copy failed';
      });
    } finally {
      window.clearTimeout(timeout);
      if (submit) submit.disabled = false;
    }
  });
}

