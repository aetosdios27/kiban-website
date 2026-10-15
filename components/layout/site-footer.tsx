import Link from "next/link";
import { ExternalLink } from "pixelarticons/react";
import { ENGINE_REPO, ENGINE_TAG } from "@/lib/kiban/source";
import { FooterField } from "./footer-field";

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
      ["github", ENGINE_REPO, true],
      ["readme", `${ENGINE_REPO}#readme`, true],
      [
        `${ENGINE_TAG} release`,
        `${ENGINE_REPO}/releases/tag/${ENGINE_TAG}`,
        true,
      ],
      ["license", `${ENGINE_REPO}/blob/main/LICENSE`, true],
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
        <span>© 2026 aetosdios27</span>
        <span>基盤 · n. foundation</span>
      </div>

      <FooterField />
    </footer>
  );
}
