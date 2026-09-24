# Project Context: ET B2B Sponsor Retention & Post-Event Deck Automation

Context carried over from earlier planning chats. Read this before working on anything in this repo.

> **Current focus: ET BrandEquity events only** (e.g. Brand World Summit). Scope all analysis, specs and examples to BrandEquity for now. ETCIO/ETCISO/HR files already reviewed (Secufest setup sheet and sponsorship grid, ETCIO Cloud Summit sales tracker and RT sheet) serve only as **format references** for what the BrandEquity equivalents probably look like. They aren't BrandEquity data. BrandEquity runs both IPs and Customs (§3).

## 1. What we're building

A sponsor-retention product for **ET B2B** events. It starts with an internal data layer and automated post-event reporting. Right now the focus is **automating the post-event deck**, which shows sponsors and leadership the value we delivered, backed by analytics.

### Core narrative (the value chain)
Internal capture → accurate ROI report → the sponsor's marketing manager has real proof → their leadership re-approves → sponsor retained.

- Present internal value and sponsor value as **one chain**, not two separate stories.
- The pitch line: *internal-first isn't the cautious option, it's the only order that works. You can't ship sponsor value on a hollow data layer.* This makes "we're building an internal tool first" the foundation of the retention outcome, not a compromise.

## 2. Documents produced so far (outside this repo)

- **Brief / build-spec doc** (Claude Doc, multiple tabs):
  - A value-chain diagram placed after the "Users" section.
  - A **Leadership 1-pager** tab, placed first. It's plain prose with no tables or diagrams and covers: problem, five pain points, MVP (the "no-regret core"), P1 scope, scaling and success metrics.
    - An italic line ties internal enablement to sponsor value.
    - Metrics lead with **net revenue retention (NRR)** as the north star. The first thing to instrument is **wishlist fulfillment vs renewal**.
    - `[Your name]` placeholder in the footer.
    - Open: whether to add the churn-number caveat as a footnote.
  - **Build-spec** tab: data model, deliverable catalog, auto-report feature.
- **Leadership 1-pager (.docx)**: Word export of the 1-pager, for sharing.
- A "Sponsor Retention — Leadership Clarity One-Pager" design artifact was started, then replaced by the simpler doc version.

## 3. Business structure: two sponsorship models

| | **IP** (owner: Shahbaz) | **Custom** (owner: Keshav) |
|---|---|---|
| Shape | Big events: conferences, multiple partners, 1 to several days, residential IPs | Single sponsor: RTs (roundtables), Unplugged, 1-on-1s, podcasts, webinars (a.k.a. Brand Solutions) |
| Examples | ETCISO, ETCIO, HR, BrandEquity (CMOs), ET DigiPlus (9th/10th edition), Brand World Summit, ETCISO Secufest | Lenovo; Proofpoint (wishlist, sales-team custom) |
| Agenda | Set by ET | Proposed or customised by the sponsor |
| What it sells | **Exposure** (stage, branding, media reach) | **Access** (the accounts you met) |
| Post-event output | Event-level success numbers, or just the attendee list (footfall), or a full deck | A precise partner-specific deck |
| Partner inclusions | Standardised by **tier** (Presenting, Powered By, Co-Powered, In Association, Platinum, Gold, Silver, Associate, plus Gifting/Outdoor/Creative) | Negotiated per sponsor |

- **Overlap:** BrandEquity runs both IPs and Customs. CIO/CISO IPs go to Manu; CIO/CISO Customs go to Manan.
- **Sales cycle:** 6–7 months.
- IPs can also sell per-partner **accounts-met** add-ons: Pitch Room (wishlist 1:1s), Leadership Dialogues (roundtables), Customer Success Showcase. These are the same RT/1:1 formats as Customs.

## 4. Media team deliverables (per partner)

- Announcement post
- Partner speaker posts
- During the event: every panel or agenda item gets posted
- Video formats:
  1. Social media bytes / "TicTac", 1–2 min (LinkedIn, YouTube)
  2. Reels (Instagram only)
  3. 5D bytes, over 5 min (LinkedIn, YouTube, Instagram)
  4. ET Studio videos (published weeks later)
- Present impressions are post-dated to before the event.

## 5. Three post-event deck archetypes

1. **Custom deck** (e.g. Lenovo): sponsor-specific. Covers who was in the room, share of voice, a "Delivered" table of deliverables, narrative and photos.
2. **IP full deck** (e.g. Brand World Summit): event-level. Covers audience profile (e.g. 40% CMOs, 65% brands), media and social amplification (multipliers like 7.18x and 4.38x, 80K+ views per video), partner logo wall, delegate community, branding integrations (chair, lanyard, F&B, lounge) and Studio videos. No per-sponsor cut.
3. **IP light**: attendee list only (footfall).

## 6. Source data reviewed

- **Custom RT sheet** (ETCIO Cloud Summit 2026 Attendee_RT & 1_1 .xlsx): a master Attendee tab plus one tab per sponsor per format (CloudThat, Apexon RT, Snowflake 1:1, Google Cloud 1:1). Fields are Name / Designation / Company / Email / Mobile, but **every tab uses a different schema** (split last name, optional City, varying headers). It's organised around **accounts**.
- **IP pre-event setup sheet** (ETCISO Secufest 2026.xlsx):
  - `Calendar`: promo post schedule (date, topic, status, LinkedIn/FB/X/Insta/YouTube URLs). Owned by Media.
  - `Partner`: sponsors by tier, approval status, social links. Owned by Sales/Brand Solutions.
  - `Speaker`, `Day 1`, `Day 2`: agenda (times, titles, speakers). Owned by Content/Editorial.
  - `ETStudio`, `5D byte`, `CISO 5D Byte`, `videos`: per-sponsor video deliverables (company, question, LinkedIn post, YouTube link, posted date). Owned by Media.
  - No wishlist or per-sponsor account list. It's organised around agenda, tiers and media.
- **Event website** (HTML reviewed; Claude cannot fetch ET B2B pages directly, so content has to be pasted in):
  - Speakers: `SpeakerAjaxPagination` JSON from endpoint `ETB2BCompanyPageInterviewsHome` (e.g. 79 speakers with name, designation, company and photo).
  - Agenda: tabbed days; each session has time, title and speakers.
  - Partners: structured HTML blocks grouped by tier, each with name and logo.
  - Stats: hard-coded pre-event promises (1000+ experts, 100+ leaders, and so on).
  - Registration form fields: first name, last name, official email, mobile, company, designation, city, plus interested-in for sponsors. This is the **footfall and audience-profile source**.
  - Glimpses: image and video assets.
  - The website is a **fallback/cross-check** for the setup sheet, not a new source. The events module already uses a sibling-reuse/HTML-import pattern.

- **IP deep dive (Brand World Summit):** see `docs/ip-post-event-deck-sources.md`. It covers the deck categories, every source, the consolidation flow and the data-quality issues. It draws on the BWS 2024 and 2025 web pages, the BWS 2024 post-event report, the BWS 2025 sales deck, the Secufest sponsorship grid and the ETCIO Cloud Summit sales tracker. Key finding: the **sponsorship grid** (tier → inclusions, with delegate passes, 1:1 counts, RT size and online deliverables) is already a machine-readable "promised" baseline for IPs.
- **Custom deep dive (Lenovo Leaders Circle '26, an ETBrandEquity Custom):** see `docs/custom-post-event-deck-sources.md`. It has 12 deck categories, each mapped to its source: proposal/SOW, check-in roster plus classifier, run-of-show with session-owner tags, ops checklist, assets and narrative. Key finding: the deck reports delivered vs committed (34 vs 30, 78% share of voice, a Delivered table) but has **no wishlist-met, follow-up, feedback or media section**.
- **Retention root causes:** see `docs/retention-root-causes.md`. It groups the reasons into 4 families: the deck doesn't prove the sponsor's outcome; the numbers aren't defensible; the data is scattered and slow to assemble; and there is no system of record for the relationship. Proxy billing data (ETCIO/ETCISO/ETCFO, `Custom Clients.xlsx`) shows only 30–44% of Custom clients buy Custom again the next year, and 73% of the 140 Custom clients in FY23–26 bought only once.
- **Event backend (ETB2B event platform, confirmed from screenshots):** these modules can be pulled directly:
  - Design → Template / Top Banner (cover template)
  - Event Details
  - Speakers (name, designation, company, group, weightage)
  - Agenda
  - Sponsors (26 sponsors in 13 groups for BWS 2025)
  - Target Audience: Registrations with lead / visitor / conversion source, Attendees, Shortlisted, **Wishlist Users**
  - Email Marketing
  - Activity & Reporting
  - Media Center (images / videos)

  Social impressions are exported by hand per post: pre-event = post date → event start; during = event days. Photos and speaker audio come from the video team.
- **Automated IP deck spec:** see `docs/ip-deck-automation-spec.md`. It covers 16 slides with data points, sources and T+1 readiness, the must-add data points, and the T+1 pipeline. **Decided:** an IP deck shows event-level value at scale, with no per-sponsor section, and is shared with all sponsors on T+1 (refresh at T+14). **Decided output format:** an **internal Post-Event Report page in the events portal** (events team only). It carries more data than the deck: drill-downs, a readiness checklist and data-quality flags. The team clicks **Generate PPT** (PPTX/PDF, totals only, template from Design → Top Banner) to produce the sponsor-facing deck. Sponsors don't access the page.
- **Platform design:** see `docs/platform-design.md`. It covers:
  - 9 components: connectors, canonical event data store, processing and AI services, metrics registry, quality and readiness checks, internal report page, PPT generator, orchestration (T0 → T+1 → T+14), access and audit.
  - The data domains, the data model, the 16-section mapping and phases:
    - Phase 1 (MVP): internal data, social via CSV, PPT, 12 of 16 sections.
    - Phase 2: AI quotes and photos, social APIs, survey.
    - Phase 3: cross-edition sponsor history for retention.
- **Lovable build prompts:** see `docs/lovable-prompt.md`. There are 5 sequential prompts:
  1. Foundation: data model, CSV imports that mirror the portal exports, processing rules, metrics registry, 16-section report, readiness and data-quality checks, review queues, fictional BWS 2025 seed data.
  2. AI assists: drafts that need approval, verbatim quotes only, and no AI-generated numbers.
  3. PPT export with pptxgenjs: frozen versions, totals only.
  4. T+1 timeline and versioning.
  5. Polish and self-tests.

## 7. Data categories by source team

| Category | Contents | Source team | Used in | Structured today? |
|---|---|---|---|---|
| Event meta | Name, dates, venue, theme, edition, format | Content/Editorial | All | Yes (free text) |
| Audience profile | Count vs target, seniority %, sector %, geography, org count | Delegate acquisition + Ops | Custom, IP full | Partly (derived by hand) |
| Attendee/wishlist lists | Who was invited or attended, per sponsor per format | Delegate acquisition + Custom Solutions | RT sheet, Custom roster | Raw, inconsistent schema |
| Deliverable fulfillment | Touchpoints, share of voice, content minutes, branding | Custom Solutions + Sales | Custom "Delivered" table | Written by hand, not computed |
| Engagement/agenda | Sessions, speakers, featured session, minutes | Content/Editorial | Custom, IP full | Partly |
| Media & amplification | Impressions by platform, video views, OOH, print, social multipliers | Media | IP full | Yes, but event-level only |
| Narrative & proof | Design intent, moments, photos, testimonials | Custom Solutions / Media | Custom | Unstructured |

## 8. Gap analysis: is the existing data enough?

Roughly **70%**. Three gaps block full automation, and each maps to an MVP data-layer fix:

1. **No structured "promised" baseline.** Nothing machine-readable records what was committed to each sponsor, so promised-vs-delivered can't be computed. This is the biggest blocker. **Fix: a committed-deliverables table.**
2. **Wishlist isn't linked to who was met.** Nothing connects a sponsor's wishlist accounts to who attended and was met, which is the number sponsors care about most. **Fix: a wishlist-status link.**
3. **Inconsistent schemas, and media data is event-level only.** Attendee tabs need normalizing, and media can't be attributed to a single sponsor. **Fix: a normalized import, plus per-sponsor media deliverables.**

With these fixed, the Custom deck can be generated fully automatically. The IP full deck is already close.

## 9. Data model decisions (proposed)

- A sponsorship links **one sponsor to one event**.
- Add **`model` / `value_type`** to each sponsorship: `IP` (exposure) or `Custom` (accounts-met). It uses the same fulfillment engine but different deliverable categories and deck templates.
- Make **media/content deliverables a first-class entity**: type (announcement post, speaker post, panel clip, TicTac, Reel, 5D byte, ET Studio), channel, status, URL, posted/go-live date, and post-event engagement. This is the P1 "content-deliverable tracker".
- IP inclusions come from **tier → standard inclusions**.
- **Committed deliverables** and **wishlist status** tables, as described in section 8.

## 10. IP deck generator spec (agreed shape)

| Component | Source | Fill method |
|---|---|---|
| Speakers, agenda, tracks, themes | Website speaker JSON + agenda tabs, or setup sheet | Direct pull |
| Partners by tier | Website partner blocks / `Partner` tab | Direct pull |
| Audience profile | Registration fields: designation → seniority, company → org type | Classifier (reuses the team's seniority logic) |
| Footfall / scale | Registration count | Count |
| Impressions, views, multipliers | Platform analytics on post URLs from Calendar/ETStudio/5D | Metrics fetch + stored baseline |
| Narrative, glimpses, photos | On-ground assets | Manual |

Components to build:
- Three source connectors: a website/setup-sheet import, a registration feed, and a channel-metrics fetch.
- A classifier: designation → seniority, company → org type.
- Two IP templates: event-level, and an optional per-partner accounts-met cut for partners who bought Pitch Room, Leadership Dialogues or Customer Success Showcase slots.
- Custom template: leads with wishlist-met, then deliverables, share of voice and narrative.

## 11. Open next steps (pending user confirmation)

- [ ] Write the IP deck generator spec into the build-spec tab.
- [ ] Update the build-spec data model with the `value_type` split and the media-deliverable entity.
- [ ] Fold the media-deliverable list into the deliverable catalog.
- [ ] Add an "IP deck vs Custom deck" template distinction to the auto-report feature.
- [ ] Turn section 7 into a concrete "deck data model": the exact fields needed from each team, and which are missing today.
- [ ] Decide on the churn caveat footnote in the leadership 1-pager.
