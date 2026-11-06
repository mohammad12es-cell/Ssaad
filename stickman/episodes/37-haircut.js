EPISODE({ title: "New Hair", seed: 404, music: "happy" }, (E) => {
  E.pageNo(37).fig("inky", 560);
  E.cap("I need hair 💇", 1.6).wait(0.2);
  const hair = { s: [[[-40, 0], [-50, -40]], [[-20, -8], [-22, -52]], [[0, -10], [4, -56]], [[20, -8], [28, -50]], [[40, 0], [52, -36]]], w: 8 };
  E.draw("inky", hair, 560, 880, { id: "hair", attach: "inky" }).wait(0.3);
  E.face("inky", "smile").cap("Stylish 😎").hop("#inky", 30, 1).wait(1.4);
  E.to("#hair", { scaleY: 2.5, transformOrigin: "50% 100%" }, 0.8).sfx("boing", 0.3).cap("…it's growing").face("inky", "o").wait(1.2);
  E.to("#hair", { scaleY: 6, scaleX: 2.2, transformOrigin: "50% 100%" }, 1.0).sfx("rumble", 1.0, 0.3).wait(1.2);
  E.cap("TOO MUCH HAIR 😱").wait(1.4);
  E.face("inky", "worry").draw("inky", "scissors", 700, 760, { id: "sc", s: 0.9, rot: -90 }).wait(0.2);
  for (let i = 0; i < 3; i++) { E.to("#sc", { scaleY: i % 2 ? 1 : 0.6, transformOrigin: "50% 50%" }, 0.1).sfx("blip", 1400, 0.25).wait(0.18); }
  E.to("#hair", { opacity: 0, y: 380 }, 0.6).hide("#sc", 0.2).wait(0.6);
  const one = { s: [[[0, 0], [6, -40]]], w: 8 };
  E.prop(one, 560, 878, { id: "one", attach: "inky" });
  E.face("inky", "sad").cap("…one left 😑").wait(1.6);
  E.music("bright").face("inky", "smile").draw("inky", "tophat", 560, 880, { id: "hat", s: 0.8, attach: "inky" }).wait(0.2);
  E.cap("Problem solved 🎩", 2.6).hop("#inky", 40, 1).wait(2.6).end(0.3);
});
