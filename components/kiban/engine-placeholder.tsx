const stages = [
  { name: "WAL", description: "Write-ahead log", index: "01" },
  { name: "Memtable", description: "In-memory writes", index: "02" },
  { name: "SSTables", description: "Sorted files & levels", index: "03" },
];

/** A labeled layout placeholder, with no engine state or simulated activity. */
export function EnginePlaceholder() {
  return (
    <div className="engine-placeholder">
      <div className="engine-stages" aria-label="Reserved visualization areas">
        {stages.map((stage) => (
          <div className="engine-stage" key={stage.name}>
            <span className="stage-index mono">
              {stage.index} <span aria-hidden="true">/</span>
            </span>
            <h3 className="mono">{stage.name}</h3>
            <p>{stage.description}</p>
            <div className="stage-slot" aria-hidden="true">
              <span /> <span /> <span />
            </div>
          </div>
        ))}
      </div>
      <p className="engine-placeholder-note">
        <span className="empty-indicator" aria-hidden="true" />
        Layout placeholder. No engine connected.
      </p>
    </div>
  );
}
