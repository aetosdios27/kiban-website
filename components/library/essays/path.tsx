// The stops a key passes through. One record, one lit stop, and the question
// that matters at that stop, so the figure reads the same with no animation.

export type Stop = { name: string; where: "memory" | "disk" };

export function PathFigure({
  stops,
  at,
  label,
  verdict,
  safe,
}: {
  stops: Stop[];
  at: number[];
  label: string;
  verdict: string;
  safe?: boolean;
}) {
  return (
    <figure className="ap">
      <p className="ap-record">
        <span>key</span> agent/7/note <span>= “ship it”</span>
      </p>
      <ol className="ap-stops">
        {stops.map((stop, i) => (
          <li
            key={stop.name}
            data-on={at.includes(i) || undefined}
            data-past={i < Math.min(...at) || undefined}
          >
            <b>{stop.name}</b>
            <span>{stop.where}</span>
          </li>
        ))}
      </ol>
      <p className="ap-verdict" data-safe={safe || undefined}>
        <span>{label}</span>
        <b>{verdict}</b>
      </p>
    </figure>
  );
}
