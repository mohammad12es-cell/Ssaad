      const blanket = `<g id="blanket"><path d="M-120,-80 Q0,-110 120,-80 L130,10 L-130,10 Z" fill="#6a7bff"/><path d="M-120,-80 Q0,-110 120,-80" stroke="#fff" stroke-width="6" fill="none"/></g>`;
      const bag = `<g id="bag" opacity="0"><rect x="-120" y="-150" width="60" height="80" rx="16" fill="#ff5a5f"/><rect x="-112" y="-118" width="44" height="22" rx="6" fill="#c43c47"/></g>`;
      $("pip").innerHTML = `<g id="pipIn">${bag}${pipSVG(0.5)}<g id="lids">${lidsSVG(0.5)}</g>${blanket}</g>`;
            tl.set("#pip", { x: 370, y: 1440 }, 0); tl.set("#clock", { x: 605, y: 1360 }, 0); tl.set("#ring", { x: 605, y: 1360 }, 0); tl.set("#lids", { opacity: 1 }, 0);
      const ring = (t, d, big = false) => { tl.set("#ring", { opacity: 1 }, t); tl.to("#clock", { rotation: big ? 18 : 10, transformOrigin: "50% 50%", duration: 0.05, yoyo: true, repeat: Math.round(d / 0.05) }, t); tl.set("#ring", { opacity: 0 }, t + d); };
      tl.set("#time", { textContent: "3:00" }, 0); ring(0.2, 1.2);
      
      tl.set("#lids", { opacity: 0 }, 1.6); tl.to("#pipIn", { y: -80, duration: 0.2, yoyo: true, repeat: 3, ease: "power2.out" }, 1.8);
      tl.fromTo("#cal", { scale: 1, transformOrigin: "50% 50%" }, { scale: 1.35, transformOrigin: "50% 50%", duration: 0.3, ease: "back.out(2.5)", immediateRender: false }, 4.2);
      tl.to("#pipIn", { x: 8, duration: 0.05, yoyo: true, repeat: 9 }, 4.4);
      // speedrun
      tl.to("#blanket", { y: -300, x: -200, rotation: -60, opacity: 0, duration: 0.4 }, 5.4);
      tl.to("#pipIn", { rotation: 720, transformOrigin: "50% 50%", duration: 0.7 }, 5.5);
      tl.set("#bag", { opacity: 1 }, 6.0);
      tl.to("#pip", { x: 1150, duration: 1.4, ease: "power2.in" }, 6.6);
      tl.to("#pipIn", { y: -30, duration: 0.1, yoyo: true, repeat: 13 }, 6.6);
      // cut to street
      tl.set("#room", { opacity: 0 }, 8.4); tl.set("#street", { opacity: 1 }, 8.4); tl.set("#pip", { x: -100, y: 1450 }, 8.4);
            tl.to("#pip", { x: 420, duration: 0.8, ease: "power2.out" }, 8.6);
      tl.to("#pipIn", { y: -30, duration: 0.1, yoyo: true, repeat: 7 }, 8.6);
      tl.to("#pipIn", { scaleX: -1, transformOrigin: "50% 50%", duration: 0.1, yoyo: true, repeat: 3, repeatDelay: 0.25 }, 9.6);
      tl.to("#pipIn", { scaleY: 0.85, transformOrigin: "50% 100%", duration: 0.4 }, 10.8);
      tl.to("#pip", { x: 405, y: 1425, duration: 0.3 }, 11.2);
      // twist
      tl.fromTo("#notif", { opacity: 0, y: -80 }, { opacity: 1, y: 0, duration: 0.35, ease: "back.out(2)" }, 12.0);
      tl.to("#pipIn", { scaleY: 1.1, duration: 0.1, yoyo: true, repeat: 1 }, 12.2);
      tl.set("#lids", { opacity: 1 }, 13.0); tl.to("#zzz", { opacity: 1, duration: 0.2 }, 13.1); tl.to("#zzz", { y: -30, duration: 0.4, yoyo: true, repeat: 1 }, 13.1);
