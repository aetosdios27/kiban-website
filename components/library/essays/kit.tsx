"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BarChart } from "@/components/dithercn/bar-chart";

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

/** One measured value per engine, with the lead engine drawn solid. */
export function Bars({
  rows,
  unit,
  note,
}: {
  rows: { name: string; value: number; lead?: boolean }[];
  unit: string;
  note: string;
}) {
  return (
    <figure className="es-bars">
      <BarChart
        data={rows}
        x="name"
        series={[{ label: unit, value: "value" }]}
        highlight={rows.findIndex((row) => row.lead)}
        format={(value) => `${value.toFixed(2)} ${unit}`}
        height={260}
      />
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
