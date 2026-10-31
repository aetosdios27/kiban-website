"""Builds the site's benchmark data from the engine's site-refresh campaign.

Usage: python3 -I scripts/bench-data.py <path to kiban repo> <output dir>

Writes two files into <output dir>:
- bench-data.json: the scoreboard, the writer sweep and the resource figures.
  A ratio is the median of same-trial ratios, never a quotient of medians, and
  above 1 means kiban is faster. Latencies are in microseconds.
- race-data.json: for the long scale runs, the one-second samples of each
  engine's median trial, so the site can replay the run.
- tree-data.json: kiban's LSM shape each second of its median write run,
  through the post-run drain, for the pinned tree scene.
"""

import json
import re
import statistics
import sys
from pathlib import Path

ENGINES = ["kiban", "rocksdb"]
RACES = ["read-100m", "updates-10m", "write-10m"]
RIVALS = ["rocksdb", "sqlite", "lmdb"]
WRITERS = [1, 2, 4, 8, 16]
SWEEP = {
    "kiban-group": "kiban-group",
    "kiban-sync": "kiban-sync",
    "rocksdb": "rocksdb-x",
    "sqlite": "sqlite-x",
}
# id, group, label, detail, scenario, workload. Every row is the normal layout,
# the one organic writes produce; bulk fixtures flatter every engine differently.
LATENCY_ROWS = [
    ("point", "reads", "point read", "1M records", "read-normal-default", "recall-by-id"),
    ("latest", "reads", "latest ten", "1M records, one agent", "read-normal-default", "recent-for-agent"),
    ("point-32", "reads", "point read, small cache", "32 MiB cache, mmap on", "read-normal-32", "recall-by-id"),
    ("latest-32", "reads", "latest ten, small cache", "32 MiB cache, mmap on", "read-normal-32", "recent-for-agent"),
    ("remember", "durable writes", "new record", "synced before return", "write-durable", "remember"),
    ("update", "durable writes", "update", "synced before return", "write-durable", "update"),
]


def trials(folder, label):
    """Per-trial stage records for one engine, keyed by workload then trial."""
    out = {}
    for path in sorted(folder.glob(f"r[0-9]-{label}.jsonl")):
        trial = path.name.split("-", 1)[0]
        for line in path.read_text().splitlines():
            record = json.loads(line)
            if record.get("errors", 0):
                raise SystemExit(f"{path}: errors reported")
            if record["type"] == "stage":
                out.setdefault(record["workload"], {})[trial] = record["latency"]
    return out


def comparison(pairs):
    ratios = [mine / theirs for mine, theirs in pairs]
    return {
        "ratio": round(statistics.median(ratios), 3),
        "min": round(min(ratios), 3),
        "max": round(max(ratios), 3),
        "trials": len(ratios),
    }


def side(records):
    return {
        "p50": statistics.median(r["p50_ns"] for r in records.values()) / 1000,
        "p99": statistics.median(r["p99_ns"] for r in records.values()) / 1000,
    }


def latency_rows(raw):
    rows = []
    for id, group, label, detail, scenario, workload in LATENCY_ROWS:
        folder = raw / "measure" / scenario
        kiban = trials(folder, "kiban")[workload]
        rivals = {}
        for rival in RIVALS:
            theirs = trials(folder, rival)[workload]
            if kiban.keys() != theirs.keys() or len(kiban) != 5:
                raise SystemExit(f"{scenario}/{rival}: expected five paired trials")
            rivals[rival] = side(theirs) | comparison(
                (theirs[t]["p50_ns"], kiban[t]["p50_ns"]) for t in kiban
            ) | {
                "runs": [
                    [kiban[t]["p50_ns"] / 1000, theirs[t]["p50_ns"] / 1000]
                    for t in sorted(kiban)
                ]
            }
        rows.append({
            "id": id,
            "group": group,
            "label": label,
            "detail": detail,
            "source": f"raw/measure/{scenario}",
            "kiban": side(kiban),
            "rivals": rivals,
        })
    return rows


def sweep_trials(folder, case, writers):
    runs = {}
    for path in sorted(folder.glob(f"{case}-t{writers}-r[0-9].json")):
        run = json.loads(path.read_text())
        if not run["verified"]:
            raise SystemExit(f"{path}: unverified run")
        runs[path.stem.rsplit("-", 1)[1]] = run
    if len(runs) != 5:
        raise SystemExit(f"{case}/{writers}: expected five trials, got {len(runs)}")
    return runs


def sweep(folder):
    series = {}
    for key, case in SWEEP.items():
        points = []
        for writers in WRITERS:
            runs = sweep_trials(folder, case, writers).values()
            points.append({
                "ops": statistics.median(r["throughput"] for r in runs),
                "p99": statistics.median(r["p99_us"] for r in runs),
                "syncs": statistics.median(r["fdatasync"] + r["fsync"] for r in runs),
            })
        series[key] = points
    return {"writers": WRITERS, "series": series}


def writers_row(folder):
    """The group-commit row: throughput rather than latency, 16 writers."""
    kiban = sweep_trials(folder, "kiban-group", 16)
    unit = lambda runs: {
        "ops": statistics.median(r["throughput"] for r in runs.values()),
        "p99": statistics.median(r["p99_us"] for r in runs.values()),
    }
    rivals = {}
    for rival in ("rocksdb", "sqlite"):
        theirs = sweep_trials(folder, f"{rival}-x", 16)
        rivals[rival] = unit(theirs) | comparison(
            (kiban[t]["throughput"], theirs[t]["throughput"]) for t in kiban
        ) | {
            "runs": [
                [kiban[t]["throughput"], theirs[t]["throughput"]]
                for t in sorted(kiban)
            ]
        }
    return {
        "id": "writers-16",
        "group": "durable writes",
        "label": "16 concurrent writers",
        "detail": "group commit, every write verified",
        "source": "group-commit",
        "kiban": unit(kiban),
        "rivals": rivals,
    }


def resources(raw):
    folder = raw / "measure" / "read-normal-default"
    receipts = [
        json.loads(line)
        for line in (folder / "commands.jsonl").read_text().splitlines()
    ]
    out = {}
    for engine in ["kiban", *RIVALS]:
        rss = []
        for path in sorted(folder.glob(f"r[0-9]-{engine}.time.txt")):
            match = re.search(r"Maximum resident set size \(kbytes\): (\d+)", path.read_text())
            rss.append(int(match.group(1)) / 1024)
        disk = [
            r["disk"]["logical_bytes"] / 2**20
            for r in receipts
            if r["name"].endswith(f"-{engine}")
        ]
        out[engine] = {
            "rss_mib": round(statistics.median(rss)),
            "disk_mib": round(statistics.median(disk)),
        }
    return out


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


def tree(trial_dir, rocksdb_finish_s):
    """Per-second engine state as [t, ops/s, [files per level], debt MiB,
    flushes, compactions]."""
    samples = []
    for line in (trial_dir / "samples.jsonl").read_text().splitlines():
        sample = json.loads(line)
        if sample["elapsed_s"] < 0.01:
            continue
        engine = sample["engine"]
        files = [0, 0, 0, 0]
        for level in engine["levels"]:
            files[level["level"]] = level["files"]
        samples.append([
            round(sample["elapsed_s"], 2),
            round(sample["interval"]["total_ops_s"]),
            files,
            round(engine["native_debt_bytes"] / 2**20),
            engine["flush_count"],
            engine["compaction_count"],
        ])
    summary = json.loads((trial_dir / "summary.json").read_text())
    config = json.loads((trial_dir / "config.json").read_text())
    return {
        "l0_stop": config["matched_knobs"]["l0_stop"],
        "finish_s": round(summary["elapsed_s"], 2),
        "rocksdb_finish_s": rocksdb_finish_s,
        "samples": samples,
    }


def main(repo: str, output: str):
    root = Path(repo) / "validation" / "site-refresh"
    raw = root / "raw"
    metadata = json.loads((raw / "metadata.json").read_text())
    sweeps = root / "group-commit"
    data = {
        "commit": metadata["engine_src_commit"],
        "rows": [*latency_rows(raw), writers_row(sweeps)],
        "sweep": sweep(sweeps),
        "resources": resources(raw),
    }
    out = Path(output)
    (out / "bench-data.json").write_text(json.dumps(data, indent=1) + "\n")

    races = {}
    for case in RACES:
        races[case] = {
            engine: race(sorted((root / "scale").glob(f"{case}-r[0-9]-{engine}")))
            for engine in ENGINES
        }
    (out / "race-data.json").write_text(json.dumps(races) + "\n")
    shape = tree(
        root / "scale" / races["write-10m"]["kiban"]["trial"],
        races["write-10m"]["rocksdb"]["finish_s"],
    )
    (out / "tree-data.json").write_text(json.dumps(shape) + "\n")
    print(f"{len(data['rows'])} rows, {len(races)} races -> {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
