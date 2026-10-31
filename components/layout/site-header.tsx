import Link from "next/link";
import { ArrowRight, Github } from "pixelarticons/react";
import { SiteNav } from "./site-nav";
import { SoundToggle } from "./sound-toggle";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner page-width">
        <Link href="/" className="site-name" aria-label="kiban home">
          <span className="site-mark" aria-hidden="true">
            k
          </span>
          kiban
        </Link>
        <div className="site-nav">
          <SiteNav />
        </div>
        <div className="site-actions">
          <SoundToggle />
          <a
            className="button"
            data-cuelume-tap
            href="https://github.com/aetosdios27/kiban"
          >
            <Github className="icon" aria-hidden="true" />
            github
          </a>
          <Link
            className="button button-primary"
            href="/#quickstart"
            data-cuelume-tap
          >
            get started
            <ArrowRight className="icon icon-nudge" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
