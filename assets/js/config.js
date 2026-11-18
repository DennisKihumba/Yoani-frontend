// =====================================================================
//  Yoani Springs Academy: website settings
//  This is the one file to edit for day-to-day changes (tour times,
//  holidays, interview days, email settings). No other code needs to change.
// =====================================================================

export const SCHOOL = {
  name: 'Yoani Springs Academy',
  phone: '+254725906416',
  phoneDisplay: '+254 725 906 416',
  phone2: '+254721201313',
  phone2Display: '+254 721 201 313',
  whatsapp: '254725906416',
  email: 'yoanispringsacademy@gmail.com',
  address: 'Yoani Springs Academy, Behind Tangu Springs Hotel, 300m from Salama town, Makueni County',
  mapsUrl: 'https://maps.app.goo.gl/XvFHAG3cvKKUpk1U9',
};

// EmailJS sends form messages to the school's Gmail (same account the old site used).
export const EMAILJS = {
  publicKey: '0WMawkwrpGjIPCski',
  serviceId: 'service_2kmcyun',
  contactTemplateId: 'template_wpto0ro',
  // Visit bookings reuse the same template. Create a separate template later if you want a different email layout.
  admissionsTemplateId: 'template_wpto0ro',
};

// School visits and interview days (all times are Kenya time, EAT).
export const VISITS = {
  daysAhead: 28,                 // how far ahead parents can book
  minNoticeHours: 14,            // earliest bookable slot from now
  tourMinutes: 45,               // length used for calendar invites
  interviewMinutes: 180,
  tourTimes: {
    weekday: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00'],
    saturday: ['09:00', '10:00', '11:00', '12:00'],
  },
  // Days the school is closed for visits (public holidays, closing days). Format: YYYY-MM-DD
  closedDates: ['2026-12-12', '2026-12-24', '2026-12-25', '2026-12-26', '2026-12-31', '2027-01-01'],
  // Mass interview days. Past dates disappear automatically.
  interviewDays: ['2026-12-07', '2026-12-08', '2026-12-09'],
  interviewStart: '09:00',
  confirmMessage: 'Our admissions team will call or WhatsApp you to confirm your tour.',
};

// Where blog posts come from. Later this can point to an online editor's feed (see README).
export const BLOG = {
  source: '/assets/data/posts.json',
};

export const BASE = '/';      // '/' on the live site
export const PREVIEW = false;  // true only in the design preview: forms do not send
export const PAGES = {
    "index": "/",
    "about": "/about/",
    "programs": "/programs/",
    "admission": "/admission/",
    "parent-zone": "/parent-zone/",
    "blog": "/blog/",
    "contact": "/contact/"
  };      // page links (clean URLs on the live site)
