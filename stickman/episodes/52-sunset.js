EPISODE({ title: "Day or Night", seed: 569, music: "dreamy" }, (E) => {
  E.pageNo(52).fig("inky", 300).monster("mon", 1150);
  E.draw("inky", "sun", 560, 560, { id: "sun", s: 0.8 }).wait(0.2).cap("Daytime ☀️").face("inky", "smile").wait(1.2);
  const moon = { s: [[...PROPS._ring(0, -80, 80, 80, 18, -Math.PI / 2, Math.PI / 2), ...PROPS._ring(-25, -80, 60, 80, 14, Math.PI / 2, -Math.PI / 2)]], f: [{ p: [...PROPS._ring(0, -80, 80, 80, 18, -Math.PI / 2, Math.PI / 2), ...PROPS._ring(-25, -80, 60, 80, 14, Math.PI / 2, -Math.PI / 2)], c: "#ffe45c" }] };
  const night = E.el("rect", { x: -1000, y: -600, width: 3200, height: 3200, fill: "#1b2a4a", opacity: 0 }, E.$("back"));
  const dusk = E.el("rect", { x: -1000, y: -600, width: 3200, height: 3200, fill: "#ff9f6b", opacity: 0 }, E.$("back"));
  E.grin("mon").draw("mon", moon, 900, 640, { id: "moon", s: 0.8 }).to(night, { opacity: 0.75 }, 0.4).cap("Night 🌙").wait(1.2);
  E.to("#moon", { opacity: 0 }, 0.2).to(night, { opacity: 0 }, 0.3).cap("DAY ☀️").wait(0.8);
  E.to("#moon", { opacity: 1 }, 0.2).to(night, { opacity: 0.75 }, 0.3).cap("NIGHT 🌙").wait(0.8);
  E.to("#moon", { opacity: 0 }, 0.1).to(night, { opacity: 0 }, 0.15).wait(0.3).to("#moon", { opacity: 1 }, 0.1).to(night, { opacity: 0.75 }, 0.15).wait(0.3).to("#moon", { opacity: 0 }, 0.1).to(night, { opacity: 0 }, 0.15).wait(0.3);
  E.cap("…this could take a while 😑").wait(1.4);
  E.face("inky", "smile").cap("Compromise? 🤝").wait(0.4);
  E.to("#sun", { y: 520 }, 1.6).to("#moon", { opacity: 1, y: -60 }, 1.6).to(dusk, { opacity: 0.45 }, 1.6).sfx("ding", 0.3).wait(1.8);
  E.music("bright").cap("Sunset 🌅").hearts(720, 800, 3).grin("mon").wait(1.4);
  E.cap("Best of both 🧡", 2.6).wait(2.6).end(0.3);
});
