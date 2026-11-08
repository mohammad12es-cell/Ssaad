      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}</g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, true)}</g>`;
      for (let i = 0; i < 5; i++) mk("ellipse", { class: "fire", cx: -40 - i * 24, cy: (i % 2) * 8 - 4, rx: 26 - i * 3, ry: 16 - i * 2, fill: i % 2 ? "#ffb347" : "#ff5a1f" }, $("trail"));
      tl.set("#pip", { x: 360, y: 1440 }, 0); tl.set("#peb", { x: 215, y: 1480 }, 0);
      tl.set("#lady", { x: 560, y: 1820 }, 0); tl.set("#cop", { x: 600, y: 1460, scale: 0, transformOrigin: "50% 100%" }, 0);
      tl.set("#ball", { x: 215, y: 1450, opacity: 0 }, 0); tl.set(".fire", { opacity: 0 }, 0);
      // card + reaction
      tl.fromTo("#card", { y: -300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "back.out(1.8)" }, 0.1);
      ["#bangP", "#bangB"].forEach((b) => { tl.fromTo(b, { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.2, ease: "back.out(3)" }, 0.8); tl.to(b, { opacity: 0, duration: 0.2 }, 1.5); });
      tl.to("#card", { y: -300, opacity: 0, duration: 0.3, ease: "power2.in" }, 1.4);
      // Pip dashes, ladybug, screech
      tl.to("#pipIn", { y: -60, duration: 0.11, yoyo: true, repeat: 5, ease: "power1.out" }, 1.6);
      tl.to("#pip", { x: 470, duration: 0.85, ease: "power2.in" }, 1.6);
      tl.to("#lady", { y: 1480, duration: 2.0, ease: "none" }, 2.3);
      tl.to("#pipIn", { rotation: -22, transformOrigin: "50% 100%", duration: 0.12 }, 2.45);
      puff("dust", 420, 1430, 2.45);
      // cop
      tl.to("#cop", { scale: 1, duration: 0.3, ease: "back.out(2)" }, 3.8);
      tl.to("#pipIn", { rotation: 0, duration: 0.2 }, 3.8);
      tl.fromTo("#stache", { scaleY: 1, transformOrigin: "50% 50%" }, { scaleY: 1.4, transformOrigin: "50% 50%", duration: 0.07, yoyo: true, repeat: 7 }, 3.9);
      tl.to("#pipIn", { scaleY: 0.82, transformOrigin: "50% 100%", duration: 0.5 }, 4.9);
      // SHELL MODE
      tl.to("#peb", { opacity: 0, duration: 0.1 }, 5.5); tl.set("#ball", { opacity: 1 }, 5.5);
      tl.fromTo("#ballSpin", { rotation: 0, transformOrigin: "50% 50%" }, { rotation: 2880, transformOrigin: "50% 50%", duration: 2.5, ease: "power1.in" }, 5.5);
      tl.set(".fire", { opacity: 0.9 }, 5.9); tl.fromTo(".fire", { scaleX: 1 }, { scaleX: 1.5, transformOrigin: "100% 50%", duration: 0.08, yoyo: true, repeat: 22 }, 5.9);
      tl.to("#ball", { x: 420, y: 1440, duration: 0.9, ease: "power1.in" }, 6.0);
      tl.to("#ball", { keyframes: [{ x: 560, y: 1150, duration: 0.4, ease: "power2.out" }, { x: 680, y: 1440, duration: 0.4, ease: "power2.in" }] }, 6.9);
      tl.to("#stache", { rotation: 20, transformOrigin: "50% 50%", duration: 0.15 }, 7.1);
      tl.to("#ball", { x: 710, duration: 0.3, ease: "power3.out" }, 7.7); puff("dust", 700, 1440, 7.7);
      tl.set(".fire", { opacity: 0 }, 7.9);
      // Pebble at the door
      tl.set("#peb", { x: 690, y: 1475 }, 8.0); tl.set("#ball", { opacity: 0 }, 8.0);
      tl.fromTo("#peb", { opacity: 0, scale: 0.5, transformOrigin: "50% 100%" }, { opacity: 1, scale: 1, transformOrigin: "50% 100%", duration: 0.3, ease: "back.out(3)", immediateRender: false }, 8.0);
      tl.to("#door", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.5 }, 8.3);
      tl.to("#glowH", { opacity: 1, scale: 2, transformOrigin: "50% 50%", duration: 0.5 }, 8.3); tl.to("#lettuce", { opacity: 1, duration: 0.3 }, 8.4);
      tl.to("#peb", { x: 740, opacity: 0, duration: 0.5 }, 9.4); tl.to("#lettuce", { opacity: 0, duration: 0.2 }, 9.9);
      // Pip arrives, Pebble comes out full, burp
      tl.to(["#cop", "#lady"], { opacity: 0, duration: 0.3 }, 10.0);
      tl.to("#pipIn", { scaleY: 1, duration: 0.2 }, 10.1);
      tl.to("#pip", { x: 560, duration: 0.6, ease: "power2.out" }, 10.2);
      tl.to("#pipIn", { y: -40, duration: 0.1, yoyo: true, repeat: 5 }, 10.2);
      tl.to("#pipIn", { scaleY: 0.92, transformOrigin: "50% 100%", duration: 0.12, yoyo: true, repeat: 5 }, 10.8);
      tl.set("#pebIn", { scaleX: 1.25, transformOrigin: "50% 100%" }, 11.0);
      tl.to("#peb", { x: 770, opacity: 1, duration: 0.3 }, 11.0);
      tl.fromTo("#burp", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.25, ease: "back.out(3)" }, 11.4);
      tl.to("#pebIn", { scaleY: 1.15, transformOrigin: "50% 100%", duration: 0.15, yoyo: true, repeat: 1 }, 11.4);
      tl.to("#burp", { opacity: 0, duration: 0.3 }, 12.3);
      tl.to("#pipIn", { scaleY: 0.78, scaleX: 1.08, transformOrigin: "50% 100%", duration: 0.7 }, 12.2);
      tl.to("#door", { scaleX: 1, duration: 0.3 }, 12.4); tl.to("#glowH", { opacity: 0, duration: 0.3 }, 12.4);
      // loop: refill notification
      tl.call(() => {}, null, 13.3);
      tl.set("#cardT1", { textContent: "🥬 Buffet REFILLED!" }, 13.35); tl.set("#cardT2", { textContent: "first come, first served…" }, 13.35);
      tl.fromTo("#card", { y: -300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "back.out(1.8)", immediateRender: false }, 13.4);
      tl.to("#pipIn", { scaleY: 1, scaleX: 1, duration: 0.2, ease: "back.out(3)" }, 13.5);
