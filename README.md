# kiban-web

The public website and future interactive visualization layer for [Kiban](https://github.com/aetosdios27/kiban), an embedded LSM-tree key-value storage engine built from scratch. The engine lives in that separate repository; this project contains no storage-engine implementation.

## Stack

Next.js 16 (App Router), React 19, strict TypeScript, Tailwind CSS 4, and pnpm. ESLint uses the Next.js Core Web Vitals and TypeScript configurations. Prettier handles formatting. There are no component, state-management, or animation libraries.

## Local development

Use Node.js 20.9 or newer and pnpm 12.6.0 (the version recorded in `packageManager`). No environment variables or external services are required.

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. Additional commands:

```bash
pnpm build        # Production build
pnpm start        # Serve the production build
pnpm lint         # ESLint, with zero warnings allowed
pnpm typecheck    # Generate route types, then check TypeScript
pnpm format      # Apply Prettier
pnpm format:check
```

## Current status

- `/`: landing page, static engine-layout placeholder, engine source link, and pending architecture/benchmark entries.
- `/explorer`: responsive structural shell for workload controls, visualization, state inspection, timeline, and metrics. Controls are disabled and no engine state, events, or benchmark measurements are fabricated.

All components are server components. Fonts use local system stacks to avoid external font downloads and layout shifts. Semantic regions, visible focus styles, explicit empty states, and reduced-motion support form the accessibility foundation. The Explorer stacks its panels on smaller screens; future dense views will need their own responsive treatment.

## Explorer architecture

`types/kiban/events.ts` reserves event names and a minimal envelope with an `unknown` payload. It is protocol scaffolding, not a complete event schema or wire format. Define and validate discriminated event payloads once the engine's event contract is known.

`lib/kiban/event-source.ts` defines a transport-neutral async event stream with cancellation. Future adapters can read recorded traces, a local process, HTTP, WebSocket streams, or a deterministic simulation. None is implemented yet. Adapters should validate external data before yielding typed events and release their resources on cancellation or iterator closure.

The intended flow is **source adapter → validated events → state projection → presentation**. Kiban types stay outside UI components. Source-specific logic belongs in adapters; presentation should receive projected state and event history, rather than fetch from a particular transport. Add a small client boundary when playback or inspection needs interaction; no state library is needed at this stage.

Next: agree on the engine event contract, obtain a real recorded trace, and implement one validated adapter plus a deterministic state projection before adding playback or event animation. Publish benchmarks only with real results and reproducible methodology.
