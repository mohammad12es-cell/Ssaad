      const hat = (c) => `<g transform="translate(0,-205)"><path d="M-28,0 L0,-62 L28,0 Z" fill="${c}"/><circle cx="0" cy="-64" r="9" fill="#ffd166"/><path d="M-20,-14 L20,-14" stroke="#fff" stroke-width="5"/></g>`;
      const cream = `<g id="cream" opacity="0"><circle cx="-50" cy="-120" r="20" fill="#fff"/><circle cx="35" cy="-150" r="16" fill="#ff8fb1"/><circle cx="10" cy="-70" r="24" fill="#fff"/><circle cx="-30" cy="-180" r="14" fill="#fff"/><circle cx="55" cy="-95" r="18" fill="#fff3e6"/><circle cx="-60" cy="-60" r="13" fill="#ff8fb1"/></g>`;
      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}<ellipse id="red" cx="0" cy="-90" rx="80" ry="70" fill="#ff3b3b" opacity="0"/>${cream}${hat("#6a7bff")}</g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, false)}<g transform="translate(80,85) scale(0.8)">${hat("#ff5a5f")}</g></g>`;
      const fcol = ["#ff5a5f", "#ffd166", "#6a7bff", "#5fcf6a", "#ff8fb1"];
      for (let i = 0; i < 9; i++) mk("path", { d: `M${180 + i * 90},${1160 + (i % 2) * 18} l20,0 l-10,30 z`, fill: fcol[i % 5] }, $("flags"));
      const confs = []; for (let i = 0; i < 16; i++) confs.push(mk("rect", { x: 540, y: 1200, width: 12, height: 8, fill: fcol[i % 5], opacity: 0 }, $("conf")));
      const splats = []; for (let i = 0; i < 10; i++) splats.push(mk("circle", { cx: 540, cy: 1360, r: 14 + (i % 3) * 6, fill: i % 2 ? "#ff8fb1" : "#fff", opacity: 0 }, $("splat")));
      tl.set("#pip", { x: 320, y: 1450 }, 0); tl.set("#peb", { x: 850, y: 1480, scaleX: -1 }, 0);
      // party start
      tl.set(confs, { opacity: 1 }, 0.2);
      tl.fromTo(confs, { x: 0, y: 0, rotation: 0 }, { x: (i) => ((i * 53) % 600) - 300, y: (i) => 150 + ((i * 37) % 200), rotation: (i) => i * 70, duration: 1.4, ease: "power1.in", immediateRender: false }, 0.2);
      tl.to(confs, { opacity: 0, duration: 0.2 }, 1.5);
      const blow = (t, s = 1) => {
        tl.fromTo("#wind", { opacity: 0, x: -20 }, { opacity: 1, x: 40 * s, duration: 0.3, immediateRender: false }, t);
        tl.to("#wind", { opacity: 0, duration: 0.15 }, t + 0.3);
        tl.to("#flame", { scale: 0, transformOrigin: "50% 100%", duration: 0.1 }, t + 0.1);
        puff("smoke", 540, 1250, t + 0.15, "#d9d9d9", 4, 30);
      };
      const relight = (t) => tl.to("#flame", { scale: 1, transformOrigin: "50% 100%", duration: 0.15, ease: "back.out(3)" }, t);
      // wish + first blow
      tl.to("#pipIn", { scaleX: 1.12, scaleY: 1.08, transformOrigin: "50% 100%", duration: 1.2 }, 1.7);
      tl.to("#pipIn", { scaleX: 1, scaleY: 1, duration: 0.2 }, 3.0); blow(3.0);
      relight(3.6);
      // harder x2
      [4.9, 6.0].forEach((t, i) => { tl.to("#pipIn", { scaleX: 1.2, scaleY: 1.12, transformOrigin: "50% 100%", duration: 0.3 }, t - 0.3); tl.to("#pipIn", { scaleX: 1, scaleY: 1, duration: 0.15 }, t); blow(t, 1.5); relight(t + 0.45); });
      tl.to("#red", { opacity: 0.35, duration: 0.6 }, 4.8);
      // MAXIMUM POWER
      tl.to("#pipIn", { scaleX: 1.4, scaleY: 1.3, transformOrigin: "50% 100%", duration: 1.3, ease: "power1.in" }, 7.2);
      tl.to("#red", { opacity: 0.6, duration: 1.3 }, 7.2);
      tl.to("#pipIn", { scaleX: 1, scaleY: 1, duration: 0.15 }, 8.6); blow(8.6, 2.5);
      tl.set("#cake", { opacity: 0 }, 8.7);
      tl.set(splats, { opacity: 1 }, 8.7);
      tl.fromTo(splats, { x: 0, y: 0 }, { x: (i) => -220 + (i % 5) * 18 + (i > 6 ? 300 : 0), y: (i) => -60 + (i % 4) * 20, duration: 0.25, ease: "power2.out", immediateRender: false }, 8.7);
      tl.to(splats, { opacity: 0, duration: 0.1 }, 8.95);
      tl.set("#cream", { opacity: 1 }, 8.95);
      tl.to("#red", { opacity: 0, duration: 0.3 }, 8.9);
      relight(9.0);
      // Pebble achoo
      tl.to("#pebIn", { scaleY: 0.8, transformOrigin: "50% 100%", duration: 0.15, yoyo: true, repeat: 1 }, 11.2);
      tl.to("#flame", { scale: 0, transformOrigin: "50% 100%", duration: 0.1 }, 11.3); puff("smoke", 540, 1250, 11.35, "#d9d9d9", 4, 30);
      tl.to("#pipIn", { x: 8, duration: 0.05, yoyo: true, repeat: 7 }, 11.6);
      // party again
      tl.set(confs, { opacity: 1 }, 12.7);
      tl.fromTo(confs, { x: 0, y: 0, rotation: 0 }, { x: (i) => ((i * 53) % 600) - 300, y: (i) => 150 + ((i * 37) % 200), rotation: (i) => i * 70, duration: 1.2, ease: "power1.in", immediateRender: false }, 12.7);
