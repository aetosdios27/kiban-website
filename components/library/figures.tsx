import { AfterWriteDiagram } from "@/components/kiban/after-write-diagram";
import { Race } from "@/components/kiban/bench/race";
import { Scoreboard } from "@/components/kiban/bench/scoreboard";
import { Sweep } from "@/components/kiban/bench/sweep";
import { EngineStrata } from "@/components/kiban/engine-strata";
import { WriteDiagram } from "@/components/kiban/write-diagram";
import {
  GroupCommitFigure,
  LookupFigure,
  LostGenerationFigure,
  PrefixFigure,
  SectionFigure,
  SkylineFigure,
  SmallCacheFigure,
} from "./lab/figures";
import type { ComponentType } from "react";

const wrap = (Inner: ComponentType, wide = true) =>
  function Figure() {
    return (
      <div className={wide ? "lib-figure lib-wide" : "lib-figure"}>
        <Inner />
      </div>
    );
  };

export const LIBRARY_FIGURES: Record<string, ComponentType> = {
  strata: wrap(EngineStrata),
  write: wrap(WriteDiagram),
  after: wrap(AfterWriteDiagram),
  scoreboard: wrap(Scoreboard),
  sweep: wrap(Sweep),
  race: wrap(Race),
  lookup: LookupFigure,
  section: SectionFigure,
  groupCommit: GroupCommitFigure,
  generation: LostGenerationFigure,
  smallCache: SmallCacheFigure,
  prefix: PrefixFigure,
  skyline: SkylineFigure,
};
