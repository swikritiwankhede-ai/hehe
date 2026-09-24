# Building on Lovable: Integrations

This follows on from `lovable-prompt.md` (Prompts 1–5). It covers:
- whether each requested integration is feasible on Lovable
- the setup each one needs outside Lovable
- Prompts 6–11 to paste after the foundation is built

> Lovable features and third-party API terms change often. Check current Lovable, Google, LinkedIn and transcription-vendor docs before committing to a design. The answers below are what a well-scoped build needs, not guarantees about any vendor.

## 1. Feasibility

| Need | On Lovable? | How | Main constraint |
|---|---|---|---|
| **Attendee data from an Excel upload** | ✅ Easy | Parse `.xlsx` / `.csv` in the browser (SheetJS). Map columns once and save the mapping as "OneWorld export" | None; best starting point |
| **Attendee data from the OneWorld backend** | ⚠️ Possible, **needs ET engineering** | Edge function calls an OneWorld API (registrations, attendees, wishlist, speakers, sponsors, agenda) on a schedule | Needs an API or export endpoint with a token. Personal data would leave ET systems for Lovable's backend (Supabase), which needs **data-governance / DPDP sign-off** |
| **Audio files from Google Drive** | ✅ | Google **service account**; the event's Drive folder is shared with it. An edge function lists `/Audio` and `/Photos` | Long audio is large; pass files to transcription **by URL, asynchronously**, not through the edge function's memory |
| **Transcription** | ✅ via an external API | Edge function sends the audio to a speech-to-text vendor (e.g. OpenAI Whisper API, Deepgram, AssemblyAI, Google Speech-to-Text) with an API key in Lovable secrets | Pay per audio minute; Indian English and Hinglish quality varies by vendor, so test 2 on real BWS audio |
| **Summary, quotes and themes "through a prompt"** | ✅ | LLM call (Lovable AI or your own key) on the transcript: 3-line session summary, verbatim quotes, theme tags matched to the event's announced themes | Quotes must be checked as **exact substrings** of the transcript; summaries need approval |
| **LinkedIn post links → impressions** | ⚠️ **Partly** | Paste post URLs into a post register. Impressions come from **(a)** LinkedIn's Community Management API for the ETBrandEquity page (needs app approval + page-admin token), or **(b)** the page's analytics export uploaded as a file and matched by post URL | **Impressions cannot be read from a public post URL.** They are private page analytics. API access needs LinkedIn approval (plan for weeks). Start with (b) |
| **Theme of each post** | ✅ | LLM tags the post caption (from the export or pasted in) with the event's themes | None |
| **Prominent event photos** | ✅ | Photos synced from Drive `/Photos`. A vision model scores each one (stage / speaker / audience / partner branding, sharpness, faces). Photo time (EXIF) is matched to the agenda to link photo → session → speaker | Face recognition of named people is sensitive; match by **time and session** instead, and let a person confirm |
| **Generate PPT** | ✅ | pptxgenjs in the browser (Prompt 3) | None |
| **Login for events team only** | ✅ | Google sign-in restricted to the company domain | Confirm this is allowed for an internal tool on an external host |

**Verdict:** Lovable works well for a **pilot on one BWS edition**:
- Excel upload for attendees
- Drive for audio and photos
- a transcription API
- LinkedIn via the page-analytics export

For production, get ET engineering to agree on the OneWorld API, and settle where personal data is stored. That may mean moving the backend into ET's own stack later; the Lovable front end can be kept.

## 2. Setup outside Lovable (checklist)

1. **Google Cloud project:**
   - enable the Drive API
   - create a **service account** and download its JSON key
   - add the key to Lovable secrets as `GOOGLE_SERVICE_ACCOUNT_JSON`
2. **Drive folder per event:**
   - structure: `BWS 2025/Audio`, `BWS 2025/Photos`
   - share it (view only) with the service account email
   - naming rule for audio: `HHMM_<track>_<session-title>.mp3`, so files map to sessions automatically
3. **Transcription vendor:**
   - pick one after testing 2 on 3 real session recordings
   - add `TRANSCRIBE_API_KEY` and `TRANSCRIBE_PROVIDER`
4. **LinkedIn:**
   - **Now:** a page admin exports post analytics for the date range (T-60 → T+14) and uploads the file. This is one export instead of opening each post.
   - **Later:** apply for Community Management API access for the ETBrandEquity page, then add `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_ORG_URN`.
5. **OneWorld:** ask engineering for read-only endpoints or a nightly export of:
   - registrations, attendees (check-in), shortlisted, wishlist
   - speakers, sponsors, agenda
   - with an API token

   Until then, use Excel exports from the portal.
6. **Data governance:** agree which personal fields may be stored outside ET systems, and for how long. Suggested:
   - name, designation, company and status are kept
   - email is kept only for dedupe (or hashed)
   - mobile is not kept

## 3. Prompts (paste after Prompts 1–5)

### Prompt 6: Excel import with saved mappings

```
Replace the CSV-only import with Excel + CSV import using SheetJS (xlsx):
- On each Data Sources card, accept .xlsx, .xls and .csv. If the workbook has several sheets, let the user pick one.
- Show a column-mapping step: detected column → our field (e.g. "Official Email" → email, "Designation" → designation, "Conversion Source" → conversion_source).
  Auto-suggest the mapping by fuzzy header match, and let the user save the mapping as a named preset (e.g. "OneWorld Registrations export").
  Next time a file with the same headers is uploaded, apply the preset automatically.
- Show a preview of the first 20 rows, row count, and rows rejected with reasons (missing email, bad date).
- Upsert by email (lowercased) for people and by (event, email) for registrations. Never create duplicates.
- Data minimisation:
  - do not store mobile numbers
  - add a setting "Store emails as hash only" (SHA-256), used for dedupe and joins
- Log every import (file name, sheet, preset, rows added / updated / rejected, user, time) on the source card.
```

### Prompt 7: Google Drive connector (audio and photos)

```
Add a Google Drive connector using a service account (secret GOOGLE_SERVICE_ACCOUNT_JSON) in a Supabase Edge Function.
- Event settings: "Drive folder URL". Parse the folder ID. Expect subfolders "Audio" and "Photos"; show an error naming any that are missing.
- "Sync from Drive" button, plus a scheduled sync every 30 minutes on event day (pg_cron):
  - list files in Audio/ and Photos/ (name, id, mimeType, size, createdTime, modifiedTime, imageMediaMetadata.time if present)
  - upsert them into media_assets with drive_file_id; skip unchanged files
- Photos:
  - download them to Supabase Storage at max 2000px
  - keep the EXIF capture time
- Audio:
  - do NOT download into the edge function
  - store drive_file_id and size; transcription fetches it separately (Prompt 8)
- Auto-link each file to a session:
  1. filename pattern HHMM_<track>_<title> first
  2. otherwise the photo's capture time falls inside a session's start–end on that track
  3. otherwise leave it "unassigned" for the user to pick
- The Media tab shows audio and photo lists with session, speaker(s) of that session, status and a manual override.
```

### Prompt 8: Transcription, session summary, quotes and themes

```
Add an async transcription pipeline:
- Table transcription_jobs(id, media_asset_id, provider, status queued|running|done|failed, provider_job_id, error, started_at, finished_at).
- "Transcribe" button per audio file, and "Transcribe all unassigned-free" for all files linked to a session.
- Edge function `transcribe-start`:
  - creates a short-lived download URL for the Drive file (or streams it to temporary Storage)
  - submits it to the provider set in TRANSCRIBE_PROVIDER with TRANSCRIBE_API_KEY
  - asks for timestamps and speaker diarisation
  - stores provider_job_id
- Edge function `transcribe-poll` (every 2 min via pg_cron) or a provider webhook stores the transcript: text plus segments with start / end / speaker label.
- When a transcript is done, call the LLM ONCE per session with:
  - the transcript
  - the session title, speakers and the event's announced themes (from event settings / Key Discussion Points)

  Ask for JSON:
  - summary: 3 bullet lines, max 25 words each
  - quotes: 3–5 items {text, segment_start}
  - themes: 1–3 of the event's announced themes, each with a confidence
- Validation before saving:
  - every quote must be an EXACT substring of the transcript (after whitespace normalisation); drop any that are not
  - themes must be from the announced list
- Map each quote to a speaker: use the diarisation label if the user has mapped labels to people, otherwise ask the user to pick from the session's speakers.
- Everything is saved as pending. Section 8 ("What speakers said") shows only approved quotes, each paired with an approved photo of that speaker.
- Section 6 ("Content delivered") adds "Themes covered": sessions per theme, from approved theme tags.
```

### Prompt 9: LinkedIn posts, impressions and themes

```
Add a Post register for social posts, starting with LinkedIn:
- Paste one or many post URLs. Parse the activity/share ID from URLs like:
  - linkedin.com/posts/...-activity-<id>-...
  - linkedin.com/feed/update/urn:li:activity:<id>
  Store the platform, url, post_id and optional caption.
- Impressions, route A (default): "Upload LinkedIn page analytics export" (.xlsx).
  - Map the columns once with a saved preset: post link / URN, created date, impressions, reach or unique impressions if present, clicks, reactions, comments, reposts, engagement rate.
  - Match rows to the register by post ID; show unmatched rows so they can be added.
  - Each upload creates a social_snapshot with captured_at.
- Impressions, route B (only when LINKEDIN_ACCESS_TOKEN and LINKEDIN_ORG_URN are set): an edge function fetches per-post statistics for the organisation through LinkedIn's official API and stores a snapshot daily until T+14. If the call fails, show the error and fall back to route A. Never scrape linkedin.com.
- Theme per post: the LLM tags each caption with 0–2 of the event's announced themes (saved as pending → approved).
  Social reach adds "Impressions by theme" and "Top 5 posts" (impressions, theme, date).
- Keep the agreed windows: pre-event = post date → event start; during = event days. Show absolute numbers next to the per-day multiplier.
- Same pattern for Instagram, Facebook, YouTube and X: register URLs now, upload each platform's export; APIs later.
```

### Prompt 10: Prominent photo picks

```
Add a photo scoring and selection step for photos synced from Drive:
- For each photo, call a vision-capable model and store JSON:
  - scene: stage | speaker_closeup | panel | audience | networking | partner_branding | studio | other
  - quality: sharpness, lighting and composition, each 1–5
  - people_count
  - brand_visible (text of visible logos or banners, if any)
  - caption_draft (max 12 words)
- Prominence score = quality average + bonus for stage/speaker/panel scenes in keynote or main-stage sessions + bonus when people_count > 20 for audience shots.
- "Suggest 12":
  - pick the highest scores with variety: at least 3 stage/speaker, 2 audience, 2 networking, 2 partner_branding, 1 studio
  - at most 2 photos per session
- Link photos to speakers only through session time and user confirmation. Do NOT identify people by face.
- The user approves, reorders or swaps photos. Only approved photos appear in section 13 and in the PPT.
```

### Prompt 11: OneWorld backend connector (when engineering provides access)

```
Add an "OneWorld" connector alongside Excel import:
- Settings: base URL, API token (secret ONEWORLD_API_TOKEN), event ID in OneWorld.
- Edge function `oneworld-sync` pulls, in order: event details, sponsors (with group), speakers (with status), agenda, registrations (with lead / visitor / conversion source), shortlisted, attendees (check-in time), wishlist users.
  Use pagination; upsert with the same rules as the Excel import; apply the same data-minimisation settings.
- Schedule:
  - daily from T-7
  - hourly on event day (for check-in)
  - once at T0 close before the report is built
- On the Data Sources page each card shows "OneWorld · synced <time>" or "Excel · imported <time>". Excel upload stays available as a fallback.
- Log each sync (records fetched / changed / failed). A failed sync turns the related readiness items amber.
```
