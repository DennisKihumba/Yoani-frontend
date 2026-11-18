# Yoani Springs Academy website

Static site: plain HTML, CSS and JavaScript. No build step or database is needed on the server.

## What changed (and what didn't)

- Colours, logo, font (Inter) and all page wording are the school's originals, in the same places.
- New: a modern layout, a Konza-style admission booking form at `/admission/`, faster photos and video, and real school photos where the old site had random placeholder pictures.
- "Enroll Now", "Enroll Today" and "Schedule a Visit" now open the admission booking form.

## Uploading (cPanel / File Manager)

1. Upload **everything in this folder** into `public_html`, replacing the old files.
   Turn on **Settings → Show Hidden Files** so `.htaccess` is uploaded too.
2. Visit https://www.yoanisprings.co.ke/about/. Then try the old https://www.yoanisprings.co.ke/about.html, which should jump to `/about/`.
3. Once you've checked the site, you can delete the old `css/`, `js/` and `images/` folders and `yoani website video.mp4`. Keep `pdfs/`.

## Addresses without ".html"

Each page is a folder with its own `index.html` (`about/index.html` and so on), so addresses are `/about/`, `/programs/`, `/admission/` and so on.
This works on **any** server with no setup, including **VS Code Live Server**: right-click the root `index.html` → "Open with Live Server".
The small `about.html`, `programs.html`... files at the top level only forward old links to the new addresses. `.htaccess` does the same with a permanent (301) redirect, so Google keeps your ranking.

## Day-to-day changes: `assets/js/config.js`

| What | Setting |
|---|---|
| Mass interview days | `VISITS.interviewDays` (past dates hide themselves) |
| Tour times | `VISITS.tourTimes` |
| Holidays / days closed | `VISITS.closedDates` |
| How far ahead parents can book | `VISITS.daysAhead` |
| Email sending (EmailJS keys) | `EMAILJS` |
| Phone numbers / map pin used by the form | `SCHOOL` |

## Forms (EmailJS)

Both the visit booking and the contact form use the school's existing EmailJS account (`service_2kmcyun`, template `template_wpto0ro`).
Each email includes the parent's details, child, class, visit date and time, and a reference like `YSA-K3F9Q`.

Recommended one-time tweak: in the EmailJS dashboard, open the template and make sure the body shows `{{message}}` with line breaks kept.
For example, wrap it in `<div style="white-space:pre-line">{{message}}</div>`. Available fields: `from_name`, `from_email`, `reply_to`, `phone`, `subject`, `message`.

If sending fails (no internet, EmailJS limit reached), parents get a one-tap **WhatsApp** button with all their details filled in, so the enquiry isn't lost.

## Blog posts

Posts live in `assets/data/posts.json`. To add one, copy an existing entry and change it:

```json
{
  "slug": "sports-day-2026",
  "title": "Sports day 2026",
  "date": "2026-11-28",
  "category": "Events",
  "image": "assets/img/posts/sports-day.jpg",
  "imageAlt": "Learners racing on sports day",
  "excerpt": "One or two sentences shown on the card.",
  "body": "Full story. Blank line = new paragraph.\n\n## A heading\n\n- a list item\n- another\n\n**bold** and [a link](admission)"
}
```

Newest posts show first. The homepage's "News from school" section shows the latest 3 automatically, and hides itself if there are none.
To let the owner post without touching files, point `BLOG.source` in `config.js` at an online feed that returns the same fields (for example from the school portal or a headless CMS).

## Images

The optimised photos are in `assets/img` (WebP + JPEG, several sizes). The hero video is a 15-second, 220 KB loop made from the school video.
On phones and data-saver connections only the photo loads, to save parents' data.
