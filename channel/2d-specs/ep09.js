      const cone = (id, s) => `<g id="${id}" transform="scale(${s})"><path d="M-22,0 L22,0 L0,70 Z" fill="#e0a85a"/><path d="M-22,0 L0,70 M-8,0 L10,50 M8,0 L-10,50" stroke="#c4893f" stroke-width="3"/>
        <circle class="scoop" cx="0" cy="-14" r="24" fill="#ff8fb1"/><circle class="scoop" cx="0" cy="-48" r="22" fill="#fff3e6"/><circle class="scoop" cx="0" cy="-80" r="20" fill="#9be36f"/></g>`;
      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}<ellipse id="blue" cx="0" cy="-90" rx="82" ry="72" fill="#6ec6ff" opacity="0"/><g id="lids" opacity="0">${lidsSVG(0.5)}</g><g transform="translate(105,-110)">${cone("pcone", 1.1)}</g></g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, true)}<g transform="translate(110,-30)">${cone("bcone", 0.55)}</g></g>`;
      for (let i = 0; i < 6; i++) mk("path", { d: star(-80 + (i % 3) * 80, -240 - (i % 2) * 40, 14) }, $("ice"));
      const drops = []; for (let i = 0; i < 3; i++) drops.push(mk("path", { d: "M0,0 C-8,12 -8,22 0,22 C8,22 8,12 0,0 Z", fill: "#7fd6ff", opacity: 0 }, $("sweat")));
      tl.set("#pip", { x: 360, y: 1450 }, 0); tl.set("#peb", { x: 690, y: 1480 }, 0); tl.set(["#pcone", "#bcone"], { scale: 0, transformOrigin: "50% 100%" }, 0);
      // heat
      tl.to("#sun", { scale: 1.12, transformOrigin: "50% 50%", duration: 0.4, yoyo: true, repeat: 3 }, 0);
      tl.to("#heat", { y: -20, duration: 0.5, yoyo: true, repeat: 3 }, 0);
      drops.forEach((d, i) => { tl.set(d, { x: 300 + i * 40, y: 1300 }, 0.2 + i * 0.3); tl.fromTo(d, { opacity: 1, y: 1300 }, { opacity: 0, y: 1400, duration: 0.6, immediateRender: false }, 0.2 + i * 0.3); });
      tl.to("#pipIn", { scaleY: 0.92, transformOrigin: "50% 100%", duration: 0.4, yoyo: true, repeat: 1 }, 0.3);
      // cones
      tl.to("#pcone", { scale: 1.1, duration: 0.3, ease: "back.out(2.5)" }, 1.7);
      tl.to("#bcone", { scale: 0.55, duration: 0.3, ease: "back.out(2.5)" }, 1.9);
      tl.to("#pipIn", { y: -40, duration: 0.15, yoyo: true, repeat: 3 }, 2.0);
      // one bite
      tl.to("#pcone", { x: -95, y: 20, scale: 0.2, duration: 0.35, ease: "power3.in" }, 3.3);
      tl.to("#pcone", { opacity: 0, duration: 0.05 }, 3.65);
      tl.to("#pipIn", { scaleX: 1.2, scaleY: 1.1, transformOrigin: "50% 100%", duration: 0.12, yoyo: true, repeat: 1 }, 3.65);
      // brain freeze
      tl.to("#blue", { opacity: 0.6, duration: 0.3 }, 4.4); tl.set("#lids", { opacity: 1 }, 4.4);
      tl.to("#pipIn", { x: 6, duration: 0.04, yoyo: true, repeat: 49 }, 4.4);
      tl.set("#ice", { x: 360, y: 1450 }, 4.4); tl.to("#ice", { opacity: 1, duration: 0.2 }, 4.5);
      tl.fromTo("#ice", { rotation: 0, transformOrigin: "50% 50%" }, { rotation: 30, transformOrigin: "50% 50%", duration: 0.3, yoyo: true, repeat: 7, immediateRender: false }, 4.5);
      tl.to("#ice", { opacity: 0, duration: 0.3 }, 7.0);
      // Pebble slow licks
      tl.to("#pebIn", { rotation: -6, transformOrigin: "50% 100%", duration: 0.5, yoyo: true, repeat: 3, ease: "sine.inOut" }, 7.2);
      tl.to("#bcone .scoop:last-child", { scale: 0.7, transformOrigin: "50% 50%", duration: 2.0 }, 7.2);
      // Pip lunges, Pebble shells up with the cone
      tl.to("#blue", { opacity: 0, duration: 0.3 }, 9.4); tl.set("#lids", { opacity: 0 }, 9.4);
      tl.to("#pip", { keyframes: [{ x: 500, y: 1330, duration: 0.3, ease: "power2.out" }, { x: 600, y: 1470, duration: 0.3, ease: "power2.in" }] }, 9.8);
      tl.to("#pebIn", { scaleY: 0.6, transformOrigin: "50% 100%", duration: 0.12 }, 9.9); tl.to("#bcone", { scale: 0, duration: 0.12 }, 9.9);
      tl.to("#pipIn", { rotation: 80, transformOrigin: "50% 100%", duration: 0.2 }, 10.3);
      // Pebble pops back out licking, Pip sweaty again (loop)
      tl.to("#pebIn", { scaleY: 1, duration: 0.25, ease: "back.out(3)" }, 11.4); tl.to("#bcone", { scale: 0.55, duration: 0.25, ease: "back.out(3)" }, 11.4);
      tl.to("#pipIn", { rotation: 0, duration: 0.3 }, 12.0);
      tl.to("#pip", { x: 360, y: 1450, duration: 0.8 }, 12.3);
      tl.to("#pipIn", { scaleY: 0.85, transformOrigin: "50% 100%", duration: 0.4 }, 13.1);
      tl.to("#sun", { scale: 1.15, transformOrigin: "50% 50%", duration: 0.3, yoyo: true, repeat: 1 }, 13.2);
