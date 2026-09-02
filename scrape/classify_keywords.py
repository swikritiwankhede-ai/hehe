#!/usr/bin/env python3
"""
Replay the technology filter over an existing extractor output.

The scraper already applies these rules as it goes. This is for re-running an
updated vocabulary over data already collected, without re-crawling.

    python classify_keywords.py keywords_clean.csv -o tech_keywords.csv
"""

from __future__ import annotations

import argparse
import collections
import csv
import signal
from pathlib import Path

from tech_filter import classify


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("-o", "--out", default="keywords_tech.csv")
    args = ap.parse_args()

    rows = list(csv.DictReader(open(args.input, newline="", encoding="utf-8")))
    kept: list[dict] = []
    dropped: list[dict] = []
    review: list[dict] = []
    for r in rows:
        verdict, detail, category = classify(r["label"], r.get("domain", ""))
        # the input already has a "domain" column holding the vendor host, so the
        # technology domain is written as "tech_domain" to avoid overwriting it
        if verdict == "keep":
            kept.append({**r, "tech_domain": detail, "category": category})
        elif verdict == "drop":
            dropped.append({**r, "reason": detail})
        else:
            review.append({**r, "reason": detail})

    out = Path(args.out)
    stem = out.with_suffix("")
    base = ["company", "domain", "source", "bucket", "label", "url"]

    def write(path: Path, data: list[dict], extra: list[str]) -> None:
        with path.open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=base + extra, extrasaction="ignore")
            w.writeheader()
            w.writerows(data)

    write(out, kept, ["tech_domain", "category"])
    write(Path(f"{stem}_dropped.csv"), dropped, ["reason"])
    write(Path(f"{stem}_review.csv"), review, ["reason"])

    total = len(rows)
    if not total:
        print("no rows to classify - the scrape step produced nothing")
        return 0
    print(f"in     : {total:,} rows")
    print(f"keep   : {len(kept):,} ({len(kept)*100//total}%)  -> {out}")
    print(f"drop   : {len(dropped):,} ({len(dropped)*100//total}%)  -> {stem}_dropped.csv")
    print(f"review : {len(review):,} ({len(review)*100//total}%)  -> {stem}_review.csv\n")
    print("dropped, by reason:")
    for reason, n in collections.Counter(d["reason"] for d in dropped).most_common():
        print(f"   {n:6,}  {reason}")
    print("\nkept, by technology domain:")
    for dom, n in collections.Counter(k["tech_domain"] for k in kept).most_common():
        print(f"   {n:6,}  {dom}")
    return 0


if __name__ == "__main__":
    # tolerate a truncated pipe, e.g. "... | head"
    if hasattr(signal, "SIGPIPE"):
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    raise SystemExit(main())
