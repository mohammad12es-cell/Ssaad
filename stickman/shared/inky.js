// Margin Man shared kit: stick-figure rig markup, props, and seek-safe timeline helpers.
// Each episode copies this file into its assets/ folder (HyperFrames resolves assets per project).
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1d1d2b", PAPER = "#fbf7ea";

  function figure(id, opts = {}) {
    const c = opts.color || INK, w = opts.width || 9;
    const st = `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"`;
    const lm = opts.legMask ? ` mask="url(#${opts.legMask})"` : "";
    const glasses = opts.glasses
      ? `<path d="M-40,-348 L40,-348" stroke="${INK}" stroke-width="7"/><rect x="-42" y="-354" width="34" height="20" rx="6" fill="${INK}"/><rect x="8" y="-354" width="34" height="20" rx="6" fill="${INK}"/>`
      : `<circle cx="-19" cy="-342" r="7" fill="${c}"/><circle cx="19" cy="-342" r="7" fill="${c}"/>`;
    const chest = opts.buff
      ? `<path d="M-55,-262 L0,-150 L55,-262 Z" fill="${c}" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`
      : "";
    return `<g id="${id}">
      <g id="${id}-legsWrap"${lm}><g id="${id}-legs"><line ${st} x1="0" y1="-130" x2="-45" y2="0"/><line ${st} x1="0" y1="-130" x2="45" y2="0"/></g></g>
      <g id="${id}-upper">
        <line ${st} x1="0" y1="-275" x2="0" y2="-130"/>${chest}
        <g id="${id}-armL"><line ${st} x1="0" y1="-240" x2="-70" y2="-170"/></g>
        <g id="${id}-armR"><line ${st} x1="0" y1="-240" x2="70" y2="-170"/></g>
        <circle cx="0" cy="-330" r="55" fill="${PAPER}" stroke="${c}" stroke-width="${w}"/>
        ${glasses}
        <path id="${id}-smile" d="M-24,-312 Q0,-288 24,-312" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/>
        <path id="${id}-worry" d="M-36,-302 q12,-10 24,0 q12,10 24,0" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" opacity="0"/>
        <path id="${id}-sad" d="M-22,-298 Q0,-318 22,-298" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" opacity="0"/>
        <circle id="${id}-o" cx="0" cy="-304" r="13" fill="none" stroke="${c}" stroke-width="7" opacity="0"/>
        <path id="${id}-sweat" d="M58,-375 q10,18 0,26 q-10,-8 0,-26 Z" fill="#7cc3ff" stroke="${INK}" stroke-width="4" opacity="0"/>
      </g>
    </g>`;
  }

  function pencil(id, body, cap) {
    return `<g id="${id}" opacity="0">
      <polygon points="0,0 8,-26 24,-19" fill="${INK}"/>
      <polygon points="8,-26 24,-19 66,-112 50,-119" fill="${body}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <polygon points="50,-119 66,-112 74,-130 58,-137" fill="${cap}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    </g>`;
  }

  const eraser = (id) => `<g id="${id}" opacity="0">
      <rect x="-90" y="-45" width="180" height="90" rx="14" fill="#ff9fb2" stroke="${INK}" stroke-width="8"/>
      <rect x="-90" y="-45" width="80" height="90" rx="10" fill="#5aa9e6" stroke="${INK}" stroke-width="8"/>
    </g>`;

  const heart = (id, color = "#e63946") => `<path id="${id}" d="M0,-10 C-10,-30 -40,-20 -30,5 L0,30 L30,5 C40,-20 10,-30 0,-10 Z" fill="${color}" stroke="${INK}" stroke-width="5" opacity="0"/>`;

  function mk(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  function paper(linesGroup) {
    for (let y = 160; y < 1920; y += 64) mk("line", { x1: 0, y1: y, x2: 1080, y2: y }, linesGroup);
  }

  function kit(tl, seed = 7) {
    let s = seed;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const len = (p) => p.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
    const pd = (p) => "M" + p.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" L");
    const ring = (cx, cy, rx, ry = rx, n = 20) =>
      Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * 6.2832 - 1.5708) * rx, cy + Math.sin((i / n) * 6.2832 - 1.5708) * ry]);

    // a stroke drawn on screen with a pencil tracing it (pencil keyframes match dash progress)
    function draw(el, pts, t0, dur, pen) {
      if (typeof el === "string") el = document.querySelector(el);
      el.setAttribute("d", pd(pts));
      el.setAttribute("pathLength", 1);
      tl.set(el, { opacity: 0, attr: { "stroke-dasharray": "1 1", "stroke-dashoffset": 1 } }, 0);
      tl.set(el, { opacity: 1 }, t0);
      tl.to(el, { attr: { "stroke-dashoffset": 0 }, duration: dur, ease: "none" }, t0);
      if (!pen) return;
      const L = len(pts);
      tl.set(pen, { x: pts[0][0], y: pts[0][1] }, t0);
      tl.to(pen, { keyframes: pts.slice(1).map((q, i) => ({ x: q[0], y: q[1], duration: (dur * Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])) / L, ease: "none" })) }, t0);
    }
    // several strokes back to back with one pencil; returns the end time
    function drawAll(list, t0, speed, pen) {
      let t = t0;
      for (const [el, pts] of list) {
        const d = Math.max(0.12, len(pts) / speed);
        draw(el, pts, t, d, pen);
        t += d + 0.03;
      }
      return t;
    }
    const pop = (sel, t) => tl.fromTo(sel + " span", { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: "back.out(2.5)" }, t);
    const penOn = (pen, t) => tl.fromTo(pen, { opacity: 0 }, { opacity: 1, duration: 0.12 }, t);
    const penOff = (pen, t) => tl.to(pen, { opacity: 0, duration: 0.15 }, t);
    const face = (id, which, t) =>
      ["smile", "worry", "sad", "o"].forEach((m) => tl.to(`#${id}-${m}`, { opacity: m === which ? 1 : 0, duration: 0.06 }, t));
    const hop = (sel, t, h = 70, n = 1, base) =>
      tl.to(sel, { keyframes: Array.from({ length: n }).flatMap(() => [{ y: `-=${h}`, duration: 0.17, ease: "power2.out" }, { y: `+=${h}`, duration: 0.17, ease: "power2.in" }]) }, t);
    const boil = (dur) => tl.fromTo("#turb", { attr: { seed: 0 } }, { attr: { seed: Math.round(dur * 12) } , duration: dur, ease: "none" }, 0);
    return { rnd, len, pd, ring, draw, drawAll, pop, penOn, penOff, face, hop, boil };
  }

  window.Inky = { figure, pencil, eraser, heart, mk, paper, kit, INK, PAPER };
})();
