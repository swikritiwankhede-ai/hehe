# Bulk HTML downloader

Saves the HTML of every URL in `urls.txt` (356 vendor sites) to one file per site.

Two scripts, because "the HTML" means two different things:

| | `fetch_html.py` | `fetch_rendered.py` |
|---|---|---|
| What you get | Exactly what the server sends | The DOM after JavaScript runs |
| Needs | Python 3.8+, nothing else | `pip install playwright` + a browser |
| Speed | ~1-2 min for all 356 | ~15-30 min for all 356 |
| Use when | You want the real source, `<meta>` tags, scripts | The site is React/Next/Vue and the raw body is nearly empty |

Many sites in this list are JS-rendered marketing sites, so the raw HTML will
look thin. If you care about the visible text and content, use the rendered one.

## Quick start

```bash
python3 fetch_html.py                 # urls.txt -> html/, plus report.csv
```

Output:

```
html/redis.io.html
html/www.cloudflare.com.html
html/in.ingrammicro-asia.com.html
...
report.csv          # url, final_url, status, bytes, file, error
```

### Options

```bash
python3 fetch_html.py -i urls.txt -o html -c 8 -t 30 -r 2
```

- `-c` parallel downloads (default 8; raise to 16-24 on a good connection)
- `-t` per-request timeout in seconds
- `-r` retries per URL (backs off on 403/429/503)
- `--force` re-download files that already exist
- `--insecure` skip TLS verification (a few sites have broken certificate chains)

Re-runs skip anything already downloaded, so if a batch dies partway just run
it again — only the missing ones are fetched.

## Rendered version

```bash
pip install playwright
playwright install chromium

python3 fetch_rendered.py                    # -> html_rendered/
python3 fetch_rendered.py --screenshots      # also a full-page PNG per site
```

- `-c` parallel tabs (default 4 — each is a real browser tab, so this costs RAM)
- `--settle` extra seconds to let network activity go quiet (default 8)
- `--browser-path /path/to/chrome` use a Chromium you already have

## Reading the report

```bash
# how many worked
awk -F, 'NR>1 && $3 ~ /^2/' report.csv | wc -l

# what failed, and why
awk -F, 'NR>1 && ($3 !~ /^2/) {print $1, $3, $6}' report.csv
```

## Expect some failures

Out of 356 sites, a handful will not come back cleanly no matter what:

- **403 / Cloudflare / Akamai bot walls** — the big security vendors are the
  most aggressive about this. The rendered version gets past most of them.
- **429 rate limiting** — lower `-c`, the retry backoff handles the rest.
- **Timeouts** on slow or geo-restricted hosts (several `.in` sites are slow
  from outside India).

The script still saves the body of a 403 page, so check the file before
assuming a site is lost — sometimes it is the real page behind an odd status.

## Notes on the list

- `urls.txt` holds all 356 URLs, deduplicated, one per line.
- `grc3.io./` was normalised to `grc3.io/` (the trailing dot was a typo).
- "EZE Cloud" was in the source list with no URL attached, so it is not
  included — add its URL to `urls.txt` if you have it.
- Some companies appear twice under both apex and `www.` hostnames
  (e.g. `firecompass.com` and `www.firecompass.com`). Both are kept, since
  they can serve different content; each gets its own file.

## One-liner alternative

If you would rather not use the script at all:

```bash
mkdir -p html
xargs -P 8 -I{} sh -c \
  'curl -sSL --max-time 30 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0" \
   "{}" -o "html/$(echo {} | sed -e "s#https\?://##" -e "s#/\$##" -e "s#[/:]#_#g").html"' \
  < urls.txt
```

It works, but you get no report, no retries, and no resume.
