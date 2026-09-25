# Report v1 with zero dependencies

**Goal:** the events team can produce the BWS post-event report and PPT **without waiting on anyone**:
- no OneWorld API from ET engineering
- no LinkedIn, Meta or YouTube API approvals
- no transcription-vendor contract
- no media server

Everything comes in through what the team **already has access to**:
- links and pages they can open (OneWorld admin screens, the event website, Drive, their own social analytics)
- files they can export
- one **prompt-driven "Add data" box** that turns whatever is pasted, linked or dropped into structured, checked data

The automated connectors in `docs/execution-plan.md` become **v2 upgrades** that replace a paste with a sync. The report, its design and its sections don't change when that happens.

Files:
- `schemas/report-section.schema.json`: the section format that makes custom sections possible
- `samples/custom-sections.example.json`: three example custom sections

---

## 1. What "no dependency" means for each input

| Input | v1 route (no one else needed) | v2 upgrade (needs someone) |
|---|---|---|
| Event details + theme line | Paste the OneWorld Event Details page, or the event website URL/HTML, into **Add data** | OneWorld API |
| Visual theme | Paste a **screenshot** of OneWorld Colors & Fonts, or type the 12 fields | OneWorld API |
| Sponsors + logos | Event website URL/HTML (partner blocks with logo URLs) or paste the OneWorld Sponsors list | OneWorld API |
| Speakers + photos | Event website URL/HTML (speaker cards with photo URLs), plus the agenda for companies; add missing ones by hand | OneWorld API |
| Attendees | Download OneWorld's registrations export (a button the team already has) or fill the built-in template, then upload | OneWorld API |
| Leader videos → insights | Paste the transcript or upload a caption file (.srt/.vtt/.txt) from the editing tool, or the YouTube captions of the published video; add the leader name | Drive watch + transcription vendor |
| Leader photo | Website/OneWorld speaker photo (URL from the speaker card) or upload a frame | Frame picker from video |
| Event photos | Upload a selection, or paste a Drive folder link shared "anyone with the link can view", then pick | Drive service account |
| Social numbers | Each platform's **own analytics export** (LinkedIn page analytics, Instagram/Meta Business Suite, YouTube Studio → export), or paste the analytics table text | Official APIs |
| Market insights | Paste a report paragraph or table, or a stat line with its URL | Same, plus suggestions |

**Why these routes count as zero dependency:** the team member already has a login to every one of those sources, and no API approval, contract or engineering ticket is required. The only "tool" is the platform's built-in AI, which reads the paste.

**Honest limits of v1:**
- Social numbers are only as current as the export.
- Transcripts need someone to paste them. Most editing tools, and YouTube once a video is published, produce captions automatically.
- Pages behind the OneWorld login can't be fetched by URL; they must be copied or screenshotted.

---

## 2. The "Add data" box: one prompt to ingest anything

One box appears on every intake step and on the report page. It accepts:
- **a URL** (public pages such as the event website)
- **pasted text or HTML** (OneWorld screens, analytics tables, report paragraphs)
- **a screenshot** (Colors & Fonts, an analytics dashboard)
- **a file** (.xlsx/.csv/.srt/.vtt/.txt/.pdf)

### What happens
1. **Detect the kind of data.** The AI classifies the input as one of: event_details, theme, sponsors, speakers, agenda, attendees, transcript, social_metrics, photos, market_stat, other. It shows its guess, and the user can change it.
2. **Extract into a fixed schema.** For each kind there is a fixed JSON shape, e.g. speakers → `[{name, designation, company, photo_url, session}]`. The model must fill only those fields. Anything it can't find is `null`; it never guesses.
3. **Check before saving.** The system, not the model, runs these checks:
   - **Every number and name must appear in the source text** (exact match after whitespace/number formatting). Otherwise it's marked ❌ and not saved.
   - Screenshots: the extracted values are shown **next to the image**, and each number needs a tick before saving. OCR misreads are the main risk.
   - Duplicates (speaker name + company, sponsor name) are merged.
   - The source is recorded: `source_kind` (url/paste/screenshot/file), the URL or file name, who added it and when.
4. **Confirm.** The user sees a table: extracted rows · ✓ found in source / ❌ not found · "Save 34 speakers".
5. **Show the source.** Every value on the report links back to the paste it came from ("Source: pasted from OneWorld Speakers, 25 Sep, by Priya").

### Where each backend link's data comes from
| Data | Link the team opens | What to paste / drop | Extracted fields |
|---|---|---|---|
| Event details | OneWorld → Event Details | Select all → copy → paste | name, dates, venue, city, theme line, edition, hashtag |
| Theme | OneWorld → Event Website → Colors & Fonts (2 screens) | Screenshots | the 12 theme fields → `thm_…` draft (`docs/theme-id-spec.md`) |
| Sponsors | Event website (public) | URL, or view-source HTML | name, group, logo URL (dedupe carousel repeats) |
| Speakers | Event website speakers page, or OneWorld → Speakers | URL/HTML, or copy the table | name, designation, company, photo URL |
| Agenda | Event website agenda tabs, or OneWorld → Agenda | URL/HTML or copy | day, time, hall, title, speakers |
| Attendees | OneWorld → Target Audience → export | The exported file | registration fields (mobile dropped) |
| Wishlist | OneWorld → Wishlist Users → export or copy | File or paste | sponsor, person, company, status |
| Transcript | Editing tool captions / YouTube → "Show transcript" | Paste or .srt/.vtt | segments + the leader chosen from the speaker list |
| LinkedIn numbers | LinkedIn page → Analytics → Content → Export | .xls export | post URL, date, impressions, clicks, reactions, comments, reposts |
| Instagram numbers | Meta Business Suite → Insights → Content → Export | .csv | post URL, date, views/reach, likes, comments, shares, saves |
| YouTube numbers | YouTube Studio → Analytics → Advanced → Export | .csv | video, publish date, views, watch time, likes (impressions if present) |
| Market stat | Any report page | Paste paragraph + URL | statistic, value, unit, source, year, URL |

Fetching a **public** URL is done server-side by the platform. If a site blocks it, the fallback is always to paste the HTML (view source → copy).

---

## 3. How the report design is made

The design is three layers, and none of them is hand-made per event.

### Layer 1: Theme (the event's look)
From OneWorld Colors & Fonts → theme ID `thm_…` (fonts, colours, sizes, hashtag, edition, banner).
- The theme is applied as CSS variables on the report page and as slide masters in the PPT.
- A new event gets a new look automatically.
- Full details: `docs/theme-id-spec.md`.

### Layer 2: Block library (how content is shown)
Every section is built from a small set of **blocks**. Each block has one web rendering and one slide layout, so the page and the PPT always match.

| Block | Shows | Web | Slide |
|---|---|---|---|
| `stat_tiles` | 2–6 headline numbers with a label and source | Tile row | 3×2 tile grid |
| `bar_chart` | Breakdown (seniority, industry, city, platform) | Horizontal bars, n shown | Native chart |
| `compare` | Pre vs event day, this year vs last, promised vs delivered | Paired bars | Paired bars |
| `table` | Rows (top posts, sponsors by tier) | Sortable table | First 8 rows |
| `quote_cards` | Leader photo + name + role + headline + verbatim quote | Cards | 2 per slide |
| `photo_grid` | Approved photos with captions | Grid | 4 or 6 per slide |
| `logo_wall` | Sponsors grouped by tier | Grouped wall | Tier rows |
| `people_grid` | Speakers with photo, role, company | Grid | 8 per slide |
| `text` | Short narrative (≤ 60 words) | Paragraph | Title + body |
| `callout` | One big number or line | Hero line | Full-bleed accent slide |

Layout rules are fixed, so it looks designed without a designer:
- one idea per section
- a title that states the takeaway ("74% of speakers were CXOs")
- a maximum of 2 blocks per slide
- the source line on every number
- the accent colour only on the key number

### Layer 3: Report template (which sections, in what order)
The default **IP full** template is the 16 sections from `docs/platform-design.md`:

0 Cover · 1 At a glance · 2 Promised vs delivered · 3 Seniority · 4 Brands in the room · 5 Sign-up channels · 6 Content · 7 Speaker line-up · 8 What leaders said · 9 Partner presence · 10 Access programmes · 11 Social reach · 12 ET media · 13 Photos · 14 Feedback · 15 YoY + next edition

In v1:
- Sections without data are **hidden automatically**, not shown empty. The readiness panel says why ("Feedback: no data added").
- The team can reorder sections, hide them, or add their own (§4).
- The final list and order are saved as a **template** ("BWS standard"), so the next edition starts from it.

**Result:** theme (automatic) × blocks (fixed) × template (reusable). The page and the PPT come from the same section specs.

---

## 4. Adding a new section (beyond the defined ones)

### What the user does
The user clicks **"+ Add section"** anywhere in the report, then does one of three things:

1. **Describe it in a prompt.** Example: *"Add a section on the gifting partners with their logos and one line each on what they gave delegates."* The AI turns this into a **section spec** (below), picks blocks, and binds data that already exists (the sponsors in the Gifting group). It asks for anything missing: "Paste what each gifting partner gave".
2. **Paste content with the prompt.** Example: *"Make a section from this"* plus a pasted table, e.g. an OOH campaign list with sites and dates. The data goes through the same Add-data checks (§2) and is saved as a **custom dataset** on the event.
3. **Pick a block.** Choose a block from the library and fill it by hand (title, numbers, sources).

The new section appears in place, in the event's theme. It's included in the PPT, and it can be saved as a reusable section ("Add to BWS template").

### The section spec (what the prompt produces)
The prompt never produces free HTML or slide files. It produces a **spec** in a fixed format (`schemas/report-section.schema.json`) that the platform renders:

```json
{
  "section_id": "sec_custom_gifting",
  "title": "Gifting partners made the day memorable",
  "kind": "custom",
  "created_by_prompt": "Add a section on the gifting partners with their logos and one line each on what they gave",
  "blocks": [
    { "type": "logo_wall",
      "data": { "source": "sponsors", "filter": { "group": "Gifting Partners" } } },
    { "type": "table",
      "columns": ["Partner", "What delegates received"],
      "data": { "source": "custom_dataset", "dataset_id": "ds_gifting_notes" } }
  ],
  "narrative": { "text": null, "generate_from": "data_only" },
  "include_in_ppt": true,
  "status": "draft"
}
```

### Guardrails that keep custom sections trustworthy
| Rule | Why |
|---|---|
| Blocks come only from the library | The design stays consistent and the page and PPT match |
| **Every number binds to data**: an existing source (attendees, speakers, sponsors, social, market_stats) or a checked custom dataset | The AI can't invent a number to fill a section |
| Narrative text is generated only from the bound data; numbers in it are re-checked against that data | No made-up claims in prose |
| Custom sections start as **draft** and need approval before freezing a version | The same review as every other section |
| Personal data (attendee names/emails) can't be bound to a sponsor-facing block; only aggregates | DPDP-safe by construction |
| Every custom section shows its prompt and sources on the internal page | Anyone can see where it came from |

### Examples of sections the team can add
In `samples/custom-sections.example.json`:
1. **Gifting partners:** a logo wall from the existing sponsor group, plus a pasted notes table.
2. **OOH campaign:** pasted site list, then `table` + `stat_tiles` (sites, cities, days live).
3. **Leaders by industry:** a new cut of existing speaker data, `bar_chart` of industry, with "Not stated" shown.

---

## 5. v1 build scope (what to build first)

1. **Add data box:** URL / paste / screenshot / file, then classify, extract to a fixed schema, check against the source, confirm, save with source.
2. **Theme from screenshot or form**, then `thm_…` (Prompt F).
3. **Speakers, sponsors and agenda from the website URL/HTML** (real BWS 2025 data already parses: 35 speakers, 26 sponsors).
4. **Attendee upload** (template or own file).
5. **Transcript paste → leader insights** (verbatim check), with the website/OneWorld photo.
6. **Social exports** (one per platform) with pre/event-day windows.
7. **Block library + default template + auto-hide empty sections.**
8. **Add section** (prompt / paste / pick block) with section specs.
9. **Generate PPT** from section specs + frozen theme.

No external approvals are needed for any of these. The only running cost is the built-in AI usage for extraction and insight drafting.

---

## 6. Lovable Prompt H: "Add data" box (prompt-driven ingest)

```
Add a universal "Add data" box (drawer) available on every intake step and on the report page.
Inputs: URL, pasted text/HTML, image (screenshot), or file (.xlsx .csv .srt .vtt .txt .pdf).
Flow:
1. Classify the input as one of: event_details, theme, sponsors, speakers, agenda, attendees, wishlist, transcript, social_metrics, photos, market_stat, other. Show the guess with a dropdown to change it.
2. Extract with the built-in AI into the FIXED JSON schema for that kind (define one schema per kind; unknown fields = null; never guess). For URLs, fetch server-side; if the fetch fails, ask the user to paste the HTML.
3. Validate in code, not in the model:
   - every extracted number and proper name must be found in the source text (normalise whitespace, commas, K/M suffixes)
   - mark misses ❌ and exclude them
   - for images, show the extracted values beside the image; each number needs a tick
   - dedupe against existing rows
4. Show the confirm table (rows, ✓/❌, "Save N"). On save, write to the kind's table with source_kind, source_ref (URL or file name), added_by and added_at.
5. Everything saved shows a "Source" link on the report that opens the original paste.
Transcripts: ask "Who is speaking?" (pick from speakers; allow several for panels, with a label → name mapping step). Then run the insight extraction (1–3 per leader, exact-substring quote check), pending approval.
Social exports: detect the platform from the headers, map with saved presets, split into pre-event / event-day windows, and store a snapshot with as_of.
```

## 7. Lovable Prompt I: block library, templates and "Add section"

```
Make the report page and the PPT render from section specs (see schemas/report-section.schema.json).
1. Block library components (web + PPT layout for each): stat_tiles, bar_chart, compare, table, quote_cards, photo_grid, logo_wall, people_grid, text, callout. All styling comes from the frozen theme tokens.
2. report_templates(id, name, vertical, series, sections jsonb[]). Seed "IP full – BWS standard" with the 16 default sections as specs. A section with no bound data is hidden automatically, with the reason shown on the readiness panel.
3. "+ Add section" between any two sections, with three tabs:
   (a) Prompt: send the prompt + the list of available data sources and their fields to the AI; it must return a section spec that validates against the schema (retry once on invalid). Missing data → ask for a paste, which goes through the Add data flow into custom_datasets(id, event_id, name, columns, rows, source).
   (b) Paste + prompt: same as (a), with the paste pre-attached.
   (c) Pick a block: manual form per block type.
4. Guardrails:
   - numbers render only from bound data
   - narrative text generated from bound data only, with numbers re-checked
   - attendee-level personal fields can't bind to sponsor-facing blocks
   - custom sections are status draft until approved
   - show the originating prompt and sources on the internal page
5. Drag to reorder; hide/show. "Save as template" stores the section list for the next edition.
6. Generate PPT walks the approved section specs in order and uses each block's slide layout (max 2 blocks per slide) with the frozen theme.
```
