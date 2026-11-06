EPISODE({ title: "Slam Dunk", seed: 129, music: "happy" }, (E) => {
  E.pageNo(12).fig("inky", 360);
  E.draw("inky", "hoop", 1060, 1250, { id: "hoop", speed: 2600 }).wait(0.2);
  E.draw("inky", "ball", 430, 1100, { id: "ball", s: 0.8 }).wait(0.2);
  E.cap("Three pointer 🏀", 1.8).wait(1.2);
  // miss: hits the rim and bounces back on his head
  E.to("#ball", { x: 600, ease: "none" }, 0.7).to("#ball", { keyframes: [{ y: -300, duration: 0.35, ease: "power2.out" }, { y: -190, duration: 0.35, ease: "power2.in" }] }, 0.7).wait(0.7).sfx("pop", 600, 0.4);
  E.to("#ball", { x: 0, ease: "none" }, 0.6).to("#ball", { keyframes: [{ y: -420, duration: 0.3, ease: "power2.out" }, { y: -230, duration: 0.3, ease: "power2.in" }] }, 0.6).wait(0.6);
  E.sfx("thud", 300, 0.15, 0.6).squash("#inky", 0.25, 0.85).to("#ball", { y: 0, x: -120, ease: "bounce.out" }, 0.6).wait(0.4);
  E.stars(360, 880, 1.4).cap("Miss 😬").face("inky", "sad").wait(1.8);
  E.music("sneaky").face("inky", "smile").cap("Plan B: DUNK 😤").draw("inky", "trampoline", 640, 1250, { s: 0.8 }).wait(0.2);
  E.hide("#ball", 0.1).walk("inky", 640, 0.8).wait(0.8).sfx("boing", 0.45);
  E.to("#inky", { keyframes: [{ y: 1190, duration: 0.12 }, { y: 1250, duration: 0.1 }, { x: 900, y: 600, duration: 0.45, ease: "power2.out" }, { x: 1060, y: 1130, duration: 0.4, ease: "power2.in" }] }, 1.1).wait(1.1);
  E.sfx("slam", 0.6).shake("#hoop", 8, 0.3).wait(0.5);
  E.face("inky", "o").cap("…stuck 😐", 2.2).wait(1.4);
  E.monster("mon", 1950).walk("mon", 1350, 1.2).wait(1.2).laugh("mon", 0.8).wait(0.9);
  E.face("inky", "sad").cap("Don't. Say. Anything.", 2.6).wait(2.8).end(0.4);
});
