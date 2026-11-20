// CHARACTER BIBLE (as code). Every appearance of every character is built from these specs.
// Do not edit per-episode: change here and the whole season stays consistent.
import { Human, HumanSpec } from "./Human";

/** KAEL — 25, short messy black hair, dark brown eyes, scar above LEFT eyebrow,
 *  black futuristic jacket with metallic details, lean athletic build. NO neural link. */
export const KAEL: HumanSpec = {
  name: "kael", build: 0.97,
  skin: { key: "kael", base: "#c99a7e", shade: "#7a4f45", blush: "#d0806e", scar: true, stubble: true, seed: 21 },
  face: { jaw: 1.0, chin: 1.0, cheek: 1.1, nose: 0.95, lips: 0.95 },
  eyes: { inner: "#9a6a44", outer: "#3e2616" },          // dark brown (painted brighter to read in neon light)
  hair: { style: "messy", color: 0x17161d, seed: 7 },    // short messy black
  brows: { color: 0x1c1616, thick: 0.95 },
  outfit: { kind: "jacket", color: "#101119", accent: 0x38e8ff },
};
/** Kael as a child (Ep03 memory): same eyes / hair / face shape, no scar yet. */
export const KAEL_CHILD: HumanSpec = { ...KAEL, name: "kael-child", scale: 0.62, headScale: 1.32, build: 0.9,
  skin: { ...KAEL.skin, key: "kael-child", scar: false, stubble: false }, face: { ...KAEL.face, jaw: 0.82, chin: 0.85, cheek: 1.25 },
  outfit: { kind: "tee", color: "#3b4d78" }, hair: { ...KAEL.hair, seed: 8 } };
/** The Original (Ep08): identical body, containment bodysuit. */
export const KAEL_CLONE: HumanSpec = { ...KAEL, name: "kael-original", outfit: { kind: "bodysuit", color: "#c7ccd6", accent: 0x8fe9ff } };
/** The real human in the life-support pod (Ep10 final reveal). Same face & scar: he is the original Kael. */
export const KAEL_REAL: HumanSpec = { ...KAEL, name: "kael-real", skin: { ...KAEL.skin, key: "kael-real", base: "#bf9a86" }, outfit: { kind: "bodysuit", color: "#3a4148", accent: 0xff6a3a } };

/** E.V.E — AI hologram: silver hair, glowing cyan eyes, elegant. */
export const EVE: HumanSpec = {
  name: "eve", build: 0.86, holo: 0x7feaff,
  skin: { key: "eve", base: "#ffffff", shade: "#cccccc", blush: "#ffffff" },
  face: { female: true, jaw: 0.74, chin: 0.88, cheek: 1.15, nose: 0.78, lips: 1.3, brow: 0.3 },
  eyes: { inner: "#bfffff", outer: "#18e8ff", glow: true },
  hair: { style: "long", color: 0xdfe9ff, seed: 3 },
  brows: { color: 0xeef6ff, thick: 0.8 },
  outfit: { kind: "gown", color: "#ffffff" },
};

/** DR. VEX — older scientist, white hair and beard, worn futuristic clothing. */
export const VEX: HumanSpec = {
  name: "vex", build: 1.0,
  skin: { key: "vex", base: "#c4a08c", shade: "#6c4a42", blush: "#c47e70", age: 1, seed: 33 },
  face: { jaw: 0.95, chin: 0.9, cheek: 0.9, nose: 1.2, lips: 0.85, brow: 1.3 },
  eyes: { inner: "#5d6f7d", outer: "#2b3540" },
  hair: { style: "receding", color: 0xcfcac2, seed: 4 },
  beard: { color: 0xcfcac2 },
  brows: { color: 0xdedbd6, thick: 1.4 },
  outfit: { kind: "labcoat", color: "#565e6c", accent: 0xffb36b },
};
export const VEX_HOLO: HumanSpec = { ...VEX, name: "vex-holo", holo: 0x9fd8ff };

/** Neo-Eden citizens: varied coats, all with the cyan neural link behind the ear. */
const COATS = ["#1d2233", "#2b1f33", "#162a2f", "#2d2d38", "#3a2430", "#202a40", "#121418", "#33303a"];
const SKINS = [["#c99a7e", "#7a4f45", "#d0806e"], ["#8d5f45", "#4a2e24", "#a8634d"], ["#e0b9a0", "#9a6f60", "#e09a8a"], ["#b07d5e", "#5e3d2f", "#c27b62"], ["#6e4a38", "#3b241b", "#8a5543"]];
const HAIRS = [0x111111, 0x2a1d16, 0x5a4636, 0x0c0c12, 0x8a8a90, 0x3a2a4a];
export function citizen(i: number): HumanSpec {
  const sk = SKINS[i % SKINS.length];
  return {
    name: "citizen" + i, detail: "crowd", build: 0.9 + (i % 4) * 0.05, scale: 0.92 + ((i * 37) % 10) / 70,
    skin: { key: "cit" + (i % SKINS.length), base: sk[0], shade: sk[1], blush: sk[2], seed: i },
    face: { female: i % 2 === 0 },
    eyes: { inner: "#3a2a20", outer: "#1a120c" },
    hair: { style: i % 3 === 0 ? "hood" : "short", color: HAIRS[i % HAIRS.length], seed: 100 + i },
    brows: { color: HAIRS[i % HAIRS.length] },
    outfit: { kind: "citizen", color: COATS[i % COATS.length], hood: i % 3 === 0 },
    neural: true,
  };
}

export const make = (s: HumanSpec) => new Human(s);
