import {
  bench,
  fmtOps,
  fmtRatio,
  fmtUs,
  overview,
  ratio,
} from "@/lib/kiban/bench";
import { HISTORICAL_BENCHMARK } from "@/lib/kiban/facts";

// Every workload on one board: both engines' throughput in pixel numerals,
// p99 underneath, and a segmented bar growing either side of 1×, log scale,
// one doubling per third of each half. It is a real table, so it reads the
// same without the bars.

const DOUBLINGS = 3; // each half spans 1× to 8×

export function Scoreboard() {
  return (
    <table className="sb">
      <caption className="sr-only">{HISTORICAL_BENCHMARK.caption}</caption>
      <thead>
        <tr>
          <th scope="col">workload</th>
          <th scope="col">
            <i className="key key-kiban" /> kiban
          </th>
          <th scope="col">
            <i className="key key-rocks" /> RocksDB
          </th>
          <th scope="col" className="sb-scale">
            <span>← RocksDB faster</span>
            <span>1×</span>
            <span>kiban faster →</span>
          </th>
        </tr>
      </thead>
      {overview.map((group) => (
        <tbody key={group.title}>
          <tr className="sb-group">
            <th scope="colgroup" colSpan={4}>
              {group.title}
            </th>
          </tr>
          {group.rows.map((w) => {
            const c = bench(w.id);
            const r = ratio(w.id);
            const even = r > 0.97 && r < 1.03;
            const ahead = r >= 1;
            const kind = c.kiban.write ? "write" : "read";
            const op = kind === "write" ? "PUT" : "GET";
            const width = Math.min(1, Math.abs(Math.log2(r)) / DOUBLINGS) * 50;
            return (
              <tr key={w.id}>
                <th scope="row">
                  {w.label}
                  <small>{w.detail}</small>
                </th>
                <td
                  className="sb-num num-kiban"
                  data-win={(!even && ahead) || undefined}
                >
                  {fmtOps(c.kiban.ops.median)}
                  <small>
                    {op} p99 {fmtUs(c.kiban[kind]!.p99)}
                  </small>
                </td>
                <td
                  className="sb-num num-rocks"
                  data-win={(!even && !ahead) || undefined}
                >
                  {fmtOps(c.rocksdb.ops.median)}
                  <small>
                    {op} p99 {fmtUs(c.rocksdb[kind]!.p99)}
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
                    >
                      {even
                        ? "even"
                        : `${fmtRatio(r)} ${ahead ? "faster" : "slower"}`}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      ))}
    </table>
  );
}
