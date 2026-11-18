// Admissions: 4-step school-visit booking.
// Saves progress on the device, supports the phone's back button, and sends the request by email,
// with WhatsApp as a fallback so no enquiry is lost.
import { EMAILJS, SCHOOL, VISITS, PREVIEW } from './config.js';
import { openDays, slotTime, fmtTime, fmtDay, fmtDayLong, dowShort, monShort, isInterviewDay } from './visits.js';
import { sendEmail, whatsappLink, normalisePhone, validEmail } from './send.js';

const form = document.getElementById('booking');
if (form) {
  const $ = (s, r = form) => r.querySelector(s);
  const $$ = (s, r = form) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'ysa-booking-v1';
  const MAX_CHILDREN = 4;
  const TITLES = ['Parent/Guardian Details', 'Tell Us About Your Child', 'Book Your Private Tour', 'One Last Question'];
  const START_LABELS = { asap: 'As soon as possible', 'jan-2027': 'January 2027', 'later-2027': 'Later in 2027', exploring: 'I am still exploring options' };
  const svg = (p) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I = {
    check: svg('<path d="M20 6 9 17l-5-5"/>'),
    alert: svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
    pin: svg('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
    cal: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    dl: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>'),
    nav: svg('<path d="m3 11 19-9-9 19-2-8-8-2z"/>'),
    phone: svg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'),
    wa: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88zm8.41-18.3A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41z"/></svg>',
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const blank = () => ({
    step: 1, maxStep: 1,
    parentName: '', phone: '', email: '',
    children: [{ name: '', level: '' }],
    start: '', mode: 'visit', date: '', time: '', callback: '',
    source: '', sourceOther: '', notes: '',
  });
  let state = blank();
  let days = openDays();
  let submitting = false;

  /* ---------- storage ---------- */
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const clear = () => { try { localStorage.removeItem(KEY); } catch {} };

  /* ---------- children ---------- */
  const tpl = document.getElementById('child-template');
  function renderChildren() {
    const wrap = $('[data-children]');
    wrap.innerHTML = '';
    state.children.forEach((c, i) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.index = i;
      const multi = state.children.length > 1;
      $('[data-child-head]', node).hidden = !multi;
      $('[data-child-num]', node).textContent = i + 1;
      const input = $('[data-name="childName"]', node);
      input.id = `childName-${i}`; input.name = `childName-${i}`; input.value = c.name;
      $('[data-for="childName"]', node).setAttribute('for', input.id);
      $$('[data-name="level"]', node).forEach((r) => { r.name = `level-${i}`; r.checked = r.value === c.level; });
      wrap.appendChild(node);
    });
    $('[data-add-child]').hidden = state.children.length >= MAX_CHILDREN;
  }

  /* ---------- fill inputs from state ---------- */
  function fill() {
    $('#parentName').value = state.parentName;
    $('#phone').value = state.phone;
    $('#email').value = state.email;
    $$('[name="start"]').forEach((r) => { r.checked = r.value === state.start; });
    $$('[name="callback"]').forEach((r) => { r.checked = r.value === state.callback; });
    $$('[name="source"]').forEach((r) => { r.checked = r.value === state.source; });
    $('#sourceOther').value = state.sourceOther;
    $('[data-other-source]').hidden = state.source !== 'Other';
    $('#notes').value = state.notes;
    renderChildren();
  }

  /* ---------- step 3: days and slots ---------- */
  function renderDays() {
    days = openDays();
    const strip = $('[data-days]');
    if (!days.length) {
      strip.outerHTML = `<p class="no-days">There are no visit days open right now. Ask us to call you instead and we'll find a time.</p>`;
      return;
    }
    if (state.date && !days.some((d) => d.key === state.date)) { state.date = ''; state.time = ''; }
    strip.innerHTML = days.map((d) => `
      <button type="button" class="day-btn${d.interview ? ' is-interview' : ''}" data-day="${d.key}" aria-pressed="${d.key === state.date}"
        aria-label="${d.interview ? 'Interview day, ' : ''}${fmtDayLong(d.key)}">
        <span class="dow">${dowShort(d.dow)}</span><span class="num">${d.day}</span><span class="mon">${monShort(d.month)}</span>${d.interview ? '<span class="badge">Interview</span>' : ''}
      </button>`).join('');
    renderSlots();
    const sel = $(`[data-day="${state.date}"]`, strip);
    if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function renderSlots() {
    const day = days.find((d) => d.key === state.date);
    const field = $('[data-time-field]');
    field.hidden = !day;
    if (!day) return;
    if (state.time && !day.times.includes(state.time)) state.time = '';
    if (day.interview) state.time = day.times[0];
    $('[data-interview-info]').hidden = !day.interview;
    $('#time-label').firstChild.textContent = day.interview ? 'Start time' : 'Choose a time';
    $('[data-slots]').hidden = day.interview;
    $('[data-slots]').innerHTML = day.times.map((t) =>
      `<button type="button" class="slot-btn" data-time="${t}" aria-pressed="${t === state.time}">${fmtTime(t)}</button>`).join('');
  }
  function setMode(mode) {
    state.mode = mode;
    $$('[data-mode-panel]').forEach((p) => { p.hidden = p.dataset.modePanel !== mode; });
    const ph = normalisePhone(state.phone);
    $('[data-callback-hint]').textContent = `We'll call you${ph ? ` on ${ph}` : ''} to arrange a visit.`;
    updateChrome();
    save();
  }

  /* ---------- summary ---------- */
  function visitLine() {
    if (state.mode === 'callback') return `Call back: ${state.callback}`;
    if (!state.date) return '';
    return isInterviewDay(state.date)
      ? `Mass interview day, ${fmtDay(state.date)}, from ${fmtTime(state.time || VISITS.interviewStart)}`
      : `Private tour, ${fmtDay(state.date)} at ${fmtTime(state.time)}`;
  }
  function renderSummary() {
    const rows = [
      ['Tour', visitLine(), 3],
      ['Parent/Guardian', [state.parentName.trim(), normalisePhone(state.phone), state.email.trim()].filter(Boolean), 1],
      [state.children.length > 1 ? 'Children' : 'Child', [...state.children.map((c) => `${c.name.trim() || 'Your child'}, ${c.level}`), `Joining: ${START_LABELS[state.start] || ''}`], 2],
    ];
    $('[data-summary]').innerHTML = rows.map(([k, v, s]) => `
      <div class="summary-row"><dt>${k}</dt><dd>${[].concat(v).map(esc).join('<br>')}</dd><button type="button" class="edit" data-edit="${s}" aria-label="Change ${k.toLowerCase()}">Change</button></div>`).join('');
  }

  /* ---------- validation ---------- */
  function setError(fieldEl, on) {
    if (!fieldEl) return;
    fieldEl.classList.toggle('has-error', on);
    $$('input, textarea', fieldEl).forEach((el) => (on ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid')));
  }
  function validate(step) {
    const errs = [];
    const check = (el, bad) => { setError(el, bad); if (bad) errs.push(el); };
    if (step === 1) {
      check($('[data-field="parentName"]'), state.parentName.trim().length < 2);
      check($('[data-field="phone"]'), !normalisePhone(state.phone));
      check($('[data-field="email"]'), state.email.trim() !== '' && !validEmail(state.email));
    }
    if (step === 2) {
      $$('[data-child]').forEach((node, i) => check($('[data-field="level"]', node), !state.children[i]?.level));
      check($('[data-field="start"]'), !state.start);
    }
    if (step === 3) {
      if (state.mode === 'visit') {
        check($('[data-field="day"]'), !state.date);
        check($('[data-field="time"]'), !!state.date && !state.time);
      } else {
        check($('[data-field="callback"]'), !state.callback);
      }
    }
    if (errs.length) {
      const target = $('input:not([type="radio"]), textarea', errs[0]) || $('input, button', errs[0]) || errs[0];
      errs[0].scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      setTimeout(() => target.focus({ preventScroll: true }), reduceMotion ? 0 : 250);
    }
    return errs.length === 0;
  }

  /* ---------- progress + chrome ---------- */
  function stepFill(step) {
    if (step < state.step) return 1;
    if (step > state.step) return 0;
    const r = (n) => Math.max(0.08, n);
    if (step === 1) return r(((state.parentName.trim().length >= 2) + !!normalisePhone(state.phone)) / 2);
    if (step === 2) return r((state.children.every((c) => c.level) + !!state.start) / 2);
    if (step === 3) return r(state.mode === 'callback' ? (state.callback ? 1 : 0) : (state.date ? 0.5 : 0) + (state.time ? 0.5 : 0));
    return state.source ? 1 : 0.6;
  }
  function updateChrome() {
    $$('.progress li i').forEach((el, i) => el.style.setProperty('--fill', `${Math.round(stepFill(i + 1) * 100)}%`));
    const last = state.step === 4;
    $('[data-next-label]').textContent = last ? (state.mode === 'callback' ? 'Request a Call Back' : 'Book My Tour') : 'Continue';
  }

  function showStep(n, { focus = true, dir = 1 } = {}) {
    state.step = n;
    $$('[data-step]').forEach((s) => {
      const on = Number(s.dataset.step) === n;
      s.hidden = !on;
      s.classList.remove('is-entering', 'is-entering-back');
      if (on && focus && !reduceMotion) { void s.offsetWidth; s.classList.add(dir > 0 ? 'is-entering' : 'is-entering-back'); }
    });
    $('[data-step-label]').textContent = `Step ${n} of 4`;
    $('[data-step-title]').textContent = TITLES[n - 1];
    $('[data-back]').hidden = n === 1;
    $('[data-req-note]').hidden = n !== 1;
    if (n === 3) { renderDays(); setMode(state.mode); }
    if (n === 4) renderSummary();
    $('[data-submit-status]').className = 'form-status';
    $('[data-submit-status]').innerHTML = '';
    updateChrome();
    save();
    if (focus) {
      const top = form.getBoundingClientRect().top;
      if (top < 0 || top > innerHeight * 0.6) form.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      $('[data-step-title]').focus({ preventScroll: true });
    }
  }

  function goTo(n, { push = true } = {}) {
    const dir = n >= state.step ? 1 : -1;
    if (push) history.pushState({ ysaStep: n, from: state.step }, '', `#step-${n}`);
    else history.replaceState({ ysaStep: n }, '', `#step-${n}`);
    showStep(n, { dir });
  }

  /* ---------- events ---------- */
  form.addEventListener('input', (e) => {
    const t = e.target;
    const child = t.closest('[data-child]');
    if (child && t.dataset.name === 'childName') state.children[Number(child.dataset.index)].name = t.value;
    else if (['parentName', 'phone', 'email', 'sourceOther', 'notes'].includes(t.name)) state[t.name] = t.value;
    const f = t.closest('.field');
    if (f?.classList.contains('has-error') && t.type !== 'radio') setError(f, false);
    updateChrome();
    save();
  });
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.type !== 'radio') return;
    const child = t.closest('[data-child]');
    if (child) state.children[Number(child.dataset.index)].level = t.value;
    else if (t.name === 'start' || t.name === 'callback') state[t.name] = t.value;
    else if (t.name === 'source') {
      state.source = t.value;
      $('[data-other-source]').hidden = t.value !== 'Other';
      if (t.value === 'Other') setTimeout(() => $('#sourceOther').focus(), 0);
    }
    setError(t.closest('.field'), false);
    updateChrome();
    save();
  });
  form.addEventListener('blur', (e) => {
    const t = e.target;
    if (t.id === 'phone' && t.value.trim()) { const n = normalisePhone(t.value); if (n) { t.value = n; state.phone = n; save(); } else setError(t.closest('.field'), true); }
    if (t.id === 'email' && t.value.trim()) setError(t.closest('.field'), !validEmail(t.value));
  }, true);

  form.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.day) {
      state.date = t.dataset.day;
      $$('[data-day]').forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      setError($('[data-field="day"]'), false);
      renderSlots();
      setError($('[data-field="time"]'), false);
      updateChrome(); save();
      if (!isInterviewDay(state.date)) setTimeout(() => $('[data-time-field]').scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }), 50);
    } else if (t.dataset.time) {
      state.time = t.dataset.time;
      $$('[data-time]').forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      setError($('[data-field="time"]'), false);
      updateChrome(); save();
    } else if (t.dataset.switchMode) {
      setMode(t.dataset.switchMode);
      const panel = $(`[data-mode-panel="${t.dataset.switchMode}"]`);
      ($('input', panel) || $('button', panel))?.focus();
    } else if ('addChild' in t.dataset) {
      state.children.push({ name: '', level: '' });
      renderChildren(); updateChrome(); save();
      $(`#childName-${state.children.length - 1}`).focus();
    } else if ('removeChild' in t.dataset) {
      const i = Number(t.closest('[data-child]').dataset.index);
      state.children.splice(i, 1);
      renderChildren(); updateChrome(); save();
      $('[data-add-child]').focus();
    } else if ('back' in t.dataset) {
      if (history.state?.from === state.step - 1) history.back();
      else goTo(state.step - 1, { push: false });
    } else if (t.dataset.edit) {
      goTo(Number(t.dataset.edit));
    } else if ('reset' in t.dataset) {
      clear(); state = blank(); fill(); $('[data-saved-note]').hidden = true; showStep(1, { focus: false }); $('#parentName').focus();
    }
  });

  addEventListener('popstate', () => {
    if (!$('[data-success]').hidden) return;
    const m = location.hash.match(/^#step-([1-4])$/);
    const n = m ? Math.min(Number(m[1]), state.maxStep) : 1;
    if (n !== state.step) showStep(n, { dir: n > state.step ? 1 : -1 });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitting) return;
    if (state.step < 4) {
      if (!validate(state.step)) return;
      state.maxStep = Math.max(state.maxStep, state.step + 1);
      goTo(state.step + 1);
      return;
    }
    submit();
  });

  /* ---------- submit ---------- */
  function composeMessage(ref) {
    const now = new Date();
    const lines = [`New ${state.mode === 'callback' ? 'call-back' : 'visit'} request from the website (${ref})`, ''];
    if (state.mode === 'callback') lines.push(`CALL-BACK: ${state.callback}`);
    else if (isInterviewDay(state.date)) lines.push(`ADMISSION INTERVIEW DAY: ${fmtDayLong(state.date)}, from ${fmtTime(state.time)}`);
    else lines.push(`SCHOOL TOUR: ${fmtDayLong(state.date)} at ${fmtTime(state.time)}`);
    lines.push('', 'PARENT OR GUARDIAN', `Name: ${state.parentName.trim()}`, `Phone/WhatsApp: ${normalisePhone(state.phone)}`, `Email: ${state.email.trim() || 'not given'}`);
    lines.push('', state.children.length > 1 ? 'CHILDREN' : 'CHILD');
    state.children.forEach((c, i) => lines.push(`${i + 1}. ${c.name.trim() || '(name not given)'}, ${c.level}`));
    lines.push(`Wants to join: ${START_LABELS[state.start]}`);
    const src = state.source === 'Other' ? `Other: ${state.sourceOther.trim() || 'not specified'}` : state.source;
    lines.push('', `Heard about us: ${src || 'not given'}`);
    if (state.notes.trim()) lines.push(`Notes: ${state.notes.trim()}`);
    lines.push('', `Sent ${now.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })}`);
    return lines.join('\n');
  }

  async function submit() {
    if ($('#website').value) return; // spam trap
    submitting = true;
    const btn = $('[data-next]');
    const status = $('[data-submit-status]');
    const ref = `YSA-${Date.now().toString(36).slice(-3).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    const message = composeMessage(ref);
    const subject = state.mode === 'callback'
      ? `Call-back request: ${state.parentName.trim()}`
      : `${isInterviewDay(state.date) ? 'Mass interview day' : 'School tour'}: ${state.parentName.trim()}, ${fmtDay(state.date)} ${fmtTime(state.time)}`;
    btn.setAttribute('aria-disabled', 'true');
    status.className = 'form-status form-status--busy';
    status.textContent = 'Sending your request...';
    try {
      await sendEmail(EMAILJS.admissionsTemplateId, {
        from_name: state.parentName.trim(),
        from_email: state.email.trim(),
        reply_to: state.email.trim() || SCHOOL.email,
        phone: normalisePhone(state.phone),
        subject, message,
      });
      showSuccess(ref, message);
    } catch (err) {
      console.warn(err);
      const wa = whatsappLink(`Hello Yoani Springs Academy, I'd like to book a school visit.\n\n${message}`);
      status.className = 'form-status form-status--error';
      status.innerHTML = `${I.alert}<span><strong>Your request wasn't sent.</strong> Check your internet connection and press "${esc($('[data-next-label]').textContent)}" again, or <a href="${wa}" target="_blank" rel="noopener">send it to us on WhatsApp</a>. Your details are saved.</span>`;
      status.focus?.();
    } finally {
      submitting = false;
      btn.removeAttribute('aria-disabled');
    }
  }

  const gcalStamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  function showSuccess(ref, message) {
    const first = state.parentName.trim().split(/\s+/)[0];
    const phone = normalisePhone(state.phone);
    const callback = state.mode === 'callback';
    const interview = !callback && isInterviewDay(state.date);
    const type = callback ? 'Call back requested' : interview ? 'Mass interview day' : 'Private school tour';
    const when = callback ? `${state.callback}` : `${fmtDay(state.date)}<br>${interview ? 'from ' : ''}${fmtTime(state.time)}`;
    const docs = ["Copy of the child's Birth Certificate", 'Previous school report cards (if applicable)', 'Passport-sized photos (2 copies)', 'Copy of parents/guardian ID cards', 'Completed Admission Form (available in Parent Zone)', 'Immunization/Vaccination record'];
    let actions = '';
    let ics = '';
    if (!callback) {
      const start = slotTime(state.date, state.time);
      const end = start + (interview ? VISITS.interviewMinutes : VISITS.tourMinutes) * 60e3;
      const title = `${interview ? 'Admission interview' : 'School visit'}: Yoani Springs Academy`;
      const details = `Reference ${ref}. Questions? Call or WhatsApp ${SCHOOL.phoneDisplay}.`;
      const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${gcalStamp(start)}/${gcalStamp(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(SCHOOL.address)}`;
      ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Yoani Springs Academy//Visit//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
        `UID:${ref}@yoanisprings.co.ke`, `DTSTAMP:${gcalStamp(Date.now())}`, `DTSTART:${gcalStamp(start)}`, `DTEND:${gcalStamp(end)}`,
        `SUMMARY:${title}`, `LOCATION:${SCHOOL.address.replace(/,/g, '\\,')}`, `DESCRIPTION:${details.replace(/,/g, '\\,')}`,
        'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:School visit reminder', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      actions = `
        <a class="btn btn-dark" href="${gcal}" target="_blank" rel="noopener">${I.cal} Add to Google Calendar</a>
        <button type="button" class="btn btn-ghost" data-ics>${I.dl} Save to phone calendar</button>
        <a class="btn btn-ghost" href="${SCHOOL.mapsUrl}" target="_blank" rel="noopener">${I.nav} Get directions</a>
        <a class="btn btn-ghost" href="${whatsappLink(`Hello Yoani Springs Academy, this is ${state.parentName.trim()}. My visit reference is ${ref}.`)}" target="_blank" rel="noopener">${I.wa} WhatsApp us</a>`;
    } else {
      actions = `
        <a class="btn btn-dark" href="tel:${SCHOOL.phone}">${I.phone} Call us now</a>
        <a class="btn btn-ghost" href="${whatsappLink(`Hello Yoani Springs Academy, this is ${state.parentName.trim()}. I asked for a call-back (${ref}).`)}" target="_blank" rel="noopener">${I.wa} WhatsApp us</a>`;
    }
    const box = $('[data-success]');
    box.innerHTML = `
      <div class="success-badge">${svg('<path d="M20 6 9 17l-5-5"/>')}</div>
      <h2 tabindex="-1">Thank you, ${esc(first)}!</h2>
      <p>${callback ? `We'll call you on ${esc(phone)} in the ${esc(state.callback.toLowerCase())}.` : `Your tour request has been received. ${esc(VISITS.confirmMessage)}`}</p>
      <div class="ticket">
        <div class="ticket-top">
          <div><div class="ticket-type">${type}</div><div class="ticket-when">${when}</div></div>
          <div class="ticket-ref">Reference<b>${ref}</b></div>
        </div>
        <div class="ticket-bottom">${I.pin}<span>Salama Town, Makueni County. Behind Tangu Springs Hotel, 300m from Salama town</span></div>
      </div>
      <div class="success-actions">${actions}</div>
      <div class="bring">
        <h3>Documents Required for Admission</h3>
        <ul>${docs.map((d) => `<li>${I.check}<span>${d}</span></li>`).join('')}</ul>
      </div>
      ${PREVIEW ? '<p class="preview-flag">Preview only: this request was not sent to the school.</p>' : ''}
      <button type="button" class="mode-switch" style="margin-top:1.25rem" data-again>Book another tour</button>`;
    $('[data-flow]').hidden = true;
    box.hidden = false;
    clear();
    history.replaceState({ ysaDone: true }, '', '#booked');
    form.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    $('h2', box).focus({ preventScroll: true });
    $('[data-ics]', box)?.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `yoani-springs-visit-${ref}.ics` });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
    $('[data-again]', box).addEventListener('click', () => {
      state = blank(); fill(); box.hidden = true; $('[data-flow]').hidden = false;
      history.replaceState({}, '', location.pathname);
      showStep(1);
    });
  }

  /* ---------- start up ---------- */
  const draft = load();
  if (draft && (draft.parentName || draft.phone)) {
    state = { ...blank(), ...draft, children: draft.children?.length ? draft.children : [{ name: '', level: '' }] };
    $('[data-saved-note]').hidden = false;
  }
  let picked = new URLSearchParams(location.search).get('date');
  try { picked = picked || sessionStorage.getItem('ysa-picked-date'); sessionStorage.removeItem('ysa-picked-date'); } catch {}
  if (picked && days.some((d) => d.key === picked)) {
    state.date = picked; state.time = ''; state.mode = 'visit';
    const note = $('[data-picked-note]');
    $('span', note).textContent = `Tour day picked: ${fmtDay(picked)}. Add your details, then choose a time.`;
    note.hidden = false;
  }
  fill();
  const m = location.hash.match(/^#step-([1-4])$/);
  const startStep = m ? Math.min(Number(m[1]), state.maxStep) : 1;
  history.replaceState({ ysaStep: startStep }, '', location.pathname + (startStep > 1 ? `#step-${startStep}` : ''));
  showStep(startStep, { focus: false });
}
