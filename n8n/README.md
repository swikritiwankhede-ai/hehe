# n8n workflows

| File | What it does | Trigger |
|---|---|---|
| `workflows/01-upload-event-data.json` | Upload any data file (OneWorld export, template, social export) into the data sheet, checked and deduped | n8n form |
| `workflows/02-video-to-insights.json` | New video in Drive → Gemini transcript → word-for-word-checked insights (pending approval) | Drive folder, every 5 min |
| `workflows/03-build-deck.json` | Builds the IP or Custom deck from the sheet into a copy of the Slides template, emails the lead a link and PDF | n8n form |
| `workflows/04-daily-readiness.json` | 09:00 IST readiness email to each active event's lead | Schedule |
| `workflows/05-theme-from-website.json` | Reads the event website and proposes the deck theme (accent colour, hashtag, theme line) | n8n form |

Setup and the full build plan are in `docs/n8n-build-blueprint.md`. Prompts are in `prompts.md`.
After changing `engine/report-engine.js`: `npm test && npm run n8n`, then re-import the changed workflows.
