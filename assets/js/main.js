// Shared behaviour for every page.
import { interviewSummary } from './visits.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Header shadow on scroll */
const header = $('.site-header');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
}

/* Mobile menu */
const menu = $('#mobile-menu');
const toggle = $('.menu-toggle');
if (menu && toggle) {
  const close = (refocus = true) => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 350);
    if (refocus) toggle.focus();
  };
  const open = () => {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    setTimeout(() => $('.menu-close', menu)?.focus(), 50);
  };
  toggle.addEventListener('click', open);
  $('.menu-close', menu)?.addEventListener('click', () => close());
  $$('a', menu).forEach((a) => a.addEventListener('click', () => close(false)));
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key !== 'Tab') return;
    const f = $$('a, button', menu);
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  });
}

/* Footer year */
$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* Hero video: larger screens only, never on data saver or slow connections */
const video = $('.hero-media video');
if (video) {
  const c = navigator.connection || {};
  const slow = c.saveData || /(^|-)2g$/.test(c.effectiveType || '');
  if (!reduceMotion && !slow && matchMedia('(min-width: 860px)').matches) {
    video.src = video.dataset.src;
    video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
    video.play().catch(() => {});
  }
}

/* Interview-date line on the admission page (hides itself once the dates pass) */
const interviewText = interviewSummary();
$$('[data-next-interview]').forEach((el) => {
  if (!interviewText) return;
  el.querySelector('span').textContent = interviewText;
  el.hidden = false;
});

/* Google map loads only when scrolled near, to save data */
const maps = $$('[data-map]').filter((m) => m.dataset.map);
if (maps.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const f = document.createElement('iframe');
    f.src = en.target.dataset.map; f.title = 'Map showing Yoani Springs Academy'; f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    en.target.appendChild(f);
    io.unobserve(en.target);
  }), { rootMargin: '300px' });
  maps.forEach((m) => io.observe(m));
}

/* Page-specific modules */
if ($('[data-posts]')) import('./blog.js');
if ($('#contactForm')) import('./contact.js');
