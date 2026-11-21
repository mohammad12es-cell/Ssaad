      const phone = (id, txtId, col) => `<g id="${id}"><rect x="-26" y="-44" width="52" height="88" rx="10" fill="#22213a"/><rect id="${id}S" x="-20" y="-36" width="40" height="72" rx="6" fill="${col}"/><text id="${txtId}" x="0" y="8" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="18" fill="#fff"></text></g>`;
      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}<g transform="translate(95,-160)">${phone("pp", "ppT", "#ff5a5f")}</g><g id="tongue" opacity="0"><rect x="0" y="-8" width="200" height="16" rx="8" fill="#ff6f91"/><circle cx="200" cy="0" r="12" fill="#ff6f91"/></g></g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, true)}<g transform="translate(-30,-40) scale(0.8)">${phone("bp", "bpT", "#5fcf6a")}</g></g>`;
      tl.set("#pip", { x: 360, y: 1410, rotation: -10 }, 0); tl.set("#peb", { x: 805, y: 1480 }, 0);
      tl.set("#ppT", { textContent: "1%" }, 0); tl.set("#bpT", { textContent: "100%" }, 0); tl.set("#tongue", { x: 30, y: -80, rotation: 15, transformOrigin: "0% 50%" }, 0);
      tl.to("#ppS", { opacity: 0.5, duration: 0.3, yoyo: true, repeat: 3 }, 0);
      // stretch
      tl.to("#pip", { rotation: 0, duration: 0.3 }, 1.5);
      tl.to("#pipIn", { scaleX: 1.6, transformOrigin: "0% 100%", duration: 0.8, ease: "power2.out" }, 1.7);
      tl.to("#pipIn", { scaleX: 1.5, duration: 0.15, yoyo: true, repeat: 5 }, 2.5);
      tl.to("#pipIn", { scaleX: 1, duration: 0.3, ease: "back.out(2)" }, 3.3);
      // tongue
      tl.set("#tongue", { opacity: 1, scaleX: 0 }, 3.6);
      tl.to("#tongue", { scaleX: 1, duration: 0.3, ease: "power3.out" }, 3.6);
      tl.to("#tongue", { scaleX: 0.95, duration: 0.1, yoyo: true, repeat: 5 }, 3.9);
      tl.to("#tongue", { scaleX: 0, duration: 0.2 }, 5.1); tl.set("#tongue", { opacity: 0 }, 5.3);
      // roll off bed, crawl
      tl.to("#pip", { keyframes: [{ x: 480, y: 1350, rotation: 60, duration: 0.3 }, { x: 520, y: 1480, rotation: 90, duration: 0.3, ease: "power2.in" }] }, 5.5);
      tl.to("#pip", { x: 530, duration: 1.2, ease: "none" }, 6.2);
      tl.to("#pipIn", { scaleX: 1.1, transformOrigin: "50% 100%", duration: 0.15, yoyo: true, repeat: 7 }, 6.2);
      // plugged in... dies
      tl.to("#pip", { rotation: 0, y: 1470, duration: 0.3 }, 7.5);
      tl.to("#plugEnd", { x: 60, y: -40, duration: 0.2 }, 7.6);
      tl.set("#ppT", { textContent: "⚡1%" }, 7.8); tl.set("#ppS", { opacity: 1 }, 7.8);
      tl.set("#ppT", { textContent: "0%" }, 8.6); tl.to("#ppS", { attr: { fill: "#000" }, duration: 0.2 }, 8.8); tl.set("#ppT", { textContent: "" }, 8.9);
      // the reveal
      tl.to("#arrow", { opacity: 1, duration: 0.2 }, 9.2); tl.to("#arrow", { y: 15, duration: 0.25, yoyo: true, repeat: 5 }, 9.2); tl.to("#arrow", { opacity: 0, duration: 0.2 }, 11.0);
      tl.to("#pipIn", { scaleY: 0.8, transformOrigin: "50% 100%", duration: 0.5 }, 10.0);
      // Pebble 100%
      tl.set("#glint", { x: 790, y: 1400 }, 11.6);
      tl.fromTo("#glint", { opacity: 0, scale: 0.2, rotation: 0, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, rotation: 90, transformOrigin: "50% 50%", duration: 0.25, yoyo: true, repeat: 1 }, 11.6);
      tl.to("#pebIn", { rotation: -6, transformOrigin: "50% 100%", duration: 0.3, yoyo: true, repeat: 3 }, 11.8);
      tl.to("#pipIn", { rotation: -80, transformOrigin: "50% 100%", duration: 0.5, ease: "bounce.out" }, 12.8);
