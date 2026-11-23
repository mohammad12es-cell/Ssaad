      $("pip").innerHTML = `<g id="pipIn">${pipSVG(0.5)}<g id="lids">${lidsSVG(0.5)}</g><g id="bag" opacity="0"><path d="M-130,-70 Q0,-100 130,-70 L135,10 L-135,10 Z" fill="#ff8f5a"/></g></g>`;
      $("peb").innerHTML = `<g id="pebIn">${pebSVG(0.5, true)}</g>`;
      const fl = []; for (let i = 0; i < 9; i++) fl.push(mk("circle", { cx: 200 + i * 80, cy: 1250 + (i % 3) * 60, r: 6 }, $("flies")));
      fl.forEach((f, i) => tl.fromTo(f, { opacity: 0.2, y: 0 }, { opacity: 1, y: -30, duration: 0.6 + (i % 3) * 0.2, yoyo: true, repeat: 13 - (i % 3) * 3, ease: "sine.inOut" }, i * 0.1));
      tl.set("#pip", { x: 330, y: 1440 }, 0); tl.set("#peb", { x: 420, y: 1420, opacity: 0, scale: 0.6, transformOrigin: "50% 100%" }, 0); tl.set("#lids", { opacity: 1 }, 0);
      tl.fromTo("#zzz", { y: 0, opacity: 1 }, { y: -60, opacity: 0, duration: 1.6 }, 0);
      tl.to("#pipIn", { x: 8, duration: 0.05, yoyo: true, repeat: 7 }, 1.6);
      tl.set("#lids", { opacity: 0 }, 2.0);
      tl.to("#pipIn", { scaleY: 1.1, transformOrigin: "50% 100%", duration: 0.12, yoyo: true, repeat: 1 }, 2.2);
      // tiptoe to the table
      tl.to("#pip", { x: 500, duration: 2.2, ease: "none" }, 2.8);
      tl.to("#pipIn", { y: -22, rotation: 6, transformOrigin: "50% 100%", duration: 0.4, yoyo: true, repeat: 5, ease: "sine.inOut" }, 2.8);
      tl.to("#pipIn", { rotation: 15, transformOrigin: "50% 100%", duration: 0.4 }, 5.6);
      // the lettuce pile shakes... Pebble pops out of it. LIGHTS ON
      tl.to("#food", { x: 6, duration: 0.05, yoyo: true, repeat: 7 }, 6.2);
      tl.fromTo("#flash", { opacity: 0.85 }, { opacity: 0, duration: 0.4, immediateRender: false }, 6.7);
      tl.set("#gloom", { opacity: 0 }, 6.7);
      tl.to("#peb", { opacity: 1, y: 1330, scale: 0.8, duration: 0.3, ease: "back.out(3)" }, 6.7);
      tl.to("#pipIn", { rotation: -10, scaleY: 1.12, duration: 0.15 }, 6.8);
      tl.fromTo("#bangP", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.2, ease: "back.out(3)" }, 6.8);
      tl.to("#bangP", { opacity: 0, duration: 0.2 }, 7.8);
      tl.to("#food", { scale: 0, transformOrigin: "50% 100%", duration: 0.8 }, 7.6);
      tl.fromTo("#burp", { opacity: 0, scale: 0.3, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 0.25, ease: "back.out(3)" }, 8.6);
      tl.to("#burp", { opacity: 0, duration: 0.3 }, 9.3);
      tl.to("#pipIn", { rotation: 0, scaleY: 0.8, scaleX: 1.08, transformOrigin: "50% 100%", duration: 0.5 }, 8.8);
      // next night: camping by the table
      tl.to("#gloom", { opacity: 0.45, duration: 0.3 }, 9.6); tl.set("#peb", { opacity: 0, y: 1420, scale: 0.6 }, 9.6); tl.set("#food", { scale: 1 }, 9.6);
      tl.set("#pipIn", { scaleY: 1, scaleX: 1 }, 9.6); tl.set("#pip", { x: 470, y: 1470 }, 9.6); tl.set("#bag", { opacity: 1 }, 9.6);
      tl.set("#lids", { opacity: 1 }, 11.0);
      // Pebble sneaks in, eats, leaves a note
      tl.to("#peb", { opacity: 1, y: 1330, scale: 0.8, duration: 0.3 }, 11.4);
      tl.to("#food", { scale: 0, transformOrigin: "50% 100%", duration: 0.9 }, 11.6);
      tl.to("#peb", { opacity: 0, duration: 0.3 }, 12.6);
      tl.set("#note", { x: 470, y: 1300 }, 12.6); tl.fromTo("#note", { opacity: 0, scale: 0.3, rotation: -10, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, rotation: -6, transformOrigin: "50% 50%", duration: 0.25, ease: "back.out(3)" }, 12.6);
      tl.set("#lids", { opacity: 0 }, 13.1); tl.to("#pipIn", { scaleY: 1.1, transformOrigin: "50% 100%", duration: 0.1, yoyo: true, repeat: 3 }, 13.1);
