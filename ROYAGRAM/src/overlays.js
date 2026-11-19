// DOM typography layer (crisp vector text composited over the WebGL frame)
import { range, easeOut, easeInOut, clamp, lerp } from './lib.js';
const $ = (id) => document.getElementById(id);

// generic in/out envelope with rise + blur + tracking settle
function env(el, t, tin, tout, o = {}) {
  const din = o.din ?? 0.5, dout = o.dout ?? 0.35;
  const a = easeOut(range(t, tin, tin + din));
  const b = 1 - easeInOut(range(t, tout - dout, tout));
  const v = Math.min(a, b);
  el.style.opacity = v.toFixed(3);
  const rise = (1 - a) * (o.rise ?? 26) - (1 - b) * (o.fall ?? 0);
  const blur = (1 - a) * (o.blur ?? 10) + (1 - b) * (o.blurOut ?? 8);
  el.style.transform = `translateY(${rise.toFixed(2)}px) scale(${lerp(o.s0 ?? 1.0, 1, a).toFixed(4)})`;
  el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '';
  return v;
}

export function updateOverlays(t, r) {
  // hook
  const hk = $('hook');
  env(hk, t, 2.25, 4.05, { din: 0.7, rise: 0, blur: 0, dout: 0.3, blurOut: 14, s0: 1.0 });
  hk.querySelectorAll('.ln > div').forEach((s, i) => {
    const p = easeOut(range(t, 2.25 + i * 0.16, 2.95 + i * 0.16));
    s.style.transform = `translateY(${((1 - p) * 110).toFixed(1)}%)`;
  });
  hk.style.letterSpacing = (0.08 + 0.06 * range(t, 2.25, 4.05)).toFixed(4) + 'em';

  // concept tags
  const tags = [['tag1', 6.1, 10.35], ['tag2', 14.6, 17.45], ['tag3', 20.9, 24.4], ['tag4', 29.0, 30.95]];
  for (const [id, a, b] of tags) {
    const el = $(id); env(el, t, a, b, { din: 0.8, rise: 18, blur: 6 });
    el.querySelector('.rule').style.width = (easeOut(range(t, a + 0.3, a + 1.2)) * 260).toFixed(1) + 'px';
    el.querySelector('.t').style.backgroundPosition = `${(100 - 100 * range(t, a, b)).toFixed(1)}% 0`;
  }

  // montage captions + viewfinder frame
  const caps = [['cap1', 31.0, 32.98], ['cap2', 33.0, 34.68], ['cap3', 34.7, 35.98], ['cap4', 36.0, 37.98]];
  for (const [id, a, b] of caps) env($(id), t, a, b, { din: 0.3, dout: 0.12, rise: 30, blur: 8, blurOut: 0, s0: 1.04 });
  const fr = $('frame'); const fv = t >= 31.0 && t < 32.98 ? 1 : 0;
  fr.style.opacity = fv;
  if (fv) { const f = Math.floor((t - 31.0) * 24); $('tc').textContent = `00:00:${String(31 + Math.floor(f / 24)).padStart(2, '0')}:${String(f % 24).padStart(2, '0')}`; }

  // final brand screen
  env($('f1'), t, 42.35, 46, { din: 0.8, rise: 14, blur: 8 });
  $('frule').style.width = (easeOut(range(t, 42.6, 43.5)) * 520).toFixed(1) + 'px';
  env($('f2'), t, 42.75, 46, { din: 0.7, rise: 12, blur: 6 });
  env($('f3'), t, 43.15, 46, { din: 0.8, rise: 16, blur: 8 });
  env($('f4'), t, 43.6, 46, { din: 0.7, rise: 14, blur: 6, s0: 0.96 });
}
