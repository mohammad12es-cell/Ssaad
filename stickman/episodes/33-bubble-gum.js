EPISODE({ title: "Bubble Gum", seed: 360, music: "bright" }, (E) => {
  E.pageNo(33).fig("inky", 520);
  E.cap("Bubble gum 🍬", 1.6).wait(0.2);
  E.draw("inky", "gum", 600, 960, { id: "gum", s: 0.6 }).wait(0.2).to("#gum", { x: -60, y: -20, opacity: 0 }, 0.3).wait(0.3);
  for (let i = 0; i < 4; i++) { E.face("inky", i % 2 ? "smile" : "o").sfx("blip", 300 + i * 30, 0.15).wait(0.2); }
  E.prop("bubble", 545, 945, { id: "bub", s: 0.2 });
  E.to("#bub", { scale: 5.5, transformOrigin: "0% 50%" }, 1.6).sfx("rumble", 1.6, 0.2).face("inky", "o").cap("Big… BIGGER 🫧").wait(1.8);
  E.to("#inky", { y: 820 }, 2.0, 0).to("#bub", { y: -430 }, 2.0, 0).wait(0.8).cap("…liftoff?! 🎈").wait(1.4);
  E.music("sneaky").monster("mon", 1950).walk("mon", 640, 1.4).wait(1.4);
  E.grin("mon").draw("mon", { s: [[[0, 0], [0, -180]], [[0, -180], [-6, -196], [0, -206], [6, -196], [0, -180]]], w: 6 }, 760, 1050, { id: "pin" }).wait(0.2);
  E.to("#pin", { y: -280 }, 0.25).wait(0.25).sfx("pop", 300, 0.8).hide("#bub", 0.03).puff(880, 600, 2.5).wait(0.15);
  E.face("inky", "worry").to("#inky", { y: 1250 - 445, x: 640, ease: "power2.in" }, 0.45).wait(0.45);
  E.sfx("boing", 0.5).to("#mon-body", { keyframes: { scaleY: [1, 0.75, 1.05, 1] }, transformOrigin: "50% 100%" }, 0.4).wait(0.6);
  E.music("happy").face("inky", "smile").cap("Soft landing 😅", 2.6).wait(2.6).end(0.3);
});
