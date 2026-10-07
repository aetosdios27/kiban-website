import type { ReactNode } from "react";

type PanelProps = {
  id: string;
  title: string;
  annotation?: string;
  className?: string;
  children: ReactNode;
};

export function Panel({
  id,
  title,
  annotation,
  className = "",
  children,
}: PanelProps) {
  return (
    <section aria-labelledby={id} className={`panel ${className}`}>
      <div className="panel-header">
        <h2 id={id}>{title}</h2>
        {annotation && (
          <span className="mono panel-annotation">{annotation}</span>
        )}
      </div>
      {children}
    </section>
  );
}
