"use client";

import { useState } from "react";
import {
  BENCHMARK,
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

function Cells({ row, rival, name }: { row: Row; rival: Rival; name: string }) {
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
        {mine}
        <small>
          {unit}p99 {fmtUs(row.kiban.p99)}
        </small>
      </td>
      <td
        className="sb-num num-rocks"
        data-win={(!even && !ahead) || undefined}
      >
        {other}
        <small>
          {unit}p99 {fmtUs(theirs.p99)}
        </small>
      </td>
      <td className="sb-ratio">
        <div className="sb-ratio-in">
          <span className="sb-track" aria-hidden="true">
            {!even && (
              <span
                className={`sb-bar ${ahead ? "bar-ahead" : "bar-behind"}`}
                style={{ width: `${width}%` }}
              />
            )}
          </span>
          <span
            className="sb-verdict"
            data-ahead={(!even && ahead) || undefined}
            title={`${theirs.trials} paired trials against ${name}, ratios ${theirs.min} to ${theirs.max}; above 1 favors kiban`}
          >
            {even
              ? "even"
              : `${fmtRatio(theirs.ratio)} ${ahead ? "faster" : "slower"}`}
          </span>
        </div>
      </td>
    </>
  );
}

export function Scoreboard() {
  const [rival, setRival] = useState<Rival>("rocksdb");
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
              <i className="key key-rocks" /> {name}
            </th>
            <th scope="col" className="sb-scale">
              <span>← {name} faster</span>
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
                <tr key={row.id}>
                  <th scope="row">
                    {row.label}
                    <small>{row.detail}</small>
                  </th>
                  <Cells row={row} rival={rival} name={name} />
                </tr>
              ))}
          </tbody>
        ))}
      </table>
    </>
  );
}
