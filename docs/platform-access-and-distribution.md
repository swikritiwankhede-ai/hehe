# Report Studio: dependencies, access, communication and viewing

This covers what the platform depends on, who logs in and how, how reports and reminders reach people, and how each audience views the report. It also covers design choices that make **login the normal way in from day one**, so there's no drift back to email attachments and WhatsApp forwards.

Related docs:
- `docs/platform-design.md`: components
- `docs/intake-prd.md`: intake screen
- `docs/lovable-integrations.md`: connectors

---

## 1. Dependencies

### 1a. Systems and access (build blockers)
| # | Dependency | Needed for | Owner | Status / action | If missing |
|---|---|---|---|---|---|
| 1 | **OneWorld read API or nightly export**: event, sponsors, speakers, agenda, registrations, check-in, wishlist | Steps 1–4 automated | ET engineering | Export for attendees **not working**. Raise a ticket with field list and schedule | Excel upload stays a manual step every event |
| 2 | **Company SSO**: Google Workspace or Microsoft Entra; the domain and groups the team uses | Login, roles | ET IT | Confirm the IdP and whether an external host (Lovable/Supabase) may use it | Email + password accounts, which are weaker and get shared |
| 3 | **Google Drive service account** with view access to the event folders | Media step | ET IT + video team | Create the service account; share folders with it | Drag-and-drop uploads only |
| 4 | **Transcription vendor** + API key | Quotes, summaries | Product | Test 2 vendors on 3 real BWS recordings (Indian English, Hinglish) | Quotes typed by hand |
| 5 | **LLM access** (Lovable AI or own key) | Captions, summaries, quote picks | Product | Budget per event | Manual captions |
| 6 | **LinkedIn Community Management API** approval for the ETBrandEquity page | Automatic impressions | Social team | Apply now; plan for weeks | Page-level export uploaded once per platform |
| 7 | **Meta app** (Instagram business account) + **YouTube Analytics** OAuth | Automatic impressions | Social team | Link accounts; channel owner signs in | Page-level export |
| 8 | **Transactional email** (e.g. Resend, SendGrid, or ET's SMTP relay) with an ET sending domain (SPF/DKIM) | Invites, reminders, sponsor links | ET IT | Sending domain e.g. `reports.etbrandequity.com` | Emails land in spam or can't be sent |
| 9 | **Custom domain + HTTPS** for the app and sponsor viewer | Trust, link previews | ET IT | e.g. `studio.<et domain>` (internal) and `reports.<et domain>` (sponsor) | Lovable subdomain looks untrustworthy to sponsors |
| 10 | **Data governance / DPDP sign-off**: which personal fields are stored, where, for how long | Storing attendees outside ET systems | Legal + data governance | Proposed: name, designation, company, status; email hashed or kept for dedupe; **no mobile**; delete after 24 months | Pilot must run on hashed or sample data |
| 11 | **Hosting decision**: Lovable + Supabase for the pilot vs ET's stack for production | Everything | ET engineering + product | Pilot on Lovable; plan a move if governance needs it | Rework later |

### 1b. People and process (adoption blockers)
| Dependency | Why it matters |
|---|---|
| **Video team adopts the filename convention** `HHMM_<Hall>_<Format>_<First-Last>` | Otherwise media matching falls to manual dropdowns |
| **Social team registers every post URL** as it goes live | Impressions can be matched to the event |
| **Sales / Brand Solutions enter tier inclusions** (promised deliverables) | Promised-vs-delivered can't be computed without them |
| **One named report owner per event** | Someone approves and sends on T+1 |
| **Leadership mandate: "the link is the report"** | No parallel PPT made by hand |

### 1c. Decisions still needed
1. Sponsor access (§3b): a secure viewer link with login (recommended) vs PPT/PDF only (the current decision).
2. Which SSO provider, and whether it may be used by an externally hosted app.
3. Email sending domain and the named sender (e.g. "ETBrandEquity Events").
4. Retention period for attendee data.

---

## 2. Who uses it

| Audience | What they do | Access |
|---|---|---|
| **Events team** (report owner, 3–6 people) | Set up the event, run intake, review, approve, send | Full: company SSO, role **Owner / Editor** |
| **Contributing teams**: Video, Social, Delegate acquisition, Sales/Brand Solutions, Content | Upload or confirm their own piece only | Company SSO, role **Contributor**, limited to their step(s) |
| **Leadership** (BU head, Shahbaz for IPs, Keshav for Customs) | See all events' reports and retention metrics | Company SSO, role **Viewer**, read-only, all events |
| **Sponsors** (marketing manager + their leadership) | See the event report and download the deck | See §3b: invite-only viewer, no company SSO |

### Roles and permissions
| Permission | Owner | Editor | Contributor | Viewer | Sponsor |
|---|---|---|---|---|---|
| Create event, invite people | ✅ | — | — | — | — |
| Intake: all steps | ✅ | ✅ | own steps | — | — |
| Review queue, approve quotes/photos | ✅ | ✅ | — | — | — |
| Approve and freeze a report version | ✅ | — | — | — | — |
| Send to sponsors | ✅ | — | — | — | — |
| View internal report page (drill-downs, data-quality flags) | ✅ | ✅ | ✅ | ✅ | — |
| View sponsor report (totals only) | ✅ | ✅ | ✅ | ✅ | own events only |
| Download PPT / PDF | ✅ | ✅ | — | ✅ | ✅ (watermarked) |
| Personal data (attendee names, emails) | ✅ | ✅ | Delegate team only | aggregates only | **never** |

---

## 3. How people get in

### 3a. Internal users: company SSO from day one
- **Sign in with Google (or Microsoft).** One click, restricted to the company domain; no passwords to share.
- **Invite, don't sign up.**
  - The Owner adds people to an event by email and role.
  - Nobody can see an event they weren't added to, except Viewers.
  - First login lands them on **their** tasks for that event.
- **Deep links everywhere.** Every email or message links to the exact step, e.g. `/events/bws-2025/intake/media?tab=leaders`. After sign-in they land there, not on a home page.
- **Session length:** 12 hours, so the event-day evening needs one login.
- **Audit:** every import, override, approval and send is logged with user and time. This is only possible because everyone logs in.

### 3b. Sponsors: secure viewer link with lightweight login (recommended)
Current decision: sponsors don't access the platform and get a PPT/PDF.
Recommendation: keep the internal page internal, and add a **separate sponsor viewer**: a read-only web version of the same frozen report, totals only.

**Why:**
- **Attachments are invisible.** You can't tell whether the sponsor opened the deck, which slides they read, or whether it went up to their leadership. Those are the earliest retention signals you have.
- **One link, always current.** The T+14 refresh updates the same link; there's no "v2_final_final.pptx".
- **Personal data never leaves.** The viewer shows aggregates only.

**How sponsors get in:**
1. On T+1, the Owner clicks **Send**. Each sponsor's named contacts (from the sponsor record) get an email: "Your Brand World Summit 2025 report is ready", with a big **View report** button.
2. **The link is personal**, not shareable:
   - It's a magic link tied to that email. It works for 14 days and logs them in on first click.
   - After that, they sign in with a one-time code sent to the same work email. No password.
   - Access is limited to their company's email domain. A colleague on the same domain can request access in one click, and the Owner gets a notification to approve. **Forwarding the email to their CMO therefore creates a tracked new viewer, not an anonymous one.** That's the internal-escalation signal you want.
3. The viewer is mobile-first, since sponsors open these on phones. It has sections, the key numbers first, then **Download PPT / PDF**. Downloads are watermarked with the viewer's name and company.
4. **Fallback:** the PDF is attached to the email only if the sponsor's IT blocks the viewer domain. It is tracked separately.

**Rejected alternatives:**
| Option | Why not |
|---|---|
| Public link, no login | Anyone can see it; no idea who viewed it |
| Password per sponsor | Gets shared, forgotten, reset by email anyway |
| Sponsor accounts with passwords | Friction kills opens; support load |
| PPT attachment only | No view data; versions multiply |

---

## 4. How communication flows

Principle: **messages carry a status and a link, never the data itself.** Every notification says what is needed, who owes it and the deadline, and deep-links into the step. That makes logging in the fastest way to act.

### 4a. Timeline
| When | To | Channel | Message | Links to |
|---|---|---|---|---|
| **T-30** event created | Owner + contributors | Email invite + in-app | "You've been added to BWS 2025 as Video contributor. Your tasks: …" | Their task list |
| **T-7** | Contributors with open setup items | Email digest | "3 things due before the event: tier inclusions (Sales), filename convention (Video), post register (Social)" | Each item |
| **T0, event day** | Social team | In-app + optional Teams/Slack/WhatsApp | "Log today's post URLs as they go live" | Post register |
| **T0 18:00** | Video, Social, Delegate teams | Email + chat | "Intake is open. You owe: Sessions folder (Video), page exports (Social), check-in export (Delegate)" | Intake step |
| **T0 23:00** | Owner | Email + chat | Readiness: "5 of 7 ready. Missing: 22 key-speaker recordings (Video)" | Readiness panel |
| **T+1 08:00** | Owner + Editors | Email | "Draft report ready. Review queue: 14 quotes, 12 photos" | Review queue |
| **T+1 by 12:00** | Owner | In-app | Approve → freeze v1 → **Send** | Send screen |
| **T+1** on send | Sponsor contacts | Email from the ET sending domain | "Your report is ready" + View report | Sponsor viewer |
| **T+1** on send | Leadership | Email | "BWS 2025 report sent to 26 sponsors" + summary | Internal report |
| **T+3** | Owner | In-app | "11 of 26 sponsors have opened; 4 shared internally. Not opened: …" | Engagement panel |
| **T+3** | Sponsors who haven't opened | Email (one reminder only) | Gentle nudge from the named account manager | Sponsor viewer |
| **T+14** | Sponsor viewers | Email | "Your report has been updated with final video views and social numbers" | Same link, v2 |
| **T+30 / renewal window** | Account manager | In-app + email | "Renewal conversation: here's what they viewed, downloaded and shared" | Sponsor engagement card |

### 4b. Channels
- **In-app inbox** (bell icon): the source of truth for tasks. Always present.
- **Email:** invites, digests, sponsor delivery. Sent from the ET domain with a named sender.
- **Team chat** (Teams, Slack or a WhatsApp group bot, whichever the team actually uses): event-day nudges only. Each message is one line plus a link.
- **Quiet rules:** one digest per person per day except on T0/T+1; no messages 22:00–07:00 except to the Owner on T0; everything can be muted per event.

---

## 5. How each audience views the report

| Audience | View | Where | Contents |
|---|---|---|---|
| Events team | **Internal Report page** | `studio.<domain>/events/<id>/report` | 16 sections with drill-downs, sources, data-quality flags, readiness, version history, review queue, sponsor engagement panel |
| Contributors | **My tasks** + their intake step | `studio.<domain>/me` | What they owe, status, deadline |
| Leadership | **Portfolio view** | `studio.<domain>/portfolio` | All events: sent on time?, sponsor open rate, NRR / renewal status (Phase 3) |
| Sponsors | **Sponsor viewer** | `reports.<domain>/r/<token>` | Frozen version, totals only, mobile-first, Download PPT/PDF, "Request access for a colleague" |
| Anyone offline | **PPT / PDF** | Download | Same frozen version, watermarked |

---

## 6. Design mechanisms that make login the default from the beginning

The goal is that logging in is the **fastest** way to do the job. Then nobody needs to be forced.

### For internal users
1. **One-click SSO, no passwords.** No sign-up page. Invite → click → in.
2. **Every notification deep-links to the exact task.** Links go to the task, not "go to the portal".
3. **"My tasks" is the home page.** It lists what you owe for which event, by when, and who's waiting on you. First-time users see their 1–3 tasks, not an empty dashboard.
4. **No data arrives by email.**
   - Uploads happen only in the app.
   - Replies to notification emails bounce back with the upload link.
   - The team agrees to stop accepting WhatsApp attachments for report data.
5. **Visible ownership.**
   - Each gap on the readiness panel shows the person or team who owes it, with their avatar.
   - The Owner can "Nudge" in one click, which sends a deep link.
   - People log in because their name is on the gap.
6. **Credit for contributions.** The internal report credits who supplied each section ("Media: Video team · 14 files"). The leadership email names the teams.
7. **Onboarding in context.**
   - First visit to a step shows a 3-line "what you do here" card and a sample file to try.
   - There's no separate training.
8. **Pre-filled by T0.** Because OneWorld and Drive sync automatically, users log in to **check and approve**, not type. Short sessions make people come back.
9. **Mobile-friendly for event day.** The social team logs post URLs from their phone at the venue.

### For sponsors
1. **Magic link on day one, then a one-time code.** There's no account creation, so the first open takes about 5 seconds.
2. **The email shows a teaser, not the report.** It carries 3 headline numbers (illustrative: "1,020 delegates · 62% CXO · 4.1M impressions") with "See the full report". Enough to make them click, not enough to replace the click.
3. **The link is the report, and it updates.** "Updated T+14 with final video views" gives a reason to log in again.
4. **Share by inviting, not forwarding.**
   - A "Share with a colleague" button adds a named viewer on the same domain.
   - Forwarded links ask the new person to verify their email.
   - This turns every internal escalation (marketing manager → CMO → CFO) into a known contact.
5. **Download needs login.** The PPT/PDF is one click inside the viewer, watermarked, so people go through the viewer rather than around it.
6. **Their history grows over time (Phase 3).** Each new event adds to the same sponsor page: "Your 3 editions with ETBrandEquity". It becomes the renewal proof they keep coming back to.
7. **Named human sender.** The email comes from their account manager's name, with a reply-to that person.

### What to measure
| Metric | Target (pilot) |
|---|---|
| Contributors who complete their task in-app (not via email/WhatsApp) | ≥ 90% |
| Report sent by T+1 12:00 | 100% of pilot events |
| Sponsors who open the viewer within 3 days | ≥ 70% |
| Sponsors with ≥ 2 viewers (shared internally) | ≥ 30% |
| Sponsors who return at T+14 | ≥ 40% |
| Link between viewer engagement and renewal | Tracked from Phase 3 |

---

## 7. Lovable Prompt E: login, roles, notifications, sponsor viewer

```
Add access, roles, notifications and a sponsor viewer.

Auth (internal):
- Supabase Auth with Google (or Azure AD) SSO only, restricted to our company domain.
- No sign-up page; users exist only when invited.
- Tables: memberships(user_id, event_id nullable, role owner|editor|contributor|viewer, steps text[] for contributors).
- Enforce with Postgres RLS on every table. Contributors can write only their steps; Viewers are read-only; attendee personal fields are readable only by owner/editor/delegate contributors.
- Invite flow: the Owner enters email + role (+ steps). The invite email deep-links to /me.
- After login, redirect to the originally requested URL.

Home = "My tasks" (/me):
- Open tasks across events: task, event, due, status, "Open" deep link.
- Tasks are generated from intake status (e.g. a Video contributor gets "Sessions folder: 22 key speakers missing a file").

Notifications:
- Table notifications(id, user_id, event_id, kind, title, body, link, read_at, sent_email_at, sent_chat_at).
- In-app bell with unread count.
- Emails through an edge function using EMAIL_PROVIDER_API_KEY from the ET sending domain. Every email = one-line status + one button with a deep link; no data in the email body.
- Optional chat webhook (Teams/Slack) per event for event-day nudges.
- Scheduled jobs (pg_cron) create the timeline messages: T-7 digest, T0 18:00 intake open, T0 23:00 readiness to Owner, T+1 08:00 draft ready, T+3 engagement summary, T+14 refresh.
- Quiet hours 22:00–07:00 except Owner on T0. Per-event mute.
- A "Nudge" button next to every gap on the readiness panel.

Sponsor viewer (separate route group /r, separate layout, no internal navigation):
- Tables: sponsor_contacts(id, sponsor_id, name, email, role) and viewer_access(id, report_version_id, sponsor_id, email, token_hash, expires_at, first_opened_at, last_opened_at, invited_by).
- Send: for the frozen report version, create one viewer_access per sponsor contact and email a personal magic link (valid 14 days). After expiry, sign in with an email one-time code. Only emails on the sponsor's domain(s) are allowed.
- The viewer shows the frozen version, totals only, mobile-first, key numbers first, then sections. Buttons:
  - "Download PPT" / "Download PDF": watermark each page with "<viewer name> · <company> · <date>"
  - "Share with a colleague": same-domain email → new viewer_access, Owner notified
- Track view_events(access_id, section, event open|section_view|download|share, at). Never show attendee names or emails in the viewer.
- T+14: a new version on the same link, with "Updated <date>" and an email to existing viewers.

Engagement panel (internal report page):
- Per sponsor: sent, opened, viewers count, sections viewed, downloads, shares, last seen.
- Filter "not opened". Button "Send reminder" (max 1 per sponsor, from the account manager's name).

Audit log: every login, import, override, approval, send, view and download, with user and time. Owner-only page.
```
