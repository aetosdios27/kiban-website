import Link from "next/link";
import { ExternalLink } from "pixelarticons/react";
import { ENGINE_COMMIT } from "@/lib/kiban/source";
import { FooterField } from "./footer-field";

const REPO = "https://github.com/aetosdios27/kiban";

const columns = [
  {
    title: "engine",
    links: [
      ["write path", "/#write-path", false],
      ["correctness", "/#correctness", false],
      ["architecture", "/#architecture", false],
      ["install", "/#installation", false],
    ],
  },
  {
    title: "source",
    links: [
      ["github", REPO, true],
      ["readme", `${REPO}#readme`, true],
      ["reviewed commit", `${REPO}/tree/${ENGINE_COMMIT}`, true],
      ["license", `${REPO}/blob/main/LICENSE`, true],
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
            An embedded LSM-tree storage engine in Rust, built from scratch.
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
        <span>© 2026 aetosdios27 · kiban is MIT licensed</span>
        <span>基盤 · n. foundation</span>
        <span>built from scratch.</span>
      </div>

      <FooterField />
    </footer>
  );
}
