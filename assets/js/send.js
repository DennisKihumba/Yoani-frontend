// Sending form messages through EmailJS, with a WhatsApp fallback.
import { EMAILJS, SCHOOL, PREVIEW } from './config.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function emailjsReady(timeout = 8000) {
  const t0 = Date.now();
  while (!window.emailjs) {
    if (Date.now() - t0 > timeout) throw new Error('EmailJS did not load');
    await wait(150);
  }
  return window.emailjs;
}

/** Sends template params. Resolves on success, throws on failure. */
export async function sendEmail(templateId, params) {
  if (PREVIEW) { await wait(700); return { preview: true }; }
  if (!navigator.onLine) throw new Error('offline');
  const ejs = await emailjsReady();
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000));
  return Promise.race([ejs.send(EMAILJS.serviceId, templateId, params, { publicKey: EMAILJS.publicKey }), timeout]);
}

export const whatsappLink = (text) => `https://wa.me/${SCHOOL.whatsapp}?text=${encodeURIComponent(text)}`;

/** Normalises a phone number. Returns a display version or null if invalid. */
export function normalisePhone(raw) {
  const v = String(raw || '').replace(/[\s\-().]/g, '');
  if (!v) return null;
  let m = v.match(/^(?:\+?254|0)?([17]\d{8})$/);
  if (m) return `0${m[1].slice(0, 3)} ${m[1].slice(3, 6)} ${m[1].slice(6)}`;
  m = v.match(/^\+(\d{8,15})$/);
  if (m) return `+${m[1]}`;
  return null;
}

export const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
