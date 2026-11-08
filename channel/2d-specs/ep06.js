      const flower = `<g id="hatF" opacity="0" transform="translate(10,-195)"><circle cx="-12" cy="0" r="10" fill="#ff8fb1"/><circle cx="12" cy="0" r="10" fill="#ff8fb1"/><circle cx="0" cy="-11" r="10" fill="#ff8fb1"/><circle cx="0" cy="11" r="10" fill="#ff8fb1"/><circle cx="0" cy="0" r="7" fill="#ffe066"/></g>`;
      const lily = `<g id="lily" opacity="0"><ellipse cx="0" cy="-185" rx="58" ry="14" fill="#3fa34d"/><path d="M0,-185 L50,-196 L50,-176 Z" fill="#8be08f"/></g>`;
      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}<g id="wink" opacity="0">${winkSVG(0.5)}</g>${lily}${flower}</g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, true)}</g>`;
      tl.set("#pip", { x: 360, y: 1450 }, 0); tl.set("#peb", { x: 215, y: 1490 }, 0); tl.set("#wink", { opacity: 0 }, 0);
      tl.set("#wink", { opacity: 1 }, 0.6); tl.set("#wink", { opacity: 0 }, 1.4);
      // dive into the bushes
      tl.to("#pip", { keyframes: [{ x: 470, y: 1250, duration: 0.4, ease: "power2.out" }, { x: 580, y: 1340, duration: 0.4, ease: "power2.in" }] }, 2.0);
      tl.to("#pip", { opacity: 0, duration: 0.05 }, 2.8);
      tl.to(".bush", { rotation: 8, transformOrigin: "50% 100%", duration: 0.07, yoyo: true, repeat: 9 }, 2.8);
      puff("dust", 600, 1300, 2.8, "#4f9a3a", 7, 80);
      // pops out confused with a flower
      tl.set("#hatF", { opacity: 1 }, 3.2);
      tl.to("#pip", { opacity: 1, y: 1250, duration: 0.3, ease: "back.out(2)" }, 3.2);
      tl.to("#pipIn", { scaleX: -1, transformOrigin: "50% 50%", duration: 0.1, yoyo: true, repeat: 5, repeatDelay: 0.2 }, 3.6);
      // hops out and trips into the pond
      tl.to("#pip", { keyframes: [{ x: 520, y: 1380, duration: 0.4 }, { x: 500, y: 1450, duration: 0.3 }, { x: 520, y: 1560, duration: 0.3 }] }, 5.2);
      tl.to("#pipIn", { rotation: 200, transformOrigin: "50% 50%", duration: 0.6 }, 5.6);
      tl.set("#pipIn", { rotation: 0 }, 6.2); tl.set("#pip", { y: 1700 }, 6.2);
      puff("dust", 520, 1600, 6.2, "#8fd3ff", 8, 90);
      tl.fromTo("#ripple", { opacity: 0.9, scale: 0.5, transformOrigin: "50% 50%" }, { opacity: 0, scale: 2.2, transformOrigin: "50% 50%", duration: 1.0 }, 6.2);
      tl.to("#pip", { y: 1655, duration: 0.4, ease: "back.out(2)" }, 6.6);
      // meanwhile Pebble on the normal road
      tl.to("#peb", { x: 720, duration: 2.4, ease: "none" }, 7.6);
      // Pebble eats, Pip arrives soaked
      tl.to("#food", { scale: 0, transformOrigin: "50% 100%", duration: 1.2 }, 10.0);
      tl.to("#pebIn", { rotation: -5, transformOrigin: "50% 100%", duration: 0.12, yoyo: true, repeat: 9 }, 10.0);
      tl.set("#lily", { opacity: 1 }, 10.0);
      tl.to("#pip", { keyframes: [{ x: 500, y: 1520, duration: 0.35 }, { x: 500, y: 1460, duration: 0.35 }] }, 10.1);
      tl.to("#pipIn", { scaleY: 0.92, transformOrigin: "50% 100%", duration: 0.12, yoyo: true, repeat: 7 }, 10.8);
      tl.set("#wink", { opacity: 1 }, 12.6); tl.set("#wink", { opacity: 0 }, 13.3);
