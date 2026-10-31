import { DocCard } from "@/components/library/doc-card";
import Link from "next/link";
import { ArrowRight } from "pixelarticons/react";
import { CATALOG } from "@/lib/library/catalog";
import { SectionHead } from "./section-head";

const FEATURED = ["architecture", "the-field", "perfect-hash"];

// The way into the engine's writing, without leaving the site.
export function LibraryTeaser() {
  return (
    <section id="library" className="section" aria-labelledby="library-title">
      <SectionHead
        index="09"
        label="Library"
        id="library-title"
        title={
          <>
            everything we <span className="px">measured.</span>
          </>
        }
      >
        How kiban is built, how it was tested, and what it lost along the way.
      </SectionHead>
      <ol className="section-body lib-cards lib-cards-three">
        {FEATURED.map((slug) => {
          const entry = CATALOG.find((e) => e.slug === slug)!;
          return (
            <li key={slug}>
              <DocCard slug={slug}>
                <h3>
                  {entry.title[0]} <span className="px">{entry.title[1]}</span>
                </h3>
                <p>{entry.dek}</p>
              </DocCard>
            </li>
          );
        })}
      </ol>
      <div className="section-foot">
        <p>The reports worth reading, set for the screen.</p>
        <Link className="read-link" href="/library">
          Open the library <ArrowRight className="icon" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
