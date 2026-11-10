import { fbm, smooth } from "./util.js";
// battlefield height: flat mud around the heroes, the horde holds a long slow rise
export function groundH(x, z) {
  const r = Math.hypot(x, z);
  const big = (fbm(x / 160 + 3.1, z / 160 + 7.7, 4) - 0.5) * 7 * smooth(18, 120, r);
  const ruts = (fbm(x / 3.2, z / 3.2, 3) - 0.5) * 0.16;
  const ridge = smooth(45, 260, -z) * 9 + smooth(260, 700, -z) * 14;
  return big + ruts + ridge * (1 - smooth(250, 500, Math.abs(x)) * 0.5) - 0.02;
}
