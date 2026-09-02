#!/usr/bin/env python3
"""
Scrape the vendor sites and build the workbook.

The scraper keeps only technology and cybersecurity terms, so nothing has to be
cleaned afterwards.

    python run_all.py vendors.csv --out-dir results

Add -n 5 to try five vendors first. Everything lands in --out-dir, and the
scrape step resumes, so a re-run after an interruption picks up where it left off.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def step(title: str, cmd: list[str]) -> None:
    print(f"\n=== {title} ===", flush=True)
    result = subprocess.run([sys.executable, *cmd])
    if result.returncode != 0:
        raise SystemExit(f"failed: {title}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("vendors", help="CSV with a 'url' column")
    ap.add_argument("--out-dir", default="results")
    ap.add_argument("-n", "--limit", type=int, default=0, help="only first N vendors")
    ap.add_argument("-w", "--workers", type=int, default=8)
    ap.add_argument("--save-html", action="store_true",
                    help="also archive each homepage (adds 100-300 MB)")
    args = ap.parse_args()

    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    keywords = out / "keywords.csv"

    extract = [str(HERE / "extract_vendor_keywords.py"), args.vendors,
               "-o", str(keywords), "-w", str(args.workers),
               "--vendor-dir", str(out / "vendors_out")]
    if args.limit:
        extract += ["-n", str(args.limit)]
    if args.save_html:
        extract += ["--save-html"]

    step("1/2  scraping vendor sites, keeping technology and cybersecurity terms", extract)
    step("2/2  building the workbook",
         [str(HERE / "build_workbook.py"),
          "--tech", str(keywords),
          "--review", str(out / "keywords_review.csv"),
          "--removed", str(out / "keywords_removed.csv"),
          "--summary", str(out / "keywords_summary.csv"),
          "-o", str(out / "etsignals_vendor_keywords.xlsx")])

    print(f"\nAll done. Everything is in {out}/")
    print(f"   etsignals_vendor_keywords.xlsx   the deliverable")
    print(f"   vendors_out/<domain>/            per-vendor evidence")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
