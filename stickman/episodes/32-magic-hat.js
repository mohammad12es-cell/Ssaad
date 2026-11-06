EPISODE({ title: "Magic Hat", seed: 349, music: "dreamy" }, (E) => {
  E.pageNo(32).fig("inky", 380);
  E.cap("A magic trick 🎩", 1.8).wait(0.2);
  E.draw("inky", "tophat", 680, 1250, { id: "hat", flip: false, rot: 180, s: 1.1 }).wait(0.3);
  const rabbit = { s: [PROPS._ring(0, -50, 45, 40, 16), [[-18, -85], [-26, -170], [-6, -88]], [[18, -85], [26, -170], [6, -88]], [[-14, -58], [-14, -54]], [[14, -58], [14, -54]]], f: [{ p: PROPS._ring(0, -50, 45, 40, 16), c: "#ffffff" }, { p: [[-18, -85], [-26, -170], [-6, -88]], c: "#ffffff" }, { p: [[18, -85], [26, -170], [6, -88]], c: "#ffffff" }] };
  E.draw("inky", { s: [[[0, 0], [90, -90]]], w: 8 }, 560, 1120, { id: "wand", attach: "inky" }).wait(0.2);
  E.arm("inky", "R", -30, 0.1).sfx("ding", 0.3).wait(0.2).arm("inky", "R", 0, 0.1).wait(0.3);
  E.prop(rabbit, 680, 1130, { id: "rab", hidden: true }).show("#rab", 0.05).to("#rab", { y: -110 }, 0.3).sfx("boing", 0.35).wait(0.5);
  E.cap("Ta-da 🐰").hop("#inky", 40, 1).wait(1.4);
  E.to("#rab", { x: 220, y: 0 }, 0.5).sfx("blip", 800, 0.2).wait(0.6);
  E.music("sneaky").cap("…the rabbit has a pencil?").wait(0.5);
  E.draw(null, "tophat", 1100, 1250, { id: "hat2", rot: 180, s: 1.1, speed: 2400 }).wait(0.2);
  E.to("#rab", { rotation: -20, transformOrigin: "50% 100%" }, 0.15).sfx("ding", 0.3).wait(0.2).to("#rab", { rotation: 0 }, 0.15).wait(0.3);
  E.puff(380, 1100, 1.5).hide("#inky", 0.05).hide("#wand", 0.05).wait(0.4);
  E.set("#inky", { x: 1100, y: 1130 }).show("#inky", 0.05).to("#inky", { y: 1050 }, 0.3).sfx("boing", 0.35).wait(0.5);
  E.face("inky", "o").cap("Who's the magician now? 🎩", 2.8).wait(2.8).end(0.3);
});
