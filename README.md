# kiban-website

The website for [kiban](https://github.com/aetosdios27/kiban), an embedded LSM-tree key-value storage engine written in Rust. The engine lives in its own repository; this site explains how it works and contains no storage-engine code.

## What's on the page

- **Install:** `cargo` and source instructions, pinned to the reviewed engine commit.
- **Correctness:** the counts reported for the project's recovery, fault-injection and concurrency runs. They are supplied results, not measurements this site reruns.
- **Write path** and **what happens after `put()`:** two isometric explainers following one write, `pear = green`, through the WAL, memtable, SST, MANIFEST and compaction.
- **Architecture:** how the pieces fit together, with links into the engine source at the pinned commit.

Illustrative keys and sequence numbers in the diagrams describe stages of the design, not live engine state.

## Development

Next.js 16, React 19, strict TypeScript, Tailwind CSS 4, and pnpm. Node.js 20.9+ and pnpm 12.6.0. No environment variables or external services are needed.

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm format:check
```

## Credits

Fonts are bundled locally (Inter Tight and JetBrains Mono under the SIL Open Font License; Geist Pixel from the `geist` package). Icons are [Pixelarticons](https://pixelarticons.com/). Number animation is [Scritto](https://scrit.to/), the footer wordmark is drawn with [ascii.rest](https://ascii.rest/), and the interface components are [shadcn/ui](https://ui.shadcn.com/) with [Animate UI](https://animate-ui.com/), vendored under `components/animate-ui`.

## Accessibility

Semantic HTML, text descriptions for every SVG and canvas, visible keyboard focus, and reduced-motion support: the diagrams and numbers settle to their final state instead of animating.
