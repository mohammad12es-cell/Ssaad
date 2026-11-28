      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}<g id="lids" opacity="0">${lidsSVG(0.5)}</g></g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, false)}</g>`;
      tl.set("#pip", { x: 370, y: 1440, rotation: -8 }, 0); tl.set("#peb", { x: 735, y: 1480 }, 0); tl.set("#clock", { x: 605, y: 1360 }, 0);
      tl.set("#phoneGlow", { x: 300, y: 1330 }, 0); tl.set("#phone", { x: 300, y: 1330, rotation: -8 }, 0); tl.set("#glint", { x: 800, y: 1350 }, 0);
      tl.set("#checklist", { x: 760, y: 1280 }, 0);
      // Pebble already asleep, calm breathing
      tl.to("#pebIn", { y: -6, duration: 1.1, yoyo: true, repeat: -1, ease: "sine.inOut" }, 0);
      // Pip doomscrolling, phone glow flicker
      tl.to("#phoneGlow", { opacity: 0.6, duration: 0.4, yoyo: true, repeat: 5 }, 0.2);
      tl.to("#pipIn", { y: -4, duration: 0.15, yoyo: true, repeat: 7 }, 0.2);
      tl.set("#time", { textContent: "11:58 PM 😬" }, 0);
      // countdown of sleep hours, each tick Pip panics a bit more
      const tick = (t, label, shake) => {
        tl.set("#time", { textContent: label }, t);
        tl.to("#pipIn", { rotation: shake ? 10 : -4, transformOrigin: "50% 100%", duration: 0.08, yoyo: true, repeat: 3 }, t);
      };
      tick(2.0, "7 hrs left 😅", false);
      tick(4.0, "6 hrs left 😰", false);
      tick(6.0, "5 hrs left 😱", true);
      // Pebble's checklist pops up, calm
      tl.fromTo("#checklist", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.3, ease: "back.out(2.2)" }, 7.4);
      tl.fromTo("#glint", { opacity: 0, scale: 0.2, rotation: 0, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, rotation: 90, transformOrigin: "50% 50%", duration: 0.25, yoyo: true, repeat: 1 }, 7.6);
      tl.to("#checklist", { opacity: 0, duration: 0.3 }, 9.6);
      // 2 AM, Pip still scrolling, eyes drooping
      tick(10.2, "2:00 AM 💀", true);
      tl.set("#lids", { opacity: 1 }, 10.4);
      tl.to("#phone", { rotation: 25, y: "+=20", duration: 0.5 }, 11.4);
      tl.to("#phoneGlow", { opacity: 0, duration: 0.5 }, 11.4);
      tl.fromTo("#zzz", { opacity: 0, y: 0 }, { opacity: 1, y: -40, duration: 1.4 }, 11.6);
      // Monday alarm slams in
      tl.set("#time", { textContent: "MONDAY 😵" }, 13.0);
      tl.to("#pipIn", { scale: 1.12, transformOrigin: "50% 100%", duration: 0.12, yoyo: true, repeat: 1 }, 13.0);
