EPISODE({ title: "Super Magnet", seed: 107, music: "happy" }, (E) => {
  E.pageNo(10).fig("inky", 300);
  E.cap("Super magnet 🧲", 2.0).wait(0.3);
  E.draw("inky", "magnet", 420, 1110, { attach: "inky", id: "mag", s: 0.6, rot: 90 }).arm("inky", "R", -15, 0.2).wait(0.8);
  const spoon = { s: [[[0, 0], [0, -90]], PROPS._ring(0, -110, 16, 24, 14)], w: 7, color: "#8d97ad" };
  E.prop(spoon, 1600, 1000, { id: "spoon" }).prop("hammer", 1650, 1180, { id: "ham", s: 0.6, rot: -90 });
  E.to("#spoon", { x: -1110, y: 110, rotation: 90, transformOrigin: "50% 50%", ease: "power2.in" }, 0.6).sfx("whoosh", 0.3, 0.3).wait(0.6).sfx("pop", 1800, 0.4);
  E.face("inky", "o").cap("Whoa ✨").wait(1.4);
  E.to("#ham", { x: -1150, y: -80, ease: "power2.in" }, 0.6).sfx("whoosh", 0.3, 0.3).wait(0.6).sfx("slam", 0.5).shake("#inky", 8, 0.2);
  E.face("inky", "smile").cap("Strong one 😎").wait(1.6);
  E.music("chase").cap("…wait, what's that?", 1.6).wait(0.6);
  E.prop("anvil", 1700, 900, { id: "anvil", s: 1.4 });
  E.sfx("rumble", 1.6, 0.6).to("#anvil", { x: -400, y: 0 }, 1.4, 0, ).wait(1.0);
  E.face("inky", "o").sweat("inky").wait(0.4);
  // he throws the magnet away... the anvil follows it
  E.set(["#spoon", "#ham"], { opacity: 0 }).hide("#mag", 0.05);
  E.prop("magnet", 500, 1110, { id: "mag2", s: 0.6, rot: 90 });
  E.to("#mag2", { x: 600, y: 130, rotation: 360, transformOrigin: "50% 50%" }, 0.5).sfx("whoosh", 0.3, 0.3).wait(0.3);
  E.monster("mon", 1950).to("#mon", { x: 1100 }, 0.6, 0).wait(0.3);
  E.to("#anvil", { x: -650, y: 260, ease: "power2.in" }, 0.4).wait(0.4);
  E.quake(14, 0.35).sfx("slam", 1.0).to("#mon-body", { scaleY: 0.25, transformOrigin: "50% 100%" }, 0.12).wait(0.6);
  E.music("happy").cap("Oops 😬", 2.0).face("inky", "worry").wait(2.0);
  E.to("#anvil", { opacity: 0 }, 0.2).walk("mon", 1900, 2.2).cap("…sorry! 🥞", 2.4).wait(2.6).end(0.4);
});
