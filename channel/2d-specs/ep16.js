      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}<g id="lids" opacity="0">${lidsSVG(0.5)}</g><g id="napkin" opacity="0"><path d="M-40,-40 L40,-40 L0,10 Z" fill="#fff"/></g></g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, true)}<g id="apron" transform="translate(70,-40)"><path d="M-14,-20 L14,-20 L18,30 L-18,30 Z" fill="#ff8fb1"/></g></g>`;
      tl.set("#pip", { x: 330, y: 1390, rotation: -15 }, 0); tl.set("#peb", { x: 810, y: 1480 }, 0); tl.set("#dishes", { x: 690, y: 1392 }, 0);
      // "help clean?" -> suddenly asleep
      tl.set("#lids", { opacity: 1 }, 1.9);
      tl.to("#pipIn", { scaleY: 1.03, transformOrigin: "50% 100%", duration: 0.4, yoyo: true, repeat: 2 }, 1.9);
      // "dinner's ready" -> teleport
      tl.set("#lids", { opacity: 0 }, 3.7);
      tl.set("#lines", { opacity: 1 }, 3.8); tl.to("#lines", { opacity: 0, duration: 0.4 }, 3.9);
      puff("dust", 330, 1390, 3.8, "#dddddd", 6, 60);
      tl.set("#pip", { x: 505, y: 1470, rotation: 0 }, 3.8); tl.set("#napkin", { opacity: 1 }, 3.9);
      tl.to("#pasta", { scale: 0, transformOrigin: "50% 100%", duration: 0.8 }, 4.4);
      tl.to("#pipIn", { y: -15, duration: 0.08, yoyo: true, repeat: 9 }, 4.4);
      tl.to("#pipIn", { scaleX: 1.15, transformOrigin: "50% 100%", duration: 0.3 }, 5.3);
      // "who's washing dishes?" -> poof
      puff("dust", 520, 1440, 7.0, "#dddddd", 8, 70);
      tl.set("#pip", { opacity: 0 }, 7.05);
      // Pebble washes, plates wobble
      tl.set("#dishes", { opacity: 1 }, 8.4);
      tl.to("#dishes", { rotation: 6, transformOrigin: "50% 100%", duration: 0.25, yoyo: true, repeat: 7 }, 8.5);
      tl.to("#pebIn", { y: -10, duration: 0.25, yoyo: true, repeat: 7 }, 8.5);
      // "dessert!" -> back instantly
      tl.set("#cake", { opacity: 1 }, 10.8);
      tl.set("#lines", { opacity: 1, x: 220 }, 11.3); tl.to("#lines", { opacity: 0, duration: 0.3 }, 11.4);
      tl.set("#pip", { opacity: 1, x: 505, y: 1470 }, 11.3); tl.set("#pipIn", { scaleX: 1 }, 11.3);
      tl.to("#pipIn", { y: -40, duration: 0.12, yoyo: true, repeat: 3 }, 11.4);
      // Pebble takes the cake
      tl.to("#cake", { x: 110, y: 40, duration: 0.5, ease: "power2.inOut" }, 12.6);
      tl.to("#cake", { scale: 0, transformOrigin: "50% 100%", duration: 0.6 }, 13.2);
      tl.to("#pipIn", { scaleY: 0.8, transformOrigin: "50% 100%", duration: 0.4 }, 12.9);
