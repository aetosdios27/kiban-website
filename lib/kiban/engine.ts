// Facts about the engine shown on the landing page, each taken from the
// engine repository: README and src/db.rs at v0.1.0 for the API and
// guarantees. The RocksDB comparison lives in bench.ts; its write-up,
// validation/COMPARISON.md, is on main and pins the v0.1.0 commit, 76d9d85.

import { ENGINE_REPO } from "./source";

export const COMPARISON_URL = `${ENGINE_REPO}/blob/main/validation/COMPARISON.md`;

// ------------------------------------------------------------ quickstart --

export const examples = [
  {
    id: "basic",
    label: "basic",
    code: `use kiban::db::Kiban;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut db = Kiban::open("example-db")?;
    db.put(b"hello", b"world")?;
    db.sync()?; // put alone is not crash-durable
    assert_eq!(db.get(b"hello")?, Some(b"world".to_vec()));
    drop(db);

    let reopened = Kiban::open("example-db")?;
    assert_eq!(reopened.get(b"hello")?, Some(b"world".to_vec()));
    Ok(())
}`,
  },
  {
    id: "batch",
    label: "batch",
    code: `use kiban::db::{Kiban, WriteBatch};

let mut db = Kiban::open("example-db")?;
let mut batch = WriteBatch::new();
batch.put(b"pear", b"green").delete(b"plum");
db.write(batch)?; // one WAL record, all or nothing
db.sync()?;`,
  },
  {
    id: "range",
    label: "range",
    code: `// Live entries in ascending byte order, [start, end).
for entry in db.range(b"apple", b"kiwi") {
    let (key, value) = entry?;
    println!("{key:?} = {value:?}");
}`,
  },
  {
    id: "snapshot",
    label: "snapshot",
    code: `db.put(b"pear", b"green")?;
let snap = db.snapshot();
db.put(b"pear", b"ripe")?;

// The snapshot still reads the value it was taken on.
assert_eq!(db.get_at(&snap, b"pear")?, Some(b"green".to_vec()));
db.release_snapshot(&snap);`,
  },
  {
    id: "shared",
    label: "shared",
    code: `use kiban::db::SharedKiban;
use std::thread;

// Clonable handles; flush and compaction run in the background.
let db = SharedKiban::open("example-db")?;
let writer = db.clone();
thread::spawn(move || writer.put(b"pear", b"green")).join().unwrap()?;
db.sync()?; // covers writes from every clone`,
  },
] as const;

export const specs = ["Rust 2024", "no runtime dependencies", "Linux", "MIT"];

// ------------------------------------------------------------ guarantees --

// Terse on purpose: a key and a clause, both columns. Every line is backed
// by the v0.1.0 README ("Durability and limitations") or src/db.rs.
export const promised = [
  ["sync()", "every write accepted before it survives a crash"],
  ["write(batch)", "all or nothing, one WAL record"],
  ["snapshot()", "unmoved by later writes and compactions"],
  ["a failed sync", "the engine refuses writes until reopened"],
  ["WAL records, SST blocks", "CRC-32 checksummed"],
] as const;

export const notPromised = [
  ["put() before sync()", "lost if the machine goes down"],
  ["drop", "not a sync"],
  ["MANIFEST", "no checksum yet"],
  ["two processes, one directory", "not validated"],
  ["machine power loss", "simulated, not tested on hardware"],
  ["API, on-disk format", "may change before 1.0"],
  [
    "not built yet",
    "compression, range deletes, reverse iteration, transactions",
  ],
] as const;
