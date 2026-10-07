import { EnginePlaceholder } from "@/components/kiban/engine-placeholder";
import { Panel } from "@/components/ui/panel";

export function ExplorerShell() {
  return (
    <main id="main-content" className="container explorer">
      <div className="explorer-heading">
        <div>
          <p className="eyebrow mono">Kiban / Internals workspace</p>
          <h1>
            Explorer<span className="development-tag mono">In development</span>
          </h1>
          <p>A workspace for understanding the engine, one event at a time.</p>
        </div>
        <span className="connection-state mono">
          <span className="empty-indicator" aria-hidden="true" />
          No event source
        </span>
      </div>
      <p className="development-notice">
        This is the structural shell. Controls are unavailable until an event
        source is connected. No engine behavior is simulated.
      </p>

      <div className="explorer-grid">
        <Panel
          id="workload-title"
          title="Workload controls"
          annotation="01"
          className="workload-panel"
        >
          <div className="panel-body">
            <fieldset disabled aria-describedby="workload-note">
              <legend className="sr-only">
                Workload configuration — in development
              </legend>
              <label htmlFor="workload">Workload</label>
              <select id="workload" defaultValue="">
                <option value="">No workloads available</option>
              </select>
              <label htmlFor="key">Key</label>
              <input id="key" placeholder="Awaiting event source" />
              <label htmlFor="value">Value</label>
              <input id="value" placeholder="Awaiting event source" />
              <button className="button button-primary" type="button">
                Run workload <span aria-hidden="true">→</span>
              </button>
            </fieldset>
            <p className="placeholder-copy" id="workload-note">
              Development placeholder. Workload definitions and playback
              controls will live here.
            </p>
          </div>
        </Panel>

        <Panel
          id="visualization-title"
          title="Engine visualization"
          annotation="02"
          className="visualization-panel"
        >
          <EnginePlaceholder />
          <div className="reserved-operations mono">
            <span>Flushes</span>
            <span>Compactions</span>
            <span>Snapshots</span>
            <span>Recovery</span>
          </div>
          <p className="placeholder-copy visualization-note">
            Reserved for event-driven engine views and their textual
            equivalents.
          </p>
        </Panel>

        <Panel
          id="inspector-title"
          title="State inspector"
          annotation="03"
          className="inspector-panel"
        >
          <div className="panel-body inspector-empty">
            <span className="empty-glyph mono" aria-hidden="true">
              [ — ]
            </span>
            <h3>No state to inspect</h3>
            <p className="placeholder-copy">
              Keys, sequence numbers, files, and snapshot details will appear
              here when engine state is available.
            </p>
            <span className="mono placeholder-label">
              Development placeholder
            </span>
          </div>
        </Panel>

        <Panel
          id="timeline-title"
          title="Event timeline"
          annotation="04"
          className="timeline-panel"
        >
          <div className="timeline-columns mono" aria-hidden="true">
            <span>Sequence</span>
            <span>Event</span>
            <span>Details</span>
          </div>
          <div className="timeline-empty">
            <span className="empty-indicator" aria-hidden="true" />
            <p>
              No events received. The timeline is a development placeholder.
            </p>
          </div>
        </Panel>

        <Panel
          id="metrics-title"
          title="Metrics"
          annotation="05"
          className="metrics-panel"
        >
          <dl className="metrics">
            <div>
              <dt>Writes</dt>
              <dd>Unavailable</dd>
            </div>
            <div>
              <dt>Flushes</dt>
              <dd>Unavailable</dd>
            </div>
            <div>
              <dt>Compactions</dt>
              <dd>Unavailable</dd>
            </div>
          </dl>
          <p className="placeholder-copy metrics-note">
            Development placeholder. Metrics require an event source.
          </p>
        </Panel>
      </div>
    </main>
  );
}
