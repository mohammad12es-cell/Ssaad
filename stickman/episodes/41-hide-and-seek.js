EPISODE({ title: "Hide and Seek", seed: 448, music: "sneaky" }, (E) => {
  E.pageNo(41).fig("inky", 260).blot("pet", 640, { s: 0.8 });
  E.cap("Hide and seek 🙈", 1.8).wait(0.4);
  E.to("#inky", { scaleX: -1, transformOrigin: "50% 50%" }, 0.15).cap("1… 2… 3…").wait(1.6);
  E.draw(null, "tree", 900, 1250, { id: "tree", s: 0.9, speed: 3000, layer: "front" }).to("#pet", { x: 930 }, 0.4).wait(0.6);
  E.to("#inky", { scaleX: 1 }, 0.15).cap("Ready or not!").wait(1.0);
  E.walk("inky", 620, 1.0).wait(1.0).to("#pet", { y: 1250 - 140 }, 0.3).wait(0.4).to("#pet", { y: 1250 }, 0.2);
  E.face("inky", "smile").cap("Found you 😄").wait(1.4);
  E.to("#inky", { scaleX: -1 }, 0.15).cap("Again! 1… 2…").wait(0.6);
  E.draw(null, "wall", 1200, 1250, { id: "wall", s: 0.8, speed: 3000, layer: "front" }).to("#pet", { x: 1200 }, 0.4).wait(0.8);
  E.to("#inky", { scaleX: 1 }, 0.15).walk("inky", 980, 1.0).wait(1.0);
  E.prop({ s: [[[-20, -72], [-20, -68]], [[20, -72], [20, -68]]], w: 14, color: "#ffffff" }, 1200, 940, { id: "peek", hidden: true, layer: "front" });
  E.show("#peek", 0.1).wait(0.6).cap("…I see eyes 👀").wait(1.2).hide("#peek", 0.1);
  E.music("dreamy").to("#inky", { scaleX: -1 }, 0.15).cap("Last round…").wait(1.2);
  E.to("#pet", { x: 980, y: 1250 - 395, scale: 0.4, transformOrigin: "50% 100%" }, 0.5).wait(0.8);
  E.to("#inky", { scaleX: 1 }, 0.15).face("inky", "o").cap("Where did it go? 🤔").wait(1.0);
  E.walk("inky", 760, 0.8).to("#pet", { x: 760 }, 0.8).wait(0.8).walk("inky", 1100, 0.8).to("#pet", { x: 1100 }, 0.8).wait(0.9);
  E.cap("…it's on my head 😅", 2.6).wait(2.6).end(0.3);
});
