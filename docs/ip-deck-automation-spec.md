# Automated IP Post-Event Deck: Slide Spec (Brand World Summit)

**Goal:** the BWS post-event deck is generated automatically and shared with all sponsors on **T+1** (the day after the event).

**Scope:** it is an **IP** deck. It shows the value the event delivered **at scale, to the whole ecosystem**. It does **not** give each sponsor a separate section; per-sponsor detail belongs to Custom decks.

## 1. What we now know about the sources

### Event backend (ETB2B event platform)
It is shared across ET events, e.g. "Automation To Autonomy | 3980 | Cio". The modules seen in screenshots:

| Module | What it holds | Fields seen | Deck use |
|---|---|---|---|
| **Design → Template / Top Banner** | Custom header, desktop and mobile banner, sponsor logo strip, header text, alignment | Banner image, mobile image, sponsor logo (571×340), "Header Info + CTA" | Cover, section dividers, thank-you slide (**slides 1 & 16**, the old 1 & 7) |
| **Event Setup → Event Details** | Name, edition, date/time, venue | "Mar 13, 2026 (05:00 PM–10:00 PM)" | Cover, at-a-glance |
| **Event Setup → Speakers** | Speakers shown on the website | ID, name, designation, company, speaker group, status (active), weightage | Speakers, content |
| **Event Setup → Agenda** | Sessions | Time, title, speakers | Content, sessions |
| **Event Setup → Sponsors** | Sponsors shown on the website | ID, name, logo, group name (tier), added date, status; Sponsor Group count (BWS 2025: **26 sponsors in 13 groups**) | Partner ecosystem |
| **Target Audience → Registrations** | Every registration | Name, email, mobile, designation, company, location, **visitor source, lead source, conversion source**, registration date, form type | Audience, funnel |
| **Target Audience → Attendees** | People who attended (checked in) | Same fields | Headline, audience quality, show-up |
| **Target Audience → Shortlisted Users** | Approved / curated delegates | Same fields | Funnel |
| **Target Audience → Wishlist Users** + Upload Wishlist | Accounts partners asked for | Same fields | Access-programme delivery (aggregate) |
| **Email Marketing** | Invites, reminders, newsletters | Sends, opens, clicks (assumed) | Reach funnel |
| **Activity & Reporting** | Platform reports | [Check] | Funnel, engagement |
| **Media Center → Event Images / Event Videos** | Uploaded media | File name, URL, status, date (the example event had **none uploaded**) | Glimpses, speaker moments |

### Outside the backend
| Source | Owner | How it arrives today |
|---|---|---|
| Speaker photos, video clips, **audio of what speakers said** | Video team | Shared by hand after the event |
| Post-level impressions (LinkedIn, Instagram, Facebook, YouTube, X) | Social media team | Opened post by post and exported by hand |
| Posting window rule | Social media team | **Pre-event** = post date → event start; **During** = event days |
| Outdoor / print placements | Outdoor partner / print desk | By hand |

## 2. Slide spec for the automated BWS deck

- **Status:** "Existing" = in the 2025 deck. "Improve" = exists but shown poorly. "New" = a must-add.
- **T+1:** whether the data can be ready by the morning after the event.

| # | Slide | Data points | Source | Automation | T+1? | Status |
|---|---|---|---|---|---|---|
| 1 | **Cover** | Event name, edition, theme, date, venue, banner, presented-by logos | Design → Top Banner; Event Details; Sponsors (top tiers) | Pull banner image and fields into the template | ✅ | Existing |
| 2 | **Edition at a glance** | Registrations, attendees, show-up %, unique organisations, speakers, sessions, content hours, partners, total impressions, video views | Registrations, Attendees, Speakers, Agenda, Sponsors, social export | Count / sum | ✅ (social: during-event only) | Improve |
| 3 | **Promised vs delivered** | Each pre-event promise (e.g. "1000+ professionals", "100+ thought leaders", indicative speakers) next to the actual; % of indicative speakers who spoke | Website stats block / sales deck targets; Attendees; Speakers (active) vs Agenda | Store targets as data, then compare | ✅ | **New** |
| 4 | **Who was in the room: seniority & function** | % CXO / VP / Director / Manager; % marketing / CMO; count of CMOs and CEOs; **n** shown | Attendees → designation | Designation classifier (rules + AI fallback; fixes encoding errors like "DGM Ã¢â‚¬Å“") | ✅ | Improve (40% CMOs had no base or n) |
| 5 | **Who was in the room: organisations** | Org type (brand / agency / publisher / start-up / tech), industry mix, **top brands present** (logo wall of attendee companies), company size band | Attendees → company; company master / enrichment | Company matching + classifier | ✅ | **New** (brands in the room) |
| 6 | **Reach & registration funnel** | Invited → registered → shortlisted → attended; registrations by channel (newsletter, direct, partner, social, paid); registration curve over time | Email Marketing; Registrations (lead / visitor / conversion source, date); Shortlisted; Attendees | Group lead-source values into channels | ✅ | **New** |
| 7 | **Content delivered** | Sessions, tracks, formats (keynote / panel / fireside / case study), content minutes, sessions per theme | Agenda; Key Discussion Points (Design) | Parse agenda | ✅ | Improve |
| 8 | **Speaker line-up** | Speakers by seniority and company type; brand vs partner vs editorial speakers; featured keynotes | Speakers (group, weightage) + classifier | Pull + classify | ✅ | Improve |
| 9 | **What was said (speaker moments)** | 4–6 speaker photos, each with a key quote from the session | Video team audio / video → Media Center; Speakers; Agenda | **Transcribe audio**, pick quotes with AI, match to speaker by agenda slot, human approves | ⚠️ if audio lands on T0 | Improve (today: generic testimonials) |
| 10 | **Partner ecosystem** | Partners by tier (canonical tier + event label); total partner-led sessions, partner speakers, partner content minutes, activations (Studio, soirée, branding integrations) | Sponsors (group); Agenda (sessions tagged to a partner); Speakers | Tag each session to its owner; aggregate | ✅ | Improve (today: logos only) |
| 11 | **Access programmes delivered (all partners combined)** | Pitch Room meetings held; Leadership Dialogue / Customer Success Showcase sessions and attendees; **wishlist fulfilment across all partners** (% of wishlist accounts that attended) | Wishlist Users ⨝ Attendees; RT / Pitch Room log | Join on email / company | ✅ if check-in is complete | **New** |
| 12 | **Amplification** | Per platform: posts, impressions, reach, engagement, engagement rate for **pre-event** and **during event** windows, plus the multiplier with its baseline shown (e.g. during-event daily average ÷ pre-event daily average) | Social exports (move to APIs); post list tagged to the event | Window rule automated; per-day normalisation | ✅ pre + during | Improve (7.18x had no base; conflicts with 17.8x) |
| 13 | **Owned media & content** | Videos published and views (top 3); ET BrandEquity article count and page views; live stream / Studio views; newsletter sends and opens | Media Center; YouTube; site analytics; Email Marketing | API pulls | ⚠️ partial at T+1 | **New** |
| 14 | **Glimpses** | 8–12 photos (stage, audience, networking, partner activations) | Media Center → Event Images | Auto-select a mix of categories; human approves | ⚠️ needs same-day upload | Existing |
| 15 | **Voice of the room** | Attendee rating / NPS, % who would return, 2–3 attendee and partner quotes | Survey sent through Email Marketing on the evening of the event | Aggregate | ⚠️ partial responses | **New** |
| 16 | **Year on year + next edition / thank you** | Growth vs last edition (attendees, CXO share, brands, impressions); next edition date; CTA | Past editions in the backend; Design template | Compare editions | ✅ | **New** (YoY); existing (CTA) |
| — | *Refresh v2 at T+14* | ET Studio videos, 5D bytes, post-event social tail, full survey, outdoor / print reach | Same sources | Re-run the generator | T+14 | New |

## 3. Data points that are must-haves but missing today

These show value at scale and are what a sponsor's marketing manager can take to their own leadership:
1. **Promised vs delivered for the event.** Targets next to actuals (slide 3). Without this, every promise in the next sales deck is unproven.
2. **Show-up rate and unique organisations.** Registrations alone overstate the room.
3. **Brands in the room.** For an event about CMOs, the list of brands that attended is the single most persuasive proof of audience quality.
4. **Decision-maker count, with n.** "142 CMOs and CXOs", not just "40%".
5. **Reach funnel by channel.** Shows how much of the audience ET's own channels (newsletter, portal) brought in. The backend already records conversion source.
6. **Access programmes, combined across partners.** Pitch Room meetings and wishlist fulfilment across all partners. This proves the paid access formats work without breaking out each sponsor.
7. **Collective partner presence.** Partner sessions, partner speakers, partner minutes and activations.
8. **Real amplification numbers.** Absolute impressions, reach and engagement per platform next to the multiplier, with the baseline stated.
9. **Owned-media reach.** Articles, page views, live-stream / Studio views and newsletter opens. ET owns the portal, so this data is available and currently unused.
10. **Attendee and partner voice (NPS).**
11. **Year-on-year growth.**

## 4. Existing data points that are shown poorly

| In the 2025 deck | Problem | Fix |
|---|---|---|
| 7.18x overall social growth | No baseline, no absolute numbers, conflicts with 17.8x | Show the absolute figures and the formula; compute from the pre/during window rule |
| 4.38x / 10.18x / 9.6x / 2.42x per platform | Growth multiples only | Add impressions, reach and engagement per platform |
| 80K+ views per video | Unclear: average, maximum or total? Over how many videos and what period? | Total and average views, n videos, "as of" date |
| 40% CMOs / 65% brands (2024 report) | No base; registrations or attendees? | Attendees only, with n |
| Partner logo wall | Logos only; 14 labels | Canonical tier + counts + collective partner presence |
| Speaker list | Names only | Seniority and company-type mix; % indicative → spoke |
| Themes list | Not linked to sessions | Sessions and speakers per theme |
| Testimonials | Speakers only, chosen by hand | Transcript quotes + attendee / partner survey |
| Outdoor and print | No reach | Reach / placements from the outdoor partner, or drop them |

## 5. The pipeline for T+1

```
T-30…T0  Backend: event, banner, speakers, agenda, sponsors (tier), registrations, wishlist
         Social team logs every post URL against the event (the post list)
T0       Check-in marked in backend (Attendees) · video team uploads photos + audio to Media Center
         Survey email sent at event close
T0 night Connectors pull: backend (all modules) · social APIs by post list (pre / during windows)
         Processing: dedupe + fix encoding · designation → seniority · company → org type / industry
                     · transcribe audio → quote picks · photo selection · target vs actual
         QA gate: automatic checks (totals add up, n ≥ threshold, no conflicting figure)
                  + one human approval on quotes and photos
T+1 AM   Render deck in the website template (Design → Top Banner) → PDF / PPTX → sent to all sponsors
T+14     Auto-refresh v2 (Studio videos, social tail, full survey) → re-send
```

### Operational prerequisites (otherwise T+1 fails)
- **Check-in must be recorded in the backend on the day.** Attendees is the base for slides 2–6 and 11.
- **Media must be uploaded on T0.** The Media Center was empty for the example event.
- **Every social post must be logged with its URL.** Manual per-post export does not scale to T+1. Replace it with platform APIs:
  - LinkedIn Pages / Community Management API
  - Meta Graph API for Facebook and Instagram
  - YouTube Analytics API
  - X API
- **Pre-event targets must be stored as data** (not only as website text), so slide 3 can compute them.
- **Sessions must be tagged with their owner** (ET / brand speaker / partner) in the agenda, for slides 10–11.
- **A canonical tier mapping must exist for the 13 sponsor groups** (e.g. "NBFC Fintech Partner" → category partner).

## 6. Open questions
1. Does the backend have an API or export for all modules, or is it screen-only? This decides whether the connectors are integrations or scheduled exports.
2. Is check-in currently recorded in the Attendees tab for BWS, or kept on paper / a separate app?
3. Is the multiplier meant as during-event impressions ÷ pre-event impressions (raw), or per-day normalised? Pre-event windows vary in length, so per-day is recommended.
4. Who approves the deck before it is sent on T+1: Shahbaz (IP owner) or the event lead?
