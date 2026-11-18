// News and stories: reads posts from BLOG.source and renders cards and the reader.
import { BLOG, BASE, PAGES } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtDate = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return y ? `${d} ${MON[m - 1]} ${y}` : ''; };
const src = (p) => (!p ? '' : /^(https?:|data:|\/)/.test(p) ? p : BASE + p);

/** Small, safe Markdown: paragraphs, ## headings, - lists, **bold**, *italic*, [links](url) */
function markdown(md) {
  const inline = (t) => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
      const h = PAGES[href] || href;
      const safe = /^(https?:|mailto:|tel:|\/|#|[\w-]+(\.html)?([?#].*)?$)/.test(h) ? h : '#';
      const ext = /^https?:/.test(safe) ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${esc(safe)}"${ext}>${text}</a>`;
    });
  return String(md || '').trim().split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`;
    const h = block.match(/^(#{2,4})\s+(.+)/);
    if (h) return `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('');
}

async function loadPosts() {
  const res = await fetch(BLOG.source, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.posts || [];
  return list.filter((p) => p && p.title && p.published !== false)
    .map((p, i) => ({ ...p, slug: p.slug || `post-${i + 1}` }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function photo(p) {
  if (!p.image) return `<div class="post-photo post-photo--empty"><img src="${BASE}assets/img/logo.jpeg" alt=""></div>`;
  const img = src(p.imageSmall || p.image);
  return `<div class="post-photo" style="--bg:url('${esc(img)}')"><img src="${esc(img)}" alt="${esc(p.imageAlt || '')}" loading="lazy" decoding="async"></div>`;
}

function card(p, mode) {
  const meta = [fmtDate(p.date), p.category].filter(Boolean).join(', ');
  const action = mode === 'page'
    ? `<a class="read-more-btn" href="${PAGES.blog}#${esc(p.slug)}"><span>Read more</span></a>`
    : `<button type="button" class="read-more-btn" data-open="${esc(p.slug)}"><span>Read more</span></button>`;
  return `<li class="post-card">${photo(p)}<div class="post-body">
      <p class="post-date">${esc(meta)}</p>
      <h3>${esc(p.title)}</h3>
      <p class="post-excerpt">${esc(p.excerpt || '')}</p>
      ${action}
    </div></li>`;
}

function markPortraits(root) {
  root.querySelectorAll('.post-photo img').forEach((img) => {
    const check = () => { if (img.naturalHeight > img.naturalWidth * 1.05) img.parentElement.classList.add('is-portrait'); };
    img.complete ? check() : img.addEventListener('load', check, { once: true });
  });
}

function setupReader(posts) {
  const dlg = $('#post-dialog');
  if (!dlg) return;
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  let lastFocus = null;
  const open = (slug, push = true) => {
    const p = bySlug.get(slug);
    if (!p) return;
    lastFocus = document.activeElement;
    $('[data-dialog-photo]', dlg).innerHTML = p.image ? `<img src="${esc(src(p.image))}" alt="${esc(p.imageAlt || '')}">` : '';
    $('[data-dialog-photo]', dlg).hidden = !p.image;
    $('[data-dialog-photo]', dlg).classList.toggle('is-portrait', false);
    const img = $('[data-dialog-photo] img', dlg);
    if (img) img.addEventListener('load', () => { if (img.naturalHeight > img.naturalWidth * 1.05) img.parentElement.classList.add('is-portrait'); }, { once: true });
    $('[data-dialog-meta]', dlg).textContent = [fmtDate(p.date), p.category].filter(Boolean).join(', ');
    $('[data-dialog-title]', dlg).textContent = p.title;
    $('[data-dialog-content]', dlg).innerHTML = markdown(p.body || p.excerpt || '');
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.scrollTop = 0;
    if (push && location.hash !== `#${slug}`) history.pushState({ post: slug }, '', `#${slug}`);
    document.title = `${p.title} | Yoani Springs Academy`;
  };
  const baseTitle = document.title;
  const close = (fromHistory = false) => {
    if (!dlg.open) return;
    dlg.close();
    document.title = baseTitle;
    if (!fromHistory && location.hash) history.pushState({}, '', location.pathname + location.search);
    lastFocus?.focus?.();
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (b) open(b.dataset.open);
  });
  $('[data-close-dialog]', dlg).addEventListener('click', () => close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  addEventListener('popstate', () => { const s = location.hash.slice(1); s && bySlug.has(s) ? open(s, false) : close(true); });
  const initial = location.hash.slice(1);
  if (initial && bySlug.has(initial)) open(initial, false);
}

(async function init() {
  const lists = document.querySelectorAll('[data-posts]');
  let posts = [];
  let failed = false;
  try { posts = await loadPosts(); } catch (err) { failed = true; console.warn('Could not load posts', err); }
  lists.forEach((ul) => {
    const limit = Number(ul.dataset.limit) || posts.length;
    const mode = ul.dataset.linkMode || 'dialog';
    const items = posts.slice(0, limit);
    ul.removeAttribute('aria-busy');
    ul.innerHTML = items.map((p) => card(p, mode)).join('');
    ul.classList.toggle('post-grid--single', items.length === 1);
    markPortraits(ul);
    const section = ul.closest('[data-news-section]');
    if (section) section.hidden = items.length === 0;
    if (!items.length) ul.closest('section').hidden = true;
  });
  if (posts.length) setupReader(posts);
})();
