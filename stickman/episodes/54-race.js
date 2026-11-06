EPISODE({ title: "The Race", seed: 591, music: "chase" }, (E) => {
  E.pageNo(54).fig("inky", 150).dog("dog", 150, { layer: "front", y: 1290 });
  E.draw("inky", { s: [[[1200, 1250], [1200, 900]], PROPS._rect(1200, 900, 1300, 960)], f: [{ p: PROPS._rect(1200, 900, 1300, 960), c: "#e63946" }] }, 0, 0, { id: "flag" }).wait(0.2);
  E.cap("Race to the flag 🏁", 1.8).wait(1.0);
  E.cap("GO!").sfx("ding", 0.3).walk("dog", 1400, 1.4).walk("inky", 450, 1.4).wait(1.6);
  E.cap("…the dog is fast 😩").face("inky", "sad").wait(1.2);
  E.face("inky", "smile").draw("inky", { s: [PROPS._rect(-60, -20, 60, 0), PROPS._ring(-40, 10, 12, 12, 10), PROPS._ring(40, 10, 12, 12, 10)], f: [{ p: PROPS._rect(-60, -20, 60, 0), c: "#e63946" }] }, 450, 1250, { id: "sk", attach: "inky" }).wait(0.2);
  E.prop("flame", 380, 1235, { id: "fl", attach: "inky", rot: 90, s: 0.8 });
  E.cap("Rocket skateboard 🚀🛹").to("#inky-upper", { y: -25 }, 0.1).to("#inky-legsWrap", { y: -25 }, 0.1).wait(0.3);
  E.to("#inky", { x: 2000, ease: "power2.in" }, 0.9).sfx("whoosh", 0.9, 0.6).wait(0.9);
  E.cap("…missed the flag 😅", 1.4).wait(1.4);
  E.set("#inky", { x: -700 }).to("#inky", { x: 1200, ease: "power2.out" }, 1.0).sfx("whoosh", 0.8, 0.5).wait(1.0);
  E.quake(10).sfx("slam", 0.8).cap("…round page = WIN 🏁🌍").hop("#inky", 50, 2).wait(1.6);
  E.wag("dog", 8).cap("Rematch? 🐶", 2.6).wait(2.6).end(0.3);
});
