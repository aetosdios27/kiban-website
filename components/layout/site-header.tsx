import Link from "next/link";
import { ArrowRight, Github } from "pixelarticons/react";

const links = [
  ["write path", "/#write-path"],
  ["correctness", "/#correctness"],
  ["architecture", "/#architecture"],
] as const;

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
        <nav className="site-nav" aria-label="Sections">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="site-actions">
          <a className="button" href="https://github.com/aetosdios27/kiban">
            <Github className="icon" aria-hidden="true" />
            github
          </a>
          <Link className="button button-primary" href="/#installation">
            get started
            <ArrowRight className="icon icon-nudge" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
