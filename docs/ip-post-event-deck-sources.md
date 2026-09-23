# IP Post-Event Deck: Categories and Data Sources

Worked example: **Brand World Summit (BWS)**, an ET BrandEquity IP.

Inputs reviewed:
- BWS 2024 and BWS 2025 event pages (HTML pasted in chat)
- Drive folder files:
  - `Brand World Summit 2024 Post Event Report.pdf`
  - `Brand World Summit 2025 _ Deck.pptx.pdf`
  - `Sponsorship Deck _ ET CISO Secufest.xlsx`
  - `Sales Tracker - 5th ETCIO Cloud Summit 2026.xlsx`
  - `ETCISO Secufest 2026 (1).xlsx`
  - `ETCIO Cloud Summit 2026 Attendee_RT & 1_1.xlsx`

> **Scope: BrandEquity only.** The BWS web pages, the 2024 report and the 2025 deck are BrandEquity data. The four `.xlsx` files come from ETCIO/ETCISO events. They're used here only as **format references** for sources C, D, B and J. See §5 for the BrandEquity versions still needed.

## Key observation

The post-event report for edition N becomes the sales deck for edition N+1. The BWS 2025 sales deck reuses the 2024 report's multipliers, keynote speakers, partner logo wall and testimonials, then adds partnership opportunities. So the IP post-event deck is a sponsor-retention and renewal asset as well as a report, which is the value chain in CLAUDE.md §1 applied to IPs.

## 1. Deck categories (what the BWS deck is built from)

| # | Category | What appears in the BWS deck (2024 actuals) | Source | Owner |
|---|---|---|---|---|
| 1 | **Event identity & theme** | 6th edition, 5 Jul 2024, Taj Lands End; theme "Reimagine Branding in the Age of Tech"; 8 key themes explored | Website hero + FAQ; editorial brief | Content/Editorial |
| 2 | **Scale / headline numbers** | 102 speakers, 715 attendees, 3 tracks, 20+ sessions, 20+ startups | Registration/check-in count; agenda; Startup Arena list | Delegate acquisition + Ops |
| 3 | **Audience profile** | Seniority: 40% CMOs, 10% CEO/Founders, 10% Tech/IT, 10% Sr Mktg Directors, 30% others. Org type: 65% brands, 15% agencies, 20% others | Registration fields (designation, company) → classifier | Delegate acquisition |
| 4 | **Speakers & content** | Marquee speakers, keynote highlights, session formats (panel, fireside, standalone, case study, report unveiling), tracks | Website speaker JSON + agenda tabs; setup-sheet `Speaker`/`Day` tabs; Sales tracker `Confirmed Speakers` | Content/Editorial |
| 5 | **Partners by tier** | Logo wall: Powered By, Gold, Engagement, Associate, Co-Partners, Communications, Wellness, Insights, Gifting, Creative, Outdoor Media, Exhibitor, Delegate Kit, Startup Arena Showcase | Website partner blocks; setup-sheet `Partner` tab | Sales / Brand Solutions |
| 6 | **Partner integrations delivered** | Partner standalone sessions (Exotel, NIQ, ShareChat, MoEngage, AiSensy all had one), booths, branding touchpoints, "Product & Solution Showcases" | **Promised:** Sponsorship grid (tier → inclusions). **Delivered:** agenda, Booth tab, RT List, 1:1 wishlist, Partner Delegates | Sales + Ops + Custom Solutions |
| 7 | **Media & amplification** | Social multipliers: 4.38x LinkedIn, 10.18x X, 9.6x Instagram, 2.42x Facebook, overall figure; 80K+ views per video; OOH and print placements | Platform analytics on post URLs (`Calendar`, `ETStudio`, `5D byte`, `videos` tabs) + a stored pre-event baseline; OOH partner (Times OOH / Roshan Space); print schedule | Media |
| 8 | **Testimonials & glimpses** | Speaker quotes (P&G, Nivea, IKEA), YouTube testimonial videos, photo glimpses | On-ground photo/video; YouTube; ET Studio | Media / Custom Solutions |
| 9 | **Next-edition pitch** (sales-deck reuse only) | Market stats, indicative speakers, partnership opportunities: Leadership Dialogues, Customer Success Showcase, Welcome Soirée, Branding Integrations (chair, lanyard, F&B, lounge), BWS Studio, Pitch Room (up to 3 wishlist CMOs) | Sales collateral; stays mostly static | Sales |

Categories 1–5 and 8 are event-level and mostly exist today. Category 6 is where a per-partner cut is possible, and the data for it now exists (see §3). Category 7 is event-level only.

## 2. Data sources and what each contributes

| Source | Format today | Feeds categories | Notes |
|---|---|---|---|
| **A. Event website** | HTML: speaker JSON, agenda tabs, partner blocks by tier, stats, glimpses | 1, 4, 5, 8 | Use it for structure (who, what, which tier), not for facts. Copy is reused across years (see §4). |
| **B. Event setup sheet** (e.g. `ETCISO Secufest 2026.xlsx`) | Tabs: `Calendar`, `Partner`, `Speaker`, `Day 1/2`, `ETStudio`, `5D byte`, `videos` | 4, 5, 7 | Main internal source for agenda, partners and media URLs. Website is the cross-check. |
| **C. Sponsorship grid** (`Sponsorship Deck _ ET CISO Secufest.xlsx`) | One matrix: deliverable × tier × day, plus investment per tier and add-on menu | 6 (promised) | **This is the machine-readable "promised" baseline for IPs** (gap #1). Each tier lists on-ground branding, speaker slot (15 min), panel seat, AV bite, delegate passes (10/8/6/4/3/2), RT size, 1:1 count (12/10/8/5), booth, and online deliverables (mast-head, EDM, press release, social mentions, advertorials, video interviews). Add-ons: Innovation Hub, Mixology, Food Stop, Tech Sangam, Walk the Talk, Studio. |
| **D. Sales tracker** (`Sales Tracker - 5th ETCIO Cloud Summit 2026.xlsx`) | Tabs: `Agenda`, `Target List`, `Confirmed Speakers`, `Booth`, `RT List`, `1:1 Wishlist`, `Partner Delegates`, `RT Check List` | 2, 4, 6 (delivered) | Ops-level delivery status per partner: booth creative/mockup approvals, RT wishlist received, 1:1 wishlist by account, partner delegate names. `Target List` gives name, designation, org and industry for the audience we aimed at. |
| **E. Registration / check-in feed** | Registration form (name, email, company, designation, city) + on-site check-in | 2, 3 | Not in the folder yet. It's the only source of truth for footfall and audience mix. The 40% / 65% splits are currently derived by hand. |
| **F. Channel analytics** | LinkedIn, X, Instagram, Facebook, YouTube insights | 7 | Multipliers need a stored baseline (pre-event average). Not in the folder, and nothing records how the multiplier was calculated. |
| **G. OOH & print** | Media plan from outdoor partner and print desk | 7 | Qualitative in the 2024 report (no reach numbers). |
| **H. On-ground assets** | Photos, videos, testimonials, YouTube links | 8 | Manual; stays manual. |
| **I. Networking app** | Meetings booked, questions asked, QR check-ins (advertised on site) | 3, 6 | Not used in the deck today. A possible source of per-partner meetings and engagement. |
| **J. Custom RT/1:1 sheet** (`ETCIO Cloud Summit 2026 Attendee_RT & 1_1.xlsx`) | Per-sponsor per-format attendee tabs | 6 (accounts met) | Only for IP partners who bought Pitch Room, Leadership Dialogues or Customer Success Showcase slots. |

### Consolidation flow

```
Setup sheet (B), website as cross-check (A)  → event, agenda, partner+tier  → 1, 4, 5
Registration/check-in (E) → classifier       → count, seniority %, org %    → 2, 3
Sponsorship grid (C) via partner tier        → committed deliverables       ┐
Sales tracker (D) + RT/1:1 sheet (J) + agenda → delivered deliverables      ┴→ 6 promised vs delivered
Setup-sheet media tabs (B) + analytics (F) + stored baseline → multipliers   → 7
OOH/print (G), photos/videos (H)             → manual                       → 7, 8
```

## 3. What this changes in the plan

1. **For IPs, gap #1 is half solved.** The sponsorship grid is already structured as tier → inclusions. To finish it: import the grid as `tier_inclusion` rows, link each partner (from the `Partner` tab) to its tier, and the committed-deliverables table fills itself. Add-ons such as the Studio or Innovation Hub get attached per partner.
2. **Delivered status already lives in the Sales tracker**, but as free-text status columns ("Received", "Approved", "Sent"). Normalise them into the fulfillment engine.
3. **An IP per-partner cut is feasible.** Partner speaker slot (from agenda), booth, delegate passes used (from `Partner Delegates`), RT/1:1 accounts met, and media mentions (from setup-sheet media tabs) can all be computed per partner. The standard BWS deck has no per-sponsor section today, so this is the retention upgrade for IP sponsors.
4. **Missing inputs to request:** the registration/check-in export (E), channel analytics exports with the baseline method (F), OOH/print reach (G), and networking-app data (I).

## 4. Data-quality issues found (why a single source of truth matters)

- **Overall social multiplier conflicts:** the 2024 report says **17.8x**, the 2025 sales deck says **7.18x**. One is a typo, and nothing records which is correct or how it was computed.
- **Promised vs actual attendance:** the website promised "1000+ industry experts" and "over 300 attendees" on the same page. The report states 715 attendees.
- **Stale website copy:** the 2024 page header says "6th Edition" but the body says "5th edition". The 2025 FAQ says "In its sixth edition… two tracks" while the page says 7th edition, 3+ tracks. Website text can't be trusted for facts.
- **Tier labels vary by event:** BWS 2024 used 14+ tier names (Engagement, Wellness, Insights, Delegate Kit…). BWS 2025 used Presenting, Powered By, Co-Powered, In Association, Gold, Silver, Associate, NBFC Fintech, Outdoor, Exhibitors, Gifting, Creative, Startup Arena. The Secufest grid uses 6 priced tiers. The data model needs a canonical tier list plus an event-specific "category partner" label.

## 5. BrandEquity inputs still needed

We have BWS content (website, 2024 report, 2025 deck) but no BrandEquity operational files. To build the BWS deck from real data rather than format references, we need:

| Need | Stands in for today | Why |
|---|---|---|
| BWS sponsorship grid / rate card (tier → inclusions, price) | Secufest grid (C) | "Promised" baseline per BWS partner. BWS tiers (Presenting, Powered By, Co-Powered, In Association, Gold, Silver, Associate, category partners) differ from Secufest's |
| BWS sales tracker (booth, RT, Pitch Room wishlist, partner delegates) | ETCIO Cloud Summit tracker (D) | "Delivered" status per partner |
| BWS setup sheet (`Calendar`, `Partner`, `Speaker`, agenda, Studio/video tabs) | Secufest setup sheet (B) | Agenda, partner list and media post URLs |
| BWS registration + check-in export | none | Headline 715 count, and 40% CMO / 65% brand splits |
| BrandEquity channel analytics + baseline method | none | Settles 17.8x vs 7.18x and makes multipliers repeatable |
| Pitch Room / Leadership Dialogues attendee lists | ETCIO RT sheet (J) | Per-partner accounts-met cut |
| One BrandEquity Custom deck (optional) | Lenovo deck | BrandEquity runs Customs too |
