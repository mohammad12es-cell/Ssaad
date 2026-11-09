      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}<g id="lids" opacity="0">${lidsSVG(0.5)}</g></g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, true)}</g>`;
      const bang = (x, y, t) => { tl.set("#bangP", { x, y }, t); tl.fromTo("#bangP", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.2, ease: "back.out(3)", immediateRender: false }, t); tl.to("#bangP", { opacity: 0, duration: 0.2 }, t + 0.9); };
      tl.set("#pip", { x: 400, y: 1450 }, 0); tl.set("#peb", { x: 780, y: 1480 }, 0); tl.set("#fakeRock", { x: 560, y: 1480 }, 0);
      // Pebble counts, Pip looks for a spot
      tl.to("#count", { opacity: 1, duration: 0.2 }, 0.2); tl.to("#count", { opacity: 0, duration: 0.2 }, 3.3);
      
      tl.to("#pip", { keyframes: [{ x: 300, duration: 0.4 }, { x: 640, duration: 0.6 }, { x: 520, duration: 0.4 }] }, 0.5);
      tl.to("#pipIn", { y: -40, duration: 0.1, yoyo: true, repeat: 13 }, 0.5);
      // hides behind the thin flower (fully visible)
      tl.to("#pip", { x: 528, y: 1440, duration: 0.2 }, 1.9);
      tl.to("#pipIn", { scaleY: 0.9, transformOrigin: "50% 100%", duration: 0.2 }, 2.1);
      // found
      tl.to("#pebIn", { scaleX: -1, transformOrigin: "50% 50%", duration: 0.01 }, 3.5);
      bang(470, 1240, 4.6);
      tl.to("#pipIn", { scaleY: 1.1, duration: 0.12, yoyo: true, repeat: 1 }, 4.6);
      // Pebble's turn: Pip counts, Pebble becomes a rock
      tl.to("#pip", { x: 320, y: 1460, duration: 0.6 }, 6.0); tl.set("#lids", { opacity: 1 }, 6.6);
      tl.to("#count", { opacity: 1, x: -460, duration: 0.01 }, 6.6); tl.to("#count", { opacity: 0, duration: 0.2 }, 8.0);
      tl.to("#peb", { x: 560, duration: 0.9 }, 6.4);
      tl.to("#peb", { opacity: 0, duration: 0.2 }, 7.3); tl.to("#fakeRock", { opacity: 1, duration: 0.2 }, 7.3);
      // Pip searches
      tl.set("#lids", { opacity: 0 }, 8.1);
      tl.to("#pip", { keyframes: [{ x: 330, duration: 0.4 }, { x: 680, duration: 0.7 }, { x: 830, duration: 0.5 }, { x: 640, duration: 0.5 }] }, 8.2);
      tl.to("#pipIn", { y: -35, duration: 0.1, yoyo: true, repeat: 19 }, 8.2);
      tl.to(".rock", { rotation: 6, transformOrigin: "50% 100%", duration: 0.08, yoyo: true, repeat: 5 }, 9.2);
      tl.to("#pipIn", { scaleX: -1, transformOrigin: "50% 50%", duration: 0.1, yoyo: true, repeat: 3, repeatDelay: 0.3 }, 9.6);
      // sits on the "rock"
      tl.to("#pip", { x: 560, y: 1430, duration: 0.4 }, 10.6);
      tl.to("#pipIn", { scaleY: 0.85, transformOrigin: "50% 100%", duration: 0.3 }, 11.0);
      // the rock says hi
      tl.to("#peek", { opacity: 1, duration: 0.15 }, 12.2);
      tl.fromTo("#peek", { y: 30 }, { y: 0, duration: 0.25, ease: "back.out(3)", immediateRender: false }, 12.2);
      tl.to("#pip", { keyframes: [{ y: 1200, x: 520, duration: 0.3, ease: "power2.out" }, { y: 1450, x: 400, duration: 0.35, ease: "power2.in" }] }, 12.6);
      tl.to("#pipIn", { scaleY: 1, duration: 0.1 }, 12.6); bang(380, 1250, 12.7);
