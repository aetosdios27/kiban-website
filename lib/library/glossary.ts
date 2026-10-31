// Plain definitions for the words a smart non-specialist will trip on. The
// first use of each term in a document gets a hover definition.

export const GLOSSARY: Record<string, string> = {
  LSM: "Log-structured merge tree. Writes land in memory, then move to sorted files on disk that are merged in the background.",
  WAL: "Write-ahead log. Every change is appended here first, so it can be replayed after a crash.",
  SST: "Sorted string table: an immutable file of sorted keys and values. Once written, it never changes.",
  memtable:
    "The in-memory table that takes new writes before they are flushed to an SST.",
  MANIFEST:
    "The engine's record of which files are live. A file does not exist to kiban until the MANIFEST says so.",
  compaction:
    "Background merging of SSTs into larger sorted files, which drops old versions and keeps reads fast.",
  flush: "Writing a full memtable out to disk as a new SST.",
  fdatasync:
    "The system call that forces a file's data onto the disk. Slow, but it is what makes a write survive power loss.",
  fsync: "Forces a file and its metadata onto the disk.",
  "Bloom filter":
    "A compact structure that can say a key is definitely absent, so a read can skip a file.",
  "block cache":
    "Recently read file blocks kept in memory, so they need no disk read.",
  MPHF: "Minimal perfect hash function: maps each of N known keys to its own slot, with no collisions and no empty slots.",
  PH3: "Kiban's compact on-disk format for the perfect-hash point index.",
  fingerprint:
    "A few bits of a key's hash, stored beside its slot to reject wrong keys cheaply.",
  tombstone:
    "A marker that records a deletion, so older versions of the key stay hidden.",
  snapshot:
    "A frozen view of the database at one moment. Later writes do not change what it sees.",
  p50: "The median: half of all operations were faster than this.",
  p99: "99% of operations were faster than this. It shows how bad the slow cases get.",
  LMDB: "A widely used embedded database built on a B+tree and memory-mapped files, known for very fast reads.",
  RocksDB: "Meta's widely deployed LSM storage engine, the standard to beat.",
  "B+tree":
    "A sorted tree of pages. Reads walk from the root to a leaf, and pages are changed in place.",
  "group commit":
    "Letting many waiting writers share one disk sync, so durability costs less per write.",
  mmap: "Mapping a file into memory so it can be read like an array, with the OS handling the disk.",
  RSS: "Resident set size: the physical memory a process is actually using.",
  governor: "Kiban's scheduler that decides when maintenance work should run.",
  CRC: "A checksum used to detect corrupted bytes.",
  L0: "The top level of the tree, where flushed files land. Its files can overlap in key range.",
  LLC: "Last-level cache: the CPU's largest cache. Missing it means a trip to main memory.",
};
