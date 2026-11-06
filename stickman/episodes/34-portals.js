EPISODE({ title: "Portals", seed: 371, music: "dreamy" }, (E) => {
  E.pageNo(34).fig("inky", 360);
  E.cap("Portals 🌀", 1.6).wait(0.2);
  E.draw("inky", "portal", 760, 1252, { id: "blue" }).draw("inky", "portal2", 760, 470, { id: "orange" }).wait(0.4);
  E.walk("inky", 760, 1.0).wait(1.0);
  const loop = (d) => {
    E.to("#inky", { scaleY: 0.05, transformOrigin: "50% 100%" }, 0.15).wait(0.15 / 1.25).sfx("blip", 700, 0.3);
    E.set("#inky", { y: 470 + 380, scaleY: 1, rotation: 0 }).to("#inky", { y: 1250, ease: "power1.in" }, d).sfx("whoosh", d, 0.25).wait(d / 1.25);
  };
  loop(0.8); E.cap("Wheee 😄").face("inky", "smile"); loop(0.6); loop(0.45);
  E.face("inky", "o").cap("…I can't get out 😵"); loop(0.35); loop(0.3); loop(0.3);
  E.music("sneaky").monster("mon", 1950).walk("mon", 1080, 0.7);
  loop(0.3);
  E.erase("#blue", 760, 1240, { w: 110, from: [1000, 1100] });
  E.set("#inky", { y: 470 + 380, scaleY: 1 }).to("#inky", { y: 1250, ease: "power1.in" }, 0.35).wait(0.35);
  E.quake(10).sfx("slam", 0.8).squash("#inky", 0.3, 0.6).stars(760, 870, 1.8).wait(1.0);
  E.music("dreamy").cap("…thanks? 😅", 2.6).wait(2.6).end(0.3);
});
