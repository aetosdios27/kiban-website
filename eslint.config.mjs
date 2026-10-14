import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  prettier,
  {
    // Vendored from the Animate UI registry: kept as shipped
    // so updates stay diffable. Their code predates some of these rules.
    files: [
      "components/animate-ui/**",
      "hooks/**",
      "lib/get-strict-context.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/refs": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "visuals/.venv/**",
    "visuals/renders/**",
  ]),
]);
