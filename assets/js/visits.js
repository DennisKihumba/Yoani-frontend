// Visit-day calculations, always in Kenya time (EAT, UTC+3, no daylight saving).
import { VISITS } from './config.js';

const EAT_MS = 3 * 3600e3;
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const parseKey = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };

/** UTC timestamp for a Kenya-time slot */
export function slotTime(key, time) {
  const [y, m, d] = key.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - EAT_MS;
}

export function isInterviewDay(key) { return VISITS.interviewDays.includes(key); }

export function openDays(now = Date.now()) {
  const start = new Date(now + EAT_MS);
  start.setUTCHours(0, 0, 0, 0);
  const out = [];
  for (let i = 0; i <= VISITS.daysAhead; i++) {
    const d = new Date(start.getTime() + i * 864e5);
    const key = keyOf(d);
    const dow = d.getUTCDay();
    if (dow === 0 || VISITS.closedDates.includes(key)) continue;
    const interview = isInterviewDay(key);
    const times = interview ? [VISITS.interviewStart] : dow === 6 ? VISITS.tourTimes.saturday : VISITS.tourTimes.weekday;
    const valid = times.filter((t) => slotTime(key, t) - now >= VISITS.minNoticeHours * 3600e3);
    if (valid.length) out.push({ key, dow, day: d.getUTCDate(), month: d.getUTCMonth(), interview, times: valid });
  }
  return out;
}

export function upcomingInterviewDays(now = Date.now()) {
  const today = keyOf(new Date(now + EAT_MS));
  return VISITS.interviewDays.filter((k) => k >= today).sort();
}

/** "Interview days: Mon 7, Tue 8 and Wed 9 Dec, from 9:00 am" */
const ord = (n) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

/** "Mass Interviews: 7th, 8th and 9th December 2026, from 9:00 AM" */
export function interviewSummary(now = Date.now()) {
  const days = upcomingInterviewDays(now).map(parseKey);
  if (!days.length) return '';
  const same = days.every((d) => d.getUTCMonth() === days[0].getUTCMonth());
  const label = (d) => same ? ord(d.getUTCDate()) : `${ord(d.getUTCDate())} ${MON_LONG[d.getUTCMonth()]}`;
  const list = days.length > 1 ? `${days.slice(0, -1).map(label).join(', ')} and ${label(days.at(-1))}` : label(days[0]);
  const tail = same ? ` ${MON_LONG[days[0].getUTCMonth()]} ${days[0].getUTCFullYear()}` : '';
  return `Mass Interviews: ${list}${tail}, from ${fmtTime(VISITS.interviewStart)}`;
}

export function fmtTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad(m)} ${ap}`;
}
export const fmtDay = (key) => { const d = parseKey(key); return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
export const fmtDayLong = (key) => { const d = parseKey(key); return `${DOW_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MON_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const dowShort = (i) => DOW[i];
export const monShort = (i) => MON[i];
export const monLong = (i) => MON_LONG[i];
