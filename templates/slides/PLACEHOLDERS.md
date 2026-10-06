# Template placeholders

Type these into any slide of the Google Slides templates. The build workflow (03) replaces them. Generated from the engine; regenerate after engine changes.

## How to add, change or remove slides
- **Add a slide:** duplicate any slide in the template (or make a new one) and type placeholders from the lists below, exactly as written, each in its own text box or run.
- **Make a slide disappear when its data is missing:** add a small text box with `[[section:NAME]]` (names below). The workflow deletes the slide if that section has no data, otherwise it just removes the marker.
- **Your own values:** type any new placeholder, e.g. `{{award_line}}`, then add a row to the `custom` tab: event_key, key = award_line, value = the text. Computed values always win over custom ones.
- **Pictures:** a shape containing `{{img:KEY}}` is replaced by the image (the URL must be viewable by anyone with the link).
- **Charts:** a box containing `{{chart:KEY}}` is replaced by bars drawn to fit the box.
- **Theme colours:** shapes or text in the sentinel colours are recoloured to the event theme: accent #FF00AA, dark #AA0077, light tint #FFD6F0. Use these colours for anything that should follow the event theme.
- **Remove a slide for good:** delete it from the template.

## IP template

**Sections** (for `[[section:NAME]]`): `glance`, `promise`, `room`, `orgs`, `content`, `speakers`, `quotes`, `partners`, `social`, `market`, `photos`, `cover`, `close`

**Charts:** `{{chart:seniority}}`, `{{chart:orgtype}}`, `{{chart:formats}}`, `{{chart:speaker_seniority}}`

**Images:** `{{img:q1_photo}}`…`{{img:q4_photo}}`, `{{img:photo1}}`…`{{img:photo6}}`, `{{img:logo1}}`…`{{img:logo12}}`

| Placeholder | Example (sample data) |
|---|---|
| `{{event_name}}` | Brand World Summit 2025 |
| `{{edition}}` | 7th Edition |
| `{{theme_line}}` | Reimagining Marketing In The Age of AI |
| `{{date_venue}}` | 4 Jul 2025 · Grand Hyatt, BKC, Mumbai |
| `{{hashtag}}` | #ETBWS2025 |
| `{{next_edition}}` | See you at the 8th edition |
| `{{as_of}}` | Data as of 2025-07-05 |
| `{{report_version}}` | v1 |
| `{{registrations}}` | 413 |
| `{{attended}}` | 260 |
| `{{show_up_pct}}` | 63% |
| `{{unique_orgs}}` | 15 |
| `{{speakers_count}}` | 35 |
| `{{sessions_count}}` | 13 |
| `{{content_hours}}` | 6.7 hrs |
| `{{partners_count}}` | 26 |
| `{{impressions_total}}` | 625K |
| `{{src_glance}}` | Sources: OneWorld registrations and check-in · OneWorld speakers, agenda and sponsors · pl |
| `{{target_attendees}}` | 1,000+ |
| `{{target_speakers}}` | 100+ |
| `{{attendees_vs_target}}` | 26% of target |
| `{{speakers_vs_target}}` | 35% of target |
| `{{cxo_count}}` | 73 |
| `{{cxo_pct}}` | 28% |
| `{{room_title}}` | 28% of the room were CXOs |
| `{{src_room}}` | n = 260 attendees (checked in) · seniority from job titles |
| `{{top_brands}}` | Lotus Naturals  ·  Crescent Pharma  ·  Kestrel Motors  ·  Quartz Electronics  ·  Tidal Bev |
| `{{orgs_title}}` | 81% of attendees came from brands |
| `{{src_orgs}}` | n = 260 attendees, 15 organisations · organisation type from the companies tab |
| `{{content_title}}` | 13 sessions, 6.7 hrs of content |
| `{{speakers_title}}` | 74% of speakers were CXOs |
| `{{speaker_highlights}}` | Sanjiv Mehta, Executive Chairman, L Catterton India / Prabha Narasimhan, MD & CEO, Colgate |
| `{{src_speakers}}` | n = 35 speakers · OneWorld speakers / event website |
| `{{q1_name}}` | Sanjiv Mehta |
| `{{q1_role}}` | Executive Chairman, L Catterton India |
| `{{q1_headline}}` | Sample headline: replaced by the approved insight |
| `{{q1_quote}}` | “Sample quote. The approved, word-for-word excerpt from this leader's session appears here |
| `{{q2_name}}` | Prabha Narasimhan |
| `{{q2_role}}` | MD & CEO, Colgate-Palmolive India |
| `{{q2_headline}}` | Sample headline: replaced by the approved insight |
| `{{q2_quote}}` | “Sample quote. The approved, word-for-word excerpt from this leader's session appears here |
| `{{q3_name}}` | Rohit Bhasin |
| `{{q3_role}}` | President and CMO, Kotak Mahindra Bank |
| `{{q3_headline}}` | Sample headline: replaced by the approved insight |
| `{{q3_quote}}` | “Sample quote. The approved, word-for-word excerpt from this leader's session appears here |
| `{{q4_name}}` | Kapil Grover |
| `{{q4_role}}` | CMO, Restaurant Brands Asia (Burger King) |
| `{{q4_headline}}` | Sample headline: replaced by the approved insight |
| `{{q4_quote}}` | “Sample quote. The approved, word-for-word excerpt from this leader's session appears here |
| `{{partners_title}}` | 26 partners across 13 groups |
| `{{partners_by_tier}}` | Presenting Partner: Samsung ads / Powered By: Monotype / Co-Powered by: Route Mobile / In  |
| `{{li_pre}}` | 271K |
| `{{li_event}}` | 41K |
| `{{ig_pre}}` | 132K |
| `{{ig_event}}` | 43K |
| `{{yt_pre}}` | 69K |
| `{{yt_event}}` | 70K |
| `{{total_pre}}` | 471K |
| `{{total_event}}` | 154K |
| `{{social_title}}` | 625K impressions and views across 3 platforms |
| `{{multiplier_line}}` | Event-day reach ran at 17.3x the pre-event daily average |
| `{{multiplier_basis}}` | Daily average on event day ÷ daily average from first event post (2025-05-12) to event sta |
| `{{src_social}}` | Platform analytics exports (LinkedIn page, Meta Business Suite, YouTube Studio) · 30 event |
| `{{m1_value}}` | ₹1,64,137 crore; +7% YoY, digital 60% |
| `{{m1_stat}}` | Indian advertising market |
| `{{m1_src}}` | GroupM TYNY 2025 |
| `{{m2_value}}` | 971.5 million |
| `{{m2_stat}}` | Internet users |
| `{{m2_src}}` | TRAI 2025 |
| `{{m3_value}}` | 85,698; +6% a year |
| `{{m3_stat}}` | High-net-worth individuals |
| `{{m3_src}}` | Knight Frank 2025 |
| `{{m4_value}}` | $350 billion |
| `{{m4_stat}}` | E-commerce market by 2030 |
| `{{m4_src}}` | Redseer 2024 |
| `{{photo1_caption}}` |  |
| `{{photo2_caption}}` |  |
| `{{photo3_caption}}` |  |
| `{{photo4_caption}}` |  |
| `{{photo5_caption}}` |  |
| `{{photo6_caption}}` |  |
| `{{award_line}}` | Shark Awards (sample custom field) |

## Custom template

**Sections** (for `[[section:NAME]]`): `mandate`, `kpis`, `wishlist`, `audience`, `sov`, `delivered`, `quotes`, `followups`, `feedback`, `roster`, `photos`, `cover`, `close`

**Charts:** `{{chart:seniority}}`, `{{chart:sector}}`, `{{chart:geo}}`, `{{chart:sov}}`

**Images:** `{{img:q1_photo}}`, `{{img:q2_photo}}`, `{{img:photo1}}`…`{{img:photo6}}`

| Placeholder | Example (sample data) |
|---|---|
| `{{event_name}}` | Northwind Leaders Circle 2025 (sample) |
| `{{edition}}` |  |
| `{{theme_line}}` | From Pilot to Scale: AI in the Enterprise |
| `{{date_venue}}` | 12–14 Sep 2025 · Sample resort, Goa |
| `{{hashtag}}` |  |
| `{{next_edition}}` | Thank you from ETBrandEquity Custom Solutions |
| `{{as_of}}` | Data as of 2025-07-05 |
| `{{report_version}}` | v1 |
| `{{sponsor_name}}` | Northwind Cloud |
| `{{obj1}}` | Convene 30 CXOs from target accounts |
| `{{obj2}}` | Land the "pilot to scale" narrative |
| `{{obj3}}` | Build relationships beyond the sales cycle |
| `{{obj4}}` | Turn conversations into follow-ups |
| `{{leaders_attended}}` | 34 |
| `{{leaders_committed}}` | 30 |
| `{{attendance_vs_commit}}` | 113% |
| `{{touchpoints}}` | 13 |
| `{{content_minutes}}` | 200 |
| `{{sponsor_minutes}}` | 145 |
| `{{sov_pct}}` | 73% |
| `{{cxo_count}}` | 17 |
| `{{sectors_count}}` | 9 |
| `{{kpi_title}}` | 34 leaders in the room against 30 committed |
| `{{src_kpis}}` | Sources: room check-in · run-of-show with session owners · signed proposal. Data as of 202 |
| `{{wishlist_total}}` | 25 |
| `{{wishlist_attended}}` | 19 |
| `{{wishlist_met}}` | 15 |
| `{{wishlist_met_pct}}` | 60% |
| `{{wishlist_title}}` | 19 of 25 target accounts were in the room |
| `{{accounts_met}}` | Aurora Steel  ·  Bluepeak Pharma  ·  Cedarline Motors  ·  Delta Grid Power  ·  Everest Fin |
| `{{src_wishlist}}` | Target list agreed with Northwind Cloud · outcomes from the session desk and check-in |
| `{{audience_title}}` | 91% of the room were CXO, VP or Director |
| `{{orgs_count}}` | 28 |
| `{{src_audience}}` | n = 34 leaders · seniority from job titles · sector and region from the companies tab |
| `{{sov_title}}` | Northwind Cloud owned 73% of content minutes (145 of 200) |
| `{{src_sov}}` | Run-of-show: sessions tagged by owner; informal blocks excluded |
| `{{delivered_title}}` | 7 of 7 commitments delivered |
| `{{delivered_lines}}` | ✓ Event identity and co-branding · All days · committed Yes, delivered Yes / ✓ Sponsor key |
| `{{src_delivered}}` | Committed: signed proposal · delivered: ops checklist with evidence |
| `{{q1_name}}` | Deepa Nair |
| `{{q1_role}}` | Chief Information Officer, Delta Grid Power |
| `{{q1_headline}}` | Sample headline |
| `{{q1_quote}}` | “Sample quote from a fictional attendee, used to show the layout.” |
| `{{q2_name}}` | Aditi Rao |
| `{{q2_role}}` | Chief Technology Officer, Aurora Steel |
| `{{q2_headline}}` | Sample headline |
| `{{q2_quote}}` | “Another sample quote, for layout only.” |
| `{{followups_title}}` | 6 leaders asked Northwind Cloud to follow up |
| `{{followup_lines}}` | Aurora Steel: Infrastructure assessment / Cedarline Motors: Pricing workshop / Everest Fin |
| `{{feedback_avg}}` | 4.7 / 5 |
| `{{would_return_pct}}` | 85% |
| `{{feedback_n}}` | n = 20 responses |
| `{{feedback_quote}}` | “The smallest room I have been in with peers who are actually scaling AI.” |
| `{{roster_col1}}` | Aditi Rao · Chief Information Officer, Aurora Steel / Chirag Nair · Chief Digital Officer, |
| `{{roster_col2}}` | Arjun Sethi · Vice President - IT, Bluepeak Pharma / Isha Joshi · VP Engineering, Indus Te |
| `{{photo1_caption}}` |  |
| `{{photo2_caption}}` |  |
| `{{photo3_caption}}` |  |
| `{{photo4_caption}}` |  |
| `{{photo5_caption}}` |  |
| `{{photo6_caption}}` |  |

