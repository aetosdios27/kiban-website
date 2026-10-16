import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

// Compile the actual boundary code with the already-installed TypeScript.
// Fetch is replaced only for failure cases that the public feed cannot supply.
function load(file) {
  const require = createRequire(file);
  const output = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2017,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  const exports = {};
  new Function("require", "exports", output.outputText)((specifier) => {
    if (specifier === "./source")
      return load(path.resolve(path.dirname(file), "source.ts"));
    return require(specifier);
  }, exports);
  return exports;
}
const root = path.resolve(import.meta.dirname, "..");
const facts = load(path.join(root, "lib/kiban/facts.ts"));
const snapshot = JSON.parse(
  readFileSync(path.join(root, "lib/kiban/facts.snapshot.json"), "utf8"),
);

test("snapshot corrections and shipped bindings", () => {
  const parsed = facts.parseFacts(snapshot);
  assert.equal(parsed.tests.crash_seeds_per_pr, 128);
  assert.equal(parsed.bugs_found.length, 4);
  for (const id of ["python", "mcp", "c-abi"]) {
    assert.equal(
      parsed.capabilities.find((row) => row.id === id)?.status,
      "shipped",
    );
  }
  assert.ok(parsed.guarantees.promised.every((row) => row.evidence.length));
  assert.ok(
    parsed.guarantees.promised.some((row) => row.key.includes("MANIFEST")),
  );
  assert.ok(!JSON.stringify(parsed).includes("no checksum yet"));
  assert.equal(facts.getExamples(parsed).at(-1).id, "python");
  const grid = facts.getCorrectnessResults(parsed);
  assert.equal(grid.length, 6);
  assert.deepEqual(grid[4], {
    value: "530,100",
    label: "Acknowledged writes verified",
  });
  for (const row of [
    ...parsed.guarantees.promised,
    ...parsed.guarantees.not_promised,
  ]) {
    assert.ok(row.key.length <= 32 && row.clause.length <= 64, row.key);
  }
});

test("partial and empty feeds never inherit stale snapshot claims", () => {
  const parsed = facts.parseFacts({ schema: 1 });
  assert.deepEqual(parsed.guarantees.promised, []);
  assert.deepEqual(parsed.specs, []);
  assert.deepEqual(facts.getExamples(parsed), []);
  assert.deepEqual(facts.getCorrectnessResults(parsed), []);
  assert.deepEqual(parsed.correctness_stats, []);
  assert.equal(
    facts.getExamples(
      facts.parseFacts({ schema: 1, examples: { python: " " } }),
    ).length,
    0,
  );
});

test("invalid schema, nested types, counts, links and enums are rejected", () => {
  for (const value of [
    null,
    [],
    {},
    { schema: 2 },
    { schema: 1, tests: { lib_tests: "320" } },
    { schema: 1, tests: { lib_tests: -1 } },
    { schema: 1, tests: { lib_tests: 1.2 } },
    { schema: 1, guarantees: { promised: ["sync"] } },
    { schema: 1, specs: [320] },
    { schema: 1, examples: { python: 3 } },
    { schema: 1, capabilities: [{ status: "unknown" }] },
    { schema: 1, capabilities: [{ link: "javascript:alert(1)" }] },
    { schema: 1, generated_at: "yesterday" },
  ]) {
    assert.throws(() => facts.parseFacts(value));
  }
});

test("strongest sweep and nonzero nightly evidence lead before library tests", () => {
  const parsed = facts.parseFacts({
    ...snapshot,
    correctness_stats: [],
    local_sweeps: [
      { seeds: 1000, suite: "direct", result: "pass" },
      { seeds: 10000000, suite: "shared", result: "pass" },
    ],
    tests: { ...snapshot.tests, nightly_seeds_total: 50 },
  });
  const results = facts.getCorrectnessResults(parsed);
  assert.equal(results[1].value, "10M");
  assert.match(results[1].label, /shared.*pass/);
  assert.equal(results[2].label, "Nightly seeds, total");
  assert.equal(results[3].value, "328");
});

test("loader uses the hourly fetch option and falls back on every boundary failure", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    let request;
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return Response.json({
        schema: 1,
        engine: { version: "0.2.0" },
        tests: { lib_tests: 999 },
      });
    };
    const live = await facts.getFacts();
    assert.equal(live.engine.version, "0.2.0");
    assert.equal(live.tests.lib_tests, 999);
    assert.equal(live.examples.basic, undefined);
    assert.equal(request.url, facts.FACTS_URL);
    assert.equal(request.options.next.revalidate, 3600);
    assert.ok(request.options.signal instanceof AbortSignal);
    assert.equal(warnings.length, 0);
    for (const failure of [
      async () => new Response("missing", { status: 404 }),
      async () => {
        throw new TypeError("offline");
      },
      async () => new Response("not json"),
      async () => Response.json({ schema: 2 }),
      async () => Response.json({ schema: 1, specs: [false] }),
    ]) {
      globalThis.fetch = failure;
      const fallback = await facts.getFacts();
      assert.deepEqual(fallback, facts.parseFacts(snapshot));
    }
    assert.equal(warnings.length, 5);
    assert.ok(
      warnings.every((warning) => warning.includes("using committed snapshot")),
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});

// No new digit-bearing factual copy in components. Section indexes, diagram
// coordinates, illustrative L0/L1 labels and fixed chart scales are UI data.
export function claimStrings(file, source) {
  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found = [];
  function visit(node) {
    if (
      ts.isJsxText(node) ||
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node)
    ) {
      const value = node.text.trim();
      if (
        /\d/.test(value) &&
        (/\bv?\d+\.\d+\.\d+\b/.test(value) ||
          /\b\d[\d,.]*\s*(?:(?:library|crash|simulated|injected|acknowledged)\s+)?(?:tests?|seeds?|crashes|recoveries|mutations|faults?|cycles|trials?|threads?|CPUs?|MiB|MB|writes?|reads?)\b/i.test(
            value,
          ) ||
          /\b(?:Rust|Linux|CRC)[ -]?\d/i.test(value) ||
          (ts.isArrayLiteralExpression(node.parent) &&
            value !== "0" &&
            /^[\d,]+$/.test(value)))
      )
        found.push({
          line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
          value,
        });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return found;
}
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(path.join(dir, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [path.join(dir, entry.name)]
        : [],
  );
}
test("components contain no digit-bearing engine claim strings", () => {
  const violations = files(path.join(root, "components/kiban")).flatMap(
    (file) =>
      claimStrings(file, readFileSync(file, "utf8")).map(
        (claim) => `${path.relative(root, file)}:${claim.line}: ${claim.value}`,
      ),
  );
  assert.deepEqual(violations, []);
  for (const source of [
    'const claim = "320 library tests";',
    "<p>128 crash seeds per PR</p>",
    "<p>Rust 2024 · v0.1.0</p>",
    'const results = [["260", "Library tests"]];',
  ])
    assert.ok(claimStrings("probe.tsx", source).length, source);
});
