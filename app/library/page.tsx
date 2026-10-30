import type { Metadata } from "next";
import Link from "next/link";
import { StackMark } from "@/components/library/mark";
import { CATALOG, SHELVES } from "@/lib/library/catalog";
import { documentStats, libraryCommit } from "@/lib/library/document";

export const metadata: Metadata = {
  title: "Library",
  description:
    "How kiban is built, tested and measured, in the engine's own reports.",
};

const LIT = { start: 0, correctness: 1, contests: 2, speed: 3, history: 3 };

export default function LibraryPage() {
  const { words, bySlug } = documentStats();
  return (
    <main id="main-content" className="lib-index">
      <header className="lib-hero page-width">
        <p className="chip">
          <span className="chip-mark" aria-hidden="true" /> the library
        </p>
        <h1>
          everything we <span className="px">measured.</span>
        </h1>
        <p className="lib-hero-text">
          How kiban is built, how it was tested, and what it lost along the way,
          in the engine&apos;s own reports. {CATALOG.length} documents,{" "}
          {Math.round(words / 1000)}k words, at commit{" "}
          {libraryCommit.slice(0, 7)}.
        </p>
      </header>
      {SHELVES.map((shelf) => (
        <section key={shelf.id} className="lib-shelf page-width">
          <div className="lib-shelf-head">
            <StackMark lit={LIT[shelf.id]} />
            <h2>{shelf.title}</h2>
            <p>{shelf.intro}</p>
          </div>
          <ol className="lib-cards">
            {CATALOG.filter((e) => e.shelf === shelf.id).map((entry) => (
              <li key={entry.slug}>
                <Link href={`/library/${entry.slug}`} className="lib-card">
                  <h3>
                    {entry.title[0]}{" "}
                    <span className="px">{entry.title[1]}</span>
                  </h3>
                  <p>{entry.dek}</p>
                  <small>
                    {Math.max(1, Math.round(bySlug[entry.slug] / 220))} min read
                  </small>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
