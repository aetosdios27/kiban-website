import type { ComponentType } from "react";
import { PerfectHashEssay } from "./perfect-hash";

// Hand-written reads. Each keeps its source report one link away.
export const ESSAYS: Record<string, ComponentType> = {
  "perfect-hash": PerfectHashEssay,
};
