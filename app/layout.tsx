import { SmoothScroll } from "@/components/layout/smooth-scroll";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SITE_DESCRIPTION } from "@/lib/kiban/brand";
import { SITE_URL } from "@/lib/kiban/site";
import "./globals.css";

// Mona Sans (expanded) for headlines, Departure Mono for UI chrome and the
// pixel word, Commit Mono for code and diagram text.
const monaSans = localFont({
  src: "../public/fonts/mona-sans.woff2",
  variable: "--font-mona-sans",
  weight: "200 900",
  style: "normal",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "75% 125%" }],
});
const departureMono = localFont({
  src: "../public/fonts/departure-mono.woff2",
  variable: "--font-departure-mono",
  weight: "400",
  display: "swap",
});
const commitMono = localFont({
  src: [
    { path: "../public/fonts/commit-mono-400.woff2", weight: "400" },
    { path: "../public/fonts/commit-mono-700.woff2", weight: "700" },
  ],
  variable: "--font-commit-mono",
  display: "swap",
});

const title = "kiban — An embedded LSM-tree storage engine in Rust";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description: SITE_DESCRIPTION,
  applicationName: "kiban",
  keywords: [
    "LSM tree",
    "storage engine",
    "key-value store",
    "Rust",
    "embedded database",
    "write-ahead log",
    "SSTable",
  ],
  openGraph: {
    type: "website",
    siteName: "kiban",
    title,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${monaSans.variable} ${departureMono.variable} ${commitMono.variable}`}
    >
      <body>
        <SmoothScroll />
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
