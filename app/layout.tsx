import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { TypeSwitch } from "@/components/layout/type-switch";
import { SITE_DESCRIPTION } from "@/lib/kiban/brand";
import { SITE_URL } from "@/lib/kiban/site";
import "./globals.css";

const interTight = localFont({
  src: "../public/fonts/inter-tight-latin.woff2",
  variable: "--font-inter-tight",
  weight: "100 900",
  display: "swap",
});
// Only the Square face: the package's own export preloads all five.
const geistPixel = localFont({
  src: "../public/fonts/geist-pixel-square.woff2",
  variable: "--font-geist-pixel-square",
  weight: "500",
  display: "swap",
});
const jetbrainsMono = localFont({
  src: "../public/fonts/jetbrains-mono-latin.woff2",
  variable: "--font-jetbrains-mono",
  weight: "400 500",
  display: "swap",
});

// Candidate type stack, compared with ?type=proposed. Not preloaded, so it
// only downloads when the comparison is switched on.
const monaSans = localFont({
  src: "../public/fonts/specimen/mona-sans.woff2",
  variable: "--font-mona-sans",
  weight: "200 900",
  style: "normal",
  display: "swap",
  preload: false,
  declarations: [{ prop: "font-stretch", value: "75% 125%" }],
});
const departureMono = localFont({
  src: "../public/fonts/specimen/departure-mono.woff2",
  variable: "--font-departure-mono",
  weight: "400",
  display: "swap",
  preload: false,
});
const commitMono = localFont({
  src: [
    { path: "../public/fonts/specimen/commit-mono-400.woff2", weight: "400" },
    { path: "../public/fonts/specimen/commit-mono-700.woff2", weight: "700" },
  ],
  variable: "--font-commit-mono",
  display: "swap",
  preload: false,
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
      className={`${interTight.variable} ${jetbrainsMono.variable} ${geistPixel.variable} ${monaSans.variable} ${departureMono.variable} ${commitMono.variable}`}
    >
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
        <TypeSwitch />
      </body>
    </html>
  );
}
