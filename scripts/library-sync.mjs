// Copies the catalogued engine documents into content/library, verbatim, and
// records the commit they came from.
// Usage: node scripts/library-sync.mjs <path to kiban repo>

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repo = process.argv[2];
if (!repo) throw new Error("usage: library-sync.mjs <kiban repo>");
const root = path.resolve(import.meta.dirname, "..");
const catalog = readFileSync(path.join(root, "lib/library/catalog.ts"), "utf8");
const entries = [
  ...catalog.matchAll(/slug: "([^"]+)",\s+source: "([^"]+)"/g),
].map(([, slug, source]) => ({ slug, source }));
const out = path.join(root, "content/library");
mkdirSync(out, { recursive: true });
for (const { slug, source } of entries)
  copyFileSync(path.join(repo, source), path.join(out, `${slug}.md`));
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repo,
  encoding: "utf8",
}).trim();
writeFileSync(
  path.join(out, "meta.json"),
  `${JSON.stringify({ commit, documents: entries.length }, null, 2)}\n`,
);
console.log(`${entries.length} documents at ${commit.slice(0, 8)}`);
