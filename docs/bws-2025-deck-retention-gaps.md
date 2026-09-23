# BWS 2025 Deck: Why It Doesn't Help Retain Sponsors

Scope: **only** `Brand World Summit 2025 _ Deck.pptx.pdf` (Drive). This is the deck ET BrandEquity uses to sell BWS 2025, and it is built largely from the 2024 edition's results.

The reasons below are what the deck itself shows. Anything that needs outside data is marked **[Check]**.

## What the deck contains

| Section | Content | Whose data |
|---|---|---|
| Market context | ₹1,64,137 cr ad market, 971.5 M internet users, HNIs, e-commerce, middle class | Third-party reports (GroupM, Knight Frank, TRAI, Redseer, PwC) |
| 2024 highlights | Keynotes (Sanjiv Mehta, Deepak Subramanian, Manish Tiwary); speaker testimonials (Nivea, P&G, IKEA) | 2024 edition |
| 2024 impact | 7.18x overall social impressions "over average"; 4.38x LinkedIn, 10.18x X, 9.6x Instagram, 2.42x Facebook; 80K+ views per video | Media team, event-level |
| Past partners | Logo wall, 14 tier labels (Powered By ×2, Associate, Communications, Creative, Wellness, Outdoor, Engagement, Co-Partners, Insights, Gifting, Exhibitor, Startup Arena, Delegate Kit) | Sales |
| 2025 promise | 1 day, 1000+ professionals, 100+ thought leaders, Shark Awards; "indicative" CEO/CMO speakers; 8 themes | Editorial / Sales |
| What sponsors can buy | Leadership Dialogues, Customer Success Showcase (wishlist accounts), Welcome Soirée, Branding Integrations, BWS Studio, Pitch Room (up to 3 CMOs, "maximizing conversion") | Sales |

## Slide-by-slide map: requirements and data sources

The slide order follows the deck's text export (16 slides).
- **Type:** Static = reused boilerplate; Pull = copied from a source system; Computed = calculated from sources; Manual = human-written or chosen.
- **Retention gap** refers to the numbered reasons below.

| # | Slide | Data points required | Source | Owner | Type | Retention gap / what automation must add |
|---|---|---|---|---|---|---|
| 1 | Cover | Event name, edition, theme ("Redefining Marketing for 1.4 Billion Indians"), date (4 Jul 2025), city | Event master / setup sheet; website hero | Content / Editorial | Pull | None; should come from one event record, not retyped |
| 2 | Why India is a marketing paradise | Ad market ₹1,64,137 cr (+7%, digital 60%), 971.5 M internet users, 85,698 HNIs, e-commerce $350 B by 2030, middle class 61% by 2047 | Third-party reports: GroupM TYNY 2025, Knight Frank 2025, TRAI 2025, Redseer 2024, PwC 2024 | Editorial / Research | Static + manual refresh | Keep each stat with its source and year so the figures can be refreshed; typos show it's pasted by hand (gap 5) |
| 3 | 2024 keynote speakers | Name, title, company, session title/topic (Sanjiv Mehta, Deepak Subramanian, Manish Tiwary) | Agenda (setup-sheet `Speaker`/`Day`), website speaker JSON, photos | Content / Editorial | Pull | Only speakers who actually spoke (agenda, not target list) |
| 4 | Past-edition highlights and speaker testimonials | Highlight video/photos; quote, name, title, company (Nivea, P&G, IKEA) | On-ground photos and video, YouTube, testimonial capture | Media | Manual pick from an asset library | **No sponsor testimonials** (gap 1). Add: partner quote + partner feedback score from a post-event survey |
| 5 | Impact: "Eyeballs. Impact. Results." | Overall 7.18x; LinkedIn 4.38x, X 10.18x, Instagram 9.6x, Facebook 2.42x; 80K+ views per video | Platform analytics on event posts (setup-sheet `Calendar`, `ETStudio`, `5D byte`, `videos` URLs) ÷ stored pre-event baseline | Media | Computed (today: by hand) | No baseline recorded; conflicts with 17.8x (gap 3). Add: baseline window, platform totals, and a **per-partner cut** (posts, mentions, views per partner) |
| 6 | Past-edition partners (logo wall) | Partner name, logo, tier label (14 labels) | Setup-sheet `Partner` tab; website partner blocks | Sales / Brand Solutions | Pull | Only logos (gap 1). Add: canonical tier, what each tier included, delivered status, renewed yes/no |
| 7 | "7th Edition is around the corner" + cover repeat | Edition number, date, theme | Event master | Content | Pull | None |
| 8 | "Mahakumbh of Brands" headline stats | 1 day, 1000+ professionals, 100+ thought leaders, Shark Awards | Target figures from Sales/Editorial plan | Sales / Editorial | Manual (a promise) | No 2024 actuals shown (gap 4). Add the previous edition's actuals beside the target: registrations, check-ins (715), speakers (102) from registration/check-in + agenda |
| 9–10 | Indicative speakers 2025 + past speakers 2024 | Name, title, company, photo; status (indicative / confirmed / spoke) | Speaker pipeline (tracker `Target List` / `Confirmed Speakers`); agenda; website JSON | Content / Editorial | Pull | "Indicative" isn't tracked to "confirmed" to "spoke" (gap 4). Needs a speaker-status field and one person ID |
| 11 | Be a part of the BWS community (audience types) | Audience roles (CDOs/CMOs/Digital heads/CTOs/VPs) and org types (brands, agencies, publishers, start-ups…) | Today: marketing copy. Should be: registration designation + company, sorted into seniority and org type | Delegate acquisition | Manual (should be computed) | Replace the list with **actual audience mix** from the last edition (40% CMOs, 65% brands) computed from registration/check-in |
| 12 | Why you shouldn't miss BWS 2025 (5 reasons) | Value-proposition copy | Sales / Editorial | Sales | Static | No proof points attached. Link each reason to a measured result (e.g. "Network with decision-makers": X CMOs attended, Y partner meetings) |
| 13 | Insights that matter (8 themes) | Theme / track list | Editorial agenda plan; setup-sheet agenda | Content / Editorial | Pull | None; post-event version should show sessions and speakers per theme |
| 14 | Partnership opportunities | Leadership Dialogues, Customer Success Showcase (wishlist accounts), Welcome Soirée, Branding Integrations (chair, lanyard, F&B, lounge), BWS Studio | Sponsorship grid / rate card (tier → inclusions, add-ons, price) | Sales | Static (should be pulled) | No past outcomes (gap 2). Post-event: per partner, RT attendees vs wishlist, showcase audience, soirée guests, branding delivered, Studio chats and views |
| 15 | Pitch Room | Up to 3 wishlist CMOs per partner; pre-briefed; invite acceptance | Wishlist sheet (per partner) → invitation log → acceptance → meeting held | Sales + Delegate acquisition | Static (should be computed) | **Nothing measured** (gap 2). Post-event: wishlist CMOs named, invited, accepted, met, follow-up requested |
| 16 | Let's collaborate + videos | Contact, CTA, YouTube links (3) | Sales contact; YouTube channel | Sales / Media | Pull | Add video views per link (YouTube analytics) |

### Data sources this deck depends on

| Source | Slides | Available for BWS today? |
|---|---|---|
| Event master / setup sheet (event, agenda, partners, media URLs) | 1, 3, 5, 6, 7, 9–10, 13 | [Check]: BWS setup sheet not yet in Drive (Secufest used as format reference) |
| Website (speaker JSON, partner blocks) | 3, 6, 9–10 | Yes (2024 and 2025 pages pasted) |
| Registration + check-in export | 8, 11 | **Missing** |
| Speaker pipeline (target → confirmed → spoke) | 9–10 | [Check]: BWS tracker not in Drive |
| Platform analytics + stored baseline | 5, 16 | **Missing** (no baseline method recorded) |
| Sponsorship grid / rate card | 6, 14 | [Check]: BWS grid not in Drive |
| Wishlist, invitations, meeting log | 14, 15 | **Missing** |
| Asset library (photos, video, testimonials) | 4 | Partly (YouTube) |
| Partner feedback survey | 4 | **Missing** |
| Third-party market reports | 2 | Yes (static) |
| Sponsor history / renewal | 6 | **Missing** |

## Why the deck doesn't help manage the relationship

### 1. Every sponsor gets the same generic deck
- **Past partners appear only as logos.** NIQ GfK, MoEngage, ShareChat, Exotel, AiSensy, Spotify, Havas and others are on the wall, but nothing says what any of them *got* in 2024. A returning sponsor sees their own logo, not their results.
- **The same deck goes to a new prospect and a renewing sponsor.** Nothing in it builds on last year's relationship, such as "here's what you received, here's what we propose next."
- **The testimonials come from speakers, not sponsors.** Nivea, P&G and IKEA speaking at the event is proof the content was good. It isn't proof that sponsoring pays off.

### 2. It sells outcomes that were never measured
- **The paid formats all promise results:**
  - Pitch Room: "guaranteed attention", "high-intent", "maximizing conversion"
  - Customer Success Showcase: "your wish-list accounts"
  - Leadership Dialogues: "access to prospect accounts"
- **The deck has no 2024 result for any of these:**
  - how many Pitch Room meetings happened
  - how many wishlist accounts attended
  - how many prospects were met
  - any follow-up or conversion
- **Because nothing was measured last year, the promise can't be backed up.** And unless something changes, 2025's results won't be captured either, so the same gap repeats at the next renewal.

### 3. The main numbers are for the event, not the sponsor, and can't be checked
- **The social-growth figures are ET's own reach.** Sponsors can't use them in their own reporting because nothing is broken down by sponsor: no mentions, posts or video views per partner.
- **"7.18x … over average" has no stated baseline:** average of what, measured over which period? A sponsor's marketing team can't explain the number to its leadership.
- **[Check]** The 2024 post-event report gives the same figure as **17.8x**. One of the two is wrong, and nothing records which.

### 4. It promises a lot, with no record to check delivery against
- **The 2025 targets are stated with no 2024 actual beside them:** 1000+ professionals and 100+ thought leaders, but no attendance or audience mix is reported.
  - **[Check]** The 2024 report says 715 attendees, below the "1000+" level the deck continues to promise.
- **The "indicative" 2025 speakers are top CEOs and CMOs,** including ITC, HUL, P&G, Britannia and Pidilite. Sponsors buy partly on this lineup, but nothing tracks whether those speakers actually came.
- **The deck never shows what each tier includes or costs.** Fourteen tier labels with no stated inclusions means each sponsor's commitments are agreed one by one and never recorded as data. That is the gap that makes "promised vs delivered" impossible to show later.

### 5. Signs the deck is assembled by hand
- **Garbled copy:** "E-commerce to $350 by Reach 2030 Billion", "Ravi Rohit Bhasin, President Santhanam…", "Powered By" printed twice. This comes from copying content between years by hand.
- **Old results are reused wholesale** ("The 6th Edition made a big splash"). Nothing is refreshed from source data.

### 6. [Check] Past partners don't appear to come back
- **None of the named 2024 partners on this deck's logo wall appear among the named 2025 partners on the BWS 2025 website.** The 2025 names are Samsung Ads, Monotype, Route Mobile, Flipkart Ads, Google Messages, Tata Communications, The Trade Desk, frog, Shakuniya, L&T, Roshan Space, Lenskart, Fixderma, Good Bug and Refreshing.
- **The 6 unnamed 2025 exhibitors and the startups were not checked.**
- If this holds, BWS kept **almost none of its 2024 named partners.** That fits every reason above: the deck gave them nothing specific to bring back to their own leadership.

## What the automated deck must add to fix this

| Gap above | Needed in the automated BWS deck | Data needed |
|---|---|---|
| 1 | **A section per partner:** your tier, your inclusions, delivered status, your speakers and sessions, your media | Tier-inclusion grid, partner list, agenda, media deliverables |
| 2 | **Access outcomes:** Pitch Room meetings held, wishlist accounts attended / met, Leadership Dialogue attendees | Wishlist list ⨝ check-in ⨝ meeting log |
| 3 | **Per-partner reach**, and the social-growth formula printed in the deck (baseline window, platforms) | Post URLs + analytics + stored baseline |
| 4 | **Promised vs actual:** registrations, attendance, audience mix, speakers who confirmed vs actually spoke | Registration/check-in, agenda vs website speaker list |
| 5 | **Generated from source data, with no manual copy-paste** | All of the above |
| 6 | **A renewal view per sponsor:** past editions, what they received, whether they renewed | Sponsor history table |
