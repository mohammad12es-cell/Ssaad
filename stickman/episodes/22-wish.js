EPISODE({ title: "Wishing Star", seed: 239, music: "dreamy" }, (E) => {
  E.pageNo(22).fig("inky", 460);
  E.cap("Make a wish ⭐", 1.8).wait(0.2);
  E.draw("inky", "star", 880, 640, { id: "star", s: 0.9 }).wait(0.4);
  E.arms("inky", -60, 60, 0.3).face("inky", "smile").wait(0.4).sfx("ding", 0.3).wait(0.4);
  E.cap("I wish for… a friend 🙏", 2.2).wait(2.2);
  E.to("#star", { keyframes: { rotation: [0, -15, 15, -15, 0] }, transformOrigin: "50% 50%" }, 0.6).sfx("blip", 1200, 0.25).wait(0.8);
  E.arms("inky", 0, 0).face("inky", "o").cap("…uh oh").wait(0.5);
  E.to("#star", { x: -420, y: 210, rotation: 180, ease: "power2.in" }, 0.6).sfx("whoosh", 0.4, 0.4).wait(0.6);
  E.sfx("slam", 0.7).squash("#inky", 0.3, 0.7).to("#star", { y: 520, x: -300, rotation: 360, ease: "bounce.out" }, 0.6).wait(0.4);
  E.stars(460, 870, 2.0).cap("Ow ⭐").face("inky", "sad").wait(2.0);
  E.music("bright");
  E.prop({ s: [[[-14, -78], [-14, -72]], [[14, -78], [14, -72]], [[-14, -50], [0, -40], [14, -50]]], w: 9 }, 880, 640, { id: "sface", layer: "star", hidden: true });
  E.show("#sface", 0.1).sfx("pop", 1100, 0.3).cap("…it's alive? ✨").wait(1.2);
  E.to("#star", { keyframes: [{ y: 380, duration: 0.2 }, { y: 520, duration: 0.2 }, { y: 380, duration: 0.2 }, { y: 520, duration: 0.2 }] }, 0.8).sfx("blip", 900, 0.2).wait(0.9);
  E.face("inky", "smile").hearts(500, 780, 2).hop("#inky", 50, 2).cap("Wish granted 🌟", 2.6).wait(2.6).end(0.3);
});
