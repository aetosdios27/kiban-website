import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
  title: {
    default: "Kiban — Embedded storage, from scratch",
    template: "%s · Kiban",
  },
  description:
    "Kiban is an embedded LSM-tree key-value storage engine built from scratch. Explore the foundations of its storage internals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <footer className="site-footer container">
          <span>
            Kiban <span className="footer-separator">/</span> Embedded storage,
            from scratch.
          </span>
          <span className="mono">Website foundation · 0.1</span>
        </footer>
      </body>
    </html>
  );
}
