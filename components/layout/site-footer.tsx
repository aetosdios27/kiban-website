import Link from "next/link";
import { ExternalLink } from "pixelarticons/react";
import { ENGINE_REPO, ENGINE_TAG } from "@/lib/kiban/source";
import { FooterField } from "./footer-field";

const columns = [
  {
    title: "on this site",
    links: [
      ["quickstart", "/#quickstart", false],
      ["guarantees", "/#guarantees", false],
      ["benchmarks", "/#benchmarks", false],
      ["internals", "/#write-path", false],
    ],
  },
  {
    title: "project",
    links: [
      ["source code", ENGINE_REPO, true],
      [
        `${ENGINE_TAG} release`,
        `${ENGINE_REPO}/releases/tag/${ENGINE_TAG}`,
        true,
      ],
      ["license", "/license", false],
      ["credits", "/license#credits", false],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top page-width">
        <div className="footer-pitch">
          <p className="footer-title">
            now go <span className="px">read</span> the source.
          </p>
          <p className="footer-sub">
            Rust, Linux, MIT. {ENGINE_TAG} is an early release: no API or
            on-disk format stability before 1.0.
          </p>
        </div>
        <nav className="footer-columns" aria-label="Footer">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="footer-col-title">{col.title}</p>
              <ul>
                {col.links.map(([label, href, external]) => (
                  <li key={label}>
                    {external ? (
                      <a href={href}>
                        {label}
                        <ExternalLink
                          className="icon icon-ext"
                          aria-hidden="true"
                        />
                      </a>
                    ) : (
                      <Link href={href} data-cuelume-navigate>
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="footer-legal page-width">
        <span>
          © 2026 aetos ·{" "}
          <Link href="/license" data-cuelume-navigate>
            MIT licensed
          </Link>
        </span>
        <span>基盤 · n. foundation</span>
      </div>

      <FooterField />
    </footer>
  );
}
