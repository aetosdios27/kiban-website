import Link from "next/link";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, createElement, type ComponentProps } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { Contents } from "@/components/library/contents";
import { LIBRARY_FIGURES } from "@/components/library/figures";
import { Fold } from "@/components/library/fold";
import { Term } from "@/components/library/term";
import { NextRead } from "@/components/library/next-read";
import { shelfFor } from "@/lib/library/catalog";
import { libraryCommit, type loadDocument } from "@/lib/library/document";

const FOLD_AFTER = 12;

function Anchor({ href = "", children, ...rest }: ComponentProps<"a">) {
  const raw = "data-raw" in rest;
  if (href.startsWith("/")) return <Link href={href}>{children}</Link>;
  return (
    <a
      href={href}
      data-raw={raw || undefined}
      title={raw ? "Raw evidence file" : undefined}
    >
      {children}
    </a>
  );
}

function TableSlot({
  rows,
  children,
}: {
  rows: number;
  children?: React.ReactNode;
}) {
  if (rows > FOLD_AFTER) return <Fold rows={rows}>{children}</Fold>;
  return (
    <div className="lib-table" data-open>
      {children}
    </div>
  );
}

type Loaded = NonNullable<Awaited<ReturnType<typeof loadDocument>>>;

export function DocumentView({ doc, essay }: { doc: Loaded; essay?: string }) {
  const { entry, tree, headings, minutes, words, sourceTitle } = doc;
  const body = toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: {
      a: Anchor,
      "figure-slot": ({ name }: { name: string }) =>
        createElement(LIBRARY_FIGURES[name]),
      "term-slot": ({ name }: { name: string }) => <Term id={name} />,
      "table-slot": TableSlot,
    } as never,
  });
  return (
    <main id="main-content" className="lib-doc">
      <header className="lib-doc-head page-width">
        <p className="lib-crumb">
          <Link href="/library">library</Link> · {shelfFor(entry.shelf).title}
        </p>
        <h1>
          {entry.title[0]} <span className="px">{entry.title[1]}</span>
        </h1>
        <p className="lib-dek">{entry.dek}</p>
        <p className="lib-meta">
          {minutes} min read · {words.toLocaleString("en")} words · commit{" "}
          {libraryCommit.slice(0, 7)} · filed as “{sourceTitle}”
        </p>
        {essay && (
          <p className="lib-meta">
            The original report.{" "}
            <Link href={essay}>Read the essay instead</Link>
          </p>
        )}
      </header>
      <div className="lib-layout page-width">
        <Contents headings={headings} words={words} />
        <article className="lib-prose">{body}</article>
      </div>
      <NextRead slug={entry.slug} />
    </main>
  );
}
