import type { KibanEventEnvelope } from "@/types/kiban/events";

/** A transport-neutral boundary for future traces, processes, APIs, or simulations. */
export interface KibanEventSource {
  /** Closing or aborting the iterator must release adapter resources. */
  events(signal: AbortSignal): AsyncIterable<KibanEventEnvelope>;
}
