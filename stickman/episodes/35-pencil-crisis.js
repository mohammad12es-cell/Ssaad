EPISODE({ title: "Pencil Crisis", seed: 382, music: "happy" }, (E) => {
  E.pageNo(35).fig("inky", 300);
  E.draw("inky", "apple", 520, 1250).wait(0.3).set("#penY", { scale: 0.7, transformOrigin: "0% 100%" });
  E.draw("inky", "star", 700, 1100, { s: 0.6 }).wait(0.3).set("#penY", { scale: 0.45, transformOrigin: "0% 100%" });
  E.draw("inky", "heart", 880, 1200, { s: 0.6 }).wait(0.3);
  E.cap("My pencil is shrinking ✏️😨").face("inky", "o").wait(1.8);
  E.set("#penY", { scale: 0.2, transformOrigin: "0% 100%" });
  E.face("inky", "worry").draw("inky", { s: [[[0, 0], [40, -40]], [[40, -40], [20, -50]]], w: 6 }, 1060, 1240, { id: "tiny" }).wait(0.2);
  E.cap("New pencil… tiny 😩").wait(1.8);
  E.music("bright").dog("dog", -700).walk("dog", 120, 1.2).wait(0.4);
  E.prop({ s: [[[0, 0], [8, -26], [24, -19]], [[8, -26], [24, -19], [66, -112], [50, -119], [8, -26]]], f: [{ p: [[8, -26], [24, -19], [66, -112], [50, -119]], c: "#ffd23f" }] }, -630, 1130, { id: "bigpen", rot: 75, s: 1.1 });
  E.to("#bigpen", { x: 820 }, 1.2, -0.48).wait(1.0);
  E.sfx("bark", 0.4).wag("dog", 10).cap("He brought it back! 🐶✏️").face("inky", "smile").wait(1.8);
  E.set("#penY", { scale: 1 }).hide("#bigpen", 0.1).hearts(300, 800, 2).hop("#inky", 50, 2);
  E.draw("inky", "bone", 380, 1240, { s: 0.8 }).wait(0.2);
  E.cap("Good boy 🦴", 2.6).wait(2.6).end(0.3);
});
