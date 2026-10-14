import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistPixelSquare } from "geist/font/pixel";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

const interTight = localFont({
  src: "../public/fonts/inter-tight-latin.woff2",
  variable: "--font-inter-tight",
  weight: "100 900",
  display: "swap",
});
const jetbrainsMono = localFont({
  src: "../public/fonts/jetbrains-mono-latin.woff2",
  variable: "--font-jetbrains-mono",
  weight: "400 500",
  display: "swap",
});

export const metadata: Metadata = {
  title: "kiban — An embedded LSM-tree storage engine in Rust",
  description:
    "An embedded LSM-tree key-value storage engine written in Rust, built from scratch. Understand its write path, durability contract, snapshots, and crash recovery.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${jetbrainsMono.variable} ${GeistPixelSquare.variable}`}
    >
      <body>
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
