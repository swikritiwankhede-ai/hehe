# Why Sponsor Relationships Leak and Repeat Sponsorship Suffers

This document gives the root causes, grounded in the files reviewed so far:
- BWS 2024/25 web pages, report and deck
- Lenovo Leaders Circle '26 deck
- ETCIO Cloud Summit sales tracker and website
- `Custom Clients.xlsx`

Each cause is tagged by the strength of evidence behind it:
- **[Seen]** means observed directly in the files.
- **[Hypothesis]** means it is plausible but must be validated with the Sales and Custom Solutions teams.

## 0. The size of the problem (proxy data)

`Custom Clients.xlsx` is billing history for FY23–FY27, with 1,532 rows. It covers **ETCIO, ETCISO and ETCFO only, with no BrandEquity rows**, so treat it as a proxy until the BrandEquity billing export is available.

Company names were matched roughly: case and punctuation removed, "Private Limited" suffixes stripped.

| Custom clients in year | Bought Custom again next year | Bought *anything* next year |
|---|---|---|
| FY23 → FY24 (33 clients) | 12 (36%) | 42% |
| FY24 → FY25 (46) | 14 (30%) | 48% |
| FY25 → FY26 (48) | 21 (44%) | 58% |

Across FY23–FY26, **140 distinct Custom clients** appear in the billing file:
- **102 (73%) bought Custom only once.**
- 24 bought in two years, 12 in three years and 2 in all four years.

Roughly **six in ten Custom sponsors do not come back for another Custom** the following year.

## 1. The deck doesn't prove the sponsor's own outcome

The value chain (CLAUDE.md §1) breaks at the step "the sponsor's marketing manager has real proof". What the deck proves is not what the sponsor bought.

| # | Cause | Evidence |
|---|---|---|
| 1.1 | **No "accounts met vs accounts asked for".** Custom sponsors buy access, but the deck reports headcount and seniority, never how many of *their* target accounts attended. | [Seen] The Lenovo deck has 34 vs 30 committed and 59% senior, but no wishlist-met figure. |
| 1.2 | **IP sponsors get an event-level report, not their own.** A Gold or Silver partner receives the same deck as everyone else: logo wall, overall audience mix, overall social growth. Nothing reconciles their tier inclusions. | [Seen] The BWS 2024 report has no per-partner section. |
| 1.3 | **Promised vs delivered isn't checked systematically, so misses go unnoticed.** | [Seen] Lightstorm, a Silver partner, has a speaker on the ETCIO Cloud Summit website but no agenda slot. No sheet flags this. |
| 1.4 | **Nothing after the event.** There is nothing on leads passed, meetings booked, follow-ups or pipeline. The sponsor's leadership asks "what did it produce?" and the deck stops at the event. | [Seen] The Lenovo deck claims "the selling happened between sessions" with no evidence. The Response section is empty. |
| 1.5 | **Media reach is shown for the event, not for the sponsor.** The social-growth figures belong to the event; the sponsor can't say how much reach its own posts and videos got. | [Seen] BWS shows 4.38x LinkedIn growth etc. event-wide. The Secufest video tabs track per-sponsor posts, but no engagement is ever reported back. |
| 1.6 | **Sponsor feedback is never collected,** so problems surface only when the renewal is lost. | [Seen] The Lenovo Response section is empty. [Hypothesis] No post-event survey is run as standard. |

## 2. The numbers aren't defensible

The sponsor's marketing manager has to defend the spend to their own leadership. Soft or inconsistent numbers make that harder.

| # | Cause | Evidence |
|---|---|---|
| 2.1 | **The same figure differs between documents.** | [Seen] Overall social growth is 17.8x in the BWS 2024 report and 7.18x in the 2025 deck. |
| 2.2 | **What was promised before the event is out of line with what happened.** | [Seen] The BWS website promised "1000+ experts" and "300 attendees" on the same page. The report says 715 attendees. |
| 2.3 | **No record of how figures are calculated.** The social-growth multipliers have no recorded starting baseline, and minute counts mix wall-clock time with engagement. | [Seen] Lenovo's "4,320 minutes together" is simply 72 hours. |
| 2.4 | **Hand-built decks carry visible errors.** | [Seen] "VOCIE", "ENMGAGEMENT", both roster slides labelled "01 of 02", garbled slide numbers. |

## 3. The data is scattered, so the deck is slow and costly to make

| # | Cause | Evidence |
|---|---|---|
| 3.1 | **8–10 sources owned by different teams.** The deck is assembled by hand from: proposal, sponsorship grid, sales tracker, setup sheet, registration, check-in, run-of-show, analytics, outdoor/print, photos. | [Seen] Mapped in both source docs. |
| 3.2 | **The same person looks different in different sheets.** There are spelling and title mismatches, and one list is out of date. | [Seen] Kaninghat / Kanninghat, Sayed / Syed, Bajaj Life / Bajaj Allianz Life. 10 names in `Confirmed Speakers` appear nowhere on the agenda. |
| 3.3 | **Tier names change from event to event,** so no view is comparable across editions. | [Seen] BWS 2024 used 14+ tier names, BWS 2025 used 13, and Secufest uses 6 priced tiers. |
| 3.4 | **Commitments live only in documents.** The proposal/SOW is not a table, so nothing can be computed against it. | [Seen] The Lenovo objectives and "30 committed" appear only as deck text. |
| 3.5 | **The deck arrives late,** after the sponsor has started its next budget cycle. The sales cycle is 6–7 months, so the renewal conversation must begin within weeks of the event. | [Hypothesis] Need the deck turnaround time per event. |

## 4. No system of record for the relationship

| # | Cause | Evidence |
|---|---|---|
| 4.1 | **No single view of a sponsor.** Nothing shows, per sponsor, the events bought, what was promised, what was delivered, satisfaction and renewal status. | [Seen] The only cross-year file (`Custom Clients.xlsx`) is billing only: FY, month, client, site, product. |
| 4.2 | **No early warning.** Under-delivery (a missing speaker slot, a thin wishlist) is found at deck time or never, when it's too late to fix on the day or offer a make-good. | [Seen] The Lightstorm gap (1.3). |
| 4.3 | **The post-event report is reused as the next sales deck,** but it is generic. The renewal pitch isn't tailored to what *this* sponsor got. | [Seen] The BWS 2025 sales deck reuses the 2024 report's numbers, speakers and logo wall. |
| 4.4 | **IP and Custom are run separately.** BrandEquity sells both, with separate owners and deck formats. A sponsor buying both may get two uncoordinated stories and two contacts. | [Hypothesis] Check for sponsors that bought both an IP and a Custom in the same year. |
| 4.5 | **Nothing ties delivery quality to renewal.** Nobody can say "sponsors who got more than 70% of their wishlist renewed at X%", so there is nothing to steer by. | [Seen] No field links fulfilment to renewal in any file reviewed. |

## 5. How the causes map to fixes (MVP data layer, CLAUDE.md §8–9)

| Cause | Fix |
|---|---|
| 1.2, 1.3, 3.4, 4.2 | **Committed-deliverables table** (tier grid + SOW), plus delivered status from ops, checked during the event, not after |
| 1.1, 4.5 | **Wishlist-status link:** invite/wishlist list ⨝ check-in ⨝ met |
| 1.5 | **Per-sponsor media deliverables** with post-event engagement |
| 2.x, 3.2, 3.3 | **Normalised import:** one person/company ID, a canonical tier list, recorded metric definitions |
| 1.4, 1.6 | **New capture:** follow-up / leads-passed log and a standard feedback survey |
| 3.1, 3.5, 2.4 | **Auto-generated deck** from the above, so turnaround is days and there are no typos |
| 4.1, 4.3 | **Sponsor account view:** history, fulfilment, feedback and renewal, feeding a tailored renewal pitch |

## 6. To validate with the teams

1. Get the **BrandEquity billing / renewal export**, and redo §0 for IP and Custom separately.
2. For 5–10 **lost sponsors**, ask Sales for the stated reason. Map each to the causes above.
3. Measure **deck turnaround** (event date → deck sent) for recent BrandEquity events.
4. Confirm whether a **feedback survey** or **leads-passed log** exists anywhere.
5. Check how many sponsors bought **both an IP and a Custom** in the same year (4.4).
