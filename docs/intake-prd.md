# PRD: Report Studio Data Intake (upload mechanism)

**Product:** Report Studio, the internal post-event report tool for ET BrandEquity events
**Scope of this PRD:** the data intake screen only (step 0 of the report)
**Pilot event:** Brand World Summit 2025 (7th edition, 4 Jul 2025, Grand Hyatt BKC, Mumbai)
**Users:** ET BrandEquity events team (internal only; sponsors never see this screen)
**Prototype:** `prototype/report-intake.html` · screenshots in `prototype/screens/` · test files in `samples/`

---

## 1. Problem

The post-event deck must go to sponsors on **T+1** (the day after the event). Today the inputs are pulled by hand from several teams and tools:
- attendee exports
- speaker lists
- sponsor logos
- Drive folders of session videos
- per-post social exports
- market stats copied from old decks

Nobody can see what has arrived and what is missing. The report can't be automated until every input lands in one place, in one shape, with its gaps visible.

## 2. Goal

One screen where the events team gets every input for an event's report into the system in **under 30 minutes on T0 evening**:
- automated sources are the default
- uploads are the fallback
- the screen shows what is ready and what is still owed

### Success metrics
| Metric | Target |
|---|---|
| Time from event close to all 7 sources ready | ≤ 12 hours (T0 evening → T+1 morning) |
| Manual column-mapping steps per repeat upload | 0 (saved presets) |
| Session recordings matched to a speaker without manual help | ≥ 80% |
| Key speakers with a matched recording by T+1 | ≥ 70%; every gap listed by name |
| Social impressions: exports per platform per event | 1 (page-level), not one per post |

## 3. Principles

1. **Automated first, upload as fallback.** Each source card shows its default (OneWorld, Drive, analytics API). The upload option is always there and never hidden.
2. **One source of truth per field.** OneWorld is the master for event, theme, sponsors, speakers and registrations. The website is a display of OneWorld, used only as a cross-check.
3. **Gaps are visible, never silent.** Every step has a status (ready / needs attention / not started) and names what is missing.
4. **People pick outputs, not inputs.** The team chooses quotes and photos, not which files to process.
5. **Numbers only from data.** AI can write captions and summaries and pick quotes; it never produces a number.
6. **Minimal personal data.** Mobile numbers are never stored. Emails are used for dedupe and can be hashed.

## 4. The seven steps

The layout is a left rail listing the steps, each with a status and a one-line summary, and "N of 7 sources ready" at the top. The main panel shows the current step, with Back / Next at the bottom. The top bar shows the event name, date and venue, plus "Continue to report".

### Step 1: Event and theme
- **Default:** OneWorld event settings. Pull name, edition, date, venue, theme line, hashtag, brand colour, fonts and banner (Design → Top Banner).
- **Fallback:** paste the event website's HTML. Parse the same fields from it.
- **Checks:**
  - Flag when the website theme line differs from the sales-deck theme line. Example: "Reimagining Marketing In The Age of AI" vs "Redefining Marketing for 1.4 Billion Indians". The user picks one.
  - Show a colour swatch and a cover preview built from the banner and brand colour.
- **Ready when:** name, date, venue, theme line and brand colour are set.

### Step 2: Sponsors and logos
- **Default:** OneWorld Sponsors module (group, name, logo).
- **Fallback:** Excel/CSV upload with columns Group, Sponsor Name, Logo URL.
- **Processing:**
  - Deduplicate by normalised name. The website carousel repeats logos: BWS 2025 has 37 entries for 26 sponsors.
  - Map each OneWorld group to a standard tier with an editable dropdown, e.g. "Gold Partners" → Gold, "Outdoor Media Partner" → Category partner. Save the mapping per event series.
- **Checks:** a sponsor with no logo; a group with no tier.
- **Ready when:** every sponsor has a tier and a logo.

### Step 3: Key speakers
- **Default:** OneWorld Speakers module (name, designation, company, group, weightage) joined to the agenda (session, time, hall).
- **Fallback:** the speaker list parsed from the website.
- **Processing:**
  - Seniority classifier on designation: CXO, VP, Director, Manager, Guest, Other.
  - Key speakers are pre-ticked by rule: CXO-level, or weightage above a threshold. The user can untick or tick. There are "Reset to rule" and "Clear all" buttons.
- **Checks:**
  - A speaker without a company (website cards have none; fill it from the agenda).
  - A speaker in no agenda session.
  - Later: announced but didn't speak.
- **Ready when:** at least 1 key speaker and no key speaker missing a company.

### Step 4: Attendees
- **Default:** OneWorld registrations, shortlist, check-in and wishlist. Shown as **"Not working yet"** until engineering fixes the export or API.
- **Fallback:** Excel/CSV upload (.xlsx, .xls, .csv), parsed in the browser.
- **Flow:**
  1. Drop the file (pick a sheet if there are several).
  2. **Match columns.** Suggest a field per header; the user can change any. Fields: first name, last name, email, company, designation, city, lead source, conversion source, registration date, status, "Mobile (not stored)", ignore.
  3. **Saved preset.** When the headers match a saved preset (e.g. "OneWorld registrations export"), apply it automatically and show a "Preset applied" badge.
  4. **Check before import:** rows ready, missing email (rejected), duplicate emails merged, marked attended, CXO titles. Preview the first 10 rows with the derived seniority.
  5. **Import.** Upsert by lowercased email. Log the file name, rows, user and time.
- **Required columns:** email, designation, company. Import is disabled until they are mapped.
- **Ready when:** an import has succeeded for this event.

### Step 5: Session and sponsor media
- **Sources:** two Google Drive folder links:
  - **Sessions** (key speakers on stage)
  - **Social & sponsor speakers** (bytes, reels, TicTac, 5D, Studio chats)
- **Fallback:** drag and drop files.
- **Auto-matching:**
  - Session files → speakers, by the filename convention `HHMM_<Hall>_<Format>_<First-Last>[_<First-Last>].mp4`, then by agenda time.
  - Social files → sponsors, by sponsor name in the filename.
  - Unmatched files go to a list with a speaker/sponsor dropdown.
- **Transcription:**
  - A toggle, on by default: "Transcribe every matched session file automatically overnight".
  - Manual "Transcribe selected" is also available.
  - Status per file: new → queued → transcribing → done / failed.
- **Views (tabs):**
  - **Top leaders:** every key speaker with their matched file and a transcript snippet, or "Missing file". The missing list is what the video team still owes.
  - **Sessions folder:** all files, with match method and status.
  - **Social & sponsor folder:** all files, with matched sponsor and type.
- **Ready when:** every key speaker has a file, or is explicitly marked "no recording".

### Step 6: Social media
- **Default:** "Connect analytics" per platform:
  - LinkedIn: Community Management API, needs approval
  - Instagram: Meta business account
  - YouTube: YouTube Analytics API
- **Fallback:** upload each platform's **page-level** export, one file per platform (not per post).
- **Processing:**
  - Match rows to the post register by post URL or ID.
  - Windows: **pre-event** = post date → event start; **event day** = the event dates.
- **Output:** posts per window, impressions per window, top posts.
- **Ready when:** at least LinkedIn has data for both windows.

### Step 7: Market insights
- A library per vertical (BrandEquity, CIO, CISO). Each row has statistic, value, source and year.
- It is **not** uploaded per event. It is reviewed once a year and shows a "last reviewed" date.
- Rows are editable, with "Add statistic".
- **Ready when:** the event's vertical has at least 3 statistics reviewed in the last 12 months.

## 5. Data contracts

### Attendee upload (OneWorld registrations export)
| Header in file | Field | Stored? |
|---|---|---|
| First Name / Last Name | first_name / last_name | yes |
| Official Email | email (lowercased; optionally SHA-256) | yes (for dedupe) |
| Mobile Number | — | **never** |
| Company | company | yes |
| Designation | designation → seniority | yes |
| City | city | yes |
| Lead Source / Conversion Source | lead_source / conversion_source | yes |
| Registration Date | registered_at | yes |
| Status | status: registered / shortlisted / attended | yes |

### Sponsor upload
`Group, Sponsor Name, Logo URL` → sponsor(name, group, tier, logo_url)

### Media filename convention
`HHMM_<Hall>_<Format>_<First-Last>[_<First-Last>].<ext>`, e.g. `1140_Audi1_Panel_Rohit-Bhasin_Ashwin-Moorthy.mp4`.
Files that don't follow it (e.g. `IMG_4481.MOV`) go to the unmatched list.

### Social export (LinkedIn page analytics)
`Post link, Created date, Post type, Impressions, Unique impressions, Clicks, Reactions, Comments, Reposts, Engagement rate`

## 6. Seniority rule (designation → level)
In order, first match wins, case-insensitive, whole words:
1. VP: vp, vice president, svp, evp, avp
2. CXO: chief, cxo, ceo, cmo, cto, cio, cdo, founder, co-founder, managing director, md, chairman, president
3. Director: director, head
4. Manager: manager, lead, gm, dgm, agm
5. Guest: actor, artist, athlete, author
6. Other

## 7. Out of scope (this PRD)
- The 16-section report page and Generate PPT (see `docs/lovable-prompt.md`)
- AI quote/summary generation beyond transcription (Prompt 8 in `docs/lovable-integrations.md`)
- Photo scoring (Prompt 10)
- Per-sponsor cuts

## 8. Dependencies and risks
| Dependency | Owner | Risk if missing |
|---|---|---|
| OneWorld export/API for registrations, check-in, wishlist | ET engineering | Attendee upload stays a manual step |
| LinkedIn Community Management API approval | Social team + LinkedIn | Page export stays a manual step |
| Filename convention adopted by the video team | Video team | Matching falls to manual dropdowns |
| DPDP sign-off on storing attendee data outside ET systems | Legal / data governance | Pilot must hash emails or stay on sample data |

## 9. Acceptance criteria
- [ ] Uploading `samples/oneworld_registrations_sample.csv` suggests every column correctly, flags missing emails and merges duplicates; the mobile column is never persisted.
- [ ] Uploading a second file with the same headers applies the saved preset with no mapping step.
- [ ] Sponsors dedupe to 26 across 13 groups from `samples/bws2025_sponsors.csv` (or the 37-entry website list).
- [ ] The CXO rule pre-ticks key speakers from `samples/bws2025_speakers.csv`; companies missing on the website are flagged.
- [ ] The media filenames in `samples/drive_media_filenames.txt` auto-match every session file that names a listed speaker, and social files whose name starts with a sponsor name; `IMG_4481.MOV` and `Crowd_montage_day1.mp4` stay unmatched.
- [ ] `samples/linkedin_page_export_sample.csv` splits into pre-event and event-day windows with totals.
- [ ] The rail shows correct "N of 7 ready", and each step's status updates immediately.
- [ ] Works at 390px width with no horizontal page scroll.
