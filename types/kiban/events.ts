/** Names reserved for the future protocol. Payload schemas are deliberately undefined. */
export type KibanEventKind =
  | "wal.append"
  | "memtable.write"
  | "memtable.freeze"
  | "flush.started"
  | "flush.completed"
  | "sstable.created"
  | "compaction.started"
  | "compaction.completed"
  | "snapshot.created"
  | "recovery.started"
  | "recovery.completed";

/** Protocol scaffolding, not a validated wire format or a complete event union. */
export interface KibanEventEnvelope {
  readonly kind: KibanEventKind;
  readonly payload: unknown;
}
