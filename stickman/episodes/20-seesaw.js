EPISODE({ title: "Seesaw", seed: 217, music: "happy" }, (E) => {
  E.pageNo(20).fig("inky", 400, { y: 1190 });
  E.draw("inky", "seesaw", 680, 1250, { id: "saw", speed: 2600 }).wait(0.2);
  E.cap("Seesaw! 🛝", 1.6).wait(0.6);
  E.monster("mon", 1950, { y: 1190 }).walk("mon", 950, 1.4).wait(1.4);
  const tilt = (deg, d = 0.35, ease = "power2.in") => {
    const dy = Math.sin((deg * Math.PI) / 180) * 280;
    E.to("#saw", { rotation: deg, svgOrigin: "680 1190", ease }, d).to("#inky", { y: 1190 - dy }, d, 0).to("#mon", { y: 1190 + dy }, d, 0);
  };
  tilt(14); E.sfx("thud", 120, 0.3, 0.7).wait(0.5);
  E.cap("…heavy 😐").face("inky", "worry").wait(1.6);
  E.face("inky", "smile").draw("inky", "anvil", 400, 600, { id: "anvil", s: 0.7 }).wait(0.3);
  E.music("chase").to("#anvil", { y: 500, ease: "power2.in" }, 0.35).wait(0.35);
  E.sfx("slam", 0.9);
  tilt(-14, 0.15, "power3.out");
  E.to("#mon", { y: -1500, rotation: 360, transformOrigin: "50% 50%", ease: "power2.out" }, 0.9, 0.12).sfx("boing", 0.45).wait(1.0);
  E.cap("Bye 👋").hop("#inky", 40, 1).wait(1.4);
  E.cap("…", 1.2).wait(1.4);
  // he comes back down on the other end
  E.set("#mon", { rotation: 0 }).to("#mon", { y: 1190 + Math.sin((14 * Math.PI) / 180) * 280, ease: "power2.in" }, 0.5).wait(0.5);
  E.sfx("slam", 1.0).quake(14);
  E.to("#saw", { rotation: 14, svgOrigin: "680 1190" }, 0.12);
  E.to("#inky", { y: -1500, ease: "power2.out" }, 0.8, 0.05).to("#anvil", { y: -1400, ease: "power2.out" }, 0.8, 0.1).wait(1.0);
  E.laugh("mon").cap("Physics 🙃").wait(1.4);
  E.to("#anvil", { x: 550, y: 213, ease: "power2.in" }, 0.6).wait(0.6).sfx("slam", 0.9).to("#mon-body", { scaleY: 0.25, transformOrigin: "50% 100%" }, 0.1).wait(0.7);
  E.set("#inky", { x: 400 }).to("#inky", { y: 1190 - Math.sin((14 * Math.PI) / 180) * 280, ease: "power2.in" }, 0.6).wait(0.6).sfx("thud", 140, 0.3, 0.6).stars(400, 760, 2.2);
  E.music("happy").cap("…even 🤝", 2.6).wait(2.6).end(0.3);
});
