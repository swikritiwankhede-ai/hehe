# Event leads' workspace and the sponsor report view

Prototype: `prototype/report-workspace.html`. The top switch toggles **Event leads** / **Sponsor link**; `#sponsor` opens the sponsor view directly.

## 1. Event leads: one workspace for many events

Several event leads work in parallel. Each one:
- loads data into OneWorld, or into the platform via the Add data box
- briefs the videos needed the same day
- reviews market insights

The workspace is organised around **what needs doing today, across all events**, then the events themselves.

### Navigation
| Item | What it shows |
|---|---|
| **Today** | One queue across all your events, most urgent first. Each task has a severity stripe, the event, the owner and one action (Review, Nudge, Open). |
| **Events** | Every event you lead or support: stage, 7 source squares, key counts, status |
| **Video briefs** | The video plan per event: rows briefed, received, insights waiting, due date (T-3) |
| **Market insights** | The shared per-vertical library (BrandEquity), with suggested stats that still need a source |
| **Sent reports** | Reports with sponsors: opened, shared inside the partner, renewal window |

### Event row (portfolio)
- **Theme colour swatch** from OneWorld, so each event is recognisable at a glance.
- **Lifecycle bar:** Setup → Brief → Live → Report → Sent, with the current stage in the accent colour and T-minus/T-plus days.
- **7 source squares:** 1 event and theme · 2 sponsors · 3 speakers · 4 attendees · 5 media · 6 social · 7 market insights. Green means ready, amber needs attention, grey means not started.
- **Three key facts** for that stage, e.g. "24 of 30 videos received · 14 insights waiting · report v1 due 12:00".
- **Status pill:** Planning / Setting up / Live / Report in review / Sent · v2.

### Event detail (tabs)
1. **Overview:** a readiness table (source, what's in, status, owner) with "Approve insights" and "Freeze v1 and send links". Freezing is blocked while insights are unreviewed.
2. **Video brief:** each briefed video with its time, type, leader(s), owner and status (Expected → Received → Transcribing → Name speakers → Insights ready), plus the action for that status:
   - **Review** the insights
   - **Name speakers** for panels (one click per voice)
   - **Nudge** the owner for videos not received
   - Rows still "Expected" at 18:00 go to the owner automatically.
3. **Market insights:** the vertical library, filtered to stats tagged with this event's theme. A suggested stat can't be approved without a source link and year.
4. **Sponsor links:** partners to receive links; after sending, per partner: contacts, opened or not, viewers, downloads, shared internally.

### Who sees what
| Role | Sees |
|---|---|
| Event lead (Owner) | Their events in full; other BrandEquity events read-only |
| Editor | Events they're added to |
| Contributor (video, social, delegate teams) | Only their tasks and their step: video team sees the brief and "expected" list; social team sees social |
| Leadership (Viewer) | Portfolio, all events, read-only |

Roles come from `docs/platform-access-and-distribution.md`.

## 2. Sponsors: what opens from the link

The sponsor view is a **separate, read-only page** in the **event's own theme** (`thm_etbe-bws_2025_v1`: white, #E7425F, Montserrat, serif headings). It is mobile-first.

### Getting in
- The T+1 email carries three headline numbers and one "View report" button.
- The link is personal. The first click signs the partner in; later visits ask for a 6-digit code sent to the same work email.
- **Share with a colleague:** same company domain → invite goes out directly; any other domain → the events team approves first.

### Page order
1. **Cover band:** edition, name, theme line, date and venue.
2. **"Prepared for" strip:** partner and tier, report version and date, when the final numbers arrive (v2).
3. **The day at a glance:** 6 stat tiles with a source line.
4. **Speakers by seniority:** "74% of speakers were CXOs" (26 of 35; real BWS 2025 data).
5. **What leaders said:** photo, name, role, approved verbatim quote and theme.
6. **Partner wall:** by tier.
7. **Moments:** approved photos.
8. **Take it to your team:** Download PPT / PDF (watermarked with the viewer's name), share with a colleague.
9. **Footer:** reply to the account manager; the next edition's hashtag.

### Rules
- **Totals only.** No attendee names or emails, ever.
- The same frozen version and theme as the PPT, so the web page and the deck match.
- At T+14 the same link updates to v2, and viewers get one email.
- Every view, download and share is logged for the lead's Sponsor links tab.

## 3. Lovable Prompt J: workspace and sponsor view

```
Build the multi-event workspace and the sponsor report page (see prototype/report-workspace.html and docs/workspace-and-sponsor-views.md).
Workspace (company SSO, roles from Prompt E):
- Left nav: Today, Events, Video briefs, Market insights, Sent reports, with counts.
- Today: tasks generated from every event the user belongs to (unreviewed insights, videos expected but not received, briefs below 100% by T-3, market stats without a source, unopened sponsor links at T+3), sorted by severity then due time. Each task has one action button deep-linking to the right tab.
- Events: rows with the theme colour swatch (from the event's approved theme), a 5-stage lifecycle bar, 7 source-status squares, 3 stage-specific facts and a status pill. Filter by vertical, lead, stage.
- Event detail tabs: Overview (readiness table, Freeze v1 blocked until reviews are done), Video brief (video_plan rows with status actions: Review, Name speakers, Nudge), Market insights (vertical library filtered by the event's theme tags), Sponsor links (viewer_access + view_events aggregated per partner).
- Contributors see only their tasks and their step; leadership sees all events read-only.
Sponsor page (/r/<token>, separate layout, no workspace navigation):
- Styled only from the frozen theme of the report version.
- Magic link on first visit, then a 6-digit email code. Share with a same-domain colleague creates viewer_access; other domains need Owner approval.
- Sections in this order: cover, prepared-for strip, at a glance, seniority, what leaders said, partner wall, moments, downloads + share, footer. Hide any section without approved data.
- Downloads are watermarked with viewer name, company and date. Log opens, section views, downloads and shares. Totals only; never render attendee-level data.
```
