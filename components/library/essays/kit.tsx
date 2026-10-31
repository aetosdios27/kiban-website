"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Marks a sentence as it enters the reading zone, once. */
export function Mark({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setOn(true);
        watch.disconnect();
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return (
    <mark ref={ref} className="es-mark" data-on={on || undefined}>
      {children}
    </mark>
  );
}

/** Bars that grow into place the first time they are seen. */
export function Bars({
  rows,
  unit,
  note,
}: {
  rows: { name: string; value: number; lead?: boolean }[];
  unit: string;
  note: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setOn(true);
        watch.disconnect();
      },
      { threshold: 0.4 },
    );
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  const top = Math.max(...rows.map((r) => r.value));
  return (
    <figure ref={ref} className="es-bars" data-on={on || undefined}>
      {rows.map((row, i) => (
        <div
          key={row.name}
          className="es-bar"
          data-lead={row.lead || undefined}
        >
          <span>{row.name}</span>
          <i
            style={{
              transform: `scaleX(${on ? row.value / top : 0})`,
              transitionDelay: `${i * 90}ms`,
            }}
          />
          <b>
            {row.value.toFixed(2)} {unit}
          </b>
        </div>
      ))}
      <figcaption>{note}</figcaption>
    </figure>
  );
}

/** A sticky figure beside steps: each step, as it is read, sets the figure. */
export function Story({
  steps,
  figure,
}: {
  steps: { title: string; body: ReactNode }[];
  figure: (step: number) => ReactNode;
}) {
  const [step, setStep] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const watch = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setStep(Number((entry.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && watch.observe(el));
    return () => watch.disconnect();
  }, []);
  return (
    <section className="es-story">
      <div className="es-story-figure">{figure(step)}</div>
      <ol className="es-story-steps">
        {steps.map((s, i) => (
          <li
            key={s.title}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-step={i}
            data-on={i === step || undefined}
          >
            <h3>{s.title}</h3>
            <div>{s.body}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
