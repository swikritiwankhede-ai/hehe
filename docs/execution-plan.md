# Execution plan: removing the manual dependencies

How each requirement is built so the post-event report assembles itself on the event day, with people only **defining** inputs beforehand and **approving** outputs afterwards.

Templates referenced here are in `templates/`:
- `video-plan-template.xlsx`
- `attendee-upload-template.xlsx`
- `speaker-template.xlsx`

> Third-party API names, metrics and approval rules (LinkedIn, Meta, YouTube, transcription vendors) change often. Check each against the current vendor docs during Sprint 0; the plan notes where a fallback is needed.

---

## 0. The principle: define before, approve after

| Before the event (T-7 → T-1) | On the day (T0) | After (T0 night → T+1) |
|---|---|---|
| Team defines **leaders**, **video types** (video plan), **post accounts** and **theme** | Machines watch Drive, OneWorld and social accounts; process as files and posts arrive | People approve insights, photos and numbers; generate PPT |

Everything that used to be manual matching (which file is whose, which post belongs to the event, which photo goes with which quote) moves into the **video plan** and **naming rules** defined up front.

## 1. Architecture at execution level

```
 OneWorld (event, theme, speakers, photos, registrations)      Google Drive (event folder: /Videos, /Photos)
          │  API / nightly export / template upload                     │  Drive API changes feed (every 5 min on T0)
          ▼                                                             ▼
 ┌────────────────────── Supabase (Postgres + Storage + Auth) ─────────────────────────┐
 │  events · themes · speakers · attendees · video_plan · media_files · transcripts   │
 │  insights · photos · social_accounts · social_posts · social_snapshots · market_stats│
 └──────────────────────────────────────────────────────────────────────────────────────┘
          ▲                         ▲                                  ▲
 Edge functions (light jobs)   Media worker (heavy jobs)        Social sync (scheduled)
 - OneWorld sync               - download video from Drive      - LinkedIn org posts + stats
 - Excel import                - ffmpeg: audio, frames          - YouTube channel videos + analytics
 - LLM insight extraction      - transcription job submit       - Instagram media + insights
 - classifiers                 - thumbnail / frame pick         - daily snapshot to T+14
          │
          ▼
 Lovable front end: Intake · Review queues · Report page · Generate PPT (theme_id)
```

**Why a separate media worker:** event videos are 0.2–2 GB. Supabase edge functions have tight memory and time limits and can't run ffmpeg. Run a small container worker, e.g. Google Cloud Run, Render or Railway with ffmpeg installed. It reads a job queue table (`media_jobs`) and writes results back.

An alternative that avoids ffmpeg for audio: some transcription vendors accept a **video URL** directly and extract the audio themselves. Confirm with the chosen vendor. The worker is still needed for thumbnails and frames.

---

## 2. Videos: same-day transcripts, speaker tags, photos and insights

### 2a. Before the event: the video plan (removes the matching dependency)
- The events team fills `templates/video-plan-template.xlsx` (or the same form in the platform) by **T-3**. One row per expected video:
  - video type: Panel, Keynote, Fireside chat, Social byte (TicTac), Reel, 5D byte, ET Studio, Partner speaker byte, Crowd/montage
  - leader(s), from the speaker list
  - session time and hall
  - sponsor, for partner videos
  - channels
  - expected by
- The sheet **builds the exact file name** the video team must use, e.g.:
  - `1140_Audi1_Panel_Rohit-Bhasin_Ashwin-Moorthy`
  - `BYTE_NA_SocialbyteTicTac_Kavita-Jagtiani`
- The platform creates the **Drive folder structure** for the event and shares it with the video team:
  ```
  ETBrandEquity/BWS 2025/
    Videos/     ← uploads with plan file names (or subfolders named after the leader)
    Photos/     ← event photos, any names
  ```
  Use a **Shared Drive** so files don't disappear when a freelancer's account is removed. Share it view-only with the platform's service account.

### 2b. On the day: pipeline per uploaded video

| Step | What runs | How | Output |
|---|---|---|---|
| 1. Detect | Drive **changes** API polled every 5 min on T0 (push notifications via `changes.watch` if the endpoint is public) | Service account | New `media_files` row |
| 2. Match to plan | Name matcher | Exact plan file name → fuzzy (leader names in name or parent folder) → agenda time + hall | `video_plan_id`, leader(s), type; unmatched → review list |
| 3. Wait for upload to finish | Size stable across 2 polls | — | Ready to process |
| 4. Audio | Media worker: `ffmpeg -i in.mp4 -vn -ac 1 -ar 16000 out.m4a` (or the vendor takes the video URL) | Streams from Drive | Small audio file |
| 5. Transcribe | Vendor with **diarisation** and word timestamps (test 2 vendors on 3 real BWS recordings for Indian English) | Async job + webhook | Transcript with segments `speaker A/B/C` |
| 6. Who said what | See 2c | Rules + LLM + review | Each segment tagged to a named leader |
| 7. Leader photo | See 2d | Frames + fallbacks | `photo_url` per leader per video |
| 8. Insights | See 2e | LLM with strict checks | 1–3 insight cards per leader |
| 9. Notify | In-app + chat | — | "Panel 11:40 transcribed: 6 insights waiting for approval" |

**Timing:** a 45-minute panel usually transcribes in a few minutes. With 5-minute polling, a video uploaded at 13:00 typically has insights in review by about 13:20. Everything on the plan should be processed by the evening of T0.

### 2c. Tagging speakers by name, as mentioned in the transcript
Diarisation only gives `Speaker A`, `Speaker B`; it doesn't know names. Assign names in this order and stop at the first that works:
1. **Single-leader videos** (bytes, keynotes, Studio): the plan says who it is, so every segment belongs to that leader. Confidence: high.
2. **Panels:** the plan lists the panellists and the agenda gives the moderator. An LLM reads the transcript with that fixed list and maps each diarised label to a name. It uses mentions ("Over to you, Prabha", "I'm Rohit from Kotak") and self-introductions. It returns `{label: name, evidence: "<quote>", confidence}`.
   - It may only choose from the plan's list.
   - Each piece of evidence must be an exact substring of the transcript.
   - Unmapped labels stay "Unknown speaker".
3. **Review:** any mapping below high confidence goes to a one-click review showing a 10-second clip per label: "Speaker B is… [Rohit Bhasin ▾]".

No voice biometrics or face recognition is used to identify people. That keeps it out of sensitive-data territory under DPDP, and the plan plus transcript is enough in practice.

### 2d. Leader photo: thumbnail first, then OneWorld, then the website
Priority for each leader, per video:
1. **Video thumbnail / best frame (single-leader videos only).**
   - Take the Drive thumbnail, and extract 8 frames spread across the video with ffmpeg.
   - Score each frame: sharpness (variance of Laplacian), exactly one large face (face *detection* only, no identification), eyes open, no motion blur.
   - Keep the best frame, cropped to the head and shoulders.
2. **Panels:** frames contain several people and the system can't tell who is who without face recognition, so skip to 3.
3. **OneWorld speaker photo** (Speakers module).
4. **Website speaker photo** (the same speaker card's image).
5. **Manual upload** on the speaker page.

Each photo stores its `source` and the leader's name. The review screen shows the chosen photo with the alternatives, so one click swaps it.

### 2e. "Targeted insights" against the leader's photo
The LLM runs once per leader per video with:
- that leader's segments only
- the event theme line and the announced session themes
- the leader's designation and company

It returns 1–3 insights:
```json
{ "headline": "Short paraphrase ≤ 12 words",
  "quote": "exact words from the transcript",
  "start_sec": 1312, "theme": "AI in marketing",
  "type": "number | prediction | advice | stance",
  "has_number": true }
```

Rules the system enforces, not the model:
- `quote` must be an **exact substring** of that leader's segments (whitespace-normalised). Otherwise it's dropped.
- Rank insights that contain a **number** or a clear prediction first. These are the "targeted insights" sponsors quote.
- A number in the headline must also appear in the quote. The model can't add numbers.
- Every insight starts as **pending**. The events team approves, edits the headline, or rejects.

**Output card** (report section "What leaders said" and the PPT): photo · name · designation, company · headline · verbatim quote · theme tag · a "Watch at 21:52" link to the video.

### 2f. Additional event photos (same Drive link, `/Photos`)
- Sync every 15 minutes on T0.
- Keep the EXIF capture time and resize to 2000 px.
- **Near-duplicate removal:** perceptual hash, then keep the sharpest of each burst.
- **Scene tagging** (vision model): stage, panel, audience, networking, partner branding, studio.
- **Quality score:** sharpness, exposure, composition.
- **Link to a session** by capture time + hall. No face identification.
- "Suggest 12": the best mix, e.g. at least 3 stage, 2 audience, 2 networking, 2 branding, and at most 2 per session.

---

## 3. Social media numbers: pulled from the source, not exported by hand

### 3a. Connect accounts once per vertical (one-time, by an account admin)
| Platform | Account | Connection | Needs |
|---|---|---|---|
| LinkedIn | ETBrandEquity company page | OAuth by a page **admin**; LinkedIn **Community Management API** | LinkedIn app approval (plan for weeks; start now) |
| YouTube | ETBrandEquity channel | OAuth by the channel owner/manager; YouTube Data API + YouTube Analytics API | Google Cloud project; OAuth consent |
| Instagram | ETBrandEquity professional account linked to a Facebook Page | Meta app + Instagram Graph API | Meta app review for insights permissions |
| Facebook | ETBrandEquity Page | Same Meta app | Same |

Tokens are stored encrypted, one row per account in `social_accounts`. There's a health check every day; an expired token alerts the account owner with a reconnect link.

### 3b. Find the event's posts automatically (no link collection)
The verticals keep posting as usual. The platform discovers posts:
- **Window:** from the first promo post date (default T-60) to T+14.
- **Match rule:** the caption or title contains any of the event's **keys**:
  - hashtag `#ETBWS2025`
  - "Brand World Summit"
  - "BWS 2025"
  - speaker names
  - the event URL
- **Per platform:**
  - LinkedIn: list the organisation's posts in the window, then fetch per-post share statistics (impressions, clicks, reactions, comments, reposts).
  - YouTube: list the channel's uploads playlist in the window, then match by title/description. Views, likes, comments and watch time come from the Data/Analytics APIs. Thumbnail *impressions* may only be in YouTube Studio or bulk reports; verify.
  - Instagram: list the account's media in the window, match by caption, then fetch media insights. Meta renamed and retired several metrics in 2024–25 ("views"/"reach"); use whatever the current API offers and label it accurately.
- **Review list:** "Found 43 posts; 3 unsure". The team ticks or unticks the unsure ones. Post links pasted by a vertical still work as an **override** for anything the rule missed.
- **Snapshots:** daily until T+14. The report shows **pre-event** (post date → event start) and **event-day** (event dates) numbers, with the "as of" date.
- **Fallback:** if an API isn't approved yet, upload that platform's **page-level export** once, and match rows by post URL. Never scrape.

---

## 4. Design from OneWorld (the event's theme)
Already specified in `docs/theme-id-spec.md`:
- OneWorld Event Website → Colors & Fonts + Templates → `thm_<vertical>-<series>_<year>_v<n>`
- approved once, frozen per report version
- the PPT reads only the frozen theme

**Execution:**
- Pull daily from T-30 via the OneWorld API, or the nightly export.
- Until ET engineering provides either, the Owner copies the 12 fields into the platform form, which uses the same labels as OneWorld. This takes about 2 minutes.

---

## 5. Attendees: OneWorld, the built-in template, or any file
Three routes, one import pipeline:

| Route | When | How |
|---|---|---|
| **OneWorld sync** | Default, once the export/API works | Nightly from T-7, hourly on T0 for check-in |
| **Built-in template** | OneWorld unavailable, or teams keep their own lists | "Download template" on the Attendees step gives `attendee-upload-template.xlsx` with the **Event Key prefilled**, dropdowns for Status/Lead Source, an instructions sheet and no mobile column. It can be shared with agencies. Uploading it needs **no mapping** (headers are known). |
| **Own file** | Someone made their own sheet | Upload any .xlsx/.csv, then column matching with saved presets (Prompt B) |

All routes then:
- validate (email, designation and company required)
- dedupe by email
- derive seniority, industry and city
- upsert and log the import

Rows with a wrong Event Key are rejected, so a file can't land in the wrong event.

---

## 6. Speakers and photos: OneWorld first, add on the platform
- **Sync from OneWorld Speakers:** name, designation, company, photo, group, weightage. Link each speaker to the agenda sessions.
- **Add on the platform:** an "Add speaker" form, or bulk via `speaker-template.xlsx`, with photo upload. Duplicates are caught by normalised name + company.
- A manual edit is marked `source = platform` and isn't overwritten by the next OneWorld sync. The team sees a "OneWorld differs" flag instead.

---

## 7. Speaker representation: seniority, location, industry

| Dimension | How it's filled | Confidence handling |
|---|---|---|
| **Seniority** | Rule on designation: CXO / VP / Director / Manager / Guest / Other (PRD §6) | Rule; "Other" is listed for a quick fix |
| **Location** | OneWorld speaker city, else registration city, else the template's City | No guessing from company HQ. Blanks show as "Not stated" and are counted |
| **Industry** | Company → industry **lookup table** built up across events; for new companies an LLM suggests one from the fixed 19-industry list (same list as the template) | Suggestions are pending until confirmed once. After that the company is in the lookup forever |

Report outputs:
- Speakers by seniority. BWS 2025, from the website list with this rule: 26 of 35 CXO (74%), 4 VP, 4 Director, 1 Guest.
- Speakers by industry: top 6 plus Other. For BWS 2025, 5 speakers still need a company before industry can be set.
- Speakers by city.
- The same three for attendees.

Every chart shows its n and how many are "Not stated". The existing leader-vertical classifier ("Project Uday") can be reused for the industry suggestion step.

---

## 8. Market insights by vertical, aligned with the event theme
A **market stats library**: `market_stats(vertical, statistic, value, unit, source_name, source_url, published_year, theme_tags[], status, reviewed_by, reviewed_at)`.

**Sources, in order of trust:**
1. The event's own website and sales deck (e.g. the stats already on the BWS pages).
2. Recognised industry reports for marketing/advertising, e.g. FICCI-EY media & entertainment reports, agency adspend forecasts, IAMAI/Kantar internet reports. Add each one with its URL and year.
3. **Numbers said on stage:** insights from §2e with `has_number = true`, shown as "said by <leader>", not as market fact.

**Execution:**
- At event setup the platform proposes library stats whose `theme_tags` match the event's theme (e.g. AI in marketing, Gen Z, Bharat consumers).
- An "AI research assist" can **suggest** new stats, but each needs a real source URL and year, and a person must open the link and confirm before approval. The model never writes a number into the report by itself.
- Stats older than 24 months are flagged. The library is reviewed once a year per vertical.

---

## 9. Event-day runbook (who does what)

| Time | People | Platform |
|---|---|---|
| T-7 | Owner: theme approved; speakers synced/added; post keys set | Checks readiness, sends the T-7 digest |
| T-3 | Events team: **video plan** complete; Drive folders shared | Shares the file-name list with the video team |
| T0 morning | Video team: uploads start with plan names | Drive watch every 5 min |
| T0 all day | — | Transcribe → tag → photo → insights as files land; social discovery hourly; check-in sync hourly |
| T0 18:00 | Video team gets a list of "Expected, not received" | Automatic from the plan |
| T0 22:00 | Owner: readiness 5/7 → nudges | — |
| T+1 09:00–12:00 | Editors: approve insights (≈20 min), photos (≈10 min), speaker tags (≈5 min) | Review queues |
| T+1 12:00 | Owner: freeze v1 → Generate PPT → send | theme_id stamped |
| T+14 | — | Final social snapshots → v2 on the same theme |

---

## 10. Build sequence (sprints of 2 weeks)

| Sprint | Build | Done when |
|---|---|---|
| 0 | Accounts and approvals: LinkedIn CMA application, Meta app, YouTube OAuth, Drive service account, transcription vendor test, OneWorld API ticket, DPDP note | Every "needs" in §3a has an owner and a date |
| 1 | Data model, OneWorld sync (or form), speakers + manual add, templates download/upload, attendee import, seniority/industry/location | BWS 2025 speakers and a template upload work end to end |
| 2 | Video plan, Drive watch, media worker (ffmpeg), transcription, single-leader tagging, thumbnail photo | A byte uploaded to Drive shows a transcript and photo within 20 min |
| 3 | Panel speaker mapping + review, insights with the substring check, insight cards, photos folder | A real BWS panel gives correctly named insights after one review |
| 4 | Social discovery + snapshots (whichever APIs are approved), export fallback, market stats library | Pre/event-day numbers match a manual export within 2% |
| 5 | Report sections + Generate PPT with theme_id, readiness, notifications, dry run on a past event | Full dry run on BWS 2025 data by T+1 noon |

## 11. What still depends on others (and the workaround)

| Dependency | Owner | Workaround until done |
|---|---|---|
| OneWorld API/export (speakers, photos, registrations, theme) | ET engineering | Templates + theme form |
| LinkedIn Community Management API approval | Social team + LinkedIn | Page-level export upload |
| Meta / YouTube OAuth by account owners | Social team | Exports |
| Video team using plan file names | Video lead | Fuzzy match + a 1-minute manual assign per stray file |
| Transcription accuracy on Indian English/Hinglish | Product | Choose a vendor after the test; human edits quotes only |
| DPDP sign-off | Legal | Hash emails; no mobile; aggregates only outside ET |

## 12. Lovable prompt G: video plan, media pipeline and social discovery

```
Add same-day media and social automation. Read docs/execution-plan.md sections 2–3 and follow them.
1. Video plan: table video_plan(id, event_id, video_type, leaders text[], company, session_time, hall, sponsor, channels text[], expected_by, planned_filename, status expected|received|processed|missing). Upload templates/video-plan-template.xlsx or edit in a grid. planned_filename follows HHMM_Hall_Type_First-Last[_First-Last] ('BYTE' and 'NA' when blank).
2. Drive watch: service-account edge function polls Drive changes every 5 minutes on event day (pg_cron) for the event's Videos/ and Photos/ folders. New video → media_files row → match by exact planned_filename, then leader names in file or parent folder name, then session time + hall; unmatched go to a review list with a plan-row dropdown.
3. Media worker (external container with ffmpeg; call it via a webhook with a shared secret): for each matched video, extract mono 16 kHz audio and 8 frames, and return the audio URL + frame URLs. Submit the audio to TRANSCRIBE_PROVIDER with diarisation; the webhook stores segments.
4. Speaker tagging: single-leader types → all segments belong to that leader. Panels → one LLM call with the plan's names only; it returns label→name with evidence that must be an exact substring; low confidence → review showing a 10-second clip per label.
5. Leader photo: single-leader videos → best frame by sharpness + one large detected face (no face identification); panels or no good frame → OneWorld photo → website photo → manual upload. Store photo_source.
6. Insights: one LLM call per leader per video → 1–3 {headline, quote, start_sec, theme, type, has_number}. Drop a quote if it isn't an exact substring of that leader's segments; drop a headline number not present in the quote. Status pending; the review queue shows the photo, name, headline, quote and a play-from-timestamp link.
7. Social discovery: social_accounts per vertical (OAuth, encrypted tokens, daily health check). The event has post_keys (hashtag, names, URL). Daily from T-60 to T+14, list each account's posts in the window, match captions/titles to post_keys, fetch per-post stats, and store social_snapshots. An unsure list lets the team tick/untick; pasted URLs override. If a platform isn't connected, show "Upload page export" instead.
8. Downloads on the Attendees and Speakers steps: serve templates/attendee-upload-template.xlsx and templates/speaker-template.xlsx with the Event Key prefilled; uploads with these headers skip column mapping.
```
