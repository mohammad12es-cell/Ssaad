// Margin Man episode engine: an episode is a short script of beats on a time cursor.
// Usage in an episode file:  EPISODE({ title, seed, music: "happy" }, (E) => { E.cap("..."); E.draw("inky", "sword", 380, 1090); ... });
// Everything is placed on one paused GSAP timeline, so every frame is a pure function of time.
(function () {
  const NS = "http://www.w3.org/2000/svg", INK = "#1d1d2b", PAPER = "#fbf7ea";
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const html = (parent, markup) => { parent.insertAdjacentHTML("beforeend", markup); return parent.lastElementChild; };

  // ---------- character markup (local origin = between the feet) ----------
  function monster(id, color = "#2a2a3a") {
    let s = 5, d = "";
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 44; i++) { const a = i * 2.3, r = 40 + rnd() * 140; d += (i ? " L" : "M") + (Math.cos(a) * r).toFixed(1) + "," + (-260 + Math.sin(a) * r).toFixed(1); }
    return `<g id="${id}"><g id="${id}-body">
      <circle cx="0" cy="-260" r="185" fill="${color}"/>
      <path d="${d}" fill="none" stroke="#11111a" stroke-width="7" stroke-linejoin="round"/>
      <g stroke="${INK}" stroke-width="9" stroke-linecap="round"><line x1="-60" y1="-90" x2="-85" y2="0"/><line x1="60" y1="-90" x2="85" y2="0"/>
      <line x1="-85" y1="0" x2="-120" y2="0"/><line x1="85" y1="0" x2="120" y2="0"/></g>
      <g id="${id}-armL"><line x1="-170" y1="-230" x2="-235" y2="-180" stroke="${INK}" stroke-width="9" stroke-linecap="round"/></g>
      <g id="${id}-armR"><line x1="170" y1="-230" x2="235" y2="-300" stroke="${INK}" stroke-width="9" stroke-linecap="round"/></g>
      <g id="${id}-eyes"><circle cx="-62" cy="-300" r="40" fill="#fff"/><circle cx="62" cy="-300" r="40" fill="#fff"/>
        <circle class="${id}-pupil" cx="-72" cy="-296" r="17" fill="#e63946"/><circle class="${id}-pupil" cx="52" cy="-296" r="17" fill="#e63946"/>
        <path id="${id}-brows" d="M-110,-360 L-25,-335 M110,-360 L25,-335" stroke="#fff" stroke-width="12" stroke-linecap="round"/></g>
      <path id="${id}-mouth" d="M-85,-205 L-55,-228 L-25,-200 L5,-230 L35,-200 L65,-226 L90,-205" fill="none" stroke="#fff" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>
      <path id="${id}-grin" d="M-80,-215 Q0,-150 80,-215" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0"/>
    </g></g>`;
  }
  function blob(rx, ry, seed, n = 14) {
    let s = seed;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832, k = 0.9 + rnd() * 0.2; pts.push([Math.cos(a) * rx * k, -ry + Math.sin(a) * ry * k]); }
    let d = `M${((pts[n - 1][0] + pts[0][0]) / 2).toFixed(1)},${((pts[n - 1][1] + pts[0][1]) / 2).toFixed(1)}`;
    for (let i = 0; i < n; i++) { const m = pts[i], p = pts[(i + 1) % n]; d += ` Q${m[0].toFixed(1)},${m[1].toFixed(1)} ${((m[0] + p[0]) / 2).toFixed(1)},${((m[1] + p[1]) / 2).toFixed(1)}`; }
    return d + " Z";
  }
  function blot(id, seed = 3) {
    return `<g id="${id}"><path d="${blob(62, 58, seed)}" fill="${INK}"/>
      <circle cx="-20" cy="-72" r="15" fill="#fff"/><circle cx="20" cy="-72" r="15" fill="#fff"/>
      <circle class="${id}-pupil" cx="-24" cy="-70" r="7" fill="${INK}"/><circle class="${id}-pupil" cx="16" cy="-70" r="7" fill="${INK}"/></g>`;
  }
  function dog(id) {
    return `<g id="${id}">
      <path id="${id}-tail" d="M-85,-100 Q-115,-130 -120,-145" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" transform="rotate(0 -85 -100)"/>
      <g stroke="${INK}" stroke-width="9" stroke-linecap="round"><line x1="-50" y1="-55" x2="-55" y2="0"/><line x1="-20" y1="-50" x2="-20" y2="0"/><line x1="25" y1="-50" x2="25" y2="0"/><line x1="55" y1="-55" x2="60" y2="0"/></g>
      <ellipse cx="0" cy="-90" rx="85" ry="45" fill="#fff" stroke="${INK}" stroke-width="9"/>
      <g id="${id}-head"><circle cx="100" cy="-150" r="42" fill="#fff" stroke="${INK}" stroke-width="9"/>
        <path d="M80,-180 L68,-222 L96,-188" fill="#c98a5a" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
        <circle cx="108" cy="-160" r="7" fill="${INK}"/><circle cx="138" cy="-148" r="9" fill="${INK}"/>
        <path id="${id}-tongue" d="M120,-128 q6,22 16,0" fill="#ff7b9c" stroke="${INK}" stroke-width="5" opacity="0"/></g></g>`;
  }
  const star5 = (r = 20) => Array.from({ length: 11 }, (_, i) => { const a = (i / 10) * 6.2832 - 1.5708, k = i % 2 ? r * 0.45 : r; return [Math.cos(a) * k, Math.sin(a) * k]; });

  window.EPISODE = function (meta, body) {
    const tl = gsap.timeline({ paused: true });
    const K = Inky.kit(tl, meta.seed || 7);
    const E = { tl, K, t: 0, meta, sfxList: [], musicList: [[meta.music || "happy", 0]], mutes: [], pen: {}, chars: {} };
    Inky.paper($("lines"));
    $("pens").innerHTML = Inky.pencil("penY", "#ffd23f", "#ff9fb2") + Inky.pencil("penR", "#e63946", "#2a2a3a") + Inky.pencil("penB", "#5aa9e6", "#1d1d2b");
    let uid = 0;
    E.uid = (p = "x") => `${p}${uid++}`;
    E.$ = $;
    E.el = el;

    // ---------- time cursor ----------
    E.at = (t) => ((E.t = t), E);
    // holds are stretched a little for long-form pacing (reactions land before the next beat)
    const PACE = meta.pace || 1.4;
    E.wait = (d) => ((E.t += d * PACE), E);
    E.sfx = (name, ...a) => (E.sfxList.push([name, +E.t.toFixed(3), ...a]), E);
    E.music = (name) => (E.musicList.push([name, +E.t.toFixed(3)]), E);
    E.mute = (d) => (E.mutes.push([E.t, E.t + d]), E);
    E.to = (sel, vars, d = 0.3, off = 0) => (tl.to(sel, { duration: d, ...vars }, E.t + off), E);
    E.set = (sel, vars, off = 0) => (tl.set(sel, vars, E.t + off), E);
    E.fromTo = (sel, a, b, d = 0.3, off = 0) => (tl.fromTo(sel, a, { duration: d, immediateRender: false, ...b }, E.t + off), E);

    // ---------- placement ----------
    const place = (id, x, y, hidden) => {
      const n = $(id);
      n.setAttribute("transform", `translate(${x},${y})`);
      if (hidden) n.setAttribute("opacity", "0");
      E.chars[id] = { x, y };
      E.last = "#" + id;
      return E;
    };
    E.fig = (id, x, o = {}) => { html($(o.layer || "figs"), Inky.figure(id, o)); E.pen[id] = o.pen || "penY"; return place(id, x, o.y ?? 1250, o.hidden); };
    E.monster = (id, x, o = {}) => { html($(o.layer || "figs"), monster(id, o.color)); E.pen[id] = "penR"; return place(id, x, o.y ?? 1250, o.hidden); };
    E.blot = (id, x, o = {}) => { html($(o.layer || "figs"), blot(id, o.seed || 3)); E.pen[id] = "penR"; place(id, x, o.y ?? 1250, o.hidden); if (o.s) $(id).setAttribute("transform", `translate(${x},${o.y ?? 1250}) scale(${o.s})`); return E; };
    E.dog = (id, x, o = {}) => { html($(o.layer || "figs"), dog(id)); return place(id, x, o.y ?? 1250, o.hidden); };
    E.show = (sel, d = 0.12) => E.to(sel, { opacity: 1 }, d);
    E.hide = (sel, d = 0.12) => E.to(sel, { opacity: 0 }, d);

    // ---------- captions (one at a time; a new one trims the previous) ----------
    let lastCap = null;
    E.cap = (text, d = 1.8, o = {}) => {
      if (!o.keep && lastCap && +lastCap.dataset.start + +lastCap.dataset.duration > E.t) lastCap.dataset.duration = Math.max(0.3, E.t - +lastCap.dataset.start - 0.02).toFixed(2);
      const id = E.uid("cap");
      E.capSel = "#" + id + " span";
      const c = document.createElement("div");
      c.id = id; c.className = "clip cap";
      c.dataset.start = E.t.toFixed(2); c.dataset.duration = (o.keep ? d : d * PACE).toFixed(2); c.dataset.trackIndex = "1";
      c.innerHTML = `<span>${text}</span>`;
      $("root").insertBefore(c, $("sound"));
      if (o.keep) c.dataset.trackIndex = "2";
      K.pop("#" + id, E.t);
      if (!o.keep) lastCap = c;
      return E;
    };
    // full-frame overlays
    const overlay = (color) => el("rect", { x: -1000, y: -600, width: 3200, height: 3200, fill: color, opacity: 0 }, $("fx"));
    E.flash = () => { const r = overlay("#ffffff"); tl.fromTo(r, { opacity: 0.95 }, { opacity: 0, duration: 0.35, immediateRender: false }, E.t); E.sfx("pop", 1500, 0.35); return E; };
    let darkRect = null;
    E.dark = (on, d = 0.08) => { darkRect = darkRect || overlay("#0d0d18"); tl.to(darkRect, { opacity: on ? 0.94 : 0, duration: d }, E.t); E.sfx("blip", on ? 300 : 700, 0.3, !on); return E; };
    E.pageNo = (n) => { const tx = el("text", { x: 1440, y: 1335, "font-family": "Patrick Hand", "font-size": 44, fill: "#8d97ad", "text-anchor": "end" }, $("back")); tx.textContent = "p. " + n; return E; };

    // ---------- faces and limbs ----------
    E.face = (id, mood) => (K.face(id, mood, E.t), E);
    E.arm = (id, side, deg, d = 0.2, off = 0) => {
      const sel = `#${id}-arm${side}`;
      if ($(`${id}-arm${side}`)) tl.to(sel, { rotation: deg, transformOrigin: side === "L" ? "100% 0%" : "0% 0%", duration: d }, E.t + off);
      return E;
    };
    E.arms = (id, l, r, d = 0.2, off = 0) => (E.arm(id, "L", l, d, off), E.arm(id, "R", r, d, off));
    E.hop = (sel, h = 70, n = 1) => (K.hop(sel, E.t, h, n), E.sfx("blip", 520, 0.18), E);
    E.walk = (id, x, d = 1, o = {}) => {
      tl.to("#" + id, { x, duration: d, ease: o.ease || "none" }, E.t);
      const n = Math.max(2, Math.round(d / 0.18));
      tl.to(`#${id}-upper`, { keyframes: Array.from({ length: n }, (_, i) => ({ y: i % 2 ? 0 : -12, duration: d / n })) }, E.t);
      E.sfxList.push(["steps", +E.t.toFixed(3), n, d / n, 0.2]);
      E.chars[id] && (E.chars[id].x = x);
      return E;
    };
    E.shake = (sel = "#art", amp = 10, d = 0.3) => (tl.to(sel, { keyframes: { x: [0, amp, -amp, amp * 0.6, -amp * 0.6, 0] }, duration: d }, E.t), E);
    E.quake = (amp = 12, d = 0.3) => (tl.to("#art", { keyframes: { y: [0, amp, -amp * 0.7, amp * 0.4, 0] }, duration: d }, E.t), E);
    E.squash = (sel, d = 0.3, k = 0.82) => (tl.to(sel, { keyframes: { scaleY: [1, k, 1.06, 1] }, transformOrigin: "50% 100%", duration: d }, E.t), E);
    E.sweat = (id) => {
      const n = `#${id}-sweat`;
      tl.fromTo(n, { opacity: 0, y: 0 }, { opacity: 1, y: 30, duration: 0.5, immediateRender: false }, E.t);
      tl.to(n, { opacity: 0, duration: 0.15 }, E.t + 0.55);
      return E;
    };
    E.laugh = (id, d = 0.6) => {
      tl.to("#" + id + "-body", { keyframes: { scaleY: [1, 0.9, 1.04, 0.92, 1] }, transformOrigin: "50% 100%", duration: d }, E.t);
      if ($(id + "-mouth")) tl.to("#" + id + "-mouth", { keyframes: { scaleY: [1, 1.6, 1, 1.6, 1] }, transformOrigin: "50% 50%", duration: d }, E.t);
      E.sfx("ha", 0.35);
      return E;
    };
    E.grin = (id, on = true) => (tl.to(`#${id}-grin`, { opacity: on ? 1 : 0, duration: 0.08 }, E.t), tl.to(`#${id}-mouth`, { opacity: on ? 0 : 1, duration: 0.08 }, E.t), E);
    E.scared = (id) => (tl.to(`#${id}-eyes`, { scale: 1.25, transformOrigin: "50% 50%", duration: 0.15, ease: "back.out(3)" }, E.t), tl.to(`.${id}-pupil`, { attr: { r: 8 }, duration: 0.15 }, E.t), E);
    E.wag = (id, n = 12) => (tl.fromTo(`#${id}-tail`, { attr: { transform: "rotate(-15 -85 -100)" } }, { attr: { transform: "rotate(25 -85 -100)" }, immediateRender: false, duration: 0.12, yoyo: true, repeat: n * 2 - 1, ease: "sine.inOut" }, E.t), E);

    // ---------- drawing props ----------
    // prop: { s: [[[x,y],...], ...] strokes, f: [{ p: [[x,y],...], c: "#hex" }] fills }, local coords, (0,0) = anchor
    E.draw = (who, prop, x, y, o = {}) => {
      const P = typeof prop === "string" ? PROPS[prop] : prop;
      if (!P) throw new Error("unknown prop " + prop);
      const s = o.s || 1, fx = o.flip ? -1 : 1, rot = o.rot || 0;
      const id = o.id || E.uid("p");
      // attach: the prop lives inside a character (moves with it); x,y stay in world coords
      const host = o.attach ? ($(o.attach + "-upper") || $(o.attach)) : $(o.layer || "mid");
      const c0 = o.attach ? E.chars[o.attach] : { x: 0, y: 0 };
      const outer = el("g", { id }, host);
      const inner = el("g", { transform: `translate(${x - c0.x},${y - c0.y}) rotate(${rot}) scale(${fx * s},${s})` }, outer);
      const cos = Math.cos((rot * Math.PI) / 180), sin = Math.sin((rot * Math.PI) / 180);
      const world = (pts) => pts.map(([a, b]) => { const u = fx * s * a, v = s * b; return [x + u * cos - v * sin, y + u * sin + v * cos]; });
      const fills = (P.f || []).map((f) => el("path", { d: K.pd(f.p) + " Z", fill: f.c, opacity: 0 }, inner));
      const color = o.color || P.color || INK;
      const strokes = P.s.map(() => {
        const p = el("path", { d: "", fill: "none", stroke: color, "stroke-width": o.w || P.w || 9, "stroke-linecap": "round", "stroke-linejoin": "round" }, inner);
        p.setAttribute("vector-effect", "non-scaling-stroke");
        return p;
      });
      const pen = who ? (o.pen || E.pen[who] || "penY") : null;
      const speed = o.speed || 1600;
      let t = E.t + (pen ? 0.12 : 0);
      if (pen) { K.penOn("#" + pen, E.t); E.arm(who, "R", -40, 0.15); }
      const t0 = t;
      P.s.forEach((pts, i) => {
        const wp = world(pts), d = Math.max(0.08, K.len(wp) / speed);
        K.draw(strokes[i], pts, t, d, pen ? "#" + pen : null, wp, s);
        t += d + 0.02;
      });
      if (o.instant) { /* no-op: drawn instantly below */ }
      tl.to(fills, { opacity: 1, duration: 0.12 }, t);
      if (pen) { K.penOff("#" + pen, t); E.arm(who, "R", 0, 0.15, t - E.t); }
      E.sfxList.push(["scribble", +t0.toFixed(3), +(t - t0).toFixed(3), 0.35]);
      E.t = t + 0.08;
      E.last = "#" + id;
      return E;
    };
    // a prop that is simply there (or pops in) without being drawn
    E.prop = (prop, x, y, o = {}) => {
      const P = typeof prop === "string" ? PROPS[prop] : prop;
      const s = o.s || 1, fx = o.flip ? -1 : 1, rot = o.rot || 0;
      const id = o.id || E.uid("p");
      const host = o.attach ? ($(o.attach + "-upper") || $(o.attach)) : $(o.layer || "mid");
      const c0 = o.attach ? E.chars[o.attach] : { x: 0, y: 0 };
      const outer = el("g", { id }, host);
      if (o.hidden) outer.setAttribute("opacity", "0");
      const inner = el("g", { transform: `translate(${x - c0.x},${y - c0.y}) rotate(${rot}) scale(${fx * s},${s})` }, outer);
      (P.f || []).forEach((f) => el("path", { d: K.pd(f.p) + " Z", fill: f.c }, inner));
      P.s.forEach((pts) => { const p = el("path", { d: K.pd(pts), fill: "none", stroke: o.color || P.color || INK, "stroke-width": o.w || P.w || 9, "stroke-linecap": "round", "stroke-linejoin": "round" }, inner); p.setAttribute("vector-effect", "non-scaling-stroke"); });
      E.last = "#" + id;
      return E;
    };
    E.popIn = (sel, d = 0.3) => (tl.fromTo(sel, { opacity: 0, scale: 0.2, transformOrigin: "50% 100%" }, { opacity: 1, scale: 1, transformOrigin: "50% 100%", duration: d, ease: "back.out(2.5)", immediateRender: false }, E.t), E.sfx("pop", 800, 0.3), E);

    // ---------- effects ----------
    const fx = () => $("fx");
    E.puff = (x, y, s = 1) => {
      const g = el("g", { fill: "none", stroke: INK, "stroke-width": 6, opacity: 0, transform: `translate(${x},${y})` }, fx());
      [[0, 0, 26], [32, -20, 20], [-30, -16, 18], [10, -38, 16]].forEach(([a, b, r]) => el("circle", { cx: a * s, cy: b * s, r: r * s }, g));
      tl.fromTo(g, { opacity: 1, scale: 0.4, transformOrigin: "50% 50%" }, { opacity: 0, scale: 1.5, transformOrigin: "50% 50%", duration: 0.45, immediateRender: false }, E.t);
      E.sfx("whoosh", 0.25, 0.3);
      return E;
    };
    E.hearts = (x, y, n = 2) => {
      for (let i = 0; i < n; i++) {
        const h = el("path", { d: "M0,-10 C-10,-30 -40,-20 -30,5 L0,30 L30,5 C40,-20 10,-30 0,-10 Z", fill: "#e63946", stroke: INK, "stroke-width": 5, opacity: 0, transform: `translate(${x + (i - (n - 1) / 2) * 80},${y})` }, fx());
        tl.fromTo(h, { opacity: 0, scale: 0.3, y: 0 }, { opacity: 1, scale: 1, y: -70, duration: 0.5, ease: "back.out(2)", immediateRender: false }, E.t + i * 0.15);
        tl.to(h, { opacity: 0, duration: 0.25 }, E.t + 1.1 + i * 0.15);
      }
      E.sfx("pop", 1100, 0.25);
      return E;
    };
    E.stars = (x, y, d = 1.2) => {
      const g = el("g", { transform: `translate(${x},${y})`, opacity: 0 }, fx());
      const spin = el("g", {}, g);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.2832; el("path", { d: K.pd(star5(16).map(([u, v]) => [u + Math.cos(a) * 60, v + Math.sin(a) * 22])) + " Z", fill: "#ffe45c", stroke: INK, "stroke-width": 4 }, spin); }
      tl.to(g, { opacity: 1, duration: 0.1 }, E.t);
      tl.fromTo(spin, { attr: { transform: "translate(0,0)" } }, { keyframes: Array.from({ length: 8 }, (_, i) => ({ attr: { transform: `translate(${(i % 2 ? -1 : 1) * 14},0)` }, duration: d / 8 })) }, E.t);
      tl.to(g, { opacity: 0, duration: 0.2 }, E.t + d);
      E.sfx("ding", 0.2);
      return E;
    };
    E.zzz = (x, y, d = 1.5) => {
      ["z", "Z", "Z"].forEach((ch, i) => {
        const tx = el("text", { x: x + i * 30, y: y - i * 40, "font-family": "Patrick Hand", "font-size": 50 + i * 14, fill: INK, opacity: 0 }, fx());
        tx.textContent = ch;
        tl.fromTo(tx, { opacity: 0, y: 20 }, { opacity: 1, y: -20, duration: 0.5, immediateRender: false }, E.t + i * 0.3);
        tl.to(tx, { opacity: 0, duration: 0.3 }, E.t + d);
      });
      return E;
    };
    E.text = (str, x, y, o = {}) => {
      const tx = el("text", { x, y, "font-family": "Patrick Hand", "font-size": o.size || 60, fill: o.color || INK, "text-anchor": "middle", opacity: 0 }, fx());
      tx.textContent = str;
      tl.to(tx, { opacity: 1, duration: 0.1 }, E.t);
      if (o.d) tl.to(tx, { opacity: 0, duration: 0.2 }, E.t + o.d);
      return tx;
    };
    // the eraser flies over a target and it vanishes in crumbs
    E.erase = (sel, x, y, o = {}) => {
      const g = html(fx(), Inky.eraser(E.uid("er")));
      const w = o.w || 120, from = o.from || [x - 300, y - 300];
      tl.set(g, { x: from[0], y: from[1], opacity: 1 }, E.t);
      tl.to(g, { x: x - w, y, rotation: 12, duration: 0.25, ease: "power2.in" }, E.t);
      tl.to(g, { keyframes: [0, 1, 2, 3, 4, 5].map((i) => ({ x: x + (i % 2 ? -w : w), rotation: i % 2 ? 12 : -12, duration: 0.1 })) }, E.t + 0.25);
      tl.to(sel, { opacity: 0, duration: 0.5 }, E.t + 0.3);
      tl.to(g, { opacity: 0, y: y - 200, duration: 0.25 }, E.t + 0.9);
      for (let i = 0; i < 8; i++) {
        const c = el("ellipse", { cx: x + (K.rnd() - 0.5) * w * 2, cy: y, rx: 7, ry: 5, fill: "#c98a96", opacity: 0 }, fx());
        tl.set(c, { opacity: 1 }, E.t + 0.3 + i * 0.06);
        tl.to(c, { attr: { cy: 1246 }, duration: 0.4, ease: "power2.in" }, E.t + 0.3 + i * 0.06);
        tl.to(c, { opacity: 0, duration: 0.3 }, E.t + 1.4);
      }
      E.sfxList.push(["rub", +(E.t + 0.25).toFixed(3), 0.65, 0.45]);
      E.t += 1.0;
      return E;
    };
    // a ball/object thrown along an arc
    E.arc = (sel, x0, y0, x1, y1, h = 200, d = 0.6) => {
      tl.set(sel, { x: x0, y: y0, opacity: 1 }, E.t);
      tl.to(sel, { x: x1, duration: d, ease: "none" }, E.t);
      tl.to(sel, { keyframes: [{ y: Math.min(y0, y1) - h, duration: d / 2, ease: "power2.out" }, { y: y1, duration: d / 2, ease: "power2.in" }] }, E.t);
      return E;
    };

    E.end = (hold = 1.0) => {
      const dur = +(E.t + hold).toFixed(2);
      if (lastCap && +lastCap.dataset.start + +lastCap.dataset.duration > dur) lastCap.dataset.duration = (dur - +lastCap.dataset.start).toFixed(2);
      K.boil(dur);
      tl.set({}, {}, dur);
      window.EPMETA = { title: meta.title, dur, sfx: E.sfxList, music: E.musicList, mutes: E.mutes };
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
      tl.seek(0);
    };

    body(E);
    if (!window.EPMETA) E.end();
  };
})();
