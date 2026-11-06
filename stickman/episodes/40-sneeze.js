EPISODE({ title: "The Sneeze", seed: 437, music: "happy" }, (E) => {
  E.pageNo(40).fig("inky", 300);
  E.draw("inky", "tree", 620, 1250, { id: "tr", s: 0.8, speed: 2600 }).draw("inky", "sun", 900, 560, { id: "sn", s: 0.7 }).draw("inky", "cake", 1120, 1250, { id: "ck", s: 0.9 }).wait(0.4);
  E.cap("My perfect page 🌳☀️🎂", 2.0).face("inky", "smile").wait(2.0);
  E.monster("mon", 1950).walk("mon", 1350, 1.0).wait(1.0);
  E.prop({ s: [[[0, 0], [8, 0]], [[20, -10], [26, -10]], [[10, -24], [16, -24]]], w: 6, color: "#8d97ad" }, 380, 950, { id: "dust", hidden: true });
  E.show("#dust", 0.1).to("#dust", { x: -10, y: -10 }, 0.8).cap("…dust? 🤧").wait(1.0);
  E.face("inky", "o").cap("ah…").wait(0.6).cap("ah… AH…").to("#inky", { rotation: -10, transformOrigin: "50% 100%" }, 0.4).wait(0.8);
  E.music("chase").to("#inky", { rotation: 12 }, 0.08).cap("ACHOO 💥").sfx("whoosh", 1.0, 0.8).shake("#art", 14, 0.5).hide("#dust", 0.05);
  E.to(["#tr", "#sn", "#ck"], { x: 1500, rotation: 80, transformOrigin: "50% 50%", ease: "power2.in", stagger: 0.08 }, 0.7);
  E.to("#mon", { x: 2100, rotation: 120, transformOrigin: "50% 50%", ease: "power2.in" }, 0.8, 0.15).wait(1.2);
  E.to("#inky", { rotation: 0 }, 0.3).wait(0.4);
  E.cap("…bless me 😅").wait(1.6);
  E.music("happy").cap("Starting over ✏️").draw("inky", "heart", 640, 1250, { s: 0.8 }).wait(0.3);
  E.hop("#inky", 40, 1).cap("Small page, big heart ❤️", 2.6).wait(2.6).end(0.3);
});
