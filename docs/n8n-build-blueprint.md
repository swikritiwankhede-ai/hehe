# Build blueprint: a running prototype on n8n + Claude + Google Workspace

How to build Report Studio end to end, so it produces the **IP deck** (e.g. Brand World Summit) and the **Custom deck** (one sponsor), without a OneWorld API.

**What's already built and tested in this repo:**

| Piece | File | Status |
|---|---|---|
| Report engine (all numbers, IP + Custom, Slides fill logic) | `engine/report-engine.js` | 7 tests pass (`node engine/test.mjs`) |
| 5 importable n8n workflows | `n8n/workflows/01…05-*.json` | Code-node logic tested with sample data (`node n8n/test-workflows.mjs`) |
| Data sheet (17 tabs) | `data/report-studio-data-template.xlsx` (empty), `…-sample.xlsx` (2 sample events) | Import into Google Sheets |
| Deck templates | `templates/slides/report-template-ip.pptx`, `report-template-custom.pptx` | Upload and open as Google Slides |
| Placeholder reference for adding slides | `templates/slides/PLACEHOLDERS.md` | Generated from the engine |
| Prompts | `n8n/prompts.md` + §5 below | In the workflows |
| Local end-to-end run (sample data → both decks) | `tools/run-pipeline.mjs` → `out/*.pptx` | Runs |

**Not tested here:** the live calls to Google (Sheets, Drive, Slides, Gmail) and Gemini. They need your accounts. Node settings can differ slightly between n8n versions, so after import open each node with a warning and re-pick the highlighted option.

---

## 1. The stack

| Tool | You have it? | Used for | Set up by |
|---|---|---|---|
| **n8n** | Yes | All workflows: uploads, video → insights, theme, deck build, daily digest. Its forms are the upload and "build deck" screens in Phase 1 | You |
| **Claude** | Yes | Writing and changing workflows and prompts, the proposal/promises extraction prompt, designing the template (Claude Design), maintaining the engine (Claude Code in this repo) | You |
| **Google Workspace**: Sheets, Drive, Slides, Gmail, Forms | Most likely (ET email) | Sheets = the database for the prototype. Drive = inboxes for files, videos, photos, finished decks. Slides = templates and finished decks; several people can edit at once, with comments and version history. Gmail = notifications. Forms = the session desk and feedback | You + IT for sharing settings |
| **Google Cloud project** (OAuth client) | Create (free) | Lets n8n sign in to Sheets, Drive, Slides and Gmail. Enable those 4 APIs | You |
| **Gemini API key** (Google AI Studio, paid tier) | Create | Video transcription and insights; reading the theme from the website. Paid tier so data isn't used for training | You |
| **Looker Studio** (free) | Optional | A read-only dashboard over the Sheet for leadership and the Today view. Many users, no extra logins | You |
| **Lovable + Supabase** | Phase 2 | The proper multi-user app and sponsor portal (`prototype/report-workspace.html` is the design) once the prototype proves value | You |
| **Claude API key** | Optional | Use Claude instead of Gemini for text-only prompts (n8n has an Anthropic node). Gemini stays for audio/video | You |

**Why Google Workspace as the Phase 1 backend:** it already gives you multi-user logins, roles (sharing), real-time co-editing of decks, comments, version history and an audit trail, with nothing to build.

## 2. How it fits together

```
 Teams upload / drop files                    n8n workflows                          Outputs
 ─────────────────────────                    ──────────────                         ───────
 Form 01 "Upload event data" ──────────────▶ 01 normalise + check ──▶ Google Sheet (17 tabs)
 (OneWorld exports, templates, social exports)                              │  ▲
 Drive /Videos (video team) ───────────────▶ 02 Gemini transcript ──▶ insights (pending) ── leads approve in Sheet
 Form 05 "Theme from website" ─────────────▶ 05 read theme ─────────▶ events tab (accent, hashtag)
 Form 03 "Build deck" ─────────────────────▶ 03 engine computes ─────▶ copies Slides template ──▶ fills it ──▶ PDF + Slides link
                                                                             ▲ template = predefined, editable in Slides
 Schedule 09:00 IST ───────────────────────▶ 04 readiness per event ─▶ email to each event lead
```

## 3. Every data point: source, tool, workaround

"Form 01" means the n8n upload form: the user picks the event, the data type and the file. "Auto" means no person is involved.

### Shared by IP and Custom
| Data point | Where it lives | Tool / workflow | Workaround (no direct connection) | AI? | Guardrail |
|---|---|---|---|---|---|
| Event name, dates, venue, edition | OneWorld Event Details, event website | `events` tab (one row per event) | Type once at setup, or Form 05 reads the website | Gemini (05) | Values must appear in the page |
| Theme line | OneWorld Event Details | `events.theme_line` | Form 05 proposes it from the website; the lead confirms | Gemini (05) | Kept only if found word for word on the page |
| Visual theme (accent colour, hashtag) | OneWorld Colors & Fonts → website | Form 05 → `events.accent_hex`; the deck is recoloured at build | Type the hex from the Colors & Fonts screen | Gemini fallback | The colour must exist in the page CSS; approve on the events tab |
| Speakers (name, title, company, photo) | OneWorld Speakers, website | Form 01 → `speakers` (OneWorld export, website list, or `templates/speaker-template.xlsx`) | Export or copy from OneWorld into the template | — | Names spelt as in the agenda (the join key) |
| Sessions / run-of-show | OneWorld Agenda; Custom: run-of-show sheet | Form 01 → `sessions` (day, start, end, title, format, **owner**) | Fill the run-of-show template | — | The owner column is needed for share of voice |
| Attendees and check-in | OneWorld Target Audience export | Form 01 → `attendees` | See §4 (OneWorld ladder) | — | Mobile never stored; missing email rejected; duplicates merged |
| Seniority | Derived | Engine rule (auto) | — | No | Shown with n |
| Organisation type, industry, region | `companies` tab | Lookup (auto). New companies need a row | Ask Gemini/Claude to suggest (prompt P3), the lead confirms once | P3 | Unconfirmed = "Unclassified", never guessed into the deck |
| Leader quotes and insights | Video team's files | Drive `/Videos` → 02 (auto, every 5 min) → `insights` pending → lead sets `approved` | Paste a transcript into a `.txt`, or upload a caption file to Drive | Gemini (P1) | Word-for-word check; listed speakers only; human approval; headline numbers must be in the quote |
| Leader photo | Speaker photo URL | `speakers.photo_url` → insight card | Paste the website photo URL | — | URL must be viewable by link |
| Event photos | Photographer | `photos` tab (URL, caption, status) via Form 01 | Paste Drive share links in a CSV | Optional scoring later | Only `approved` photos are used |
| Market context (IP) | Reports | `market` tab, yearly per vertical | — | P4 (suggest with sources) | No source and year, no number; a person approves |

### IP only
| Data point | Where it lives | Tool / workflow | Workaround | Guardrail |
|---|---|---|---|---|
| Partners and logos by group | OneWorld Sponsors, website partner blocks | Form 01 → `sponsors` | `samples/bws2025_sponsors.csv` shows the format | Duplicates removed by name |
| Event promises (attendees, speakers) | Sales deck / website stats | `events.target_attendees`, `target_speakers` | Typed at setup | Shown as "promised vs delivered" only if both exist |
| Social reach (LinkedIn) | Page analytics (admin only) | Form 01 → `social` (platform LinkedIn) at T+1 and T+14 | Only option until the API is approved | Posts matched by the hashtag or event name in the text; as-of date shown |
| Social reach (Instagram) | Meta Business Suite | Form 01 → `social` (Instagram) | Later: Graph API workflow (one-time connect) | Same |
| Social reach (YouTube) | YouTube Studio | Form 01 → `social` (YouTube) | Later: a YouTube Data API workflow with a key (no approval) | Same |
| Multiplier (event day vs pre-event) | Computed | Engine (auto) | — | Printed with its basis on the slide |

### Custom only
| Data point | Where it lives | Tool / workflow | Workaround | Guardrail |
|---|---|---|---|---|
| Sponsor objectives (mandate) | Signed proposal | `events.objectives` (separated by `|`) | P5: Claude extracts them from the proposal PDF, the lead confirms | Text must be in the proposal |
| Committed vs delivered | Proposal + ops checklist | `deliverables` tab (item, committed, delivered, status, evidence) | P5 drafts the committed rows; ops fills delivered | "Delivered" needs evidence |
| Leaders committed | Proposal | `events.leaders_committed` | Typed | — |
| Wishlist and outcome (met / attended / absent) | Sponsor's target list + session desk | `wishlist` tab via Form 01 | **Session desk:** a Google Form or n8n form on a tablet at the room door, writing "met" | Outcome required; otherwise derived from check-in |
| Room check-in | Session desk | `attendees` (status, checked_in_at) | Same desk form | "Attended" only from check-in |
| Share of voice | Run-of-show | Engine: sponsor-owned minutes ÷ content minutes (auto) | — | Informal blocks excluded |
| Follow-up requests | Session desk | `followups` via form | Desk form question "Wants a follow-up?" | — |
| Feedback | Google Form after the session | `feedback` tab | Link and QR code on the closing slide | n shown |
| Named attendee list | Check-in | Custom deck appendix | — | Only in the Custom deck for that sponsor; never in IP decks |

## 4. Working without OneWorld connectivity (most automatic first)

| Level | How | Human effort | Needs |
|---|---|---|---|
| **L1: scheduled email** | If OneWorld's "Activity & Reporting" can email a scheduled export, send it to a dedicated Gmail inbox. An n8n **Gmail trigger** picks up the attachment and runs it through the same steps as Form 01 | None after setup | Check whether OneWorld can schedule report emails |
| **L2: Drive inbox** | The lead saves the export into Drive `/Inbox` as `<event_key>__attendees.xlsx`. An n8n Drive trigger imports it (same Code node as Form 01) | Save one file | Nothing |
| **L3: upload form** | Form 01 (built) | Pick event and type, attach file: under a minute | Nothing |
| **L4: browser button** | A bookmarklet on the OneWorld page posts the visible table to an n8n webhook | One click | IT's OK |
| **L5: API** | n8n HTTP node on the OneWorld API, nightly and hourly on event day | None | ET engineering |

**Public website (speakers, sponsors, agenda, theme):** n8n can fetch it directly (workflow 05 does this for the theme). Extend the same pattern for speakers and sponsors, with Gemini extraction using the "must appear in the page" check.

## 5. Prompts: where each runs, and the text

| # | Prompt | Runs in | Input → output |
|---|---|---|---|
| P1 | Transcript + insights | n8n 02 → Gemini (file upload) | Video + leaders from the video plan → segments, speaker evidence, 1–3 insights per leader (JSON) |
| P2 | Theme from website | n8n 05 → Gemini | Page HTML → name, theme line, hashtag, accent colour, fonts (JSON) |
| P3 | Company classification | n8n (add a node after 01 for new companies) → Gemini or Claude | Company names → org type, industry, region with confidence |
| P4 | Market stats with sources | Gemini with Google Search grounding, or Claude with web search | Event theme → candidate stats, each with source URL and year |
| P5 | Proposal → mandate and commitments | Claude (paste the PDF) or n8n + Claude API | Proposal → objectives and committed deliverables (JSON) |
| P6 | Template design | Claude Design / Claude | Website look → a slide design, then turned into the placeholder template |
| P7 | Builder prompts | Claude / Claude Code | Change workflows, the engine, placeholders |

P1 and P2 are in `n8n/prompts.md`, exactly as the workflows send them. The rest:

**P3: company classification**
```
Classify each company for an Indian B2B events report. For each, return:
org_type: one of Brand, Agency, Publisher/Media, Technology vendor, Start-up, Consultancy, Government/Education, Other
industry: one of FMCG, BFSI, Retail & e-commerce, Automotive, Telecom, Healthcare & pharma, Technology, Media & entertainment, Manufacturing, Infrastructure, Real estate, Travel & hospitality, Apparel & lifestyle, Education, Other
hq_region: North, South, East, West, Central or Unknown (India HQ; Unknown if not Indian or unsure)
confidence: high, medium or low
Use only what you know about the company. If unsure, say Other / Unknown with low confidence. Never invent a company.
Return JSON: [{"company":"","org_type":"","industry":"","hq_region":"","confidence":""}]
Companies:
{{list}}
```
Rows land in `companies` with a `status` you add. Only high-confidence rows can be bulk-accepted, and the rest need a person.

**P4: market stats**
```
Event: {{event_name}}, theme "{{theme_line}}", audience: Indian CMOs and marketing leaders.
Find up to 8 recent statistics (published in the last 24 months) about the Indian marketing, advertising, digital or consumer landscape that relate to this theme.
For each, return the exact figure as published, a one-line description, the publisher, the year, and the URL of the page that states it.
Only include figures you found on a page you can cite. No estimates, no rounding.
Return JSON: [{"statistic":"","value":"","source":"","year":"","source_url":""}]
```
An n8n HTTP node then fetches each URL and keeps a stat only if the number appears on the page. A person opens the link and sets `status = approved`.

**P5: proposal → mandate and commitments (Custom)**
```
This is a signed proposal for a sponsored event run by ETBrandEquity for {{sponsor}}.
Extract only what is written:
1. objectives: up to 4 short lines, in the proposal's words
2. leaders_committed: the number of attendees promised (null if absent)
3. deliverables: every committed item, e.g. keynote, sessions, branding, gifting, emcee mentions, with the committed quantity as written and the day if stated
Copy text and numbers exactly. If something is not in the document, leave it out.
Return JSON: {"objectives":[],"leaders_committed":null,"deliverables":[{"item":"","committed":"","day":""}]}
```
Check every number against the PDF, then upload through Form 01 (events / deliverables).

**P6: template design (Claude Design, then the template)**
```
Design a 16:9 post-event report deck for ETBrandEquity events, 13 slides for IP events and 13 for Custom events, matching the layouts in the attached template files.
Style: clean editorial, white background, one accent colour used for the cover, titles and bars; Montserrat for text, a serif for headings; big numbers in tinted tiles; a small source line on every data slide.
Keep every {{placeholder}}, [[section:…]] marker, {{chart:…}} and {{img:…}} box exactly where it is and exactly as typed.
Use #FF00AA for anything that should take the event's accent colour, #AA0077 for dark accent text, #FFD6F0 for tinted tiles.
```
Rebuild the design in Google Slides on top of the uploaded template, keeping the placeholders. The sentinel colours let every event get its own theme automatically.

**P7: builder prompts for Claude (examples)**
- "In `engine/report-engine.js`, add a placeholder `{{female_speakers_pct}}` to the IP report, computed from a new `gender` column in speakers. Add a test, then run `node engine/test.mjs` and `node tools/build-n8n.mjs`."
- "Add an n8n workflow 06 that watches Drive /Inbox for files named `<event_key>__<type>.xlsx` and reuses the Normalise rows code from 01."
- "Write a YouTube Data API workflow: daily, list ETBrandEquity channel uploads since T-60 whose title contains the event hashtag, and upsert views, likes and comments into the social tab."

## 6. The deck template: predefined, editable, themed per event

1. **Predefined:** `templates/slides/report-template-ip.pptx` and `…-custom.pptx` are generated from the same layout code as the tested local decks. Upload both to Drive and open them as Google Slides (File → Save as Google Slides). Paste their IDs into each workflow's Config node.
2. **Themed per event:** template shapes and text in the sentinel colours (#FF00AA, #AA0077, #FFD6F0) are recoloured to the event's accent at build time. The accent comes from `events.accent_hex`, which Form 05 sets from the website.
3. **Add a slide:** duplicate a slide in the template, then type any `{{placeholder}}` from `templates/slides/PLACEHOLDERS.md`. For your own fields, type a new `{{key}}` and fill it in the `custom` tab.
4. **Delete a slide:** delete it in the template. To hide it only when data is missing, add `[[section:NAME]]`.
5. **Upload mechanisms:** Form 01 for every data tab, Drive `/Videos` for recordings, the `photos` tab for picture links.
6. **Versions:** each build copies the template into a **new** file named `… · v1` / `v2`, so a sent version is never overwritten. Template changes are tracked by Google Slides version history. Keep one template per model; duplicate it to "v2" before big redesigns.
7. **After the build:** the lead opens the copied deck in Slides, checks it, and can edit or comment with others in real time before sharing.

## 7. Users and logins

### Roles
| Role | Who | Can |
|---|---|---|
| Admin | You | Workflows, templates, sheet structure |
| Event lead | Per event | Everything for their events: approve insights and photos, build and share decks |
| Contributor | Video, social, delegate, sales, ops | Upload their data; edit their tabs |
| Reviewer | Leadership | View sheets, dashboards and decks |
| Sponsor viewer | Sponsor contacts | View only their event's finished deck |

### Phase 1: prototype on Google Workspace (no app to build)
- **Sheet:** share with the events team group. Use **protected ranges**: the `events` tab is editable by leads only, and each contributor tab by its team. Version history and "last edited by" give the audit trail.
- **Several people on the same event:** each tab is edited in parallel. The approval columns (`status` in insights and photos) are owned by the lead. Comments with @mentions are used for hand-offs.
- **Several people on the same deck:** Google Slides co-editing, suggestions and comments are built in. Each build creates a new file, so nobody's edits are overwritten.
- **n8n forms:** turn on the form trigger's **Basic Auth**, with one login per team. Add an "Your email" field if you want named entries in the `runs` tab.
- **Sponsors:** share the finished deck or PDF **with named email addresses only** (no "anyone with the link"). Turn off download, print and copy for viewers if needed.
  - Sponsors without a Google account can view through Google's **visitor sharing** with a one-time code, if your Workspace admin enables it. Check with IT.
  - Viewing analytics for external people are limited in Drive, so view tracking comes in Phase 2.
- **Leadership view:** Looker Studio on the Sheet: events, readiness, decks sent.

### Phase 2: pilot app (when the prototype proves value)
- **Lovable + Supabase**, using `prototype/report-workspace.html` and `docs/workspace-and-sponsor-views.md`.
  - Google SSO for staff.
  - Magic link plus one-time code for sponsors.
  - Row-level permissions per event membership.
  - Live presence ("Priya is reviewing quotes").
  - Locking an item while someone approves it.
  - An audit log.
- **n8n stays the engine.** The app calls the same workflows by webhook, and Supabase replaces the Sheet with the same columns, so the engine doesn't change.

## 8. Evals: how you know it works

| Layer | Eval | How | Pass bar |
|---|---|---|---|
| Engine | Golden-data tests | `node engine/test.mjs`, `node n8n/test-workflows.mjs` on every change | 100% pass |
| Upload | Per file | Run log: rows saved / rejected / merged; unmapped columns listed | 0 unexplained rejects |
| Numbers | Recompute by hand on one event | Pick 10 numbers per deck and recount from the sheet | 10/10 match |
| Transcripts | 3 real BWS recordings (keynote, panel, Hinglish byte) | Listen to every proposed quote's clip | ≥ 95% word-for-word correct; 0 invented |
| Speaker naming (panels) | Same recordings | Compare with who actually spoke | ≥ 90% correct; the rest flagged "Unknown" |
| Insight usefulness | Lead review | % approved without edits | ≥ 60% at pilot, rising |
| Theme | 3 event websites | Accent and hashtag match OneWorld Colors & Fonts | 3/3 |
| Deck | Every build | No leftover `{{` or `[[`, every data slide has a source line, empty sections hidden, PDF opens | 100% |
| Process | Each event | Deck sent by T+1 12:00; human minutes on T0 evening + T+1 | On time; < 2 hours |
| Outcome | Over editions | Sponsor opens and forwards (Phase 2), renewal rate | Tracked from the pilot |

## 9. Guardrails built in (and the ones you must keep)

**Built into the engine and workflows:**
1. Numbers come only from sheet rows. AI never writes a number into the deck.
2. AI output must be found in its source:
   - Quotes must appear word for word in the transcript.
   - Theme values must appear in the page.
   - Headline numbers must appear in the quote.
3. Only approved quotes, photos and market stats are used. Everything AI-made starts as `pending`.
4. Gemini may only name speakers listed in the video plan. Otherwise the speaker is "Unknown".
5. Mobile numbers are never stored. Attendee names appear only in a Custom sponsor's own deck, never in IP decks.
6. Each data slide carries a source line and an as-of date. A section with no data is removed, not shown empty.
7. The build is blocked when key data is missing, and the reason is shown on the form.
8. Re-uploading the same file updates rows instead of duplicating them (`row_key`).
9. Every run is logged in the `runs` tab.
10. Each build makes a new file, so sent versions are never overwritten.

**Process guardrails you keep:**
- Decks go to the event lead, never straight to sponsors. A person shares them.
- No scraping of LinkedIn, Instagram or YouTube.
- Sponsor sharing goes to named emails only.
- Use a Gemini paid-tier key with a monthly budget cap.
- Legal confirms how attendee data may be stored (DPDP).
- Editorial policy on quoting speakers applies.

## 10. Step-by-step build (about 2–3 weeks part-time)

| Step | What you do | Tool | Done when |
|---|---|---|---|
| 1 | Create a Google Cloud project; enable the Drive, Sheets, Slides and Gmail APIs; create an OAuth client (web) with your n8n callback URL | Google Cloud Console | Client ID and secret ready |
| 2 | In n8n, create credentials: Google Sheets OAuth2, Google Drive OAuth2, Google Slides OAuth2, Gmail OAuth2 (same client), and a **Query Auth** credential named `Gemini key` with parameter `key` = your AI Studio key | n8n | All 5 credentials test OK |
| 3 | Import `data/report-studio-data-sample.xlsx` into Google Sheets (File → Import → Replace spreadsheet). Later make a clean copy from `…-template.xlsx` for real events | Sheets | 17 tabs visible |
| 4 | Create Drive folders: `Report Studio/Videos`, `/Inbox`, `/Decks`, `/Templates` | Drive | IDs copied |
| 5 | Upload `templates/slides/report-template-ip.pptx` and `…-custom.pptx` to `/Templates`; open each with Google Slides → File → Save as Google Slides | Drive / Slides | 2 Slides IDs copied |
| 6 | Import `n8n/workflows/01…05-*.json`. In each, set the Config node IDs, pick credentials on every Google and Gemini node, and set the Videos folder in 02's trigger | n8n | No red warnings |
| 7 | Activate 01, 03 and 05 (forms) and 02 and 04 (triggers). Copy the form URLs; turn on Basic Auth on the forms | n8n | Form pages open |
| 8 | **Smoke test:** open Form 03, event `etbe-bws-2025`, version `draft`, your email | n8n | Email arrives with a Slides link and PDF; compare with `out/etbe-bws-2025_IP_v1.pptx` |
| 9 | Same for `etbe-northwind-25` (Custom) | n8n | Custom deck arrives |
| 10 | Form 01: upload `samples/linkedin_page_export_sample.csv` as social / LinkedIn, then re-upload it | n8n | Second upload updates rows, no duplicates |
| 11 | Drop a short test clip into `/Videos`, named like a `video_plan` row (e.g. `BYTE_NA_SocialbyteTicTac_Kapil-Grover.mp4`), and wait 5–10 minutes | Drive + n8n 02 | Insights appear as `pending` with quotes you can find in the clip |
| 12 | Form 05 with the BWS 2025 website URL | n8n | `events` row shows accent #E7425F and #ETBWS2025 |
| 13 | Restyle the templates in Slides if wanted (P6), keeping placeholders and sentinel colours. Add one custom slide with `{{award_line}}` and rebuild | Slides | The custom value appears |
| 14 | Share the Sheet and folders with the team using protected ranges; set up the Looker Studio dashboard | Workspace | Team can work in parallel |
| 15 | Run the evals in §8 on 3 real BWS recordings and one real OneWorld export | You + leads | Pass bars met |
| 16 | **Pilot:** next BrandEquity event: events row at T-30, video plan by T-3, uploads on T0 evening, approvals and build at T+1 morning, share by noon | All | Sent by T+1 12:00 |

**Keeping it in sync:** after any engine change, run `node engine/test.mjs && node n8n/test-workflows.mjs && node tools/build-n8n.mjs`, then re-import the changed workflows. Claude Code can do this in the repo with one prompt.
