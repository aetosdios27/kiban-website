"""Builds the site's benchmark data from the engine's comparison results.

Usage: python3 -I scripts/bench-data.py <path to kiban repo> <output dir>

Writes two files into <output dir>:
- bench-data.json: per case and engine, the median of the three trials'
  summary.json plus their min and max. Latencies are in microseconds.
- race-data.json: for the long scale runs, the one-second samples of each
  engine's median trial, so the site can replay the run.
"""

import json
import statistics
import sys
from pathlib import Path

CAMPAIGNS = ["smoke", "scaling-validated-build", "durability", "cache", "scale"]
ENGINES = ["kiban", "rocksdb"]
PCTS = ["p50", "p95", "p99", "p999"]
RACES = ["read-100m", "updates-10m", "write-10m"]


def spread(values):
    values = [v for v in values if v is not None]
    if not values:
        return None
    return {
        "median": statistics.median(values),
        "min": min(values),
        "max": max(values),
    }


def latency(trials, kind):
    out = {}
    for p in PCTS:
        vals = []
        for t in trials:
            lat = t["metrics"].get(f"{kind}_latency") or {}
            ns = lat.get(f"{p}_ns")
            if ns is not None and lat.get("samples"):
                vals.append(ns / 1000)
        if vals:
            out[p] = statistics.median(vals)
    return out or None


def race(trial_dirs):
    """The median trial by throughput, as [elapsed s, ops/s, done, p99 us]."""
    trials = []
    for d in trial_dirs:
        summary = json.loads((d / "summary.json").read_text())
        trials.append((summary["metrics"]["total_ops_s"], d, summary))
    trials.sort(key=lambda t: t[0])
    _, d, summary = trials[len(trials) // 2]
    done = 0
    points = [[0, 0, 0, None]]
    for line in (d / "samples.jsonl").read_text().splitlines():
        sample = json.loads(line)
        interval = sample["interval"]
        # The first sample is taken at start-up; seconds with no completed
        # operations are kept, since those are real write stalls.
        if sample["elapsed_s"] < 0.01:
            continue
        done += interval["operations"]
        p99 = interval["all_latency"].get("p99_ns")
        points.append([
            round(sample["elapsed_s"], 3),
            round(interval["total_ops_s"]),
            done,
            None if p99 is None else round(p99 / 1000, 2),
        ])
        if done >= summary["metrics"]["operations"]:
            break  # later samples are the post-run drain
    return {
        "trial": d.name,
        "finish_s": round(summary["elapsed_s"], 2),
        "operations": summary["metrics"]["operations"],
        "points": points,
    }


def main(repo: str, output: str):
    root = Path(repo) / "validation" / "comparison-results"
    cases = {}
    for campaign in CAMPAIGNS:
        for summary in sorted((root / campaign).glob("*-r[0-9]-*/summary.json")):
            name = summary.parent.name
            case, _, engine = name.rpartition("-")
            case = case.rsplit("-r", 1)[0]
            if engine not in ENGINES:
                continue
            entry = cases.setdefault(case, {"campaign": campaign})
            entry.setdefault(engine, []).append(json.loads(summary.read_text()))

    data = {}
    for case, entry in sorted(cases.items()):
        row = {"campaign": entry["campaign"]}
        for engine in ENGINES:
            trials = entry.get(engine, [])
            if len(trials) != 3:
                raise SystemExit(f"{case}/{engine}: expected 3 trials, got {len(trials)}")
            row[engine] = {
                "ops": spread([t["metrics"]["total_ops_s"] for t in trials]),
                "read": latency(trials, "read"),
                "write": latency(trials, "write"),
                "rss_mib": statistics.median(t["peak_sampled_rss"] for t in trials) / 2**20,
            }
        data[case] = row
    out = Path(output)
    (out / "bench-data.json").write_text(json.dumps(data, indent=1) + "\n")

    races = {}
    for case in RACES:
        campaign = root / data[case]["campaign"]
        races[case] = {
            engine: race(sorted(campaign.glob(f"{case}-r[0-9]-{engine}")))
            for engine in ENGINES
        }
    (out / "race-data.json").write_text(json.dumps(races) + "\n")
    print(f"{len(data)} cases, {len(races)} races -> {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
