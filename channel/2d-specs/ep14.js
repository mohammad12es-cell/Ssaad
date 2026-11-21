      const beard = `<g id="beard" transform="translate(78,-72)"><path d="M-20,0 C-30,40 -10,90 10,110 C25,90 40,50 25,0 Z" fill="#fff"/><path d="M-10,20 q10,10 0,20 M10,30 q10,10 0,20" stroke="#ddd" stroke-width="3" fill="none"/></g>`;
      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}<g id="lids" opacity="0">${lidsSVG(0.5)}</g></g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, false)}${beard}<g id="broom" transform="translate(150,-20)"><rect x="-4" y="-90" width="8" height="100" fill="#a0673e"/><path d="M-20,10 L20,10 L26,40 L-26,40 Z" fill="#ffd166"/></g></g>`;
      for (let i = 0; i < 8; i++) mk("rect", { class: "page", x: 760, y: 1100, width: 40, height: 34, rx: 4, fill: "#fff", stroke: "#2b2a6e", "stroke-width": 3, opacity: 0 }, $("pages"));
      tl.set("#pip", { x: 350, y: 1400, rotation: -12 }, 0); tl.set("#peb", { x: 770, y: 1490 }, 0);
      tl.set("#beard", { scale: 0, transformOrigin: "50% 0%" }, 0); tl.set("#stem", { scaleY: 0.08, transformOrigin: "50% 100%" }, 0);
      // "just 5 minutes"
      tl.to("#pipIn", { y: -10, duration: 0.3, yoyo: true, repeat: 3 }, 0.2);
      tl.set("#lids", { opacity: 1 }, 1.4);
      tl.to("#zzz", { opacity: 1, duration: 0.2 }, 1.6);
      tl.to("#zzz", { y: -30, duration: 0.6, yoyo: true, repeat: 12, ease: "sine.inOut" }, 1.6);
      tl.to("#zzz", { opacity: 0, duration: 0.2 }, 9.4);
      // time-lapse: window day/night, clock, pages
      const times = ["6:05", "9:00", "2:00", "7:00", "11:00", "4:00", "8:00", "1:00", "6:00", "10:00", "3:00", "9:00", "5:55"];
      times.forEach((tx, i) => tl.set("#time", { textContent: tx }, 1.8 + i * 0.6));
      for (let c = 0; c < 3; c++) {
        const t0 = 1.8 + c * 2.6;
        tl.to("#winSky", { attr: { fill: "#1b1f52" }, duration: 0.6 }, t0 + 0.6); tl.to("#winSun", { opacity: 0, duration: 0.3 }, t0 + 0.6); tl.to("#winMoon", { opacity: 1, duration: 0.3 }, t0 + 0.9);
        tl.to("#winSky", { attr: { fill: "#9fd8ff" }, duration: 0.6 }, t0 + 1.9); tl.to("#winSun", { opacity: 1, duration: 0.3 }, t0 + 2.0); tl.to("#winMoon", { opacity: 0, duration: 0.3 }, t0 + 1.9);
      }
      document.querySelectorAll(".page").forEach((p, i) => { tl.set(p, { opacity: 1 }, 4.9 + i * 0.5); tl.to(p, { x: 120 - i * 15, y: -260 + (i % 3) * 40, rotation: 180 + i * 40, opacity: 0, duration: 0.8 }, 4.9 + i * 0.5); });
      // Pebble: sweeps, waters, grows a beard
      tl.to("#peb", { keyframes: [{ x: 600, duration: 0.8 }, { x: 800, duration: 0.8 }, { x: 680, duration: 0.6 }] }, 1.8);
      tl.to("#broom", { rotation: 25, transformOrigin: "50% 100%", duration: 0.2, yoyo: true, repeat: 9 }, 1.8);
      tl.to("#broom", { opacity: 0, duration: 0.2 }, 4.0);
      tl.to("#stem", { scaleY: 1, duration: 3.2, ease: "power1.inOut" }, 4.2);
      tl.to("#peb", { x: 735, duration: 0.6 }, 6.8);
      tl.to("#beard", { scale: 1.3, duration: 2.4, ease: "power1.in" }, 7.0);
      // wakes up, stretches
      tl.set("#lids", { opacity: 0 }, 9.6);
      tl.to("#pip", { rotation: 0, y: 1440, duration: 0.4 }, 9.6);
      tl.to("#pipIn", { scaleY: 1.25, scaleX: 0.9, transformOrigin: "50% 100%", duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, 10.0);
      // sees the beard & sunflower
      tl.fromTo("#bangP", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.2, ease: "back.out(3)" }, 12.0);
      tl.to("#pipIn", { scaleY: 1.12, duration: 0.1, yoyo: true, repeat: 3 }, 12.0);
      tl.to("#pebIn", { rotation: -6, transformOrigin: "50% 100%", duration: 0.3, yoyo: true, repeat: 3 }, 12.3);
