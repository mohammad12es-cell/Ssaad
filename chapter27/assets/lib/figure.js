/* CHAPTER 27 — shared helpers for drawn scenes.
 *
 * HFFig: poses the articulated protagonist silhouette (markup lives in each scene file,
 *        see the <g class="fig"> blocks). Joints rotate around fixed points in figure space:
 *        hip (0,0) · neck (0,-105) · shoulders (0,-98) · elbows (0,-36) · knees (0,92).
 *        Angles in degrees; 0 = limb hanging straight down, + = swings backward
 *        (the figure faces screen-right). "L" = the LEFT (near, hitting) side — he is left-handed.
 * HFDust: deterministic dust / particle field drawn on a <canvas> from timeline time only.
 * Everything here is a pure function of time: no clock, no Math.random().
 */
(function () {
  var ORIGINS = {
    torso: "0 0",
    neck: "0 -105",
    shL: "0 -98",
    elL: "0 -36",
    shR: "0 -98",
    elR: "0 -36",
    hipL: "0 0",
    knL: "0 92",
    hipR: "0 0",
    knR: "0 92",
  };

  var POSES = {
    stand: { torso: 3, neck: 0, shL: 6, elL: -12, shR: -6, elR: -16, hipL: -4, knL: 4, hipR: 5, knR: 6 },
    look: { torso: -2, neck: -12, shL: 4, elL: -8, shR: -3, elR: -10, hipL: -3, knL: 3, hipR: 4, knR: 4 },
    dribbleUp: { torso: 10, neck: 8, shL: -38, elL: -55, shR: -8, elR: -20, hipL: -12, knL: 18, hipR: 8, knR: 14 },
    dribbleDown: { torso: 14, neck: 10, shL: -20, elL: -12, shR: -8, elR: -22, hipL: -14, knL: 22, hipR: 8, knR: 16 },
    stepA: { torso: 6, neck: 0, shL: 22, elL: -18, shR: -22, elR: -26, hipL: -24, knL: 8, hipR: 20, knR: 30 },
    stepB: { torso: 6, neck: 0, shL: -22, elL: -26, shR: 22, elR: -18, hipL: 20, knL: 30, hipR: -24, knR: 8 },
    runA: { torso: 18, neck: -6, shL: 50, elL: -70, shR: -45, elR: -80, hipL: -50, knL: 30, hipR: 35, knR: 85 },
    runB: { torso: 18, neck: -6, shL: -45, elL: -80, shR: 50, elR: -70, hipL: 35, knL: 85, hipR: -50, knR: 30 },
    load: { torso: 38, neck: -22, shL: 75, elL: -8, shR: 70, elR: -8, hipL: -78, knL: 108, hipR: -68, knR: 100 },
    rise: { torso: -4, neck: -14, shL: -165, elL: -10, shR: -170, elR: -10, hipL: -8, knL: 14, hipR: 0, knR: 18 },
    cock: { torso: -14, neck: -16, shL: 168, elL: 70, shR: -150, elR: -12, hipL: 18, knL: 62, hipR: 32, knR: 82 },
    contact: { torso: 22, neck: -6, shL: -172, elL: -2, shR: -50, elR: -40, hipL: -18, knL: 34, hipR: -6, knR: 46 },
    follow: { torso: 38, neck: 4, shL: -38, elL: -14, shR: 18, elR: -30, hipL: -34, knL: 30, hipR: -16, knR: 40 },
    land: { torso: 30, neck: -6, shL: 20, elL: -30, shR: 10, elR: -30, hipL: -60, knL: 88, hipR: -50, knR: 80 },
    squatTop: { torso: 8, neck: -4, shL: 40, elL: -150, shR: 40, elR: -150, hipL: -6, knL: 6, hipR: -6, knR: 6 },
    squatBottom: { torso: 38, neck: -18, shL: 40, elL: -150, shR: 40, elR: -150, hipL: -95, knL: 115, hipR: -95, knR: 115 },
    tired: { torso: 55, neck: -28, shL: -22, elL: -8, shR: -18, elR: -10, hipL: -48, knL: 58, hipR: -42, knR: 54 },
  };

  function HFFig(rootSelector) {
    var root = document.querySelector(rootSelector);
    var parts = {};
    gsap.set(root, { svgOrigin: "0 0" }); // hip = (x, y); scale/flip around the hip
    Object.keys(ORIGINS).forEach(function (k) {
      var el = root.querySelector(".j-" + k);
      parts[k] = el;
      gsap.set(el, { svgOrigin: ORIGINS[k], rotation: POSES.stand[k] || 0 });
    });
    return {
      root: root,
      parts: parts,
      poses: POSES,
      /* Add a tween to the pose `name` on timeline `tl` at time `at`. */
      pose: function (tl, name, at, dur, ease) {
        var p = typeof name === "string" ? POSES[name] : name;
        Object.keys(p).forEach(function (k) {
          tl.to(parts[k], { rotation: p[k], duration: dur, ease: ease || "sine.inOut" }, at);
        });
        return this;
      },
      setPose: function (tl, name, at) {
        var p = POSES[name];
        Object.keys(p).forEach(function (k) {
          tl.set(parts[k], { rotation: p[k] }, at);
        });
      },
      /* Alternate two poses from `at` for `count` half-cycles of `half` seconds. */
      cycle: function (tl, a, b, at, half, count) {
        for (var i = 0; i < count; i++) this.pose(tl, i % 2 ? b : a, at + i * half, half, "sine.inOut");
        return this;
      },
    };
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* opts: {seed, count, color:[r,g,b], minR, maxR, drift:[vx,vy] px/s, sway, alpha, region:{x,y,w,h},
   *        light:{x,y,r} (particles brighter inside this circle)} */
  function HFDust(canvas, opts) {
    var ctx = canvas.getContext("2d");
    var W = canvas.width,
      H = canvas.height;
    var rnd = mulberry32(opts.seed || 1);
    var reg = opts.region || { x: 0, y: 0, w: W, h: H };
    var ps = [];
    for (var i = 0; i < (opts.count || 80); i++) {
      ps.push({
        x: reg.x + rnd() * reg.w,
        y: reg.y + rnd() * reg.h,
        r: (opts.minR || 0.6) + rnd() * ((opts.maxR || 2.2) - (opts.minR || 0.6)),
        p: rnd() * 6.283,
        s: 0.4 + rnd() * 0.9,
        a: 0.35 + rnd() * 0.65,
      });
    }
    var c = opts.color || [241, 220, 170];
    var drift = opts.drift || [6, -4];
    return function draw(t, gain) {
      gain = gain == null ? 1 : gain;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < ps.length; i++) {
        var q = ps[i];
        var x = q.x + drift[0] * q.s * t + Math.sin(t * 0.6 * q.s + q.p) * (opts.sway || 10);
        var y = q.y + drift[1] * q.s * t + Math.cos(t * 0.45 * q.s + q.p) * (opts.sway || 10) * 0.6;
        x = reg.x + ((((x - reg.x) % reg.w) + reg.w) % reg.w);
        y = reg.y + ((((y - reg.y) % reg.h) + reg.h) % reg.h);
        var a = q.a * (opts.alpha || 0.5) * gain * (0.6 + 0.4 * Math.sin(t * 1.3 * q.s + q.p * 2));
        if (opts.light) {
          var dx = x - opts.light.x,
            dy = y - opts.light.y;
          var k = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / opts.light.r);
          a *= 0.15 + 0.85 * k;
        }
        if (a <= 0.003) continue;
        ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(x, y, q.r, 0, 6.283);
        ctx.fill();
      }
    };
  }

  /* Drive a draw(t) function from a timeline for [at, at+dur). */
  function HFDrive(tl, draw, at, dur) {
    var o = { t: 0 };
    tl.fromTo(o, { t: 0 }, { t: dur, duration: dur, ease: "none", onUpdate: function () { draw(o.t); } }, at);
    draw(0);
  }

  window.HFFig = HFFig;
  window.HFDust = HFDust;
  window.HFDrive = HFDrive;
  window.HFRand = mulberry32;
})();
