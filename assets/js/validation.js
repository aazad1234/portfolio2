const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateContact(values = {}) {
  const data = {
    name: stringValue(values.name),
    email: stringValue(values.email),
    subject: stringValue(values.subject),
    message: stringValue(values.message),
    consent: Boolean(values.consent),
    website: stringValue(values.website)
  };

  const errors = {};

  if (data.name.length < 2) {
    errors.name = 'Please enter your name (at least 2 characters).';
  } else if (data.name.length > 80) {
    errors.name = 'Please keep your name under 80 characters.';
  }

  if (!data.email) {
    errors.email = 'Please enter your email address.';
  } else if (data.email.length > 254 || !EMAIL_PATTERN.test(data.email)) {
    errors.email = 'Enter a valid email address, such as name@example.com.';
  }

  if (data.subject.length < 3) {
    errors.subject = 'Add a short subject (at least 3 characters).';
  } else if (data.subject.length > 120) {
    errors.subject = 'Please keep the subject under 120 characters.';
  }

  if (data.message.length < 20) {
    errors.message = 'Please share at least 20 characters so there is enough context to reply.';
  } else if (data.message.length > 2000) {
    errors.message = 'Please keep the message under 2,000 characters.';
  }

  if (!data.consent) {
    errors.consent = 'Please confirm that you understand how the message will be handled.';
  }

  if (data.website) {
    errors.form = 'The form could not be validated. Please try again.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data
  };
}

export function buildEmailDraft(values, recipient = 'john@example.com') {
  const name = stringValue(values.name);
  const email = stringValue(values.email);
  const subject = stringValue(values.subject);
  const message = stringValue(values.message);
  const draftSubject = `[Portfolio] ${subject}`;
  const draftBody = [
    `Hi John,`,
    '',
    message,
    '',
    '—',
    `From: ${name}`,
    `Email: ${email}`
  ].join('\n');

  const mailto = `mailto:${recipient}?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftBody)}`;

  return {
    subject: draftSubject,
    body: draftBody,
    mailto,
    copyText: `${draftSubject}\n\n${draftBody}`
  };
}
