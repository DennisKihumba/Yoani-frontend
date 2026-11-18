// Contact form (original fields): validates, sends through EmailJS, falls back to WhatsApp.
import { EMAILJS, PREVIEW } from './config.js';
import { sendEmail, whatsappLink, validEmail } from './send.js';

const form = document.getElementById('contactForm');
const status = document.getElementById('formStatus');
const svg = (p) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON_OK = svg('<path d="M20 6 9 17l-5-5"/>');
const ICON_ERR = svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>');
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const field = (name) => form.querySelector(`[data-field="${name}"]`);
const setError = (name, on) => {
  const f = field(name);
  f.classList.toggle('has-error', on);
  const input = f.querySelector('input, textarea');
  on ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid');
};

function validate() {
  const d = Object.fromEntries(new FormData(form));
  const errors = {
    from_name: d.from_name.trim().length < 2,
    from_email: !validEmail(d.from_email),
    subject: d.subject.trim().length < 2,
    message: d.message.trim().length < 2,
  };
  Object.entries(errors).forEach(([k, v]) => setError(k, v));
  const first = Object.keys(errors).find((k) => errors[k]);
  if (first) field(first).querySelector('input, textarea').focus();
  return first ? null : d;
}

form.querySelectorAll('input, textarea').forEach((el) => el.addEventListener('input', () => {
  const f = el.closest('.field');
  if (f?.classList.contains('has-error')) { f.classList.remove('has-error'); el.removeAttribute('aria-invalid'); }
}));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = validate();
  if (!d || d.website) return;
  const btn = form.querySelector('[type="submit"]');
  status.className = 'form-status form-status--busy';
  status.textContent = 'Sending...';
  btn.setAttribute('aria-disabled', 'true');
  try {
    await sendEmail(EMAILJS.contactTemplateId, {
      from_name: d.from_name.trim(),
      from_email: d.from_email.trim(),
      reply_to: d.from_email.trim(),
      subject: d.subject.trim(),
      message: d.message.trim(),
    });
    status.className = 'form-status form-status--ok';
    status.innerHTML = `${ICON_OK}<span><strong>Message sent!</strong> Thank you, ${escapeHtml(d.from_name.trim().split(' ')[0])}. We'll get back to you soon.${PREVIEW ? ' <em>(Preview: nothing was sent.)</em>' : ''}</span>`;
    form.reset();
  } catch (err) {
    console.warn(err);
    const wa = whatsappLink(`Hello Yoani Springs Academy, this is ${d.from_name.trim()}.\n\n${d.subject.trim()}\n${d.message.trim()}`);
    status.className = 'form-status form-status--error';
    status.innerHTML = `${ICON_ERR}<span><strong>Your message wasn't sent.</strong> Check your internet connection and try again, or <a href="${wa}" target="_blank" rel="noopener">send it on WhatsApp</a>.</span>`;
  } finally {
    btn.removeAttribute('aria-disabled');
  }
});
