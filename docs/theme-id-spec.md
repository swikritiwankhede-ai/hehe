# Theme ID: one theme per event report, carried into the PPT

Every event report is bound to exactly one **theme ID**. The theme is captured from OneWorld (Event Website → Colors & Fonts, Templates → Top Banner). It is approved once, then frozen with each report version. The report page and the generated PPT both read that frozen theme, so the deck always looks like the event website on the day it was sent, even if the website is redesigned later.

Files:
- `themes/thm_etbe-bws_2025_v1.json`: the BWS 2025 theme
- `tools/build-ppt-from-theme.mjs`: the PPT generator that reads it
- `samples/bws2025_report_sample.json`: sample report data (sample figures)
- `samples/ETBrandEquity_BWS2025_PostEventReport_v1_thm_etbe-bws_2025_v1.pptx`: the resulting 4-slide sample deck

## 1. The IDs

| ID | Format | BWS 2025 example | What it identifies |
|---|---|---|---|
| **Event key** | `<vertical>-<series>-<year>` | `etbe-bws-2025` | The event (joins to OneWorld's event ID) |
| **Theme ID** | `thm_<vertical>-<series>_<year>_v<n>` | `thm_etbe-bws_2025_v1` | One approved set of theme tokens |
| **Theme checksum** | `sha256:` of the tokens (sorted keys) | `sha256:3f51e303…` | Detects any change to the tokens |
| **Report ID** | `rpt_<vertical>-<series>_<year>` | `rpt_etbe-bws_2025` | The event's report |
| **Report version** | `v<n>` | `v1` (T+1), `v2` (T+14) | A frozen, sendable version |
| **PPT export ID** | `ppt_<report>_<version>_<yyyymmddhhmm>` | `ppt_etbe-bws_2025_v1_202507051030` | One generated file |

Vertical codes: `etbe` BrandEquity, `etcio` CIO, `etciso` CISO, `ethr` HR. Series codes are short and fixed per IP (e.g. `bws`, `digiplus`).

## 2. Lifecycle

```
OneWorld Colors & Fonts ──capture──▶ theme draft ──checksum──▶ approve ──▶ thm_…_v1 (immutable)
                                                                        │
             report rpt_etbe-bws_2025 ──binds──▶ theme_id ◀─────────────┘
                     │
                     ├─ freeze v1 (T+1) ── stores theme_id + checksum ──▶ PPT export (reads frozen theme)
                     └─ freeze v2 (T+14) ─ same theme_id unless the team re-binds on purpose
```

Rules:
1. **Capture.** On event setup, and again at T0, the system reads Colors & Fonts and Templates from OneWorld (or the pasted form) into a **draft** theme.
2. **Checksum.** Hash the tokens. If the hash equals the current approved theme's, nothing changes. If it differs, create a new draft `v<n+1>`, and the Owner sees "The website theme changed since v1: accent colour, heading font".
3. **Approve.** The Owner approves the theme once, after reviewing the cover preview, the website cross-check (5 of 5), the licensed-font flag and the contrast warning. Approved themes are **immutable**.
4. **Bind.** The report stores `theme_id`. Only an approved theme can be bound.
5. **Freeze.** Freezing a report version copies `theme_id` and `checksum` into the version. A T+14 refresh keeps the same theme unless someone re-binds on purpose, which is logged.
6. **Generate PPT.** The generator refuses to run if the theme isn't approved, or if the report's `theme_id` doesn't match the theme file (see the checks at the top of the script).
7. **Reuse.** Next year's edition starts from the last theme of the series (`thm_etbe-bws_2025_v1`) as a draft, then updates from OneWorld. This gives consistent decks across editions and quick setup.

## 3. What the theme holds

From `themes/thm_etbe-bws_2025_v1.json`:

| Token | Value | From OneWorld | Report page (CSS variable) | PPT |
|---|---|---|---|---|
| `font.body` | Montserrat | Font Family | `--font-body` | Body face `Montserrat` (fallback Arial) |
| `font.heading` | SangBleu Versailles | Heading Font Family | `--font-heading` | Face **Georgia** until a licence allows embedding |
| `size.h1 / h2 / body` | 24 / 20 / 14 | Heading / Subheading / Paragraph size | `--size-*` px | Scaled for slides: 36 / 30 / 16, captions 11 |
| `color.bg` | rgba(255,255,255,1) | Body Background Color | `--bg` | Content slide background `#FFFFFF` |
| `color.text` | rgba(0,0,0,1) | Body Text Color | `--text` | Body text `#000000` |
| `color.accent` | rgba(231,66,95,1) | Default Theme Color | `--accent` | `#E7425F`: cover and closing background, left bar, stat tiles |
| `color.heading` | rgba(231,66,95,1) | Heading Color | `--heading` | Slide titles `#E7425F` |
| `weight.heading` / `case.heading` | 700 / Initial | Heading Font weight / Capitalization | `--heading-weight` | Bold; titles in sentence/initial case |
| `layout.heading` | Style 1 | Section Heading Layout | Section header style | Section divider layout |
| `space.section` | 50 | Spacing between Sections | `--section-gap` | — |
| `event.hashtag` | #ETBWS2025 | Banner Hashtag | Header chip | Cover, footer, closing |
| `event.edition` | 7th Edition | Edition Text | Header | Cover |
| `image.banner` | banner URL | Templates → Top Banner | Cover band | Cover background (when used) |
| `image.edition` | not yet exported | Edition Image | Badge | Cover badge |

**Derived values** are computed once and stored in the theme, so every deck gets the same result:
- hex colours
- `accent_tint` `#FCE8EC` (12% accent) and `accent_dark` `#B9354C` (80% accent)
- contrast of white on the accent: **3.93:1**
- PPT type sizes

**The contrast rule is applied by the generator:** white on the accent only at ≥ 18 pt bold (cover and closing). Big numbers use `accent_dark` on `accent_tint`; small text uses black.

The theme line ("Reimagining Marketing In The Age of AI") is **content**, not theme. It lives on the report (from Event Details), so fixing a typo in it doesn't create a new theme version.

## 4. Where the theme ID shows up

| Place | How |
|---|---|
| Internal report page | Chip in the header: `Theme thm_etbe-bws_2025_v1 · approved 25 Sep` → opens the theme with its source and cross-check |
| PPT file properties | `Subject: theme_id=…; theme_checksum=sha256:…; report_version=v1` |
| PPT slide 1 speaker notes | theme_id, checksum, report version, source screen (not visible when presenting) |
| PPT file name | `ETBrandEquity_BWS2025_PostEventReport_v1_thm_etbe-bws_2025_v1.pptx` |
| Export log | `ppt_exports(ppt_export_id, report_id, report_version, theme_id, theme_checksum, generated_by, generated_at, file_path)` |
| Sponsor viewer (if adopted) | Uses the same frozen theme, so the web view and the PPT match |

The ID never appears on the visible slides; sponsors see the event's look, not internal IDs.

## 5. Data model

```
themes(theme_id PK, event_key, version, status draft|approved|retired, tokens jsonb, derived jsonb,
       fonts jsonb, checksum, source jsonb, created_by, approved_by, approved_at)
reports(report_id PK, event_key, theme_id FK → themes, theme_line, ...)
report_versions(report_id, version, frozen_at, theme_id, theme_checksum, metrics_snapshot jsonb, ...)
ppt_exports(ppt_export_id PK, report_id, version, theme_id, theme_checksum, file_path, generated_by, generated_at)
```

Constraints:
- `report_versions.theme_id` must reference an **approved** theme.
- `themes.tokens` can't be updated once approved (a trigger rejects it).
- A new version is a new row.

## 6. Generating the deck

```bash
npm i pptxgenjs
node tools/build-ppt-from-theme.mjs \
  themes/thm_etbe-bws_2025_v1.json \
  samples/bws2025_report_sample.json \
  "ETBrandEquity_BWS2025_PostEventReport_v1_thm_etbe-bws_2025_v1.pptx"
```

The sample deck has 4 slides built from slide masters:
1. **Cover:** accent background, edition, name, theme line, date and venue.
2. **"The event at scale":** accent title, 6 stat tiles in tint with dark-accent numbers, a source line on every number, and a "SAMPLE FIGURES" label.
3. **Section divider:** "What speakers said", in the heading style.
4. **Closing:** accent background and hashtag.

All figures in the sample are made up except the speaker (35), partner (26 in 13 groups) and edition counts.

## 7. Lovable Prompt F: theme ID

```
Add theme versioning so every report and PPT is tied to one theme.
- Tables themes, reports.theme_id, report_versions.theme_id/theme_checksum, ppt_exports as in docs/theme-id-spec.md §5. Enforce with RLS + a trigger that blocks updating tokens of an approved theme.
- Theme IDs: thm_<vertical>-<series>_<year>_v<n> (e.g. thm_etbe-bws_2025_v1). checksum = SHA-256 of JSON.stringify(tokens with sorted keys).
- Step 1 "Event and theme" saves a draft theme from the OneWorld Colors & Fonts fields. If the checksum equals the approved theme's, do nothing; otherwise create v<n+1> as a draft and show what changed.
- "Approve theme" (Owner only) after showing the cover preview, website cross-check, licensed-font flag and contrast. Compute derived values: hex colours, accent_tint (12% mix with white), accent_dark (80%), contrast of white on the accent, PPT sizes 36/30/16/11.
- The report header shows a theme chip; binding a different theme is Owner-only and logged.
- Freezing a report version copies theme_id + checksum. Generate PPT reads ONLY the frozen theme:
  - pptxgenjs slide masters COVER and SECTION built from the tokens
  - heading face = fonts.heading.ppt_face, body face = fonts.body.ppt_face
  - white on the accent only at ≥ 18pt bold
  - stamp theme_id, checksum and report version into pptx.subject and slide-1 notes
  - file name <Brand>_<Series><Year>_PostEventReport_<version>_<theme_id>.pptx
  - write a ppt_exports row
- Next edition: "Start from last year's theme" copies the series' latest approved theme as a draft.
```
