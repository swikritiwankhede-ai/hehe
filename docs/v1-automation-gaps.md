# Version 1: which sources still need an automation or AI layer

In the zero-dependency v1 (`docs/report-v1-no-dependency.md`), people still do two kinds of work:
- **acting as the data pipe:** copying pages, downloading exports, pasting transcripts, matching things
- **judging:** approving quotes, confirming a new company's industry, choosing a theme line

The goal is to remove the pipe work. The judging stays on purpose, as one-click approvals.

Two layers do the removing:
- **Automation layer:** deterministic code, including scheduled fetches, parsers, rules, matching and in-browser media handling.
- **AI layer:** a language or vision model doing extraction, classification, speaker naming and drafting. Its output is always checked by code against the source.

"No dependency" here means no ET engineering ticket, no platform API approval and no vendor contract negotiated by someone else. An API key the team can create themselves in minutes counts as acceptable.

---

## 1. Source by source

| # | Source | Human step left in v1 | Layer that removes it | How, with no outside dependency | Human step that stays |
|---|---|---|---|---|---|
| 1 | Event details | Copy the OneWorld Event Details page | **Automation** | Fetch the **public event website** on a schedule and parse name, date, venue, theme line and hashtag. The website is rendered from OneWorld, so it carries the same values | Pick the theme line once if the website and sales deck differ |
| 2 | Theme | Screenshot Colors & Fonts | **Automation** | Read the theme from the **website's own CSS** (theme colour, fonts, hashtag, edition). BWS 2025 matched OneWorld on 5 of 5 fields | Approve the theme once |
| 3 | Sponsors + logos | Paste the partner list | **Automation** | Parse the website partner blocks: name, group, logo URL, dedupe (37 → 26) | Map a *new* group to a tier (once per series) |
| 4 | Tier promises | Type the inclusions per tier | **AI** | Extract tier → inclusions from the **sponsorship grid** file or sales deck PDF into the promises table; code checks every number appears in the file | Confirm once per series |
| 5 | Speakers + photos | Paste the speaker list, fix companies | **Automation** + **AI** | Parse website speaker cards (name, title, photo URL). Fill missing companies from the agenda by name match; AI only where the agenda wording is ambiguous | Add a late speaker by hand (rare) |
| 6 | Agenda | Paste agenda tabs | **Automation** | Parse the website agenda tabs (day, time, hall, title, speakers). Re-fetch daily to T0 to catch changes | None |
| 7 | Attendees + check-in | **Download the OneWorld export and upload it** | **Automation** (partly) | A **"Send to Report Studio" bookmarklet or browser extension**: the lead, already logged in to OneWorld, clicks once on the Registrations/Attendees page and the page table is sent over. Confirm with ET IT that reading ET's own admin page this way is allowed | One click per sync (T0 evening, T+1) until the OneWorld API exists |
| 8 | Wishlist | Download the export | **Automation** (partly) | Same bookmarklet on the Wishlist Users page | One click |
| 9 | Seniority / location / industry | Classify titles and companies | **Automation** + **AI** | Rule for seniority. Location only from data. AI suggests industry for companies not yet in the lookup table | Confirm industry for *new* companies only |
| 10 | Video plan | Fill 30 rows by hand at T-3 | **AI** + **Automation** | Draft the plan automatically from the agenda (every panel/keynote = a row, with leaders and hall) plus last edition's byte mix. The lead edits and confirms instead of typing | Confirm the plan at T-3 |
| 11 | Videos → transcript | Paste transcripts / caption files | **AI** | Transcribe inside the platform with the built-in AI model if it accepts audio (check the Lovable AI gateway); otherwise a transcription API key the team creates itself. The browser extracts audio from the video, so no server is needed for files up to ~1 GB | None for transcription |
| 12 | Videos → who spoke, photo | Pick the leader, find a photo | **AI** + **Automation** | File name → plan row → leader (automation). Panels: AI maps voices to the plan's names with evidence. Photo: the browser grabs frames from the video (`<video>` + canvas) and scores sharpness; fallback to the website photo | One click per panel voice when confidence is low |
| 13 | Videos → insights | Write the quotes | **AI** | 1–3 insights per leader, with an exact-substring check on each quote | **Approve insights** (by design) |
| 14 | Event photos | Choose 12 photos | **Automation** + **AI** | List a Drive folder shared "anyone with the link" using a Google API key (no service account needed); dedupe, score, tag scenes, link to sessions by time | Approve the 12 (by design) |
| 15 | Social: YouTube | Export from Studio | **Automation** | The **YouTube Data API with a simple API key** reads public views, likes and comments for the channel's videos. Find event videos by title/description keys. No OAuth, no approval | None (impressions stay out of v1) |
| 16 | Social: LinkedIn, Instagram | Export one page-level file per platform at T+1 and T+14 | **Not removable in v1** | Impressions are private analytics and need the official APIs (approval). Scraping is not allowed | **2 uploads per platform per event** |
| 17 | Market insights | Find stats and copy them | **AI** | AI searches for theme-matched stats and returns each with a source URL and year; code checks the number appears on the linked page | Open the link and approve (by design) |
| 18 | Feedback (optional) | Build and send a form, export results | **Automation** | The platform hosts its own 3-question form. A short link and QR code go on the closing slide and T0 email; responses land directly, matched by email | None |

---

## 2. What that leaves

### Fully automatic in v1 (no human step)
Agenda · YouTube numbers · transcription · feedback collection

### Automatic, with a one-time or one-click human confirmation
- Event details and theme (approve once)
- Sponsors (map new groups once)
- Tier promises (confirm once per series)
- Speakers
- Seniority/industry (new companies only)
- Video plan (confirm at T-3)
- Speaker naming in panels

### Human by design (judgement, one-click approvals)
Insights · photos · market stats · freezing and sending the report

### Still human in v1, because the data is locked behind someone else
| What | Why it can't be removed yet | Workaround in v1 | Removed in v2 by |
|---|---|---|---|
| Attendees, check-in, wishlist from OneWorld | No API; admin pages are behind login | Bookmarklet: one click on the page the lead already has open | OneWorld API (ET engineering) |
| LinkedIn and Instagram impressions | Private analytics; official APIs need approval | One page-level export per platform at T+1 and T+14 | LinkedIn Community Management API, Meta app review |

So in v1 the human pipe work per event shrinks to: **about 3 bookmarklet clicks + 4 file uploads**. Everything else is either automatic or a judgement call.

---

## 3. What to build (in order)

1. **Website harvester** (automation): event, theme CSS, sponsors, speakers, agenda from the public event URL. Scheduled daily from T-30. The BWS 2025 page already parses.
2. **Promises extractor** (AI): sponsorship grid / sales deck → tier promises, with the number-in-source check.
3. **Classifiers** (automation + AI): seniority rule, industry lookup + suggestion, location from data.
4. **Video plan drafter** (AI + automation): agenda → draft plan rows + file names.
5. **Media pipeline in the browser and AI** (automation + AI): list the Drive folder by API key, extract audio and frames in the browser, transcribe, name speakers, draft insights with quote checks, pick the photo.
6. **YouTube public stats** (automation): API key, match by event keys, daily to T+14.
7. **OneWorld bookmarklet** (automation): read the current admin page table, then send it to the Add data pipeline. Needs IT's OK, not engineering work.
8. **Market stats finder** (AI): suggestions with a URL and year, checked against the page.
9. **Feedback form** (automation): hosted form + QR code.

## 4. Risks to note
- **Public Drive links:** "anyone with the link" photo folders contain attendee faces. Keep the folder unlisted, time-limited and removed after T+14. Move to a service account in v2.
- **Website parsing** depends on ET B2B page templates. Keep the AI extraction path as a fallback and alert when the parser finds zero rows.
- **Built-in AI for audio:** confirm the model accepts audio and handles Indian English. If not, the team creates a transcription API key; that's a purchase, not an approval.
- **Bookmarklet:** it reads only what the logged-in lead can already see. Get IT's written OK before use.
