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
import { GLOSSARY } from "./glossary";
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

const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
const TERM_RE = new RegExp(
  `(?<![\\w/.-])(${TERMS.map((t) => t.replace("+", "\\+")).join("|")})(?![\\w/-])`,
);
const NUMBER_RE =
  /(?<![\w.])(\d[\d,]*(?:\.\d+)?(?:[–-]\d[\d,]*(?:\.\d+)?)?(?:\s?(?:×|x\b|%|µs|ns|ms|MiB|GiB|KiB|MB|bytes|ops\/s|writes\/s|fdatasyncs?|syncs?)))/;
const CALLOUT_RE =
  /^(Result|Verdict|GO|Outcome|Restored invariant|Recommendation|Preliminary|Status|HOLD)\b/;
const SPLIT_WORDS = 70;

const el = (
  tagName: string,
  properties: Element["properties"],
  children: Element["children"],
): Element => ({ type: "element", tagName, properties, children });

/** Finds the definitions and numbers in one paragraph's plain text. */
function annotate(nodes: Element["children"], seen: Set<string>) {
  const out: Element["children"] = [];
  for (const node of nodes) {
    if (node.type !== "text") {
      out.push(node);
      continue;
    }
    let rest = node.value;
    while (rest) {
      const term = TERM_RE.exec(rest);
      const fresh = term && !seen.has(term[1]) ? term : null;
      const number = NUMBER_RE.exec(rest);
      const hit =
        fresh && (!number || fresh.index <= number.index) ? fresh : number;
      if (!hit) {
        out.push({ type: "text", value: rest });
        break;
      }
      if (hit.index)
        out.push({ type: "text", value: rest.slice(0, hit.index) });
      if (hit === fresh) {
        seen.add(hit[1]);
        out.push(el("term-slot", { name: hit[1] }, []));
      } else {
        out.push(
          el("span", { className: ["n"] }, [{ type: "text", value: hit[1] }]),
        );
      }
      rest = rest.slice(hit.index + hit[0].length);
    }
  }
  return out;
}

const sentenceEnd = (text: string, from = 0) => {
  const re = /[.?!:](?=\s+[A-Z`"(])/g;
  re.lastIndex = from;
  const m = re.exec(text);
  return m ? m.index + 1 : -1;
};

/** Divides at a sentence near the middle; every word stays. */
function splitParagraph(node: Element): Element[] {
  const words = toString(node).split(/\s+/).length;
  if (words < SPLIT_WORDS) return [node];
  let seen = 0;
  const half = toString(node).length / 2;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const text = child.type === "text" ? child.value : "";
    if (child.type !== "text") {
      seen += toString(child as Element).length;
      continue;
    }
    if (seen + text.length >= half) {
      const cut = sentenceEnd(text, Math.max(0, half - seen));
      if (cut > 0) {
        const left = node.children.slice(0, i);
        left.push({ type: "text", value: text.slice(0, cut) });
        const right = [
          { type: "text" as const, value: text.slice(cut).trimStart() },
          ...node.children.slice(i + 1),
        ];
        return [
          ...splitParagraph({ ...node, children: left }),
          ...splitParagraph({ ...node, children: right }),
        ];
      }
    }
    seen += text.length;
  }
  return [node];
}

/** Sets a paragraph's opening sentence apart, so a page can be skimmed. */
function leadIn(node: Element) {
  const first = node.children[0];
  if (first?.type !== "text") return node;
  const cut = sentenceEnd(first.value);
  if (cut < 0) return node;
  return {
    ...node,
    children: [
      el("span", { className: ["lead-in"] }, [
        { type: "text", value: first.value.slice(0, cut) },
      ]),
      { type: "text" as const, value: first.value.slice(cut) },
      ...node.children.slice(1),
    ],
  };
}

function readingLayer(tree: Root) {
  const seen = new Set<string>();
  const body: RootContent[] = [];
  for (const node of tree.children) {
    if (node.type !== "element" || node.tagName !== "p") {
      body.push(node);
      continue;
    }
    for (const part of splitParagraph(node)) {
      const callout = CALLOUT_RE.test(toString(part));
      const shaped = callout ? part : leadIn(part);
      shaped.children = shaped.children.flatMap((child) => {
        if (child.type === "element" && child.tagName === "span") {
          child.children = annotate(child.children, seen);
          return [child];
        }
        return annotate([child], seen);
      });
      body.push(
        callout ? el("aside", { className: ["callout"] }, [shaped]) : shaped,
      );
    }
  }
  tree.children = body;
  visit(tree, "element", (node) => {
    if (node.tagName === "li") node.children = annotate(node.children, seen);
  });
}

/** Mutes repeated row labels, ranks number parts, and sizes plain columns. */
function shapeTable(table: Element) {
  const tbody = table.children.find(
    (c): c is Element => c.type === "element" && c.tagName === "tbody",
  );
  if (!tbody) return 0;
  const rows = tbody.children.filter(
    (c): c is Element => c.type === "element" && c.tagName === "tr",
  );
  const cells = (row: Element) =>
    row.children.filter((c): c is Element => c.type === "element");
  const head = table.children.find(
    (c): c is Element => c.type === "element" && c.tagName === "thead",
  );
  const headRow = head?.children.find(
    (c): c is Element => c.type === "element" && c.tagName === "tr",
  );
  const labels = headRow ? cells(headRow).map((c) => toString(c)) : [];
  rows.forEach((row) =>
    cells(row).forEach((cell, c) => {
      cell.properties.dataLabel = labels[c] ?? "";
    }),
  );
  rows.forEach((row, r) => {
    const [head] = cells(row);
    const before = r ? cells(rows[r - 1])[0] : undefined;
    if (head && before && toString(head) === toString(before))
      head.properties.dataRepeat = "true";
    for (const cell of cells(row).slice(1)) {
      const text = toString(cell);
      if (/^[\d.,\s/—-]+$/.test(text) && text.includes(" / "))
        cell.children = text
          .split(" / ")
          .flatMap((part, i) => [
            ...(i
              ? [
                  el("span", { className: ["sep"] }, [
                    { type: "text", value: " / " },
                  ]),
                ]
              : []),
            el("span", { className: [i ? "dim" : "main"] }, [
              { type: "text", value: part },
            ]),
          ]);
    }
  });
  const widths = cells(rows[0] ?? el("tr", {}, [])).length;
  for (let c = 1; c < widths; c++) {
    const column = rows.map((row) =>
      toString(cells(row)[c] ?? el("td", {}, [])),
    );
    const values = column.map((v) => Number(v.replace(/,/g, "")));
    if (values.length < 3 || values.some((v) => !Number.isFinite(v))) continue;
    const top = Math.max(...values);
    if (top <= 0) continue;
    rows.forEach((row, r) => {
      const cell = cells(row)[c];
      if (cell)
        cell.properties.style = `--bar:${((values[r] / top) * 100).toFixed(1)}%`;
    });
    rows.forEach((row) => {
      const cell = cells(row)[c];
      if (cell) cell.properties.className = ["cell-bar"];
    });
  }
  return rows.length;
}

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

  readingLayer(tree);
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
      const rows = shapeTable(node);
      parent.children[index] = {
        type: "element",
        tagName: "table-slot",
        properties: { rows },
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
