      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}<g id="lids">${lidsSVG(0.5)}</g></g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, true)}</g>`;
      const fl = []; for (let i = 0; i < 9; i++) fl.push(mk("circle", { cx: 200 + i * 80, cy: 1250 + (i % 3) * 60, r: 6 }, $("flies")));
      fl.forEach((f, i) => tl.fromTo(f, { opacity: 0.2, y: 0 }, { opacity: 1, y: -30, duration: 0.6 + (i % 3) * 0.2, yoyo: true, repeat: 13 - (i % 3) * 3, ease: "sine.inOut" }, i * 0.1));
      tl.set("#pip", { x: 330, y: 1440 }, 0); tl.set("#peb", { x: 520, y: 1480 }, 0); tl.set("#lids", { opacity: 1 }, 0);
      // asleep
      tl.to("#pipIn", { scaleY: 1.04, transformOrigin: "50% 100%", duration: 0.5, yoyo: true, repeat: 2, ease: "sine.inOut" }, 0);
      tl.fromTo("#zzz", { y: 0, opacity: 1 }, { y: -60, opacity: 0, duration: 1.6 }, 0);
      tl.to("#pipIn", { x: 8, duration: 0.05, yoyo: true, repeat: 9 }, 1.6);
      tl.set("#lids", { opacity: 0 }, 2.3);
      tl.fromTo("#pipIn", { scale: 1, transformOrigin: "50% 100%" }, { scale: 1.12, transformOrigin: "50% 100%", duration: 0.12, yoyo: true, repeat: 1, immediateRender: false }, 2.3);
      // tiptoe
      tl.to("#pip", { x: 640, duration: 3.2, ease: "none" }, 2.8);
      tl.to("#pipIn", { y: -22, rotation: 6, transformOrigin: "50% 100%", duration: 0.4, yoyo: true, repeat: 7, ease: "sine.inOut" }, 2.8);
      // door creaks
      tl.to("#door", { scaleX: 0.55, transformOrigin: "0% 50%", duration: 0.8 }, 6.2);
      tl.to("#glowH", { opacity: 0.8, scale: 1.4, transformOrigin: "50% 50%", duration: 0.8 }, 6.2);
      // LIGHTS ON
      tl.fromTo("#flash", { opacity: 0.85 }, { opacity: 0, duration: 0.4, immediateRender: false }, 7.4);
      tl.set("#gloom", { opacity: 0 }, 7.4); tl.set("#snack", { opacity: 1 }, 7.4);
      tl.fromTo("#bangP", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.2, ease: "back.out(3)" }, 7.6);
      tl.to("#bangP", { opacity: 0, duration: 0.2 }, 8.6);
      tl.to("#pipIn", { scaleY: 1.1, transformOrigin: "50% 100%", duration: 0.1, yoyo: true, repeat: 1 }, 7.6);
      // Pebble eats
      tl.to("#pebIn", { rotation: -5, transformOrigin: "50% 100%", duration: 0.12, yoyo: true, repeat: 9 }, 9.6);
      tl.to("#food", { scale: 0, transformOrigin: "50% 100%", duration: 1.3 }, 9.6);
      tl.set("#pebIn", { scaleX: 1.2, transformOrigin: "50% 100%" }, 10.9);
      tl.fromTo("#burp", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.25, ease: "back.out(3)" }, 11.0);
      tl.to("#burp", { opacity: 0, duration: 0.3 }, 11.8);
      tl.to("#pipIn", { x: 8, duration: 0.05, yoyo: true, repeat: 7 }, 11.4);
      tl.to("#pipIn", { scaleY: 0.8, scaleX: 1.08, transformOrigin: "50% 100%", duration: 0.5 }, 11.8);
      // lights out, walk back to bed (loops)
      tl.to("#gloom", { opacity: 0.45, duration: 0.4 }, 12.5); tl.to("#snack", { opacity: 0, duration: 0.4 }, 12.5);
      tl.to("#door", { scaleX: 1, duration: 0.3 }, 12.5); tl.to("#glowH", { opacity: 0, duration: 0.3 }, 12.5);
      tl.to("#pip", { x: 330, duration: 1.1, ease: "power1.inOut" }, 12.6);
      tl.to("#pipIn", { scaleY: 1, scaleX: 1, duration: 0.3 }, 13.4);
      tl.set("#lids", { opacity: 1 }, 13.75);
