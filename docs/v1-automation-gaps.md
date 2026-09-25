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
| 11 | Videos → transcript | Paste transcripts / caption files | **AI** | **Gemini transcribes directly from the video or audio file** (Gemini API, File API upload; or the YouTube URL once published). Prompt for verbatim text with timestamps and speaker turns, temperature 0, in 10–15 minute chunks. Use a paid-tier key the team creates in Google AI Studio (paid-tier data isn't used for training) | Hear the quote at its timestamp while approving |
| 12 | Videos → who spoke, photo | Pick the leader, find a photo | **AI** + **Automation** | File name → plan row → leader (automation). Panels: AI maps voices to the plan's names with evidence. Photo: the browser grabs frames from the video (`<video>` + canvas) and scores sharpness; fallback to the website photo | One click per panel voice when confidence is low |
| 13 | Videos → insights | Write the quotes | **AI** | 1–3 insights per leader, with an exact-substring check on each quote | **Approve insights** (by design) |
| 14 | Event photos | Choose 12 photos | **Automation** + **AI** | List a Drive folder shared "anyone with the link" using a Google API key (no service account needed); dedupe, score, tag scenes, link to sessions by time | Approve the 12 (by design) |
| 15 | Social: YouTube | Export from Studio | **Automation** | The **YouTube Data API with a simple API key** reads public views, likes and comments for the channel's videos. Find event videos by title/description keys. No OAuth, no approval | None (impressions stay out of v1) |
| 16 | Social: LinkedIn | Export the page analytics file at T+1 and T+14 | **Not removable in v1** | Impressions are private admin analytics, and scraping breaks LinkedIn's terms (see §3). If ET already uses a LinkedIn-approved social tool (e.g. Sprout Social, Hootsuite, Metricool), pull from that tool instead | **1 export per checkpoint** |
| 16b | Social: Instagram | Export from Meta Business Suite | **Automation** | **Instagram Graph API on ET's own business account.** A social-team admin connects once through a Meta app in development mode. For accounts whose admins have a role on the app, App Review usually isn't needed (confirm in Sprint 0). Gives per-post reach/views, likes, comments, saves and shares | One-time connection |
| 17 | Market insights | Find stats and copy them | **AI** | AI searches for theme-matched stats and returns each with a source URL and year; code checks the number appears on the linked page | Open the link and approve (by design) |
| 18 | Feedback (optional) | Build and send a form, export results | **Automation** | The platform hosts its own 3-question form. A short link and QR code go on the closing slide and T0 email; responses land directly, matched by email | None |

---

## 2. What that leaves

### Fully automatic in v1 (no human step)
Agenda · YouTube numbers · Instagram numbers (after a one-time connect) · transcription (Gemini) · feedback collection

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
| LinkedIn impressions | Private admin analytics; official API needs approval; scraping not allowed | One page-level export at T+1 and T+14 | LinkedIn Community Management API, or an approved social tool ET already pays for |

So in v1 the human pipe work per event shrinks to: **about 3 bookmarklet clicks + 2 LinkedIn exports**. Everything else is either automatic or a judgement call.

---

## 3. Can we scrape LinkedIn, Instagram and YouTube instead?

No, and there's rarely a need to. For each platform:

| Platform | Scraping | Why not | What to do instead (still automatic) |
|---|---|---|---|
| **YouTube** | Not needed | YouTube's terms forbid scraping, and the official route is free | **YouTube Data API with an API key**: per-video views, likes and comments for the channel's public videos. Posts are found by title or description containing the event keys |
| **Instagram** | Not allowed by Meta's terms; public pages sit behind login walls; public pages don't show reach or impressions | Scraped numbers break silently when the page changes, and the logged-in account used for it risks being blocked. That would be ETBrandEquity's own account | **Instagram Graph API** on ET's own business account (one-time connect, see row 16b) |
| **LinkedIn** | Prohibited by LinkedIn's User Agreement, which LinkedIn enforces actively; public posts show reactions and comments, but **impressions are only visible to page admins** | Even a perfect scraper can't get impressions, the number the deck leads with. Risk to the ETBrandEquity page if an admin session is used | Page analytics export (1 file) until the Community Management API is approved, or pull from an approved social tool ET already uses |

**How the predefined channel links are still used:** the event lead or social team registers the channel links once per vertical:
- ETBrandEquity on LinkedIn, Instagram and YouTube
- the event keys: `#ETBWS2025`, "Brand World Summit"

Then:
- **YouTube and Instagram** posts are found and counted automatically every day until T+14.
- **LinkedIn** posts are matched from the export by the same keys, so nobody collects post links by hand.

### What about a scraping service such as Apify?
Apify runs ready-made scrapers ("actors") for LinkedIn, Instagram and YouTube. They work, but they don't change the answer.

**Same terms problem.** The platforms' terms still apply to whoever commissions the scraping. Apify's own terms put that responsibility on the customer, so here that is ET.

**Still no impressions.** Actors only see what's public:
- **LinkedIn:** reactions, comments, reposts, and sometimes video views. Not impressions.
- **Instagram:** likes (unless hidden), comments and reel plays. Not reach or impressions.
- **YouTube:** views, likes and comments. The free YouTube API already gives these.

**Account risk.** LinkedIn actors often ask for a logged-in session cookie. Never give one from an ETBrandEquity admin or employee account.

**Reliability.** The actors are third-party code that breaks when a site changes its layout. That makes them a weak basis for numbers sent to sponsors.

**If leadership still wants it:**
- Use it only for **LinkedIn public engagement** (reactions, comments, reposts) on ET's own posts, with no-login actors.
- Label it "public engagement" and keep it off the headline slide.
- Get legal and IT sign-off first.
- Impressions still come from the page export.

## 4. What to build (in order)

1. **Website harvester** (automation): event, theme CSS, sponsors, speakers, agenda from the public event URL. Scheduled daily from T-30. The BWS 2025 page already parses.
2. **Promises extractor** (AI): sponsorship grid / sales deck → tier promises, with the number-in-source check.
3. **Classifiers** (automation + AI): seniority rule, industry lookup + suggestion, location from data.
4. **Video plan drafter** (AI + automation): agenda → draft plan rows + file names.
5. **Media pipeline in the browser and AI** (automation + AI): list the Drive folder by API key, extract audio and frames in the browser, transcribe, name speakers, draft insights with quote checks, pick the photo.
6. **YouTube public stats** (automation): API key, match by event keys, daily to T+14.
7. **OneWorld bookmarklet** (automation): read the current admin page table, then send it to the Add data pipeline. Needs IT's OK, not engineering work.
8. **Market stats finder** (AI): suggestions with a URL and year, checked against the page.
9. **Feedback form** (automation): hosted form + QR code.

## 5. Risks to note
- **Public Drive links:** "anyone with the link" photo folders contain attendee faces. Keep the folder unlisted, time-limited and removed after T+14. Move to a service account in v2.
- **Website parsing** depends on ET B2B page templates. Keep the AI extraction path as a fallback and alert when the parser finds zero rows.
- **Gemini transcripts:** an LLM transcript can drop or smooth over words in noisy passages, and a quote check can only confirm a quote matches the transcript, not the audio. So the reviewer plays the 10-second clip at each quote's timestamp before approving. Use chunks of 10–15 minutes and a paid-tier key.
- **Bookmarklet:** it reads only what the logged-in lead can already see. Get IT's written OK before use.
