      const scr = (id, bg, lines) => `<g id="${id}" opacity="0"><rect x="-26" y="-46" width="52" height="92" rx="6" fill="${bg}"/>${lines}</g>`;
      const phone = `<g id="phone" transform="translate(95,-150)"><rect x="-32" y="-54" width="64" height="108" rx="12" fill="#22213a"/>
        ${scr("sc0", "#ffd9a8", '<polygon points="-10,-14 14,0 -10,14" fill="#2b2a6e"/><text x="0" y="36" text-anchor="middle" font-size="20">😺</text>')}
        ${scr("sc1", "#ff5a5f", '<text x="0" y="12" text-anchor="middle" font-size="34">❌</text>')}
        ${scr("sc2", "#ffd166", '<rect x="-14" y="10" width="8" height="12" fill="#2b2a6e"/><rect x="-3" y="2" width="8" height="20" fill="#2b2a6e" opacity=".25"/><rect x="8" y="-8" width="8" height="30" fill="#2b2a6e" opacity=".25"/>')}
        ${scr("sc3", "#5fcf6a", '<text x="0" y="12" text-anchor="middle" font-size="34">✅</text>')}
        ${scr("sc4", "#2b2a3e", '<rect x="-16" y="-8" width="30" height="16" rx="3" fill="none" stroke="#fff" stroke-width="3"/><rect x="-14" y="-6" width="3" height="12" fill="#ff5a5f"/><text x="0" y="34" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="16" fill="#fff">1%</text>')}
        ${scr("sc5", "#000", "")}</g>`;
      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}${phone}</g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, true)}</g>`;
      for (let i = 0; i < 3; i++) mk("path", { d: star(-40 + i * 40, -20 * (i % 2), 18) }, $("stars"));
      const screen = (n, t) => { for (let i = 0; i < 6; i++) tl.set("#sc" + i, { opacity: i === n ? 1 : 0 }, t); };
      tl.set("#pip", { x: 440, y: 1450 }, 0); tl.set("#peb", { x: 255, y: 1480, rotation: -8 }, 0); screen(0, 0);
      tl.to("#pipIn", { y: -10, duration: 0.35, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0);
      // No Wi-Fi
      screen(1, 1.4);
      tl.fromTo("#bangP", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.2, ease: "back.out(3)" }, 1.5);
      tl.to("#bangP", { opacity: 0, duration: 0.2 }, 2.6);
      tl.to("#pipIn", { x: 10, duration: 0.05, yoyo: true, repeat: 11 }, 1.5);
      // panic: phone up, hop around
      tl.to("#phone", { x: 0, y: -280, duration: 0.25 }, 3.0);
      tl.to("#pip", { keyframes: [{ x: 400, duration: 0.4 }, { x: 520, duration: 0.5 }, { x: 440, duration: 0.5 }] }, 3.0);
      tl.to("#pipIn", { y: -60, duration: 0.12, yoyo: true, repeat: 11, ease: "power1.out" }, 3.0);
      // climb the mushroom
      tl.to("#pip", { keyframes: [{ x: 560, y: 1300, duration: 0.45, ease: "power2.out" }, { x: 600, y: 1320, duration: 0.2 }, { x: 700, y: 1192, duration: 0.45, ease: "power2.out" }] }, 4.6);
      screen(2, 5.6);
      tl.to("#pipIn", { rotation: 10, transformOrigin: "50% 100%", duration: 0.25, yoyo: true, repeat: 5, ease: "sine.inOut" }, 5.7);
      // slip and BONK
      tl.to("#pip", { keyframes: [{ x: 640, y: 1150, duration: 0.2, ease: "power2.out" }, { x: 560, y: 1460, duration: 0.45, ease: "power2.in" }] }, 7.2);
      tl.to("#pipIn", { rotation: -100, transformOrigin: "50% 50%", duration: 0.6 }, 7.2);
      tl.to("#pipIn", { rotation: -90, duration: 0.1 }, 7.85);
      tl.set("#stars", { x: 560, y: 1330 }, 7.9);
      tl.to("#stars", { opacity: 1, duration: 0.1 }, 7.9);
      tl.fromTo("#stars", { rotation: 0, transformOrigin: "50% 50%" }, { rotation: 720, transformOrigin: "50% 50%", duration: 3.0, ease: "none" }, 7.9);
      tl.to("#stars", { opacity: 0, duration: 0.2 }, 10.9);
      // Pebble touching grass
      tl.to("#cup", { y: -6, duration: 0.3, yoyo: true, repeat: 3 }, 8.7);
      tl.set("#glint", { x: 340, y: 1360 }, 9.2);
      tl.fromTo("#glint", { opacity: 0, scale: 0.2, rotation: 0, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, rotation: 90, transformOrigin: "50% 50%", duration: 0.25, yoyo: true, repeat: 1 }, 9.2);
      // Connected... 1%... dead
      tl.to("#pipIn", { rotation: 0, duration: 0.3, ease: "back.out(2)" }, 10.9);
      screen(3, 11.0);
      tl.to("#pipIn", { y: -70, duration: 0.15, yoyo: true, repeat: 3, ease: "power1.out" }, 11.1);
      screen(4, 12.3); screen(5, 12.9);
      tl.to("#pipIn", { scaleY: 0.78, scaleX: 1.1, transformOrigin: "50% 100%", duration: 0.5 }, 13.0);
