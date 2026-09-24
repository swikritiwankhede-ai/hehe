# Lovable Prompts: Post-Event Report Studio (BWS)

How to use this file:
- Paste **Prompt 1** into Lovable to build the foundation.
- Then send Prompts 2–5 **one at a time**, testing between each.
- The prototype runs on CSV uploads that mirror the events-portal exports. The real build replaces the uploads with direct connectors (see `platform-design.md`).
- All seed data is **fictional**. Only sponsor brand names are taken from the public BWS 2025 website.

---

## Prompt 1: Foundation (data, import, metrics, report page)

```
Build "Post-Event Report Studio", an internal web app for the ET BrandEquity events team.

PURPOSE
After each IP event (first: Brand World Summit), the team must send all sponsors a post-event PPT by 12:00 the day after the event (T+1).
Today the deck is assembled by hand from ~8 sources and takes days. This app:
1. collects the event's data from uploads
2. computes every metric once with its formula, base (n), source and "as of" time
3. shows an internal report with drill-downs, a readiness checklist and data-quality flags
4. generates the sponsor PPT (Prompt 3)
Sponsors never log in. The report shows event-level value at scale; there is NO per-sponsor section.

TECH
React + TypeScript + Tailwind + shadcn/ui, Supabase (email auth, Postgres, Storage), Recharts for charts, PapaParse for CSV. Desktop-first.
Design:
- clean, editorial, white background
- accent red #E32932, dark text #191B1F, one neutral grey scale
- Inter font
- numbers large and tabular
- every metric shows its n and "as of" in small grey text

ROLES (profiles.role)
- editor: imports data, edits overrides and captions
- approver: everything an editor can do, plus approving and exporting
- viewer: read only

DATA MODEL (Supabase tables, all scoped by event_id)
- series(id, name)
  e.g. "Brand World Summit"
- events(id, series_id, name, edition_number, theme, start_at, end_at, venue, city, banner_url, primary_color, status)
- targets(id, event_id, metric_id, target_value, stated_where)
  e.g. attendees_total 1000 "website"
- organisations(id, name, domain, org_type, industry, size_band, logo_url, override_by)
  org_type in: brand | agency | publisher | startup | tech_vendor | other
- people(id, email, full_name, designation_raw, designation_clean, seniority, function, organisation_id)
  seniority in: CXO | VP | Director | Manager | Other
  function in: Marketing | Tech | Sales | Founder/CEO | Other
- registrations(id, event_id, person_id, status, lead_source_raw, conversion_source_raw, channel, registered_at, checked_in_at)
  status in: registered | shortlisted | attended
- sessions(id, event_id, title, starts_at, ends_at, format, theme, owner_type, partner_sponsorship_id)
  format in: keynote | panel | fireside | case_study | other
  owner_type in: ET | brand | partner
- speaker_appearances(id, session_id, person_id, status)
  status in: indicative | confirmed | spoke
- sponsorships(id, event_id, organisation_id, group_label, canonical_tier)
  canonical_tier in: presenting | powered_by | co_powered | in_association | gold | silver | associate | category_partner | exhibitor | startup
- wishlist_entries(id, sponsorship_id, person_id, outcome)
  outcome in: listed | invited | attended | met
- programme_sessions(id, event_id, type, sponsorship_id, starts_at)
  type in: pitch_room | leadership_dialogue | customer_success_showcase | soiree
- programme_attendance(id, programme_session_id, person_id)
- social_posts(id, event_id, platform, url, posted_at, caption, content_type)
  platform in: linkedin | instagram | facebook | youtube | x
- social_snapshots(id, post_id, captured_at, impressions, reach, engagements, views)
- media_assets(id, event_id, kind, storage_path, session_id, speaker_person_id, tag, approved)
  kind in: photo | audio | video
- survey_responses(id, event_id, respondent_type, rating_1_5, nps_0_10, would_return, comment)
  respondent_type in: attendee | partner
- owned_media(id, event_id, kind, title, url, views, captured_at)
  kind in: article | livestream | studio | newsletter
- previous_edition_metrics(id, series_id, edition_number, metric_id, value)
- metric_values(id, event_id, report_version_id, metric_id, value, n, source, as_of)
- report_versions(id, event_id, label, created_at, created_by, is_frozen)
- overrides(id, entity, key, field, value, by, at)
- export_log(id, report_version_id, sections, file_type, by, at)

IMPORT (page "Data Sources")
One card per source. Each card shows:
- expected columns
- a sample CSV download
- last import time and row count
- an upload button that previews the first rows, maps the columns, then upserts

Sources and columns (mirror the events-portal exports):
1. Registrations
   first_name, last_name, email, designation, company, location, lead_source, conversion_source, registration_date, form_type
2. Attendees (check-in)
   email, checked_in_at
3. Shortlisted
   email
4. Wishlist Users
   sponsor_name, email, company
5. Speakers
   name, designation, company, speaker_group, status
6. Agenda
   start_time, end_time, title, format, theme, owner_type, partner_name, speakers
   (speakers is a semicolon-separated list)
7. Sponsors
   sponsor_name, group_name, logo_url
8. Programme attendance
   programme_type, sponsor_name, session_time, email
9. Social posts
   platform, url, posted_at, impressions, reach, engagements, views, captured_at
10. Owned media
    kind, title, url, views
11. Survey responses
    respondent_type, rating, nps, would_return, comment
12. Previous edition
    edition_number, metric_id, value
Plus:
- a "Targets" form: metric picker + value + where it was stated
- an "Event settings" form: name, edition, theme, dates, venue, banner image upload, primary colour, top-tier logo picks

PROCESSING (runs after every import; deterministic TypeScript, no AI in this prompt)
- Normaliser:
  - trim and title-case names
  - dedupe people by lowercase email
  - dedupe organisations by normalised name (strip "Pvt Ltd", "Limited", "Private Limited", "Inc", punctuation) and by email domain
  - fix common mojibake: "Ã¢â‚¬Å“" → "“", "â€“" → "–", "â€™" → "’"
- Seniority rules (case-insensitive keyword lists):
  - CXO: chief, CXO, CEO, CMO, CTO, CIO, CDO, founder, MD, managing director, president
  - VP: VP, vice president, SVP, EVP, AVP
  - Director: director, head
  - Manager: manager, lead, GM, DGM, AGM
  - anything else → Other
- Function rules: marketing / brand / media / digital / communications → Marketing; similar keyword lists for Tech, Sales and Founder/CEO.
- Org type: lookup table editable in the UI, plus manual override. Unknown values go to a review queue.
- Channel mapper (lead_source + conversion_source):
  - contains "nl_" / "newsletter" / "mailer" → Newsletter
  - "referral" → Referral
  - partner or sponsor names → Partner
  - linkedin / facebook / instagram / x / youtube → Social
  - "paid" / "gclid" / "ads" → Paid
  - empty or "Direct" → Direct
  - otherwise → Other, flagged for review
- Social windows:
  - pre = posted_at to event start_at
  - during = start_at to end_at
  - post = after end_at
  - use the latest snapshot per post
  - multiplier_per_day = (during impressions ÷ during days) ÷ (pre impressions ÷ pre days)
  - always show the absolute figures next to the multiplier

METRICS REGISTRY (one TypeScript module; both the page and the PPT read ONLY from here)
Each metric has: id, label, unit, compute(eventId) → {value, n, source, asOf}, pptAllowed.
Include at least:
- Attendance: registrations_total, shortlisted_total, attendees_total, show_up_rate, unique_orgs
- Audience mix: cxo_share, vp_director_share, cmo_count, ceo_count, marketing_function_share, org_type_mix, industry_mix, top_brands (top 40 attendee organisations with org_type = brand)
- Sign-ups: registrations_by_channel, registration_curve
- Content: sessions_total, content_minutes, sessions_by_format, sessions_by_theme
- Speakers: speakers_spoke, indicative_to_spoke_rate, speaker_seniority_mix, speaker_type_split (brand / partner / ET)
- Partners: partners_total, partners_by_tier, partner_sessions, partner_speakers, partner_minutes
- Access programmes: pitch_room_meetings, programme_attendees, wishlist_fulfilment_all (share of wishlist entries whose person attended, across all sponsors)
- Social: impressions_pre, impressions_during, reach_during, engagement_rate_during, per_platform_table, multiplier_per_day, video_views_total, video_views_avg
- Owned media: owned_media_totals
- Feedback: avg_rating, nps, would_return_share, survey_n
- Year on year: yoy for attendees_total, cxo_share, unique_orgs, impressions_during (vs previous_edition_metrics)
- Promised vs delivered: target_vs_actual (every target row with actual, delta and status met / missed)

REPORT PAGE (event workspace → tab "Report")
- Sticky top bar:
  - event name, "Data as of <time>", version label
  - readiness score (%)
  - buttons "Recompute" and "Generate PPT" (Generate PPT is disabled until Prompt 3)
- Left nav with 16 sections. Each section is a card with:
  - headline metric(s) with n
  - one chart
  - a "Takeaway" text field (plain editable text for now)
  - a "Details" drawer with the underlying rows (tables with search and CSV download)
  - flag chips
  - an "Include in PPT" toggle
- The 16 sections:
  0. Cover: banner, name, edition, theme, date, venue, top-tier logos
  1. Edition at a glance: 8–10 stat tiles
  2. Promised vs delivered: table of target / actual / delta with met / missed chips
  3. Who was in the room: seniority & roles. Seniority donut, function bar, CMO and CEO counts
  4. Brands in the room: org-type mix, industry bar, logo/name wall of top brands
  5. How people found and signed up: funnel (registered → shortlisted → attended), channel bar, registration curve line
  6. Content delivered: sessions by format and theme, content minutes
  7. Speaker line-up: counts, seniority mix, brand / partner / ET split, indicative → spoke rate
  8. What speakers said: photo + quote cards (empty state until Prompt 2)
  9. Partner presence (all partners combined): partners by tier, partner sessions / speakers / minutes
  10. Access programmes delivered (all partners combined): Pitch Room meetings, programme attendees, wishlist fulfilment %
  11. Social reach: per-platform table (pre vs during impressions, reach, engagement rate), multiplier with its formula shown
  12. ET's own media reach: articles, views, livestream, newsletter
  13. Photos: grid from media_assets where kind = photo and approved
  14. Attendee & partner feedback: rating, NPS, % would return, 3 comments
  15. Growth vs last year + next edition: YoY bars and next-edition date
- Attendee-level rows appear ONLY in Details drawers, never in section headlines.

READINESS TAB
A checklist with an owner and status (green / amber / red) for each input:
- event settings complete
- targets entered
- sponsors imported
- every sponsor group mapped to a canonical tier
- agenda imported, with every session tagged (format, theme, owner_type)
- speakers imported
- registrations imported
- check-in imported (≥ 50% of shortlisted)
- wishlist imported
- programme attendance imported
- ≥ 1 social post per platform used
- photos uploaded (≥ 8 approved)
- audio uploaded
- survey responses (≥ 20)
- previous edition imported
The readiness score is the % green. Each section is marked "not ready" if any input it depends on is red.

DATA QUALITY TAB (recomputed after each import)
- Blocking:
  - seniority buckets don't sum to attendees
  - channel totals ≠ registrations
- Warnings:
  - show-up > 100%
  - multiplier > 20x
  - n < 30 on any percentage
  - more than 5% of designations or organisations unclassified
  - a speaker with status confirmed but no session
  - a session with no speaker
  - duplicate people merged (list them)
Each flag links to the offending rows. The approver can acknowledge warnings; blocking flags must be fixed.

REVIEW QUEUES TAB
- Unclassified designations → pick seniority / function, saved to overrides and reused.
- Unknown organisations → pick org_type / industry, saved to overrides.
- Unmapped channel values → pick a channel.

SEED DATA (fictional people; public sponsor brand names)
Event: "Brand World Summit 2025", edition 7, theme "Redefining Marketing for 1.4 Billion Indians", 4 July 2025, 09:00–19:00, Mumbai.

Previous edition (6th, 2024) metrics:
- attendees_total 715
- speakers_spoke 102
- cxo_share 0.40
- impressions_during 1,200,000

Targets:
- attendees_total 1000 (website)
- speakers_spoke 100 (website)
- cxo_share 0.40 (sales deck)

Sponsors (group_name):
- Samsung Ads (Presenting Partner)
- Monotype (Powered By)
- Route Mobile (Co-Powered by)
- Flipkart Ads (In Association With)
- Google Messages, Tata Communications (Gold Partners)
- The Trade Desk (Silver Partner)
- frog, Shakuniya (Associate Partners)
- L&T Finance (NBFC Fintech Partner)
- Roshan Space (Outdoor Partner)
- ImageKit + 5 fictional exhibitors (Exhibitors)
- Lenskart, Fixderma, The Good Bug (Gifting Partners)
- Refreshing (Creative Partner)

People and registrations:
- 1,100 registrations, 780 shortlisted, 640 attended
- realistic Indian names and brand / agency / tech companies
- ~35% CXO
- about 15 designations with mojibake
- channels: newsletter-heavy mix, using conversion_source values like "nl_Mailer_newsletter_brandequity_news_2025-06-20"

Agenda and speakers:
- 28 sessions over 3 tracks, with formats and themes (e.g. "AI as CMO accelerator", "GenZ", "Quick commerce")
- 6 partner-owned sessions
- 85 speakers: 78 spoke, 7 indicative-only

Access programmes:
- wishlist: 90 entries across 6 sponsors, ~55% attended
- 12 Pitch Room meetings, 3 leadership dialogues

Social and media:
- 60 social posts across 5 platforms, with snapshots
- owned media: 6 articles, 1 livestream, 2 newsletters
- no photos or audio yet

Survey: 45 survey responses.

Seed the admin user as approver.
```

---

## Prompt 2: AI assists (always drafts that a person approves)

```
Add AI assists using Lovable AI through a Supabase Edge Function.

Rules:
- AI never produces or changes a number.
- Every AI output is a draft with status pending | approved | rejected.
- Only approved drafts appear in the report or the PPT.

1. Classification fallback
   For designations and organisations still unclassified after the rules and overrides, batch-call the model to suggest seniority / function or org_type / industry, each with a confidence score.
   - Suggestions go into the Review Queues.
   - An "Accept all ≥ 0.9" button applies the confident ones.
   - Accepted suggestions are saved to overrides.

2. Speaker moments (section 8)
   - On Media Center (new tab), the user uploads an audio file OR pastes a transcript, and tags it with a session.
   - If audio is uploaded, transcribe it in the edge function.
   - Extract 3–5 candidate quotes per session. Each quote must be a VERBATIM substring of the transcript: validate this server-side and drop any that fail.
   - Attribute each quote to a speaker from that session. If the session has several speakers, let the user choose.
   - The user pairs each approved quote with an approved photo of that speaker.

3. Photo picks (section 13)
   - Photos are uploaded and tagged with session / speaker if known.
   - The model labels each photo: stage | audience | networking | partner_activation | speaker | other.
   - "Suggest 12" picks a varied set.
   - The user approves.

4. Takeaways
   - For each section, a "Draft takeaway" button sends ONLY that section's metric JSON (value, n, as_of) to the model and asks for one sentence of at most 25 words.
   - After generation, extract every number in the sentence. If any number is not present in the metric JSON, reject the draft and show "Draft contained an unsupported number".
   - The user edits and approves.

Show an "AI" badge on every AI-drafted item until it is approved.
```

---

## Prompt 3: Generate PPT (sponsor-facing, totals only)

```
Implement "Generate PPT" with pptxgenjs, running in the browser.

- Opens a modal:
  - section checklist (defaults to the sections whose "Include in PPT" toggle is on)
  - readiness warnings for any selected section that is "not ready"; the approver can override, and the reason is required and logged
  - version label
- Before generating: create a frozen report_version and copy the current metric_values into it. The PPT reads ONLY that frozen version.
- Theme from Event settings: banner image on the cover and closing slides, primary colour for accents, top-tier logos in the cover footer.
  16:9, Inter (fallback Arial).
- Slide layouts by section type:
  - cover
  - stat tiles (up to 8)
  - table (promised vs delivered, social per platform)
  - donut + bar (audience)
  - logo / name wall (brands, partners by tier)
  - funnel + bar (sign-ups)
  - quote + photo (speaker moments, 2 per slide)
  - photo grid (6 per slide)
  - comparison bars (YoY)
  - closing / next edition
- Every slide footer shows: "Source: <source> · n = <n> · Data as of <as_of>". The approved takeaway goes under the slide title.
- PRIVACY GUARD: never include names, emails or any people-level rows. Brands in the room shows organisation names or logos only. Assert this in code before export.
- Also offer a PDF export of the same slides (render the slides to images, then to PDF, client-side).
- Write an export_log row: version, sections, file type, user, time.
  Show an "Exports" tab listing past exports with re-download links.
```

---

## Prompt 4: T+1 timeline and refresh

```
Add an event timeline and versioning:

1. Event status
   Pre-event → Event day (T0) → Report due (T+1 12:00) → Refresh (T+14) → Closed.
   Status is computed from the event dates and shown in the top bar with a countdown to the T+1 noon deadline.

2. Readiness reminders
   From T-7, show a banner listing red readiness items with their owners.
   On T0, highlight check-in, photos, audio and social posts.

3. Report versions
   - v1 "T+1" is created when the first PPT is generated.
   - On T+14, a banner prompts "Refresh data and create v2".
   - A version diff view shows the metrics whose values changed between versions (e.g. impressions, survey n).

4. Dashboard home
   A list of events with: status, readiness %, open blocking flags, last export and whether the T+1 deadline was hit.

Keep all numbers reading from the metrics registry and frozen versions only.
```

---

## Prompt 5: Polish and checks

```
Polish:
- Empty states for every section that explain which import or approval is missing, with a link to fix it.
- Loading skeletons.
- Consistent number formatting: Indian digit grouping (1,23,456); percentages to 0 dp, or 1 dp if under 10%; the multiplier to 1 dp with "x".
- Keyboard-accessible tables. Charts get text labels, not colour alone.
- An audit trail drawer (who changed which override, approval or export).

Checks: a simple self-test page that runs the metrics registry against the seed data and asserts:
- attendees_total = 640
- the seniority buckets sum to attendees_total
- the channel totals sum to registrations_total
- no people-level fields in the PPT data payload
```
