EPISODE({ title: "Juggling", seed: 536, music: "happy" }, (E) => {
  E.pageNo(49).fig("inky", 560);
  E.cap("Juggling 🤹", 1.6).wait(0.2);
  ["b1", "b2", "b3"].forEach((id, i) => E.draw("inky", "ball", 640 + i * 70, 1240, { id, s: 0.5, speed: 2400 }));
  E.wait(0.3);
  const juggle = (ids, n) => {
    ids.forEach((id, i) => {
      const x0 = 640 + ids.indexOf(id) * 70;
      E.to("#" + id, { keyframes: Array.from({ length: n }, (_, k) => [{ x: 560 - x0 - 40 + (k % 2) * 80, y: -520, duration: 0.3, ease: "power2.out" }, { x: 560 - x0 + 40 - (k % 2) * 80, y: -280, duration: 0.3, ease: "power2.in" }]).flat() }, n * 0.6, i * 0.2);
    });
    E.sfx("blip", 800, 0.2).wait((n * 0.6 + 0.4) / 1.4);
  };
  E.arms("inky", -50, 50, 0.2); juggle(["b1", "b2", "b3"], 4);
  E.cap("Pro level 😎").wait(1.0);
  E.music("sneaky").monster("mon", 1950).walk("mon", 1200, 1.0).wait(1.0).grin("mon");
  E.prop("anvil", 1100, 1050, { id: "anv", s: 0.4 });
  E.to("#anv", { x: -540, y: -400, rotation: -200, transformOrigin: "50% 50%" }, 0.7).sfx("whoosh", 0.5, 0.4).cap("…an anvil?!").face("inky", "o").wait(0.7);
  juggle(["b1", "b2", "b3"], 2);
  E.to("#anv", { y: -120, rotation: -360, ease: "power2.in" }, 0.4).wait(0.4);
  E.quake(14).sfx("slam", 0.9).squash("#inky", 0.3, 0.55).to(["#b1", "#b2", "#b3"], { y: 0, ease: "bounce.out" }, 0.6).wait(0.6);
  E.stars(560, 860, 2.0).laugh("mon").music("happy").cap("…amateur level 😵", 2.6).wait(2.6).end(0.3);
});
