# Basic requirements per source

The minimum each source must meet so the report builds itself. For each source:
- **Must have:** the fields without which the report section can't be computed.
- **Rules:** the conventions that make matching automatic instead of manual.
- **When / who:** the deadline and the owner.
- **Access:** v1 (no dependency: paste, export, template) and v2 (automated sync).
- **Check:** what the platform validates on arrival.

Related specs: `docs/intake-prd.md` (data contracts), `docs/execution-plan.md` (pipelines), `docs/report-v1-no-dependency.md` (Add data box).

---

## Summary

| # | Source | Must have | Key rule | Due | Owner | v1 access | v2 access |
|---|---|---|---|---|---|---|---|
| 1 | Event details | name, dates, venue, city, theme line, edition, vertical | One event key: `etbe-bws-2025` | T-30 | Event lead | Paste OneWorld Event Details | OneWorld API |
| 2 | Theme | 12 Colors & Fonts fields + banner | Approved once → `thm_…` | T-7 | Event lead | Screenshot / form | OneWorld API |
| 3 | Sponsors | name, OneWorld group, logo | Group → tier mapped once per series | T-7 | Sales / event lead | Website URL or paste | OneWorld API |
| 4 | Tier promises | per tier: passes, sessions, branding, posts, videos | From the sponsorship grid | T-30 | Sales | Grid upload | Same table, reused |
| 5 | Speakers + photos | name, designation, company, photo, session | Name spelt as in the agenda | T-7 (final T-1) | Content | Website URL or speaker template | OneWorld API |
| 6 | Agenda | day, start–end, hall, title, speakers | Times in 24h, hall names fixed | T-7 | Content | Website URL or paste | OneWorld API |
| 7 | Attendees | email, designation, company, status | Status from check-in, not invite list | T0 night | Delegate team | OneWorld export or template | OneWorld API (hourly on T0) |
| 8 | Wishlist (if sold) | sponsor, person or account, status met/not met | Linked by email or company | T0 night | Delegate / Custom team | Export or paste | OneWorld API |
| 9 | Video plan | type, leader(s), time, hall, owner, expected-by | Builds the exact file name | T-3 | Event lead | Template / grid | Same |
| 10 | Videos | file named per plan, in the event Drive folder | One video = one plan row | T0 same day | Video team | Transcript paste or caption file | Drive watch + transcription |
| 11 | Event photos | photos in `/Photos` with original capture time | Don't strip EXIF | T0 night | Video team | Upload selection | Drive watch |
| 12 | Social | post URL, date, impressions/views, engagement | Every event post has the hashtag | T-60 → T+14 | Social team | One page-level export per platform | Official APIs |
| 13 | Market insights | statistic, value, source, source URL, year | No source link, no number | Yearly + T-7 | Event lead | Paste into library | Same, AI suggests |
| 14 | Feedback (optional) | rating, would return, comment | Same email as registration | T+3 | Delegate team | Form export | Form integration |

---

## 1. Event details
- **Must have:** event name, edition, start and end date, venue, city, theme line, vertical (BrandEquity), model (IP / Custom), hashtag.
- **Rules:**
  - One **event key** per event (`<vertical>-<series>-<year>`), used on every file and template.
  - The theme line is chosen once. If the website and the sales deck differ, the lead picks one.
- **Check:** the dates are valid, and the event key is unique.

## 2. Theme
- **Must have:** Font Family, heading/subheading/paragraph sizes, body background, body text, Default Theme Color, heading font/colour/weight/case, banner hashtag, edition text, banner image.
- **Rules:**
  - Taken from OneWorld Event Website → Colors & Fonts, not from the website CSS.
  - Approved once, then frozen per report version.
  - A licensed heading font needs a fallback.
- **Check:** colours parse, contrast of white on the accent is flagged under 4.5:1, and the website cross-check covers 5 fields.

## 3. Sponsors
- **Must have:** sponsor name, OneWorld group, logo file or URL.
- **Rules:**
  - One row per sponsor; carousel repeats are removed by normalised name.
  - Each OneWorld group maps to a standard tier (saved per series, reused next year).
  - Logos should have a transparent or white background, ≥ 400 px wide.
- **Check:**
  - no duplicate names
  - every group has a tier
  - every sponsor has a logo
  - the count is shown (BWS 2025: 26 in 13 groups)

## 4. Tier promises (what each tier was sold)
- **Must have:** for each tier: delegate passes, speaking slots, branding items, social posts, videos (TicTac, 5D, Studio), plus access add-ons (Pitch Room 1:1s, roundtable seats).
- **Rules:** entered once from the sponsorship grid. Per-sponsor exceptions are added as extra rows.
- **Why it matters:** without it, "promised vs delivered" can't be computed. This is the biggest gap in `CLAUDE.md` §8.
- **Check:** every sponsor's tier has a promise row.

## 5. Speakers and photos
- **Must have:** name, designation, company, photo, session(s).
- **Should have:** city, industry, LinkedIn URL, key-speaker flag, weightage.
- **Rules:**
  - The name is spelt exactly as in the agenda. It's the key for video matching.
  - Company is always filled (website cards lack it for some speakers; fill it from the agenda).
  - Photo: square, ≥ 400 px, face visible. Priority: video frame > OneWorld > website > upload.
  - Late changes are marked "announced, didn't speak" instead of being deleted.
- **Check:**
  - missing company or photo flagged
  - seniority derived (BWS 2025: 26 of 35 CXO)
  - industry confirmed once per company

## 6. Agenda
- **Must have:** day, start and end time (24h), hall, session title, format (keynote/panel/fireside), speakers.
- **Rules:**
  - Hall names are a fixed list (e.g. Audi1, Audi2).
  - Speaker names match the speaker list.
  - The final version is locked at T-1, with changes on the day logged.
- **Check:** no overlapping sessions in the same hall; every speaker is in at least one session.

## 7. Attendees
- **Must have:** email, designation, company, status (registered / shortlisted / attended / no-show).
- **Should have:** first and last name, city, lead source, conversion source, registration date, check-in time.
- **Rules:**
  - "Attended" comes from **check-in**, not the invite list.
  - Use the platform template or the OneWorld export unchanged (headers are recognised).
  - The event key is on every row.
  - **No mobile numbers.**
- **Check:**
  - missing email rejected
  - duplicates merged
  - wrong event key rejected
  - seniority and industry derived
  - show-up % = attended / registered

## 8. Wishlist (only when access programmes were sold)
- **Must have:** sponsor, wishlisted person (email) or account (company), outcome (met / attended not met / did not attend).
- **Rules:** entered before the event; outcome marked on T0 by the Pitch Room / RT desk.
- **Check:** every wishlisted person resolves to an attendee row or is marked "not registered".

## 9. Video plan (the brief)
- **Must have:** video type, leader(s), session time and hall (for stage videos), sponsor (for partner videos), channel(s), owner, expected-by.
- **Rules:**
  - Complete by **T-3**.
  - The plan generates the file name `HHMM_Hall_Type_First-Last` (bytes: `BYTE_NA_Type_First-Last`).
  - One row per expected video.
- **Check:** leaders exist in the speaker list; no duplicate file names.

## 10. Videos
- **Must have:** the video file in the event Drive `Videos/` folder, named exactly as the plan says, on the same day.
- **Rules:**
  - One video per file (no merged reels of several sessions unless planned as a montage).
  - Clean audio track: board feed preferred over camera mic.
  - Upload finished before 20:00 on T0 for same-day insights.
- **v1 without the pipeline:** paste the transcript or upload a .srt/.vtt/.txt from the editing tool, and pick the leader.
- **Check:**
  - matched to a plan row
  - the transcript exists
  - quotes are exact substrings
  - speakers are named (panels need one click per voice)

## 11. Event photos
- **Must have:** original files in `Photos/` with capture time (EXIF) intact.
- **Rules:**
  - Upload originals, not WhatsApp copies (those lose EXIF and quality).
  - At least the main stage, panels, audience, networking, partner branding and Studio.
- **Check:** duplicates removed, sharpness scored, linked to sessions by time and hall.

## 12. Social
- **Must have for each post:** URL, platform, account, posted date, impressions or views, reach if available, engagement (reactions, comments, shares, clicks).
- **Rules:**
  - **Every event post carries the event hashtag** (`#ETBWS2025`) or the event name. That's how posts are found automatically.
  - Posts come only from the vertical's own accounts (ETBrandEquity on LinkedIn, Instagram, YouTube).
  - Windows: pre-event = post date → event start; event day = the event dates.
  - v1: one **page-level export per platform** covering T-60 → export date, uploaded at T+1 and again at T+14.
- **v2:** a one-time account connection by a page admin (LinkedIn Community Management API approval, Meta app, YouTube OAuth).
- **Check:**
  - every row has a URL and a date
  - numbers are non-negative
  - the "as of" date is shown
  - unmatched posts are listed for tick/untick

## 13. Market insights
- **Must have:** statistic, value, unit, source name, source URL, year, vertical, theme tags.
- **Rules:**
  - A number without a working source link and year can't be approved.
  - Stats older than 24 months are flagged.
  - Numbers said on stage are shown as "said by <leader>", not as market fact.
- **Check:** link present; year ≤ 24 months old or flagged; a reviewer's name is on each approval.

## 14. Feedback (optional in v1)
- **Must have:** rating (1–5 or NPS 0–10), "would attend again", optional comment, email (to match to attendee).
- **Rules:** sent on T0 evening, closes at T+3.
- **Check:** response count shown next to every percentage (n).

---

## What makes the whole thing automatic (the five non-negotiables)
1. **One event key** on every file, template and folder.
2. **Speaker names spelt as in the agenda:** the join key for videos, photos and quotes.
3. **The video plan by T-3**, with the file names it generates used by the video team.
4. **The event hashtag on every post** from the vertical's accounts.
5. **Check-in as the source of "attended"**, and **tier promises entered once** from the sponsorship grid.

With these five in place, every other source is either pulled or checked automatically.
