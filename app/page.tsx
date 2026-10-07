import Link from "next/link";
import { EnginePlaceholder } from "@/components/kiban/engine-placeholder";
import { Panel } from "@/components/ui/panel";

export default function Home() {
  return (
    <main id="main-content" className="container landing">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">
          <span className="accent-rule" aria-hidden="true" /> An embedded
          storage engine
        </p>
        <h1 id="hero-title">
          Small engine.
          <br />
          <span>Deep internals.</span>
        </h1>
        <p className="hero-description">
          Kiban is an embedded LSM-tree key-value storage engine built from
          scratch.
        </p>
        <p className="hero-detail">
          Storage infrastructure that lives inside your application. This is a
          place to understand how it works, from the first write to recovery.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/explorer">
            Open Explorer <span aria-hidden="true">↗</span>
          </Link>
          <Link className="text-link" href="#architecture">
            About the architecture <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="hero-caption mono">
          <span>Embedded</span>
          <span>Key-value</span>
          <span>LSM-tree</span>
        </div>
      </section>

      <section
        className="visualization-section"
        aria-labelledby="internals-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow mono">01 / Inside the engine</p>
            <h2 id="internals-title">Follow the life of a write.</h2>
          </div>
          <span className="status-label mono">
            Visualization in development
          </span>
        </div>
        <Panel
          id="engine-overview"
          title="Engine overview"
          annotation="PREVIEW / STRUCTURE ONLY"
        >
          <EnginePlaceholder />
          <div className="overview-footer">
            <p>
              A future view of writes, flushes, compactions, snapshots, and
              recovery.
            </p>
            <Link href="/explorer" className="text-link">
              View the shell <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Panel>
      </section>

      <section className="resources" aria-labelledby="resources-title">
        <h2 className="eyebrow mono" id="resources-title">
          02 / Project resources
        </h2>
        <div className="resource-row" id="architecture">
          <h3>Architecture</h3>
          <p>
            Engine internals and design decisions.
            <br />
            <span>Documentation links will be added here.</span>
          </p>
          <span className="status-label mono">Planned</span>
        </div>
        <div className="resource-row" id="benchmarks">
          <h3>Benchmarks</h3>
          <p>
            Real measurements, with reproducible workloads.
            <br />
            <span>No benchmark results published yet.</span>
          </p>
          <span className="status-label mono">Not published</span>
        </div>
        <div className="resource-row" id="source">
          <h3>
            <a
              className="resource-link"
              href="https://github.com/aetosdios27/kiban"
            >
              Source on GitHub <span aria-hidden="true">↗</span>
            </a>
          </h3>
          <p>
            The Kiban engine lives in a separate repository.
            <br />
            <span className="mono">aetosdios27/kiban</span>
          </p>
          <span className="status-label mono">Engine repository</span>
        </div>
      </section>
    </main>
  );
}
