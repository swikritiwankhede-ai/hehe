#!/usr/bin/env python3
"""Download the raw HTML of every URL in a list file.

Standard library only -- no pip install needed.

    python3 fetch_html.py                      # reads urls.txt -> html/
    python3 fetch_html.py -i my.txt -o out -c 16 --retries 3

Re-runs are resumable: a URL whose output file already exists is skipped
unless you pass --force.
"""

import argparse
import concurrent.futures as futures
import csv
import gzip
import io
import os
import random
import re
import socket
import ssl
import sys
import time
import urllib.error
import urllib.request
import zlib
from urllib.parse import urlparse

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)
HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "close",
}


def slugify(url):
    """Stable, filesystem-safe name derived from the URL."""
    p = urlparse(url)
    name = p.netloc + p.path.rstrip("/")
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("_")
    return (name or "index")[:150] + ".html"


def decompress(raw, encoding):
    if encoding == "gzip":
        try:
            return gzip.decompress(raw)
        except OSError:
            return raw
    if encoding == "deflate":
        try:
            return zlib.decompress(raw)
        except zlib.error:
            try:
                return zlib.decompress(raw, -zlib.MAX_WBITS)
            except zlib.error:
                return raw
    return raw


def decode(raw, ctype):
    """Bytes -> text, preferring the charset the server or the document declares."""
    charset = None
    m = re.search(r"charset=([\w-]+)", ctype or "", re.I)
    if m:
        charset = m.group(1)
    if not charset:
        m = re.search(rb'charset=["\']?([\w-]+)', raw[:4096], re.I)
        if m:
            charset = m.group(1).decode("ascii", "ignore")
    for enc in filter(None, [charset, "utf-8", "cp1252"]):
        try:
            return raw.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    return raw.decode("utf-8", "replace")


def fetch_one(url, timeout, retries, ctx):
    last = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                raw = resp.read()
                raw = decompress(raw, (resp.headers.get("Content-Encoding") or "").lower())
                text = decode(raw, resp.headers.get("Content-Type"))
                return resp.status, resp.geturl(), text, ""
        except urllib.error.HTTPError as e:
            # A 4xx/5xx body is still worth keeping -- many WAFs return usable HTML.
            body = b""
            try:
                body = e.read()
                body = decompress(body, (e.headers.get("Content-Encoding") or "").lower())
            except Exception:
                pass
            text = decode(body, e.headers.get("Content-Type") if e.headers else None)
            if e.code in (403, 429, 503) and attempt < retries:
                last = f"HTTP {e.code}"
                time.sleep((2 ** attempt) + random.random())
                continue
            return e.code, url, text, f"HTTP {e.code} {e.reason}"
        except (urllib.error.URLError, socket.timeout, ssl.SSLError, ConnectionError, OSError) as e:
            last = f"{type(e).__name__}: {e}"
            if attempt < retries:
                time.sleep((2 ** attempt) + random.random())
                continue
    return 0, url, "", last or "failed"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-i", "--input", default="urls.txt", help="file with one URL per line")
    ap.add_argument("-o", "--outdir", default="html", help="directory for the .html files")
    ap.add_argument("-c", "--concurrency", type=int, default=8, help="parallel downloads")
    ap.add_argument("-t", "--timeout", type=float, default=30.0, help="per-request timeout (s)")
    ap.add_argument("-r", "--retries", type=int, default=2, help="retries per URL")
    ap.add_argument("--report", default="report.csv", help="CSV summary path")
    ap.add_argument("--force", action="store_true", help="re-download even if a file exists")
    ap.add_argument("--insecure", action="store_true", help="skip TLS verification")
    args = ap.parse_args()

    with open(args.input, encoding="utf-8") as fh:
        urls, seen = [], set()
        for line in fh:
            u = line.strip()
            if not u or u.startswith("#") or u in seen:
                continue
            seen.add(u)
            urls.append(u)

    os.makedirs(args.outdir, exist_ok=True)

    ctx = ssl.create_default_context()
    if args.insecure:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

    todo = []
    skipped = []
    for u in urls:
        path = os.path.join(args.outdir, slugify(u))
        if os.path.exists(path) and os.path.getsize(path) > 0 and not args.force:
            skipped.append((u, path))
        else:
            todo.append((u, path))

    print(f"{len(urls)} URLs | {len(todo)} to fetch | {len(skipped)} already present",
          file=sys.stderr)

    rows, ok, bad = [], 0, 0
    for u, path in skipped:
        rows.append({"url": u, "final_url": u, "status": "cached",
                     "bytes": os.path.getsize(path), "file": path, "error": ""})

    def work(item):
        u, path = item
        status, final, text, err = fetch_one(u, args.timeout, args.retries, ctx)
        size = 0
        if text:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(text)
            size = os.path.getsize(path)
        return {"url": u, "final_url": final, "status": status,
                "bytes": size, "file": path if size else "", "error": err}

    with futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        for i, row in enumerate(pool.map(work, todo), 1):
            rows.append(row)
            good = str(row["status"]).startswith("2") and row["bytes"] > 0
            ok += good
            bad += not good
            print(f"[{i}/{len(todo)}] {row['status']:>3} {row['bytes']:>8}B  {row['url']}"
                  + (f"  -- {row['error']}" if row["error"] else ""), file=sys.stderr)

    with open(args.report, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["url", "final_url", "status", "bytes", "file", "error"])
        w.writeheader()
        w.writerows(rows)

    print(f"\ndone: {ok} ok, {bad} failed, {len(skipped)} cached -> {args.outdir}/  "
          f"(summary: {args.report})", file=sys.stderr)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
