import { readFileSync } from "node:fs";
import path from "node:path";
import type { Element, Root, RootContent } from "hast";
import { toString } from "hast-util-to-string";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { createHighlighter, type ThemeRegistration } from "shiki";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { ENGINE_REPO } from "@/lib/kiban/source";
import { CATALOG } from "./catalog";
import meta from "@/content/library/meta.json";

export const libraryCommit = meta.commit;

const THEME: ThemeRegistration = {
  name: "kiban",
  type: "dark",
  fg: "#d6d6d6",
  bg: "transparent",
  settings: [
    { settings: { foreground: "#d6d6d6" } },
    { scope: ["comment"], settings: { foreground: "#6b6b6b" } },
    {
      scope: ["keyword", "storage", "keyword.control"],
      settings: { foreground: "#ffe24a" },
    },
    {
      scope: ["string", "constant.other.symbol"],
      settings: { foreground: "#c9ad2c" },
    },
    {
      scope: ["constant.numeric", "constant.language"],
      settings: { foreground: "#f5f5f5" },
    },
    {
      scope: ["entity.name.function", "support.function"],
      settings: { foreground: "#f5f5f5" },
    },
    {
      scope: ["entity.name.type", "support.type"],
      settings: { foreground: "#a3a3a3" },
    },
  ],
};
const LANGUAGES = ["rust", "bash", "toml", "json", "python", "sql", "c"];
const ALIASES: Record<string, string> = {
  sh: "bash",
  shell: "bash",
  rs: "rust",
};
const highlighter = createHighlighter({ themes: [THEME], langs: LANGUAGES });

export type Heading = { id: string; text: string; depth: 2 | 3 };

// Which figures sit under which heading. "intro" means before the first h2.
const FIGURES: Record<string, Record<string, string>> = {
  overview: { intro: "strata" },
  architecture: {
    "ownership-and-durable-state": "write",
    "maintenance-and-resource-accounting": "after",
  },
  correctness: { "wal-durability": "generation" },
  "group-commit-qa": { intro: "groupCommit" },
  "the-field": {
    scoreboard: "scoreboard",
    "writer-sweep": "sweep",
    "long-runs": "race",
  },
  "group-commit": {
    intro: "groupCommit",
    "results-median-of-five-trials": "sweep",
  },
  "read-path": { "ranked-cache-hit-cost-attribution": "skyline" },
  "perfect-hash": { intro: "lookup" },
  "point-index-cost": { intro: "section" },
  "latest-ten": { intro: "prefix" },
  "small-cache": { intro: "smallCache" },
};

const figure = (name: string): Element => ({
  type: "element",
  tagName: "figure-slot",
  properties: { name },
  children: [],
});

/** Keeps readers on the site: catalogued links stay here, the rest are raw evidence. */
function resolveLink(href: string, source: string) {
  if (/^(https?:|mailto:|#)/.test(href)) return { href, raw: false };
  const [file, hash] = href.split("#");
  const target = file.startsWith("/")
    ? file.slice(1)
    : path.posix.normalize(path.posix.join(path.posix.dirname(source), file));
  const entry = CATALOG.find((e) => e.source === target);
  if (entry)
    return {
      href: `/library/${entry.slug}${hash ? `#${hash}` : ""}`,
      raw: false,
    };
  return { href: `${ENGINE_REPO}/blob/${libraryCommit}/${target}`, raw: true };
}

export async function loadDocument(slug: string) {
  const entry = CATALOG.find((e) => e.slug === slug);
  if (!entry) return null;
  const markdown = readFileSync(
    path.join(process.cwd(), "content/library", `${slug}.md`),
    "utf8",
  );
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug);
  const tree = (await processor.run(processor.parse(markdown))) as Root;

  const first = tree.children.find(
    (node) => node.type === "element" && node.tagName === "h1",
  );
  const sourceTitle = first ? toString(first as Element) : entry.slug;
  if (first) tree.children.splice(tree.children.indexOf(first), 1);

  const headings: Heading[] = [];
  const figures = FIGURES[slug] ?? {};
  const body: RootContent[] = [];
  let introPlaced = !figures.intro;
  for (const node of tree.children) {
    const isHeading =
      node.type === "element" &&
      (node.tagName === "h2" || node.tagName === "h3");
    if (isHeading && !introPlaced) {
      body.push(figure(figures.intro));
      introPlaced = true;
    }
    body.push(node);
    if (isHeading) {
      const element = node as Element;
      const id = String(element.properties.id ?? "");
      headings.push({
        id,
        text: toString(element),
        depth: element.tagName === "h2" ? 2 : 3,
      });
      if (figures[id]) body.push(figure(figures[id]));
    }
  }
  if (!introPlaced) body.push(figure(figures.intro));
  tree.children = body;

  const shiki = await highlighter;
  visit(tree, "element", (node, index, parent) => {
    if (node.tagName === "a") {
      const { href, raw } = resolveLink(
        String(node.properties.href ?? ""),
        entry.source,
      );
      node.properties.href = href;
      if (raw) node.properties.dataRaw = "true";
    }
    if (node.tagName === "table" && parent && index !== undefined) {
      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["lib-table"], dataLenisPrevent: "x" },
        children: [node],
      };
      return ["skip", index + 1];
    }
    if (node.tagName === "pre" && parent && index !== undefined) {
      const code = node.children[0] as Element | undefined;
      const classes = (code?.properties?.className ?? []) as string[];
      const named = classes
        .find((c) => c.startsWith("language-"))
        ?.replace("language-", "");
      const lang = ALIASES[named ?? ""] ?? named ?? "text";
      const known = LANGUAGES.includes(lang);
      const highlighted = shiki.codeToHast(
        toString(code ?? node).replace(/\n$/, ""),
        { lang: known ? lang : "text", theme: "kiban" },
      );
      parent.children[index] = highlighted.children[0] as Element;
      return ["skip", index + 1];
    }
  });

  const words = markdown.split(/\s+/).length;
  return {
    entry,
    tree,
    headings,
    sourceTitle,
    words,
    minutes: Math.max(1, Math.round(words / 220)),
  };
}

export function documentStats() {
  const counts = CATALOG.map(
    (entry) =>
      readFileSync(
        path.join(process.cwd(), "content/library", `${entry.slug}.md`),
        "utf8",
      ).split(/\s+/).length,
  );
  return {
    words: counts.reduce((a, b) => a + b, 0),
    bySlug: Object.fromEntries(CATALOG.map((e, i) => [e.slug, counts[i]])),
  };
}
