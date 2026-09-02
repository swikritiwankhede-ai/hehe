# Vendor keyword extractor

Pulls candidate product / solution / platform / use-case / technology labels off
vendor websites, so they can be classified into the ETSignals taxonomy.

## Why not just save the HTML?

A single vendor homepage is ~250 KB of markup for ~10 useful strings — the rest is
CSS, JS and theme boilerplate. 300 of those is ~75 MB, which no model can read.
This script throws away the 99.5% that is noise before anything is shared.

## Run it

One command runs everything: scrape, clean, keep only technology terms, build
the workbook.

```bash
pip install -r requirements.txt
python run_all.py vendors.csv --out-dir results
```

Add `-n 5` to try five vendors first. Everything lands in `results/`, and the
scrape step resumes, so re-running after an interruption continues where it
stopped.

The four stages can also be run individually:

```bash
python extract_vendor_keywords.py vendors.csv -o raw.csv --vendor-dir vendors_out
python clean_keywords.py raw.csv -o clean.csv
python classify_keywords.py clean.csv -o tech.csv
python build_workbook.py --tech tech.csv --review tech_review.csv \
       --removed tech_dropped.csv --summary raw_summary.csv -o keywords.xlsx
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

### One folder per vendor

Add `--vendor-dir vendors_out` and each vendor gets its own folder, so a single
company can be checked without opening the combined CSV:

```
vendors_out/
  sentinelone.com/
    summary.txt        what was fetched and how much was found
    keywords.csv       the keywords kept for this vendor
    rejected.csv       what was discarded here, and why
    sitemap_urls.txt   every URL seen in the sitemap
    fetch_log.txt      every request and its outcome
  qualys.com/
    ...
```

This stays small — a few MB across 350 vendors. Add `--save-html` as well to
keep each `homepage.html` exactly as fetched, which completes the chain from
keyword to source URL to the stored page, at the cost of 100-300 MB.

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
