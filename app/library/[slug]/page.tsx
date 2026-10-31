import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, createElement, type ComponentProps } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { Contents } from "@/components/library/contents";
import { LIBRARY_FIGURES } from "@/components/library/figures";
import { CATALOG, entryFor, shelfFor } from "@/lib/library/catalog";
import { libraryCommit, loadDocument } from "@/lib/library/document";

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CATALOG.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = entryFor(slug);
  return entry ? { title: entry.title.join(" "), description: entry.dek } : {};
}

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

export default async function DocumentPage({ params }: Props) {
  const { slug } = await params;
  const doc = await loadDocument(slug);
  if (!doc) notFound();
  const { entry, tree, headings, minutes, words, sourceTitle } = doc;
  const body = toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: {
      a: Anchor,
      "figure-slot": ({ name }: { name: string }) =>
        createElement(LIBRARY_FIGURES[name]),
    } as never,
  });
  const position = CATALOG.indexOf(entry);
  const next = CATALOG[(position + 1) % CATALOG.length];
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
      </header>
      <div className="lib-layout page-width">
        <Contents headings={headings} words={words} />
        <article className="lib-prose">{body}</article>
      </div>
      <footer className="lib-next page-width">
        <p>next read</p>
        <Link href={`/library/${next.slug}`}>
          {next.title[0]} <span className="px">{next.title[1]}</span>
        </Link>
        <small>{next.dek}</small>
      </footer>
    </main>
  );
}
