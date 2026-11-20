// Episode registry. Each episode exports a builder (3D + HUD) and metadata; each renders independently.
import type { Builder } from "../components/SceneCanvas";
import { ep01, meta as m01 } from "./ep01";
import { ep02, meta as m02 } from "./ep02";
import { ep03, meta as m03 } from "./ep03";
import { ep04, meta as m04 } from "./ep04";
import { ep05, meta as m05 } from "./ep05";
import { ep06, meta as m06 } from "./ep06";
import { ep07, meta as m07 } from "./ep07";
import { ep08, meta as m08 } from "./ep08";
import { ep09, meta as m09 } from "./ep09";
import { ep10, meta as m10 } from "./ep10";
export type EpisodeDef = { n: number; title: string; build: Builder };
export const EPISODES: EpisodeDef[] = [
  { ...m01, build: ep01 }, { ...m02, build: ep02 }, { ...m03, build: ep03 }, { ...m04, build: ep04 }, { ...m05, build: ep05 },
  { ...m06, build: ep06 }, { ...m07, build: ep07 }, { ...m08, build: ep08 }, { ...m09, build: ep09 }, { ...m10, build: ep10 },
];
