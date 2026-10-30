"use client";

import { Fragment, useState } from "react";
import { Morph } from "./morph";
import {
  BENCHMARK,
  RECEIPT,
  benchCommit,
  fmtFull,
  fmtOps,
  fmtRatio,
  fmtUs,
  groups,
  isEven,
  isThroughput,
  rivals,
  rows,
  type Rival,
  type Row,
} from "@/lib/kiban/bench";

// Every workload on one board: both engines in pixel numerals, p99 underneath,
// and a segmented bar growing either side of 1×, log scale, one doubling per
// third of each half. It is a real table, so it reads the same without the bars.

const DOUBLINGS = 3; // each half spans 1× to 8×

function Receipt({
  row,
  rival,
  name,
}: {
  row: Row;
  rival: Rival;
  name: string;
}) {
  const theirs = row.rivals[rival];
  if (!theirs) return null;
  const throughput = isThroughput(row);
  const peak = Math.max(...theirs.runs.flat());
  const show = (n: number) => (throughput ? fmtFull(n) : fmtUs(n));
  return (
    <tr className="rc-row">
      <td colSpan={4}>
        <div className="rc">
          <p className="rc-head">
            <span>receipt</span>
            <span>
              {theirs.trials} trials, {throughput ? "writes/s" : "p50"}, kiban
              then {name}
            </span>
          </p>
          {theirs.runs.map(([mine, other], i) => (
            <div key={i} className="rc-trial">
              <span>r{i + 1}</span>
              <i
                className="rc-bar"
                style={{ width: `${(mine / peak) * 100}%` }}
              />
              <b>{show(mine)}</b>
              <i
                className="rc-bar rc-other"
                style={{ width: `${(other / peak) * 100}%` }}
              />
              <span>{show(other)}</span>
              <em>{(throughput ? mine / other : other / mine).toFixed(2)}×</em>
            </div>
          ))}
          <dl className="rc-meta">
            <div>
              <dt>commit</dt>
              <dd>{benchCommit.slice(0, 8)}</dd>
            </div>
            <div>
              <dt>host</dt>
              <dd>{RECEIPT.host}</dd>
            </div>
            <div>
              <dt>rerun</dt>
              <dd>
                <code>
                  ${" "}
                  {throughput
                    ? RECEIPT.rerun.throughput
                    : RECEIPT.rerun.latency}
                </code>
              </dd>
            </div>
          </dl>
          <a className="read-link" href={`${RECEIPT.folder}/${row.source}`}>
            Open the raw results
          </a>
        </div>
      </td>
    </tr>
  );
}

function Cells({
  row,
  rival,
  name,
  open,
  onToggle,
}: {
  row: Row;
  rival: Rival;
  name: string;
  open: boolean;
  onToggle: () => void;
}) {
  const theirs = row.rivals[rival];
  if (!theirs) return null;
  const even = isEven(theirs);
  const ahead = theirs.ratio >= 1;
  const width = Math.min(1, Math.abs(Math.log2(theirs.ratio)) / DOUBLINGS) * 50;
  const [mine, other, unit] = isThroughput(row)
    ? [
        fmtOps(row.kiban.ops),
        fmtOps((theirs as typeof row.kiban).ops),
        "writes/s · ",
      ]
    : [fmtUs(row.kiban.p50), fmtUs((theirs as typeof row.kiban).p50), ""];
  return (
    <>
      <td className="sb-num num-kiban" data-win={(!even && ahead) || undefined}>
        <Morph value={mine} />
        <small>
          <Morph value={`${unit}p99 ${fmtUs(row.kiban.p99)}`} />
        </small>
      </td>
      <td
        className="sb-num num-rocks"
        data-win={(!even && !ahead) || undefined}
      >
        <Morph value={other} />
        <small>
          <Morph value={`${unit}p99 ${fmtUs(theirs.p99)}`} />
        </small>
      </td>
      <td className="sb-ratio">
        <div className="sb-ratio-in">
          <span className="sb-track" aria-hidden="true">
            <span
              className="sb-bar bar-ahead"
              style={{ width: `${!even && ahead ? width : 0}%` }}
            />
            <span
              className="sb-bar bar-behind"
              style={{ width: `${!even && !ahead ? width : 0}%` }}
            />
          </span>
          <button
            type="button"
            className="sb-verdict"
            aria-expanded={open}
            onClick={onToggle}
            data-ahead={(!even && ahead) || undefined}
            title={`${theirs.trials} paired trials against ${name}, ratios ${theirs.min} to ${theirs.max}; above 1 favors kiban`}
          >
            <Morph
              value={
                even
                  ? "even"
                  : `${fmtRatio(theirs.ratio)} ${ahead ? "faster" : "slower"}`
              }
            />
            <span aria-hidden="true"> {open ? "▴" : "▾"}</span>
          </button>
        </div>
      </td>
    </>
  );
}

export function Scoreboard() {
  const [rival, setRival] = useState<Rival>("rocksdb");
  const [opened, setOpened] = useState<string | null>(null);
  const { name } = rivals.find((r) => r.key === rival)!;
  return (
    <>
      <div
        className="tr-picks sb-picks"
        role="radiogroup"
        aria-label="Opponent"
      >
        {rivals.map((r) => (
          <button
            key={r.key}
            type="button"
            role="radio"
            aria-checked={r.key === rival}
            className="tr-pick"
            onClick={() => setRival(r.key)}
            data-cuelume-select
          >
            {r.pick}
          </button>
        ))}
      </div>
      <table className="sb">
        <caption className="sr-only">{BENCHMARK.caption}</caption>
        <thead>
          <tr>
            <th scope="col">workload</th>
            <th scope="col">
              <i className="key key-kiban" /> kiban
            </th>
            <th scope="col">
              <i className="key key-rocks" /> <Morph value={name} />
            </th>
            <th scope="col" className="sb-scale">
              <span>
                <Morph value={`← ${name} faster`} />
              </span>
              <span>1×</span>
              <span>kiban faster →</span>
            </th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group}>
            <tr className="sb-group">
              <th scope="colgroup" colSpan={4}>
                {group}
              </th>
            </tr>
            {rows
              .filter((row) => row.group === group && row.rivals[rival])
              .map((row) => (
                <Fragment key={row.id}>
                  <tr>
                    <th scope="row">
                      {row.label}
                      <small>{row.detail}</small>
                    </th>
                    <Cells
                      row={row}
                      rival={rival}
                      name={name}
                      open={opened === row.id}
                      onToggle={() =>
                        setOpened(opened === row.id ? null : row.id)
                      }
                    />
                  </tr>
                  {opened === row.id && (
                    <Receipt row={row} rival={rival} name={name} />
                  )}
                </Fragment>
              ))}
          </tbody>
        ))}
      </table>
    </>
  );
}
