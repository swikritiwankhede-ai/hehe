#!/usr/bin/env python3
"""Download fully rendered HTML (after JavaScript runs) for every URL in a list.

Many modern marketing sites ship an almost-empty <body> and build the page in
the browser, so the raw HTML from fetch_html.py is thin. This script drives a
real headless Chromium instead and saves the resulting DOM.

Setup (once):
    pip install playwright
    playwright install chromium

Usage:
    python3 fetch_rendered.py                        # urls.txt -> html_rendered/
    python3 fetch_rendered.py -c 4 --screenshots

Re-runs are resumable: existing output files are skipped unless --force.
"""

import argparse
import asyncio
import csv
import os
import re
import sys
from urllib.parse import urlparse

try:
    from playwright.async_api import async_playwright
except ImportError:
    sys.exit("playwright is not installed. Run:\n"
             "  pip install playwright && playwright install chromium")

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")


def slugify(url):
    p = urlparse(url)
    name = p.netloc + p.path.rstrip("/")
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("_")
    return (name or "index")[:150]


async def grab(context, url, path, timeout, settle, shot_path):
    page = await context.new_page()
    try:
        resp = await page.goto(url, wait_until="domcontentloaded", timeout=timeout)
        try:
            await page.wait_for_load_state("networkidle", timeout=settle)
        except Exception:
            pass  # networkidle never arrives on sites with polling/analytics
        html = await page.content()
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(html)
        if shot_path:
            await page.screenshot(path=shot_path, full_page=True)
        return (resp.status if resp else 0), (page.url or url), os.path.getsize(path), ""
    except Exception as e:
        return 0, url, 0, f"{type(e).__name__}: {e}"
    finally:
        await page.close()


async def main_async(args):
    with open(args.input, encoding="utf-8") as fh:
        urls, seen = [], set()
        for line in fh:
            u = line.strip()
            if u and not u.startswith("#") and u not in seen:
                seen.add(u)
                urls.append(u)

    os.makedirs(args.outdir, exist_ok=True)
    shot_dir = os.path.join(args.outdir, "screenshots")
    if args.screenshots:
        os.makedirs(shot_dir, exist_ok=True)

    rows, todo = [], []
    for u in urls:
        path = os.path.join(args.outdir, slugify(u) + ".html")
        if os.path.exists(path) and os.path.getsize(path) > 0 and not args.force:
            rows.append({"url": u, "final_url": u, "status": "cached",
                         "bytes": os.path.getsize(path), "file": path, "error": ""})
        else:
            todo.append((u, path))

    print(f"{len(urls)} URLs | {len(todo)} to render | {len(rows)} already present",
          file=sys.stderr)

    done = 0
    sem = asyncio.Semaphore(args.concurrency)

    async with async_playwright() as pw:
        launch_args = {"headless": True}
        if args.browser_path:
            launch_args["executable_path"] = args.browser_path
        browser = await pw.chromium.launch(**launch_args)
        context = await browser.new_context(
            user_agent=UA,
            viewport={"width": 1440, "height": 900},
            ignore_https_errors=True,
            java_script_enabled=True,
        )

        async def worker(u, path):
            nonlocal done
            async with sem:
                shot = os.path.join(shot_dir, slugify(u) + ".png") if args.screenshots else None
                status, final, size, err = await grab(
                    context, u, path, args.timeout * 1000, args.settle * 1000, shot)
                done += 1
                print(f"[{done}/{len(todo)}] {status:>3} {size:>8}B  {u}"
                      + (f"  -- {err}" if err else ""), file=sys.stderr)
                return {"url": u, "final_url": final, "status": status,
                        "bytes": size, "file": path if size else "", "error": err}

        results = await asyncio.gather(*(worker(u, p) for u, p in todo))
        rows.extend(results)
        await context.close()
        await browser.close()

    with open(args.report, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["url", "final_url", "status", "bytes", "file", "error"])
        w.writeheader()
        w.writerows(rows)

    bad = sum(1 for r in results if not r["bytes"])
    print(f"\ndone: {len(results) - bad} ok, {bad} failed -> {args.outdir}/ "
          f"(summary: {args.report})", file=sys.stderr)
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-i", "--input", default="urls.txt")
    ap.add_argument("-o", "--outdir", default="html_rendered")
    ap.add_argument("-c", "--concurrency", type=int, default=4,
                    help="parallel browser tabs (each costs real memory)")
    ap.add_argument("-t", "--timeout", type=float, default=45.0, help="navigation timeout (s)")
    ap.add_argument("--settle", type=float, default=8.0,
                    help="extra seconds to wait for network to go idle")
    ap.add_argument("--report", default="report_rendered.csv")
    ap.add_argument("--screenshots", action="store_true", help="also save a full-page PNG")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--browser-path", default=os.environ.get("CHROMIUM_PATH"),
                    help="path to an existing Chromium binary, instead of Playwright's own")
    args = ap.parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
