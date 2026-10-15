# kiban-website

The website for [kiban](https://github.com/aetosdios27/kiban), an embedded LSM-tree key-value storage engine written in Rust. The engine lives in its own repository; this site explains how it works and contains no storage-engine code.

## What's on the page

- **Install:** `cargo` and source instructions, pinned to the engine's `v0.1.0` release tag.
- **Correctness:** the counts reported for the project's recovery, fault-injection and concurrency runs. They come from the engine's `validation/CORRECTNESS.md` at `v0.1.0`; this site does not rerun them.
- **Write path** and **what happens after `put()`:** two isometric explainers following one write, `pear = green`, through the WAL, memtable, SST, MANIFEST and compaction.
- **Architecture:** how the pieces fit together, with links into the engine source at `v0.1.0`.

Illustrative keys and sequence numbers in the diagrams describe stages of the design, not live engine state.

## Development

Next.js 16, React 19, strict TypeScript, Tailwind CSS 4, and pnpm. Node.js 20.9+ and pnpm 12.6.0. No external services are needed. Set `NEXT_PUBLIC_SITE_URL` to the live origin (for example `https://example.com`) so share images and the sitemap use absolute links; on Vercel the production URL is used if it is unset.

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm format:check
```

## Credits

Fonts are bundled locally under the SIL Open Font License: Mona Sans, Departure Mono and Commit Mono (licences in `public/fonts`; static TTF cuts for the share images in `assets/og`). Icons are [Pixelarticons](https://pixelarticons.com/), number animation is [Scritto](https://scrit.to/), and interface sounds are [Cuelume](https://cuelume-site.pages.dev/), which can be switched off from the header.

## Accessibility

Semantic HTML, text descriptions for every SVG and canvas, visible keyboard focus, and reduced-motion support: the diagrams and numbers settle to their final state instead of animating.
