import type { ComponentType } from "react";
import { ArchitectureEssay } from "./architecture";
import { PerfectHashEssay } from "./perfect-hash";

// Hand-written reads. Each keeps its source report one link away.
export const ESSAYS: Record<string, ComponentType> = {
  architecture: ArchitectureEssay,
  "perfect-hash": PerfectHashEssay,
};
