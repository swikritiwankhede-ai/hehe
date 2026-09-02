# Vendor keyword extractor

Pulls candidate product / solution / platform / use-case / technology labels off
vendor websites, so they can be classified into the ETSignals taxonomy.

## Why not just save the HTML?

A single vendor homepage is ~250 KB of markup for ~10 useful strings — the rest is
CSS, JS and theme boilerplate. 300 of those is ~75 MB, which no model can read.
This script throws away the 99.5% that is noise before anything is shared.

## Run it

```bash
pip install -r requirements.txt
python extract_vendor_keywords.py vendors.csv -o vendor_keywords_raw.csv
```

`vendors.csv` needs a `url` column; a `company` column is optional.
See `vendors.sample.csv`.

Useful flags:

- `-n 5` — smoke-test on the first five vendors before committing to all 300
- `-w 8` — vendors scraped in parallel (default 8; each domain is still rate
  limited to one request per second)
- re-running **resumes**: domains already in the output file are skipped, so a
  crashed or interrupted run can just be started again

Expect roughly 20–40 minutes for 300 vendors.

## What comes out

Four CSVs, so every keyword can be traced back to the page it came from.

`vendor_keywords_raw.csv` — the keywords

| column | meaning |
|---|---|
| `company` | as supplied in the input |
| `domain` | normalised host, `www.` stripped |
| `source` | `sitemap`, `nav_header` or `nav_footer` |
| `bucket` | `product`, `solution`, `platform`, `use_case`, `technology`, `service`, `capability`, `industry` or `nav` |
| `label` | the candidate keyword |
| `url` | where it was found |

`vendor_keywords_rejected.csv` — every label that was **discarded**, with the
reason (`stop word`, `marketing copy`, `asset or non-offering section`,
`headline, not a product name`, `over the 120-label cap`). This is how you check
that nothing important was thrown away.

`vendor_keywords_summary.csv` — one row per vendor: the homepage fetch status,
how many sitemap URLs were seen, how many pages were fetched, how many keywords
were kept and rejected, and any error. This is the per-URL proof that each
vendor was actually visited.

`vendor_keywords_errors.csv` — vendors that yielded nothing, usually a
JS-rendered nav or a bot wall. Handle those with the browser-console fallback.

### Keeping the pages themselves

Add `--raw-dir raw` and each vendor also gets `raw/<domain>/` containing
`homepage.html` (the page exactly as fetched), `sitemap_urls.txt` (every URL
found in the sitemap) and `fetch_log.txt` (every request and its outcome).

That makes the chain fully auditable: keyword → source URL → the saved page it
was read from. Budget roughly 100-300 MB for 345 vendors.

## Where the signal comes from

In descending order of quality:

1. **`sitemap.xml`** — URL slugs are a free, CMS-independent taxonomy.
   `/products/api-security/` gives you the bucket and the keyword with no HTML
   parsing at all. Sitemap indexes are followed one level deep.
2. **Header nav** — the mega-menu, where Products / Solutions / Platform live.
3. **Footer nav** — often a flatter and more complete product list than the header.

Slugs are title-cased with acronyms preserved in their canonical form, because
that is what buyers actually search: `sd-wan` → `SD-WAN`, `iot` → `IoT`,
`cspm` → `CSPM`.

## Fallback for sites that block scrapers

Open the site, then in the browser console:

```js
copy(JSON.stringify([...document.querySelectorAll(
  'header a[href], nav a[href], [class*=mega] a[href], footer a[href]'
)].map(a => [a.innerText.trim(), a.getAttribute('href')])
 .filter(([t]) => t && t.length < 70)));
```

That puts a compact JSON array on the clipboard. Paste those in batches.
