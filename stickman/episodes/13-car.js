EPISODE({ title: "Road Trip", seed: 140, music: "happy" }, (E) => {
  E.pageNo(13).fig("inky", 300);
  E.cap("Road trip! 🚗", 1.8).wait(0.3);
  E.draw("inky", "squareCar", 700, 1250, { id: "car", speed: 2400 }).wait(0.2);
  E.walk("inky", 640, 0.6).wait(0.6).hide("#inky", 0.1).sfx("slam", 0.4).wait(0.4);
  E.cap("Square wheels 🙃", 2.4);
  for (let i = 0; i < 6; i++) { E.to("#car", { keyframes: [{ y: -40, duration: 0.14 }, { y: 0, duration: 0.14 }], x: `+=${18}` }, 0.28); E.sfx("thud", 180, 0.15, 0.5).wait(0.32); }
  E.set("#inky", { x: 600 }).show("#inky", 0.1).face("inky", "worry").wait(0.5);
  E.music("sneaky").face("inky", "smile").cap("Round ones ⭕");
  E.draw("inky", "wheel", 638, 1250, { id: "w1", s: 1.4 }).draw("inky", "wheel", 883, 1250, { id: "w2", s: 1.4 }).wait(0.4);
  E.music("chase").sfx("rumble", 0.6, 0.4).to(["#car", "#w1", "#w2"], { x: "+=1300", ease: "power2.in" }, 0.9).wait(0.9);
  E.face("inky", "o").cap("WAIT! 🚗💨").wait(0.8);
  E.walk("inky", 1900, 1.4).wait(1.6);
  // the round page brings everyone back from the left
  E.set(["#car", "#w1", "#w2"], { x: -1900 }).set("#inky", { x: -700 });
  E.to(["#car", "#w1", "#w2"], { x: "+=1700", ease: "power2.out" }, 1.4).wait(0.5).walk("inky", 330, 1.6).wait(1.7);
  E.music("bright").face("inky", "smile").cap("Round page 🌍 (again)").wait(1.4);
  E.walk("inky", 440, 0.5).wait(0.5).hide("#inky", 0.1).sfx("slam", 0.4).wait(0.3);
  E.to(["#car", "#w1", "#w2"], { x: "+=1500", ease: "power2.in" }, 1.0).sfx("whoosh", 0.6, 0.4).wait(1.0);
  E.cap("Beep beep 🚗", 2.4).wait(2.4).end(0.3);
});
