      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}<g id="lids" opacity="0">${lidsSVG(0.5)}</g></g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, true)}</g>`;
      const pipMini = (x, y, extra = "", tr = "") => `<g transform="translate(${x},${y}) ${tr}"><g transform="scale(0.95)">${pipSVG(0.5)}${extra}</g></g>`;
      const pebMini = (x, y) => `<g transform="translate(${x},${y})"><g transform="scale(0.95)">${pebSVG(0.5, true)}</g></g>`;
      const spark = (x, y) => `<path d="${star(x, y, 12)}" fill="#ffd166"/>`;
      const clip = (inner) => `<svg x="372" y="442" width="336" height="280" viewBox="372 442 336 280" overflow="hidden">${inner}</svg>`;
      const PH = [
        clip(pipMini(540, 712, lidsSVG(0.5))),
        clip(`<g opacity="0.45">${pipMini(520, 712, "", "rotate(25)")}</g><g opacity="0.45">${pipMini(570, 700, "", "rotate(35)")}</g>`),
        clip(`<ellipse cx="380" cy="715" rx="40" ry="16" fill="#5fcf6a"/>`),
        clip(pipMini(540, 712) + `<g transform="translate(530,640) scale(3)"><ellipse cx="0" cy="0" rx="35" ry="25" fill="#ff3b3b"/><circle cx="-31" cy="-3" r="15" fill="#1b1a2e"/><circle cx="-12" cy="-10" r="6" fill="#1b1a2e"/><circle cx="12" cy="-11" r="6" fill="#1b1a2e"/></g>`),
        clip(pebMini(530, 712) + spark(440, 520) + spark(640, 500) + spark(600, 600)),
        clip(pebMini(620, 712) + `<g opacity="0.5">${pipMini(460, 540, "", "rotate(170)")}</g>` + spark(660, 520)),
      ];
      const LBL = ["Blinked 😑", "Too early 😵", "Too late 🦶", "Photobomb 🐞", "Perfect ✨", "Group photo 😂"];
      tl.set("#pip", { x: 380, y: 1450 }, 0); tl.set("#peb", { x: 720, y: 1480 }, 0); tl.set("#lady", { x: -100, y: 1520 }, 0);
      const shot = (t, i) => {
        tl.fromTo("#flash", { opacity: 0.9 }, { opacity: 0, duration: 0.35, immediateRender: false }, t);
        tl.call(() => {}, null, t);
        tl.set("#ph", { innerHTML: PH[i] }, t + 0.05); tl.set("#phTxt", { textContent: LBL[i] }, t + 0.05);
        tl.fromTo("#polaroid", { opacity: 0, y: -60, rotation: -8, transformOrigin: "50% 50%" }, { opacity: 1, y: 0, rotation: i % 2 ? 4 : -4, transformOrigin: "50% 50%", duration: 0.35, ease: "back.out(2)", immediateRender: false }, t + 0.1);
      };
      tl.set("#ph", { innerHTML: "" }, 0);
      tl.to("#pipIn", { y: -20, duration: 0.2, yoyo: true, repeat: 3 }, 0.3);
      // 1 blink
      tl.set("#lids", { opacity: 1 }, 1.5); tl.set("#lids", { opacity: 0 }, 1.8); shot(1.6, 0);
      // 2 too early
      tl.to("#pip", { y: 1300, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1 }, 3.0); tl.to("#pipIn", { rotation: 25, transformOrigin: "50% 100%", duration: 0.2, yoyo: true, repeat: 1 }, 3.0); shot(3.15, 1);
      // 3 too late
      tl.to("#pip", { x: 120, duration: 0.3, ease: "power2.in" }, 4.4); shot(4.8, 2); tl.to("#pip", { x: 380, duration: 0.35, ease: "power2.out" }, 5.0);
      // 4 photobomb
      tl.to("#lady", { x: 400, duration: 0.5, ease: "power2.out" }, 5.8); shot(6.4, 3); tl.to("#lady", { x: 1200, duration: 0.8, ease: "power1.in" }, 7.2);
      tl.to("#pipIn", { scaleY: 0.85, transformOrigin: "50% 100%", duration: 0.3 }, 7.2);
      // 5 Pebble one take
      tl.to("#pip", { x: 200, duration: 0.4 }, 7.8); shot(8.4, 4);
      tl.set("#glint", { x: 790, y: 1350 }, 8.5);
      tl.fromTo("#glint", { opacity: 0, scale: 0.2, rotation: 0, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, rotation: 90, transformOrigin: "50% 50%", duration: 0.25, yoyo: true, repeat: 1 }, 8.5);
      // 6 group photo: Pip slides in and flips
      tl.to("#pipIn", { scaleY: 1, duration: 0.2 }, 10.3);
      tl.to("#pip", { keyframes: [{ x: 420, duration: 0.5, ease: "power2.in" }, { x: 520, y: 1350, duration: 0.25 }] }, 10.5);
      tl.to("#pipIn", { rotation: 180, transformOrigin: "50% 50%", duration: 0.3 }, 11.0);
      shot(11.35, 5);
      tl.to("#pip", { y: 1450, duration: 0.3, ease: "power2.in" }, 11.6);
      tl.to("#pipIn", { rotation: 180, duration: 0.01 }, 11.9);
      tl.to("#polaroid", { rotation: 10, transformOrigin: "50% 50%", duration: 0.15, yoyo: true, repeat: 5 }, 12.6);
