import type { ReactNode } from "react";

// Every section opens the same way: an index label on a hairline rule, then
// the heading on the left and a one-paragraph intro on the right.
export function SectionHead({
  index,
  label,
  id,
  title,
  children,
}: {
  index: string;
  label: string;
  id: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <p className="section-label" aria-hidden="true">
        <span>{index}</span>
        <span>{label}</span>
      </p>
      <header className="section-head split">
        <h2 id={id}>{title}</h2>
        {children && <p className="section-intro">{children}</p>}
      </header>
    </>
  );
}
