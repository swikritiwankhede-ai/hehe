# Workflows: real-time data and running the platform

The prototypes (`prototype/*.html`) are clickable designs. They can't hold API keys, run on a schedule or receive data. **Workflows live in the built platform** (Lovable + Lovable Cloud, per `docs/no-code-build-playbook.md`).

A workflow is:
- **a trigger:** a schedule, a new file, an upload or a button
- **steps:** fetch, check, transform, AI
- **a write** to the database
- **a status** that the workspace shows live

Prompt O below adds the workflow engine, the run log and the live screen updates. The "Automations" view in `prototype/report-workspace.html` shows what it looks like.

## 1. The workflows

| # | Workflow | Trigger | What it does | Writes to | Shows up in |
|---|---|---|---|---|---|
| W1 | Website harvest | Daily 07:00 IST from T-30; button "Refresh now" | Fetch the event page; parse event, theme, sponsors, speakers, agenda; diff against the last run | events, themes, sponsors, speakers, sessions | Source squares 1–3; "2 speakers added" in Today |
| W2 | Drive watch | Every 5 min on event day, hourly T-1 and T+1 | List new files in Videos/ and Photos/; match videos to the video plan | media_files, video_plan.status | Video brief: Expected → Received |
| W3 | Transcribe and draft insights | A video row becomes "received" (with audio extracted in the browser by the Media tab) | Gemini transcript (chunked), speaker naming, 1–3 insights per leader, quote checks | transcripts, insights (pending) | Video brief: Transcribing → Insights ready; Today: "Approve N insights" |
| W4 | Photo sorting | New photos arrive | Remove duplicates, score, tag scenes, link to sessions, suggest 12 | photos | Photos review |
| W5 | Attendee import | File uploaded (OneWorld export or template) | Map columns with a saved preset, validate, dedupe, classify seniority and industry | people, registrations | Source square 4; audience numbers |
| W6 | Social import | Export uploaded (LinkedIn / Instagram / YouTube) | Map, match by hashtag, split pre-event and event day, snapshot with an as-of date | social_posts, social_snapshots | Source square 6; social numbers |
| W7 | Readiness and nudges | Every 15 min on T0 and T+1; at 18:00 and 22:00 IST on T0 | Recompute the 7 sources; message whoever owes a missing item | intake_status, notifications | Today queue; emails / chat nudges |
| W8 | Freeze and send | Owner clicks "Freeze v1" | Lock data + theme, generate the PPT, create sponsor links, send emails | report_versions, ppt_exports, viewer_access | Sponsor links tab |
| W9 | Sponsor engagement | Every sponsor open, view, download or share | Log the event; daily summary at 09:00 IST | view_events | Sponsor links tab; T+3 reminder list |
| W10 | T+14 refresh | Scheduled at T+14 09:00 IST | Ask the social team for final exports; rebuild as v2 on the same links once uploaded | report_versions | Sponsor links tab: "v2 sent" |

**Real time in the screens:** every workflow writes a status row. The workspace subscribes to those tables (Lovable Cloud supports live database subscriptions), so squares turn green, the Today queue changes and video rows move status **without anyone refreshing the page**.

## 2. Rules every workflow follows
1. **Logged.** Each run writes to `workflow_runs`:
   - workflow, event
   - trigger (schedule / file / button)
   - started, finished, status (running / succeeded / failed / skipped)
   - counts (rows in / added / rejected)
   - error message
2. **Safe to repeat.** Running twice never duplicates data (upserts by key).
3. **Retried, then alerts.** A failed run retries twice (after 1 and 5 minutes). If it still fails, it alerts the event lead in Today and by email, naming the workflow and the fix ("Website changed: paste the HTML").
4. **Can be stopped.** Each workflow has an on/off switch per event, plus "Run now".
5. **Time zone.** Schedules are written in IST in the settings. The scheduler usually runs in UTC (IST = UTC + 5:30), so 18:00 IST = 12:30 UTC. Check every schedule after setup.
6. **Keys stay on the server.** Gemini and Drive keys are used only in server functions, never in the browser.

## 3. Lovable Prompt O: workflow engine, run log, live updates

```
Add a workflow layer to the platform.
1. Tables:
   - workflows(key, name, description, enabled_default, schedule_ist)
   - event_workflows(event_id, workflow_key, enabled, last_run_at)
   - workflow_runs(id, workflow_key, event_id, trigger schedule|file|button|event, status running|succeeded|failed|skipped, started_at, finished_at, rows_in, rows_added, rows_rejected, error, attempt)
2. Register these workflows, each as a server function plus its trigger:
   - W1 website_harvest: daily 07:00 IST from T-30 to T0
   - W2 drive_watch: every 5 min on event day; hourly T-1 and T+1
   - W3 transcribe_insights: when a video_plan row becomes received and its audio exists
   - W4 photo_sort: when new photos arrive
   - W5 attendee_import: on file upload
   - W6 social_import: on file upload
   - W7 readiness_nudges: every 15 min on T0 and T+1, plus 18:00 and 22:00 IST on T0
   - W8 freeze_send: on the Owner's button
   - W9 engagement_log: on sponsor-page events, with a 09:00 IST daily summary
   - W10 t14_refresh: T+14 09:00 IST
   Convert IST to the scheduler's time zone (UTC = IST − 5:30) and show both in settings.
3. Every run inserts a workflow_runs row at start and updates it at the end. Make each workflow idempotent (upsert by natural key). On failure, retry after 1 and 5 minutes, then create a Today task for the event lead and send an email naming the workflow, the error and the suggested fix.
4. "Automations" page per event:
   - one card per workflow: on/off, schedule (IST), last run (status, time, counts), next run, "Run now"
   - a live run log below, newest first, with filters for failed runs
5. Live updates: subscribe the workspace pages (Today, Events list, event Overview, Video brief, Automations) to changes in intake_status, video_plan, insights, workflow_runs and notifications, so they update without a page refresh. Show a small "Live" indicator, and "Reconnecting…" when the connection drops.
6. Never call Gemini, Drive or email from the browser; only from server functions that read keys from secrets.
Test: upload samples/oneworld_registrations_sample.csv → a W5 run appears as running, then succeeded with 426 rows in, 6 duplicates merged and 7 rejected (missing email), and source square 4 turns green without a refresh.
```

## 4. Going live (running the platform for an event)

| When | Step | Who |
|---|---|---|
| Once | Publish the Lovable app; add the custom domain if IT provides one; confirm the secrets (Gemini, Drive) are set | You |
| Once | Restrict sign-in to the company domain; invite event leads, the video team and the social team with roles | You |
| Once | Check each schedule in IST on the Automations page; run W1 by hand on the BWS 2025 page | You |
| T-30 | Create the event: website URL, event code, hashtag; W1 starts daily | Event lead |
| T-7 | Approve the theme; confirm speakers; enter tier promises | Event lead, Sales |
| T-3 | Confirm the video plan; share the Drive folder and file names with the video team | Event lead |
| T0 | Workflows run on their own (W2, W3, W4, W7). Watch the Today queue; upload the OneWorld export in the evening | Event lead, video team |
| T+1 morning | Approve insights and photos; upload the social exports; Freeze v1 → W8 sends links | Event lead, social team |
| T+3 | W9 summary: remind sponsors who haven't opened | Account managers |
| T+14 | W10: final social exports → v2 on the same links | Social team, event lead |

**Health check before every event:** the Automations page shows no failed runs in the last 24 hours, and "Run now" on W1 succeeds.
