# Custom Post-Event Deck: Categories and Data Sources

Worked example: **Lenovo Leaders Circle '26**, an ETBrandEquity Custom (single-sponsor) event.
- 3-day residential retreat, 11–13 Sep 2026, Radisson Blu Guwahati
- Deck: `Lenovo_Leaders_Circle_26_Post_Event_Report` (Google Slides, 17 slides, Drive)

This is the Custom counterpart to `ip-post-event-deck-sources.md`. The two decks differ in one important way:

- **IP deck:** sells *exposure*, so it is event-level.
- **Custom deck:** sells *access*. Every number is framed as **delivered vs committed to one sponsor** ("34 vs 30 committed — 113%", "78% Lenovo share of voice", a "Delivered" status per touchpoint).

## 1. Deck categories

| # | Category | What appears in the Lenovo deck | Source | Owner | Fill method |
|---|---|---|---|---|---|
| 1 | **Event identity** | Name, dates, venue, format, theme ("From Vision to Impact: Leading in the Age of AI"), co-brand (Lenovo × Windows 11) | Signed proposal / SOW; event setup | Custom Solutions | Direct pull |
| 2 | **The mandate (objectives)** | 4 objectives: convene the right room (30 leaders), land the AI narrative, build relationship depth, differentiate the experience | Signed proposal / client brief | Custom Solutions + Sales | Direct pull; this is the **promised baseline** |
| 3 | **Headline KPIs** | 34 leaders vs 30 committed (113%); 21 programmed touchpoints; 4,320 minutes in residence; 185 content minutes; 145 Lenovo-owned (78% SoV); 10 CXOs; 5 sectors | Computed from roster (5) + run-of-show (6) + commitment (2) | — | **Computed** |
| 4 | **Audience quality ("The Circle")** | 59% CXO/VP/Director (20 of 34); 34 distinct organisations; sector split (Mfg 11, Tech 11, Healthcare 5, Infra 5, BFSI 2); geography (South 16, West 9, North 6, East 2, Central 1) | Roster designation → seniority classifier; company → sector and HQ city (enrichment) | Delegate acquisition | Classifier + company master |
| 5 | **Roster** | 34 names, titles and companies | Attendee / check-in list | Delegate acquisition + Ops | Direct pull |
| 6 | **Programme by day** | Day I arrival (390 informal minutes); Day II Baithak, 9 sessions plus cricket and music (540 informal minutes); Day III farewell and trails (420 minutes); times per block | Run-of-show / agenda | Custom Solutions + Ops | Direct pull; minutes computed from start/end times |
| 7 | **Message delivery / share of voice** | 145 of 185 content minutes Lenovo-owned. Keynote 15, Infra modernisation 45, ThinkPad/ThinkBook 30, TruScale XaaS 20, AI Tokenomics & TCO 20, Top Choice Express 15 | Run-of-show with each session tagged by owner (sponsor / ET / guest) and topic | Custom Solutions | **Computed** |
| 8 | **Featured session / talent** | Adil Hussain closing the Baithak; "why it worked" and placement | Agenda + talent booking; rationale is editorial | Custom Solutions | Pull + manual narrative |
| 9 | **Brand integration ("Delivered" table)** | 7 touchpoints (event identity, keynote, solution sessions, emcee script, experiential blocks, on-ground branding, gifting), each with description, day and status | **Promised:** SOW deliverables. **Delivered:** ops checklist | Custom Solutions + Ops | Promised vs delivered join |
| 10 | **Design intent and narrative** | "No pitch, no deck, no ask" on Day I; "where the relationships actually formed" | Custom Solutions team | Custom Solutions | Manual (stays manual) |
| 11 | **Moments / photos** | "Moments from Guwahati" | On-ground photographer / video | Media / Ops | Manual asset pick |
| 12 | **Response** (Section 05) | Section heading only; the text export shows no content | Delegate feedback survey, testimonials | Custom Solutions | Not captured today |

## 2. Data sources

| Source | Feeds | Structured today? | Notes |
|---|---|---|---|
| **A. Signed proposal / SOW** | 1, 2, 9 (promised) | No, it's a document | Holds the commitments (30 leaders, sessions, branding, gifting). This is gap #1: it should become `committed_deliverable` rows. |
| **B. Invite / wishlist list** | none today | Partly (per-sponsor tabs, as in the ETCIO RT sheet) | **Not used in the Lenovo deck at all** (see §4). |
| **C. Attendee / check-in roster** | 3, 4, 5 | Yes (name, designation, company) | Main source for the audience-quality numbers. |
| **D. Classifier + company master** | 4 | Partly | Designation → seniority. Company → sector and HQ city. Geography is mapped to company HQ, not the delegate's own city; the deck says so itself ("Read with care"). |
| **E. Run-of-show / agenda** | 3, 6, 7, 8 | Semi (times and titles) | Needs an **owner tag per session** so share of voice can be computed rather than written by hand. |
| **F. Ops / delivery checklist** | 9 (delivered) | No | Delivered status per touchpoint. |
| **G. On-ground assets** | 11 | No | Manual. |
| **H. Feedback survey** | 12 | Not collected / not in the deck | Needed for a proper "Response" section. |
| **I. Custom Solutions narrative** | 8, 10 | No | Stays human-written. |

### Consolidation flow

```
Proposal / SOW (A)                  → objectives + committed deliverables ┐
Ops checklist (F)                   → delivered status                     ┴→ 2, 9 promised vs delivered
Check-in roster (C) → classifier (D)→ headcount, seniority, sector, geo    → 3, 4, 5
Run-of-show (E) + session owner tag → minutes, touchpoints, SoV            → 3, 6, 7
Invite / wishlist (B) ⨝ roster (C)  → wishlist-met %                        → (missing section)
Photos (G), narrative (I), survey (H)→ manual                               → 8, 10, 11, 12
```

## 3. How it maps to the IP deck

| Custom (Lenovo) | IP (BWS) equivalent | Difference |
|---|---|---|
| Mandate + delivered vs committed | none | IP decks show no per-sponsor commitment |
| Audience quality from roster | Audience profile from registration | Same classifier, different input list |
| Share of voice (sponsor minutes / content minutes) | Partner standalone sessions | Custom computes SoV; IP only lists sessions |
| Brand integration "Delivered" table | Branding integrations (chair, lanyard, F&B) | Same deliverable catalogue; Custom adds status |
| No media / amplification | Social multipliers, views, OOH, print | Custom deck has **no media section** |

The same engine can produce both decks: one roster classifier, one run-of-show parser, and one committed-vs-delivered join. Only the template differs.

## 4. Gaps and data-quality notes

- **No wishlist-met metric.** The deck proves headcount and seniority but never says how many of the accounts Lenovo *asked for* attended. That is the number the retention plan treats as the north-star input (CLAUDE.md §2, §8 gap #2). It needs the invite/wishlist list (B) joined to the roster (C).
- **No post-event follow-up.** Nothing on meetings booked, leads passed or pipeline. The deck's own claim that "the selling happened in the spaces between sessions" isn't evidenced.
- **"Response" section is empty.** No feedback survey or testimonials were captured.
- **No media / amplification.** Any social posts or videos made for the retreat aren't reported. Per-sponsor media deliverables (gap #3) would fill this.
- **Minutes framing:** "4,320 minutes together" is 72 hours of wall-clock time, not engagement. The engagement split is 185 content minutes plus about 1,350 informal minutes (390 + 540 + 420). The template should label these separately.
- **Geography uses company HQ,** not delegate location. Capturing delegate city at registration would fix this.
- **Typos show the deck is hand-built:**
  - "VOCIE" and "ENMGAGEMENT"
  - Both roster slides are labelled "01 of 02"
  - Garbled slide numbers ("0 / 27", "27 / 27")
  - The word "roadmap" is split across table rows

  A generated template removes all of these.
- **Numbers checked and consistent:**
  - Share-of-voice sessions add up: 45 + 30 + 20 + 20 + 15 + 15 = 145.
  - Sector counts add up: 11 + 11 + 5 + 5 + 2 = 34.
  - Geography counts add up to 34; the percentages add to 101% because of rounding.
  - Seniority: 10 CXO + 10 VP/Director = 20 of 34, which is 59%.
