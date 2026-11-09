      const blanket = `<g id="blanket"><path d="M-120,-80 Q0,-110 120,-80 L130,10 L-130,10 Z" fill="#6a7bff"/><path d="M-120,-80 Q0,-110 120,-80" stroke="#fff" stroke-width="6" fill="none"/></g>`;
      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}<g id="lids">${lidsSVG(0.5)}</g>${blanket}</g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, true)}<g id="mug" transform="translate(115,-40)"><rect x="-16" y="-20" width="32" height="38" rx="6" fill="#fff"/><path d="M16,-12 q14,6 0,18" stroke="#fff" stroke-width="6" fill="none"/><path d="M-6,-28 q6,-10 0,-20 M6,-28 q6,-10 0,-20" stroke="#ccc" stroke-width="3" fill="none"/></g></g>`;
      tl.set("#pip", { x: 370, y: 1440 }, 0); tl.set("#peb", { x: 735, y: 1480 }, 0); tl.set("#clock", { x: 605, y: 1360 }, 0); tl.set("#ring", { x: 605, y: 1360 }, 0); tl.set("#lids", { opacity: 1 }, 0);
      tl.fromTo("#zzz", { y: 0, opacity: 1 }, { y: -50, opacity: 0, duration: 1.2 }, 0);
      const ring = (t, d, big = false) => { tl.set("#ring", { opacity: 1 }, t); tl.to("#clock", { rotation: big ? 18 : 10, transformOrigin: "50% 50%", duration: 0.05, yoyo: true, repeat: Math.round(d / 0.05) }, t); tl.set("#ring", { opacity: 0 }, t + d); };
      const snooze = (t) => { tl.to("#pipIn", { rotation: 35, transformOrigin: "50% 100%", duration: 0.12, yoyo: true, repeat: 1 }, t); };
      tl.set("#time", { textContent: "6:00" }, 0); ring(0.3, 1.2); snooze(1.4);
      tl.set("#time", { textContent: "6:10" }, 2.6); ring(2.7, 0.6); snooze(3.2);
      tl.set("#time", { textContent: "6:20" }, 3.6); ring(3.7, 0.6); snooze(4.2);
      tl.set("#time", { textContent: "8:59" }, 4.6); ring(4.6, 1.3, true);
      tl.set("#lids", { opacity: 0 }, 4.8); tl.to("#pipIn", { scale: 1.15, transformOrigin: "50% 100%", duration: 0.12, yoyo: true, repeat: 1 }, 4.8);
      // panic run
      tl.to("#pip", { keyframes: [{ y: 1300, duration: 0.25, ease: "power2.out" }, { y: 1450, duration: 0.25, ease: "power2.in" }] }, 6.0);
      tl.to("#pipIn", { rotation: 360, transformOrigin: "50% 50%", duration: 0.5 }, 6.0);
      tl.to("#blanket", { y: -110, scale: 0.8, transformOrigin: "50% 50%", duration: 0.3 }, 6.1);
      tl.to("#pip", { x: 1150, duration: 1.4, ease: "power2.in" }, 6.6);
      tl.to("#pipIn", { y: -30, duration: 0.1, yoyo: true, repeat: 13 }, 6.6);
      // Pebble coffee
      tl.to("#mug", { y: -20, rotation: -20, transformOrigin: "50% 50%", duration: 0.4, yoyo: true, repeat: 3 }, 8.9);
      tl.set("#glint", { x: 800, y: 1350 }, 9.6);
      tl.fromTo("#glint", { opacity: 0, scale: 0.2, rotation: 0, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, rotation: 90, transformOrigin: "50% 50%", duration: 0.25, yoyo: true, repeat: 1 }, 9.6);
      // it's Saturday
      tl.set("#pipIn", { rotation: 0 }, 11.4);
      tl.to("#pip", { x: 470, duration: 0.6, ease: "power2.out" }, 11.5);
      tl.fromTo("#cal", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1.2, transformOrigin: "50% 50%", duration: 0.3, ease: "back.out(2.5)" }, 11.9);
      tl.to("#pipIn", { scaleY: 0.8, transformOrigin: "50% 100%", duration: 0.4 }, 12.4);
      tl.to("#pip", { keyframes: [{ x: 420, y: 1330, duration: 0.3 }, { x: 370, y: 1440, duration: 0.3 }] }, 12.9);
      tl.to("#pipIn", { scaleY: 1, duration: 0.2 }, 13.2); tl.to("#blanket", { y: 0, scale: 1, duration: 0.2 }, 13.3);
      tl.set("#lids", { opacity: 1 }, 13.6); tl.to("#cal", { opacity: 0, duration: 0.3 }, 13.6);
