# Vendor keyword extractor

Pulls candidate product / solution / platform / use-case / technology labels off
vendor websites, so they can be classified into the ETSignals taxonomy.

## Why not just save the HTML?

A single vendor homepage is ~250 KB of markup for ~10 useful strings — the rest is
CSS, JS and theme boilerplate. 300 of those is ~75 MB, which no model can read.
This script throws away the 99.5% that is noise before anything is shared.

## Run it

One command scrapes the sites and builds the workbook. The scraper keeps only
technology and cybersecurity terms as it goes, so there is nothing to clean up
afterwards.

```bash
pip install -r requirements.txt
python run_all.py vendors.csv --out-dir results
```

Add `-n 5` to try five vendors first. Everything lands in `results/`, and the
scrape step resumes, so re-running after an interruption continues where it
stopped.

The stages can also be run individually:

```bash
python extract_vendor_keywords.py vendors.csv -o keywords.csv --vendor-dir vendors_out
python build_workbook.py --tech keywords.csv --review keywords_review.csv \
       --removed keywords_removed.csv --summary keywords_summary.csv -o out.xlsx
```

`clean_keywords.py` and `classify_keywords.py` are no longer part of the run.
They remain for replaying an updated vocabulary over data already collected,
without re-crawling.

## What counts as a keyword

`tech_vocabulary.py` holds around 460 terms across 17 domains, from Security
Operations to Business Applications. A label is kept only if it contains one,
and the matched term also supplies its domain and the category that domain
rolls up to.

Labels matching a removal rule - industries, dates, CVE numbers, language
switchers, careers, site sections, third-party brand references - are dropped
with the reason recorded. Anything matching neither goes to `needs_review`
rather than being guessed at: these are vendor coinages such as "Nirikshak" or
"MetaDefender Transfer Guard" that only a person can judge.

The per-vendor cap applies **after** this filter, so a vendor's budget is spent
on real offerings rather than on menu items.

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
