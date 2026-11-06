EPISODE({ title: "Ice Cream", seed: 338, music: "happy" }, (E) => {
  E.pageNo(31).fig("inky", 380);
  E.prop("sun", 1150, 520, { id: "sun", s: 0.9 });
  E.cap("Hot day ☀️", 1.6).wait(0.2);
  E.draw("inky", "icecream", 452, 1085, { id: "ic", s: 0.8, attach: "inky" }).wait(0.3);
  E.cap("Ice cream 🍦").face("inky", "smile").wait(1.0);
  E.to("#ic", { scaleY: 0.85, transformOrigin: "50% 100%" }, 1.2).sfx("rumble", 1.0, 0.2).wait(0.6);
  E.cap("…melting 😰").face("inky", "worry").wait(1.2);
  E.draw("inky", "fan", 600, 1250, { id: "fan", s: 0.8 }).wait(0.2);
  E.to("#fan", { keyframes: { rotation: [0, 4, -4, 4, -4, 0] }, svgOrigin: "600 1110" }, 0.8).sfx("rumble", 1.2, 0.5).cap("Fan on max 🌀").wait(0.4);
  // the scoop flies off
  E.prop({ s: [PROPS._ring(0, -110, 40, 36)], f: [{ p: PROPS._ring(0, -110, 40, 36), c: "#ff9fb2" }] }, 452, 1085, { id: "scoop", s: 0.8, hidden: true });
  E.set("#scoop", { opacity: 1 }).wait(0.3);
  E.to("#scoop", { keyframes: [{ x: -260, y: -260, duration: 0.4, ease: "power2.out" }, { x: -470, y: 60, duration: 0.4, ease: "power2.in" }] }, 0.8).sfx("whoosh", 0.4, 0.4).wait(0.6);
  E.cap("NOOO 😭").face("inky", "o").wait(0.6);
  E.music("bright").dog("dog", -700).walk("dog", 40, 0.6).wait(0.6).sfx("pop", 600, 0.3);
  E.wait(0.3).show("#dog-tongue", 0.1).wag("dog", 10).cap("…caught it 🐶").wait(1.4);
  E.hide("#scoop", 0.4).sfx("crunch", 0.4).hearts(90, 960, 2).wait(1.2);
  E.face("inky", "sad").cap("Dog approved 🐶🍦", 2.6).wait(2.6).end(0.3);
});
