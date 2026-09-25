# Build it yourself: the no-code playbook

How a product manager with no engineering team builds Report Studio end to end:
- intake
- media and insights
- social numbers
- report
- PPT
- sponsor links

The builder is **Lovable**, with its built-in backend (Lovable Cloud: database, login, file storage, server functions, scheduled jobs). **Gemini** is the AI. You write prompts, test with the sample files in this repo, and approve. You never write code.

This playbook puts the prompts from earlier docs into **one build order** and adds the missing ones (K–N below).

**Scope: everything except the OneWorld and social-media integrations.** Those two need a tech team (API access, app approvals), so they are built later as connectors. In the no-code product they come in as **file uploads** through the same screens:

| Source | In the no-code build | Later, with tech |
|---|---|---|
| OneWorld: registrations, check-in, wishlist, speakers, sponsors | Upload the OneWorld export or the built-in template; paste a OneWorld page into the Add data box | OneWorld API connector (`docs/lovable-integrations.md` Prompt 11) |
| Social: LinkedIn, Instagram, YouTube | Upload each platform's own analytics export (LinkedIn page analytics, Meta Business Suite, YouTube Studio) at T+1 and T+14 | Official API connectors (`docs/execution-plan.md` §3) |

Because every upload lands in the same tables a connector would fill, the report, PPT and sponsor page don't change when the connectors arrive.

> Tool names, plans, prices and API limits change. Check each vendor's current pages when you set up. Anything marked *(check)* is worth confirming in Week 0.

---

## 0. Choosing the tool

The product needs:
- a database
- company login
- file storage (audio, photos)
- server functions that hold secret keys (Gemini)
- scheduled jobs (every 5 minutes on event day, daily to T+14)
- PPT generation
- a public sponsor page

A tool has to do all of these from prompts.

| Tool | What it's good for here | Builds the working product? | Watch out for |
|---|---|---|---|
| **Claude Design** | Designing the screens: workspace, intake, report, sponsor page. Fast visual iteration from the prompt in `docs/intake-prompts.md` | **No.** It makes designs and prototypes, not a running app with a database, login, secrets and scheduled jobs | Use it first for the look, then hand the screens (images or exported HTML) to the builder |
| **Lovable** (recommended) | Full app from prompts, with built-in backend (database, login, storage, server functions), GitHub backup | **Yes** | Heavy video must be reduced to audio in the browser first (Prompt L) |
| **Replit Agent** | Full app with a real server, so it can run ffmpeg for video directly; built-in database, secrets, scheduled deployments | **Yes** | UI is less polished by default (give it the screenshots); check Google sign-in domain restriction |
| **Firebase Studio / Google AI Studio "Build"** | Google-native: Gemini, Google sign-in, Drive, YouTube in one place; scheduled functions | **Yes**, but more technical when it breaks | Server functions and schedules need the paid Firebase plan; more setup screens |
| **Bolt.new** | Similar to Lovable (prompt → full app, database via its cloud or Supabase) | **Yes** | Very similar trade-offs to Lovable; pick one, not both |
| **v0 (Vercel)** | Best-looking UI components | Partly: backend and scheduled jobs need connected services | More wiring than Lovable for a non-technical builder |
| **Claude Code** | Can write the whole app in this repo and keep it in sync with these specs | **Yes**, as code | You still need hosting accounts (e.g. Vercel + Supabase) set up and deployed. Fine with guidance, but it's the most technical route |
| **claude.ai artifacts** | Click-through prototypes (like the ones already made) and light internal tools with saved data | **No** for this product: no scheduled jobs, no secret keys for Gemini, can't fetch external sites | Good for demos to leadership, not for T+1 operations |

**Recommendation:**
1. **Claude Design** for the visual design.
2. **Lovable** for the product, following the build order below.
3. If video processing in the browser becomes the bottleneck, move only that step to **Replit** (a small server that turns videos into audio and transcripts), or switch the whole build to Replit.
4. If ET IT prefers everything inside Google Cloud, **Firebase Studio** is the Google-native alternative. The prompts in this playbook work there with small wording changes ("Firebase" instead of "Lovable Cloud").

All of these change quickly. Check current features and pricing before committing *(check)*.

## 1. What you can and can't do alone

| You can do alone | You need someone for (ask early, in parallel) |
|---|---|
| Build every screen, table, rule and AI step in Lovable | **IT:** allow Google sign-in restricted to the company domain on an external app |
| Create the Gemini key and Google Cloud project yourself | **Legal/data:** DPDP sign-off to store attendee data outside ET systems. Until then, pilot with hashed emails or sample data |
| Test everything with the repo's sample files and real BWS 2025 website data | **Social team:** export LinkedIn, Instagram and YouTube analytics at T+1 and T+14 (about 5 minutes each) |
| Run a full dry run on BWS 2025 | **Video team:** use the video-plan file names on the day |
| Send sponsor links from the pilot | **IT (optional):** a custom domain and sending email address; the pilot can use Lovable's default domain and sender |

## 2. Week 0: accounts and keys (about half a day)

| # | Create | Where | What you get | Notes |
|---|---|---|---|---|
| 1 | Lovable account, paid plan | lovable.dev | The builder | You'll use many messages; the free tier is too small *(check plans)* |
| 2 | Enable **Lovable Cloud** on the project | Inside Lovable | Database, login, storage, server functions | This replaces setting up Supabase yourself |
| 3 | Connect **GitHub** | Lovable → GitHub | A backup of everything built | Lets you or anyone later take the code elsewhere |
| 4 | **Google AI Studio** API key, **paid tier** | aistudio.google.com | `GEMINI_API_KEY` for transcription, extraction and insights | Free-tier data may be used to improve Google's products; paid tier isn't *(check)* |
| 5 | **Google Cloud project** + **Google Drive API** key | console.cloud.google.com | `DRIVE_API_KEY` | Lists files in folders shared "anyone with the link" |
| 6 | A test **Drive folder**: `BWS 2025 TEST/Videos`, `/Photos` | Google Drive | A place to test media | Put 2–3 short sample clips and 10 photos in it |

Add the keys in Lovable → Cloud → Secrets. **Never paste keys into a prompt.**

## 3. How to work with Lovable (rules that save weeks)

1. **One prompt at a time.** Paste one step, let it build, test it, then move on. Don't paste three prompts together.
2. **Attach the context on the first prompt:**
   - `docs/intake-prd.md`
   - `prototype/screens/*.png`
   - `prototype/report-workspace.html`
   - `schemas/report-section.schema.json`

   Say "follow these, match the screenshots".
3. **Test with real files after every step:**
   - `samples/*.csv`
   - `templates/*.xlsx`
   - the BWS 2025 website URL
4. **When something breaks,** paste the exact error or describe what you clicked and what happened, then ask it to fix *only that*. If it gets worse twice, **revert** to the last working version (Lovable keeps history) and re-prompt more narrowly.
5. **Use Chat/plan mode first for big steps:** "Explain how you will build this before changing code." Correct the plan, then let it build.
6. **Keep a test checklist** (the "Done when" lines below) and tick it after each step.
7. **Ask for self-tests:** "Add a /selftest page that runs these checks and shows pass/fail."

## 4. Build order (about 6–8 weeks part-time)

Each step names the prompt to paste, where it lives, and how you know it's done.

### Week 1: foundation, login, workspace
| Step | Paste | Done when |
|---|---|---|
| 1. Foundation: data model, events, 16-section report with sample data | **Prompt 1** in `docs/lovable-prompt.md` | The BWS 2025 sample report shows 16 sections with fictional numbers |
| 2. Login and roles | **Prompt E** in `docs/platform-access-and-distribution.md` (start with Google sign-in + Owner/Editor/Contributor/Viewer; skip the sponsor viewer for now) | Only your company domain can sign in, and a Viewer can't edit |
| 3. Multi-event workspace | **Prompt J**, workspace part (`docs/workspace-and-sponsor-views.md`) | The Today queue, Events list and event tabs look like `prototype/report-workspace.html` |

### Week 2: automatic event data
| Step | Paste | Done when |
|---|---|---|
| 4. Website harvester (event, theme, sponsors, speakers, agenda) | **Prompt K** below | Pasting the BWS 2025 URL (or its HTML) gives 26 sponsors in 13 groups, 35 speakers, the theme colour rgba(231,66,95,1) and Montserrat |
| 5. Theme ID and approval | **Prompt F** in `docs/theme-id-spec.md` | `thm_etbe-bws_2025_v1` is approved and shown on the report header |
| 6. Intake steps 1–3 screens | **Prompt A** in `docs/intake-prompts.md` | The intake rail shows event, sponsors and speakers as ready |

### Week 3: attendees, templates, the Add data box
| Step | Paste | Done when |
|---|---|---|
| 7. Attendee upload + saved mappings | **Prompt B** in `docs/intake-prompts.md` | `samples/oneworld_registrations_sample.csv` imports 426 rows; 7 missing emails and 6 duplicates are caught; no mobile numbers are stored |
| 8. Template downloads | Item 8 of **Prompt G** in `docs/execution-plan.md` | Downloading the attendee template gives the event key prefilled, and re-uploading needs no mapping |
| 9. Add data box (paste, URL, screenshot, file → checked data) | **Prompt H** in `docs/report-v1-no-dependency.md` | A pasted OneWorld table becomes rows; a number not in the paste is rejected |

### Week 4: video plan → Gemini transcripts → insights
| Step | Paste | Done when |
|---|---|---|
| 10. Video plan, Drive listing, browser audio, Gemini transcription, speaker naming, insights | **Prompt L** below | A 2-minute test clip in the test Drive folder becomes a transcript, a named leader and 1–3 insights waiting for approval, within about 15 minutes of upload |
| 11. Event photos | **Prompt 10** in `docs/lovable-integrations.md`, with the Drive API key instead of a service account | 10 test photos → duplicates removed, 6 suggested |

### Week 5: social numbers and market insights
| Step | Paste | Done when |
|---|---|---|
| 12. Social numbers from platform exports | **Prompt M** below | `samples/linkedin_page_export_sample.csv` splits into pre-event and event day; an Instagram and a YouTube export upload with saved mappings |
| 13. Market insights library + finder | **Prompt N** below | The BrandEquity library shows 5 stats with source and year; a suggested stat can't be approved without a link |

### Week 6: report, custom sections, PPT, sponsor links
| Step | Paste | Done when |
|---|---|---|
| 14. Block library, templates, "+ Add section" | **Prompt I** in `docs/report-v1-no-dependency.md` | The three examples in `samples/custom-sections.example.json` render; empty sections hide themselves |
| 15. Generate PPT from the frozen theme | **Prompt 3** in `docs/lovable-prompt.md` + Prompt F's PPT part | The downloaded PPT matches `samples/ETBrandEquity_BWS2025_PostEventReport_v1_…pptx` in look, and the theme ID is in File → Properties |
| 16. Sponsor page + sending | **Prompt J**, sponsor part, + the sponsor-viewer part of **Prompt E** | A test "sponsor" (a colleague's email) gets a link, signs in with a code, sees totals only and can download a watermarked PPT |

### Weeks 7–8: dry run and pilot
| Step | Do | Done when |
|---|---|---|
| 17. Self-tests | **Prompt 5** in `docs/lovable-prompt.md` + every "Done when" above as a /selftest page | All pass |
| 18. Dry run on BWS 2025 | Load real website data, a OneWorld attendee export (or the sample), 3 real clips, the three social exports | Report v1 is ready in under 2 hours of human time |
| 19. Live pilot on the next BrandEquity event | Video plan by T-3, hashtag rule, OneWorld export uploaded on T0 evening | Sponsor links go out by T+1 12:00 |

---

## 5. New prompts

### Prompt K: website harvester

```
Add a "Website harvester" for each event.
Input: the public event URL (e.g. the Brand World Summit 2025 page). Fetch it server-side daily from T-30 to T0; if the fetch fails, show a box to paste the page HTML instead.
Parse, in code first (DOM selectors), with Gemini as a fallback only when the code finds nothing:
- event: name, edition, date, venue, theme line, hashtag
- theme: CSS variables and inline styles for the theme colour, body font, heading font (store as a draft theme for Prompt F)
- sponsors: partner blocks → group, name, logo URL. Deduplicate by normalised name (the carousel repeats logos: BWS 2025 has 37 entries for 26 sponsors)
- speakers: speaker cards → name, designation, company (fill a missing company from the agenda by name), photo URL
- agenda: day tabs → time, hall, title, speaker names
Every value keeps source = website + fetched_at. Show a diff when a daily fetch changes something ("2 speakers added, 1 removed") and let the lead accept it. If a section parses to zero rows, show an amber alert instead of deleting data.
Test: the BWS 2025 page must give 26 sponsors in 13 groups, 35 speakers and theme colour rgba(231, 66, 95, 1).
```

### Prompt L: video plan → Gemini transcripts → leader insights

```
Build the media pipeline with no external server.
1. Video plan: table video_plan(id, event_id, video_type, leaders text[], session_time, hall, sponsor, owner, expected_by, planned_filename, status expected|received|transcribing|needs_names|insights_ready|approved). Create rows from the agenda automatically (one per panel/keynote/fireside, leaders = session speakers) as a DRAFT; the lead edits and confirms. planned_filename = HHMM_Hall_Type_First-Last[_First-Last] (bytes: BYTE_NA_Type_First-Last). Also accept templates/video-plan-template.xlsx upload.
2. Drive listing: the lead pastes the event Drive folder link (shared "anyone with the link can view"). A scheduled function every 5 minutes on event day lists Videos/ and Photos/ with DRIVE_API_KEY and matches each video to a plan row by exact planned_filename, then by leader names in the file name, else lists it as unmatched with a dropdown.
3. Audio in the browser: when an Editor opens the Media tab, for each matched video not yet processed the browser downloads it, extracts mono audio at about 32 kbps with ffmpeg.wasm (single-thread build), and uploads the small audio file to storage. Show progress. Also accept a direct upload of a video or audio file from the computer.
4. Transcription with Gemini (server function, secret GEMINI_API_KEY): send audio up to ~20 MB inline, larger via the Gemini File API. Split anything over 15 minutes into chunks. Prompt: "Transcribe verbatim in the original language mix. Do not paraphrase or clean up. Return JSON segments {start_sec, end_sec, speaker_label, text}." Temperature 0. Save segments.
5. Who spoke: single-leader types → every segment belongs to the plan's leader. Panels → one Gemini call with ONLY the plan's names; it returns speaker_label → name with an evidence quote that must be an exact substring of the transcript; low confidence → status needs_names with a 10-second audio clip per label and a name dropdown.
6. Insights: one Gemini call per leader per video → 1–3 {headline ≤12 words, quote, start_sec, theme, has_number}. In code: drop a quote that isn't an exact substring of that leader's segments; drop a headline number that isn't in the quote. Status pending.
7. Leader photo: the browser grabs 8 frames from single-leader videos (video element + canvas), keeps the sharpest with one large detected face (face detection only, never identification); otherwise uses the speaker photo from the website/OneWorld.
8. Review queue: photo, name, role, headline, quote and a "Play" button that plays the audio from start_sec. Approve / edit headline / reject.
9. At 18:00 on event day, send each owner the list of plan rows still "expected".
Test: a 2-minute clip named per the plan becomes 1–3 pending insights with a playable clip.
```

### Prompt M: social numbers from platform exports (no integration)

```
Add Social sources per vertical and per event, fed by file uploads only (API connectors come later and will write to the same tables).
- Per event: post keys (hashtag e.g. #ETBWS2025, event name, short name) and the window (default T-60 to T+14).
- Three upload cards: "LinkedIn page analytics export", "Instagram export (Meta Business Suite → Insights → Content)", "YouTube Studio export (Analytics → Advanced → Export)". Accept .xls/.xlsx/.csv.
- Detect the platform from the headers. Map columns once with a saved preset per platform: post URL or ID, posted date, post text or title, impressions/views, reach if present, reactions/likes, comments, shares/reposts, saves, clicks, watch time (YouTube).
- Keep rows whose text, title or URL matches a post key. Put weak matches in a "Posts we weren't sure about" list to tick or untick.
- Each upload is a dated snapshot with as_of. Remind the social team at T+1 and T+14, and show which platform's export is missing or older than 2 days.
- Windows: pre-event = posted before the event start; event day = within the event dates. Show totals per platform and window, top 10 posts, and each source's as-of date. Label each metric with the name used in the export.
- Never scrape any platform.
Test: samples/linkedin_page_export_sample.csv splits into pre-event and event day, and a second upload of the same file updates instead of duplicating.
```

### Prompt N: market insights library + finder

```
Add a Market insights library per vertical: market_stats(id, vertical, statistic, value, unit, source_name, source_url, year, theme_tags[], status suggested|approved|rejected, reviewed_by, reviewed_at).
- Seed BrandEquity with these 5 approved rows (each with source and year):
  - Indian advertising market ₹1,64,137 crore, +7% YoY, digital 60% (GroupM TYNY 2025)
  - Internet users 971.5 million (TRAI 2025)
  - HNIs 85,698, +6% a year (Knight Frank 2025)
  - E-commerce market by 2030 $350 billion (Redseer 2024)
  - Middle class 61% of population by 2047 (PwC 2024)
  - Add the source URLs when reviewing.
- "Find stats for this event": Gemini with Google Search grounding, given the event theme line and themes, returns up to 8 candidate stats, each with source_url and year.
- In code, fetch the source_url and check the number appears on the page. If it doesn't, mark it "number not found on page". All candidates are status suggested.
- Approve needs a reviewer to open the link (track the click). Stats older than 24 months get a flag.
- The report section "Market context" uses only approved stats tagged with the event's themes, each with its source line.
```

---

## 6. Running costs (pilot)
- **Lovable:** a monthly paid plan *(check current pricing)*.
- **Gemini:** pay per use. A full event (about 10–15 hours of session audio plus insight calls) should be a small amount on current audio pricing *(check the Gemini price page, and set a monthly budget cap in Google Cloud)*.
- **Drive API:** free within normal quotas.
- **Email:** Lovable's default sender for the pilot. A custom sender domain later via IT.

## 7. Where people usually get stuck (and the fix)
| Symptom | Fix |
|---|---|
| Lovable rewrites working parts when you ask for a new feature | Say "Only change X. Don't modify other pages." Revert if needed |
| Big videos fail | Make sure audio is extracted in the browser first (Prompt L step 3); only small audio goes to the server |
| Gemini transcript skips words | Shorter chunks (10 min), temperature 0; the reviewer plays each quote before approving |
| An export won't map | Different export types have different columns: make sure it's the page/content-level export, then save a new preset |
| Website parse finds 0 speakers | The page template changed: paste the HTML, and let the Gemini fallback extract; ask Lovable to update the selectors |
| Numbers differ from the old manual deck | Check the windows (pre-event vs event day) and the "as of" date; the old deck may have mixed them |

## 8. Definition of done for the pilot
- One BrandEquity event's report v1 is generated by **T+1 12:00**, and sponsor links are sent.
- Human time on T0 evening + T+1 morning is **under 2 hours**:
  - OneWorld export upload
  - 3 social exports
  - approving insights and photos
  - freezing the report
- Every number on the sponsor page has a source line.
- The T+14 refresh updates the same links with final social numbers.
