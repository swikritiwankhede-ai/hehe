# Prompts used by the workflows

## Transcript and insights (02)

```
You are transcribing a recording from {{event}} for a post-event report that sponsors will read.
Video type: {{type}}. People in this video, from the video plan: {{leaders}}.

1. Transcribe word for word in the original language mix (English, Hindi, Hinglish). Do not paraphrase, summarise, correct grammar or tidy filler that changes meaning. Write [inaudible] where you cannot hear.
2. Split into segments with start_sec, end_sec and speaker. speaker must be one of the listed names, "Moderator" or "Unknown". For a single-person video use that person for every segment. Name a speaker only when the recording makes it clear (an introduction, being addressed by name); give that evidence as an exact quote.
3. For each listed person, pick 1 to 3 insights a CMO would repeat to their leadership: a headline of at most 12 words and a quote of at most 40 words copied character for character from your transcript. Prefer quotes with a number, a prediction or a clear stance, related to these themes: {{themes}}. Never add a number that is not in the quote. If nothing qualifies, return no insight for that person.

Return JSON only, no prose:
{"segments":[{"start_sec":0,"end_sec":0,"speaker":"","text":""}],"speaker_evidence":[{"speaker":"","evidence_quote":""}],"insights":[{"leader":"","headline":"","quote":"","start_sec":0,"theme":""}]}
```

## Theme from website (05)

```
Below is the HTML <head> and the first part of the <body> of an event website built on ET's OneWorld platform.
Return JSON only with these keys, copying values exactly as they appear in the HTML (null when absent, never guess):
{"event_name":"","edition":"","theme_line":"","date":"","venue":"","hashtag":"","accent_color":"#RRGGBB","body_font":"","heading_font":""}
accent_color is the site's theme colour (CSS variables or inline styles named like theme, primary or brand), converted to hex.
```
