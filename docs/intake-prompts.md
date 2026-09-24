# Data Intake: Lovable and Claude Design prompts

Build kit for the Report Studio upload mechanism. Read with `docs/intake-prd.md`.

## What to give each tool

| Attach / paste | Lovable | Claude Design | Why |
|---|---|---|---|
| `docs/intake-prd.md` (the PRD) | ✅ attach or paste | ✅ attach | Scope, steps, rules, acceptance criteria |
| `prototype/screens/intake-*.png` (7 screenshots) | ✅ attach | ✅ attach | Exact layout and states to match |
| `prototype/report-intake.html` (working prototype code) | ✅ attach or paste | ✅ attach | Real parsing, mapping, matching and validation logic to port |
| `samples/oneworld_registrations_sample.csv` | ✅ upload after the build to test | optional | Test attendee import: 426 rows, 7 missing emails, 6 dupes |
| `samples/bws2025_sponsors.csv`, `samples/bws2025_speakers.csv` | ✅ seed data | ✅ real content | Real BWS 2025 sponsors (26) and speakers (35) |
| `samples/drive_media_filenames.txt` | ✅ test matching | optional | Filename convention with good and bad names |
| `samples/linkedin_page_export_sample.csv` | ✅ test social | optional | Page-level export shape |

**Suggested order:**
1. Refine the look in **Claude Design**, using the design prompt, the screenshots and the PRD.
2. Export or screenshot the approved design.
3. Build in **Lovable** with Prompts A–D below. Attach the PRD, the screenshots (or the Claude Design export) and the prototype HTML to Prompt A.

---

## Lovable prompts

Paste them one at a time and check each before moving on. If the Report Studio from `docs/lovable-prompt.md` already exists, add this as a new **"Data intake"** page in that app; otherwise it works standalone.

### Prompt A: Intake shell, event, sponsors, speakers

```
Build "Report Studio – Data intake", an internal tool for the ET BrandEquity events team to collect every input for an event's post-event report. Sponsors never see it. I've attached the PRD, 7 screenshots and a working HTML prototype. Match the screenshots' layout and port the prototype's logic (seniorityOf, TIERMAP, guessField, validate, automatch) rather than reinventing it.

Stack: React + TypeScript + Tailwind, Supabase (auth, Postgres, storage, edge functions). Google sign-in restricted to our company domain.

Layout:
- Top bar: product mark "Report Studio · ETBrandEquity Events", event name + "Data intake", date · venue, a status chip, and a "Continue to report" button.
- Left rail (sticky on desktop, horizontal scroll on mobile): "N of 7 sources ready", then 7 steps. Each has an icon (✓ ready, ! needs attention, number = not started), a title and a one-line live summary (e.g. "26 sponsors · 13 groups"). The active step has an accent left border.
- Main panel: step title, one-paragraph explanation, panels, Back / Next.
- Visual style: warm off-white background, white panels with 1px borders and 12px radius, a serif heading font (Newsreader), IBM Plex Sans body and Plex Mono for numbers and filenames. Accent = the event's brand colour (BWS 2025: rgba(231,66,95,1)). Status colours: green ready, amber warning, red error, blue info. Light and dark mode.

Data model (Supabase):
- events(id, name, edition, start_at, end_at, venue, theme_line, theme_source, hashtag, brand_color, heading_font, body_font, banner_url, vertical)
- sponsors(id, event_id, name, name_norm, oneworld_group, tier, logo_url, source)
- tier_maps(series, oneworld_group, tier)  -- saved group → tier choices
- speakers(id, event_id, name, designation, company, seniority, weightage, is_key, source)
- sessions(id, event_id, start_at, end_at, hall, format, title)
- session_speakers(session_id, speaker_id)
- intake_status(event_id, step, status, summary, updated_at)

Seed BWS 2025: 7th edition, 4 Jul 2025, Grand Hyatt BKC Mumbai, theme "Reimagining Marketing In The Age of AI", #ETBWS2025. Sponsors from bws2025_sponsors.csv (26) and speakers from bws2025_speakers.csv (35).

Step 1 – Event and theme:
- Two source cards (radio): "OneWorld event settings" (default; for now reads the seeded event) and "Paste the website HTML".
- For the HTML option, add a textarea + "Read page". Parse in the browser with DOMParser: event name, date, venue, theme line, hashtag, theme colour (from inline styles / CSS variables), fonts, banner image.
- Show a brand-colour swatch and a cover preview (banner + name + theme + date).
- If the theme line differs from the sales-deck theme line (a field on the event), show an amber flag with both lines and a picker. Store theme_source.

Step 2 – Sponsors and logos:
- Source cards: "OneWorld Sponsors" (default) or "Upload Excel/CSV" (Group, Sponsor Name, Logo URL).
- Deduplicate by normalised name (lowercase, strip punctuation and spaces). Show "37 entries → 26 sponsors" when dupes were removed.
- Group sponsors by OneWorld group. Each group has a tier dropdown: Presenting, Powered by, Co-powered, In association, Platinum, Gold, Silver, Associate, Category partner, Exhibitor, Start-up. Prefill from tier_maps, then save changes back to tier_maps.
- Logo tile: the logo image, or initials if it's missing or fails to load. Flag sponsors without a logo.

Step 3 – Key speakers:
- Source cards: "OneWorld Speakers + agenda" (default) or "Website speaker list".
- Table: tick, name, designation, company (editable; a pill shows "from agenda" when filled from sessions), seniority, sessions.
- Seniority rule, first match wins, whole words, case-insensitive:
  - VP: vp, vice president, svp, evp, avp
  - CXO: chief, cxo, ceo, cmo, cto, cio, cdo, founder, co-founder, managing director, md, chairman, president
  - Director: director, head
  - Manager: manager, lead, gm, dgm, agm
  - Guest: actor, artist, athlete, author
  - otherwise Other
- Pre-tick is_key for CXO (or weightage ≥ threshold when available). Buttons: "Reset to CXO rule", "Clear all".
- Flags: key speakers missing a company; speakers in no session.

Step status rules come from the PRD section 4 ("Ready when"). Recompute them on every change and update the rail live.
Steps 4–7 show a placeholder panel for now.
```

### Prompt B: Attendee upload with saved mappings

```
Build Step 4 – Attendees.

Source cards:
- "OneWorld registrations": disabled, with a red "Not working" pill and the text "The export fails today. Engineering fix needed for automation".
- "Upload the export (Excel or CSV)": selected.

Upload:
- Drop zone + "Choose file" for .xlsx, .xls and .csv. Parse in the browser with SheetJS (xlsx). If there are several sheets, ask which one.
- Show "Loaded <file> · N rows · M columns".

Match the columns:
- Table: column in file | example value (first non-empty) | "Use as" dropdown.
- Fields: Ignore, First name, Last name, Email, Company, Designation, City, Lead source, Conversion source, Registration date, Status (registered / shortlisted / attended), Mobile (not stored).
- Auto-suggest from header text: first → first_name; last|surname → last_name; mail → email; company|organi → company; designation|title|role → designation; city|location → city; lead → lead_source; conversion|utm|channel → conversion_source; date|registered → registered_at; status|attend → status; mobile|phone → mobile.
- Required: email, designation, company. Show a green flag when they're matched; otherwise show a red flag naming the missing ones and disable Import.

Saved presets:
- Table mapping_presets(id, name, source_type, header_signature, mapping jsonb, created_by).
- header_signature = sorted, normalised headers joined with '|'.
- On load, if a preset's signature matches, apply it and show a green pill "Preset '<name>' applied".
- A "Save mapping as 'OneWorld registrations export'" checkbox (checked by default) saves on import.

Check before import:
- Stat tiles: rows ready | missing email (rejected) | duplicate emails merged | marked attended | CXO titles.
- Preview the first 10 valid rows: name, designation, company, status, level (seniority).

Import:
- Tables: people(id, email_norm, email_hash, first_name, last_name, company, designation, seniority, city) and registrations(id, event_id, person_id, status, lead_source, conversion_source, registered_at, checked_in_at).
- Upsert people by email_norm and registrations by (event_id, person_id).
- NEVER persist the mobile column; drop it in the browser before sending.
- Setting "Store emails as hash only" (SHA-256); when on, email_norm is null.
- Log to imports(id, event_id, source_type, file_name, sheet, preset_id, rows_added, rows_updated, rows_rejected, user_id, created_at).
- Show "Imported N registrations (A attended) at HH:MM" and the import log under the card.

Test with samples/oneworld_registrations_sample.csv: expect 426 rows, 7 missing emails, 6 duplicates merged, a preset applied on the second upload, and no mobile numbers stored.
```

### Prompt C: Session and sponsor media from Google Drive

```
Build Step 5 – Session and sponsor media.

Folders panel:
- Two inputs: "Sessions folder link (Google Drive)" and "Social & sponsor speakers folder link", plus "Connect folders".
- Parse the folder ID from the URL.
- An edge function lists the files through a Google service account (secret GOOGLE_SERVICE_ACCOUNT_JSON). The folders are shared view-only with the service account. Store name, drive_file_id, mime type, size and created time.
- Drag-and-drop fallback: files go to Supabase Storage under media/<event_id>/<folder>/.
- Table media_files(id, event_id, folder sessions|social, name, drive_file_id, storage_path, kind video|audio, size_mb, speaker_id, sponsor_id, match_method filename|agenda_time|manual|none, status new|queued|transcribing|done|failed, transcript, error).

Auto-matching (run after every sync):
- Sessions folder:
  - Filename convention HHMM_<Hall>_<Format>_<First-Last>[_<First-Last>].ext.
  - A file matches a speaker when both the speaker's first and last name appear in the normalised filename.
  - If several speakers match, prefer a key speaker and keep the others as candidates.
  - If no name matches but HHMM + Hall fall inside a session, assign that session's key speaker (match_method agenda_time).
  - Otherwise leave it unmatched.
- Social & sponsor folder: match when the normalised filename contains a sponsor's normalised name or starts with its first word. Guess the type from keywords: byte, 5D, TicTac, reel, Studio.

Transcription:
- Toggle "Transcribe every matched session file automatically overnight (recommended)", on by default. When on, a nightly job (pg_cron, 01:00 IST) queues every matched session file that isn't done.
- "Transcribe selected" button for manual runs.
- Edge function transcribe-start: send a short-lived download URL to the provider in TRANSCRIBE_PROVIDER with TRANSCRIBE_API_KEY; ask for timestamps + diarisation. Extract audio server-side if the provider needs it.
- transcribe-poll every 2 minutes stores the transcript.
- Never load whole videos into edge-function memory.

Views (tabs):
- "Top leaders": every key speaker (name, designation, company) with the matched filename and a 2-line transcript snippet, or an amber "Missing file" pill. Add a "Mark: no recording" option.
- "Sessions folder (N)": table of file, size, matched speaker (dropdown with candidates first), match method, status, select checkbox.
- "Social & sponsor folder (N)": file, matched sponsor (dropdown), type, status.

Step status:
- ready when every key speaker has a file or is marked "no recording"
- warning while any are missing
- summary "N files · M transcribed"

Test with the names in samples/drive_media_filenames.txt: IMG_4481.MOV and Crowd_montage_day1.mp4 must stay unmatched.
```

### Prompt D: Social, market insights, readiness

```
Build Steps 6 and 7 and finish the rail.

Step 6 – Social media:
- Three platform cards: LinkedIn, Instagram, YouTube. Each shows a status pill (Not connected / Connected · synced <time> / Export uploaded <time>), one line on what the connection needs, and two buttons: "Connect analytics" and "Upload export".
  - LinkedIn: Community Management API, needs LinkedIn approval.
  - Instagram: business account linked to a Meta app.
  - YouTube: YouTube Analytics API, channel owner sign-in.
- Connect analytics: OAuth where available. Tokens are stored as secrets and a daily fetch runs until T+14. If a connection isn't configured, show why and point to Upload export. Never scrape.
- Upload export: a page-level analytics file (.xlsx/.csv), one per platform. Use the same column mapping + presets as Prompt B. LinkedIn fields: post link, created date, post type, impressions, unique impressions, clicks, reactions, comments, reposts, engagement rate.
- Table social_posts(id, event_id, platform, url, post_id, created_at, type, window pre|event|post, impressions, reach, clicks, reactions, comments, shares, snapshot_at). Parse LinkedIn activity IDs from /feed/update/urn:li:activity:<id> and /posts/...-activity-<id>-.
- Windows: pre-event = created before the event start; event day = within the event dates; post = after (kept, shown separately).
- "Posts received" panel: tiles for pre-event posts, pre-event impressions, event-day posts, event-day impressions; a table of the top 10 posts. Info note: "Windows used in the report: pre-event = post date to event start; event day = <dates>."
- Status: ready when LinkedIn has data in both windows.

Step 7 – Market insights:
- Tabs: BrandEquity, CIO, CISO.
- Table market_insights(id, vertical, statistic, value, source, year, reviewed_at). Editable rows, "Add statistic", delete.
- Show "Last reviewed <month year>" per vertical. Say clearly that this is a yearly library, not event data.
- Seed BrandEquity with the 5 sales-deck statistics (statistic, value, source, year) supplied by the team.
- Status: ready when the event's vertical has ≥ 3 statistics reviewed in the last 12 months.

Rail and readiness:
- Show "N of 7 sources ready" and live summaries.
- "Continue to report" is always enabled. If any step isn't ready, show a confirm dialog listing each gap with a link to its step.
- Activity log panel (drawer from the top bar): every import, sync, match override and transcription, with user and time.
- Mobile (≤ 880px): rail becomes horizontal scroll, tables scroll inside their own container, no horizontal page scroll at 390px.
- Run the acceptance checklist from the PRD section 9 and report which items pass.
```

Next, **Prompt E** (login, roles, notifications, sponsor viewer) is in `docs/platform-access-and-distribution.md` §7.

---

## Claude Design prompt

Paste into Claude Design. Attach the 7 screenshots, the PRD and the prototype HTML.

```
Design the "Data intake" screen of Report Studio, an internal web tool the ET BrandEquity events team uses on the evening of an event to get every input for the post-event report into one place. The attached screenshots and HTML are a working prototype. Keep its structure and logic; raise the visual quality and clarity. The PRD is attached for scope.

Users and context:
- 3–6 people on the events team, on laptops, at the end of a long event day. They need to see in five seconds what is ready and what is still owed, and who owes it.
- The pilot is Brand World Summit 2025 (7th edition, 4 Jul 2025, Grand Hyatt BKC, Mumbai; theme "Reimagining Marketing In The Age of AI"; brand colour rgba(231,66,95,1)). Use the real sponsor and speaker names from the attached CSVs; everything else is sample data.

Structure (keep):
1. Top bar: product mark, event name + "Data intake", date and venue, a status chip, and a primary "Continue to report" button.
2. Left rail: "N of 7 sources ready", then 7 steps, each with a status icon (ready / needs attention / not started), a title and a live one-line summary. Steps:
   1. Event and theme
   2. Sponsors and logos
   3. Key speakers
   4. Attendees
   5. Session and sponsor media
   6. Social media
   7. Market insights
3. Main panel per step:
   - title + a one-paragraph plain-English explanation
   - a "Source" panel with two cards: the automated source (default) vs the upload fallback
   - the working panels
   - Back / Next

Design each of these states as its own frame:
- Event and theme: cover preview built from the banner, brand colour and theme line. Amber conflict flag: website theme vs sales-deck theme, with a picker.
- Sponsors: "37 entries → 26 sponsors" dedupe note, sponsors grouped by OneWorld group, a tier dropdown per group, logo tiles (initials fallback).
- Key speakers: table with tick, name, designation, company, seniority pill, sessions. "26 key of 35". A flag for 5 speakers missing a company.
- Attendees, 3 frames:
  (a) empty drop zone with OneWorld shown as "Not working"
  (b) column matching with a "Preset applied" badge
  (c) check-before-import stats (412 ready · 7 missing email · 7 duplicates merged · 245 attended · 120 CXO), a 10-row preview and a success banner
- Media: two Drive-folder inputs, the overnight auto-transcribe toggle, and tabs:
  - Top leaders: each key speaker with matched file + transcript snippet, or a "Missing file" pill; the missing list reads as "what the video team still owes"
  - Sessions folder: file table with match method, status and a speaker dropdown
  - Social & sponsor folder: files matched to sponsors
- Social: three platform cards (LinkedIn, Instagram, YouTube) with Connect analytics / Upload export. Then a connected state: pre-event vs event-day tiles and a top-posts table.
- Market insights: vertical tabs (BrandEquity, CIO, CISO), editable statistic table with source and year, "Last reviewed Jun 2025".
- "Continue to report" with gaps: a dialog listing the 3 unready steps with links.
- Mobile at 390px for Key speakers and Attendees (rail becomes a horizontal step strip).

Visual direction:
- Calm, editorial, internal-tool feel. Not a marketing page, no gradients, no illustrations.
- Warm off-white canvas, white panels, 1px hairline borders, 10–12px radius.
- Type: a serif for headings (Newsreader), a humanist sans for UI (IBM Plex Sans), and mono for numbers and filenames (IBM Plex Mono).
- Colour: the accent is the event's brand colour, used sparingly (active step border, primary button, checkboxes). Status colours are muted green / amber / red / blue with soft tinted backgrounds. Design light and dark themes.
- Density: comfortable tables (36–40px rows), numbers right-aligned in mono, filenames in mono and truncated in the middle.
- Accessibility: WCAG AA contrast; status never shown by colour alone (icon + text); visible focus rings.

Copy rules:
- Plain English, sentence case, no jargon ("Match the columns", not "Schema mapping").
- Every warning says what is wrong and who fixes it.
- Say "Not working yet" for OneWorld attendees. Never pretend a source is connected.

Deliver: the frames above, a small component sheet (source card, status pill, step item, stat tile, flag, drop zone, file row, leader row), and design tokens (colour, type scale, spacing, radius) for light and dark.
```
