EPISODE({ title: "The Gap", seed: 63, music: "happy" }, (E) => {
  E.pageNo(6).fig("inky", 160);
  E.prop("hole", 560, 1252, { id: "pit", s: 2.3 });
  E.prop("apple", 1000, 1250, { id: "apple", s: 1.3 });
  E.cap("Snack on the other side 🍎", 2.4).wait(2.4);
  E.draw("inky", "bridgeShort", 560, 1250, { id: "short" }).wait(0.3);
  E.to("#short", { y: 60, rotation: 12, opacity: 0, transformOrigin: "50% 50%" }, 0.5).sfx("whoosh", 0.3, 0.3).wait(0.5);
  E.cap("Too short 😅").face("inky", "worry").wait(1.8);

  E.music("sneaky").face("inky", "smile").draw("inky", "trampoline", 300, 1250, { s: 0.9 }).wait(0.3);
  E.walk("inky", 300, 0.6).wait(0.6);
  E.cap("Trampoline! 🤸");
  E.sfx("boing", 0.45);
  E.to("#inky", { keyframes: [{ y: 1180, duration: 0.15 }, { y: 1250, duration: 0.12 }, { x: 1100, y: 350, duration: 0.9, ease: "power2.out" }, { x: 1750, y: 200, duration: 0.6, ease: "none" }] }, 1.8).wait(1.9);
  E.face("inky", "o").cap("…way too far", 1.6).wait(1.6);
  // he comes back from the LEFT edge
  E.music("chase").set("#inky", { x: -700, y: 300 }).sfx("whoosh", 0.4, 0.4);
  E.to("#inky", { keyframes: [{ x: 0, y: 700, duration: 0.5, ease: "none" }, { x: 160, y: 1250, duration: 0.5, ease: "power2.in" }] }, 1.0).wait(1.0);
  E.quake(8).sfx("thud", 120, 0.3, 0.7).squash("#inky", 0.3, 0.7).wait(0.4);
  E.cap("The page is ROUND? 🌍").face("inky", "o").wait(2.2);
  E.music("happy").face("inky", "smile").erase("#pit", 560, 1240, { w: 200 }).wait(0.5);
  E.walk("inky", 940, 2.0).wait(2.0);
  E.hop("#inky", 50, 1).hide("#apple", 0.2).sfx("crunch", 0.5).wait(0.5);
  E.cap("Should've started with that 🙃", 2.8).wait(2.8).end(0.4);
});
