      // ---- EP07: "trust me, I know a shortcut" (day) ----
      const mk = K.mesh, M = K.M, S = K.SPH;
      const post = new THREE.Group(); K.scene.add(post); post.position.set(3.2, 0, -1.3);
      mk(new THREE.CylinderGeometry(0.06, 0.07, 2.0, 10), M(0x7a4a2a, { clearcoat: 0 }), post, [0, 1.0, 0]);
      const plank = (txt, y, rot, col) => { const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d");
        g.fillStyle = col; g.fillRect(0, 0, 512, 128); g.fillStyle = "#fff"; g.font = "bold 64px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 256, 68);
        const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
        const p = mk(new THREE.BoxGeometry(1.4, 0.34, 0.06), [M(0x8a5a35), M(0x8a5a35), M(0x8a5a35), M(0x8a5a35), new THREE.MeshStandardMaterial({ map: tx }), M(0x8a5a35)], post, [0.45, y, 0.05]); p.rotation.y = rot; return p; };
      plank("BUFFET →", 1.7, 0, "#a0673e"); plank("SHORTCUT ↘", 1.25, -0.25, "#c94f63");
      const bushes = []; [[5.6, 3.0, 0.9], [6.8, 3.6, 1.1], [7.9, 3.1, 0.85], [6.2, 4.6, 1.0], [8.9, 4.2, 1.2], [7.4, 5.4, 0.9]].forEach(([x, z, r], i) => {
        const b = mk(S, M(i % 2 ? 0x3c8a3f : 0x2f7d3a, { clearcoat: 0.2, roughness: 0.7 }), K.scene, [x, r * 0.7, z], [r, r * 0.85, r]); bushes.push(b); });
      const pond = mk(new THREE.CircleGeometry(1.7, 48), M(0x2f9de0, { roughness: 0.05, clearcoat: 1 }), K.scene, [12.2, 0.02, 4.4]); pond.rotation.x = -Math.PI / 2;
      const ripple = mk(new THREE.TorusGeometry(0.6, 0.03, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }), K.scene, [12.2, 0.04, 4.4]); ripple.rotation.x = -Math.PI / 2;
      const lily = mk(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 24, 1, false, 0.4, Math.PI * 1.8), M(0x3fa34d), K.scene, [0, 0, 0]);
      const hatFlower = new THREE.Group(); K.scene.add(hatFlower);
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; mk(S, M(0xff8fb1), hatFlower, [Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13], [0.1, 0.05, 0.1]); }
      mk(S, M(0xffe066), hatFlower, [0, 0.02, 0], [0.07, 0.05, 0.07]);
      function headPos() { const p = K.pip.position; return v3(p.x, p.y + 1.45 * K.pipBody.scale.y, p.z); }
      function render(t) {
        lily.visible = false; hatFlower.visible = false; ripple.visible = false; bushes.forEach((b, i) => (b.rotation.z = 0));
        if (t < 2.5) { // the wink
          K.pip.position.set(2.3, 0, 0.3); K.pip.rotation.y = 0.25; K.peb.position.set(0.9, 0, 0.9); K.peb.rotation.y = -0.6;
          if (t > 0.8 && t < 1.6) K.lids[1].rotation.x = 1.35;
          show("shortcut", t > 0.2);
          K.cam(v3(2.2, 1.25, 4.8), v3(2.2, 0.95, 0), 32, 0.004);
        } else if (t < 4.2) { // dives into the bushes
          const lt = t - 2.5; const k = ease(cl(lt / 0.9));
          K.pip.position.set(lerp(2.3, 6.4, k), Math.sin(k * Math.PI) * 1.6, lerp(0.3, 3.3, k)); K.pip.rotation.y = 1.0;
          if (lt > 0.9) K.pip.visible = false;
          bushes.forEach((b, i) => (b.rotation.z = lt > 0.9 ? Math.sin(lt * 30 + i) * 0.12 * Math.max(0, 1.6 - lt) : 0));
          K.puffs(6.4, 0.8, 3.3, 3.4, t, 0x4f9a3a);
          K.peb.position.set(lerp(0.9, 1.3, lt / 1.7), 0, 0.9); K.peb.rotation.y = 0;
          K.cam(v3(3.2, 1.6, 8.0), v3(5.2, 0.7, 2.4), 34, 0.003);
        } else if (t < 7.0) { // lost: flower on head, trips
          const lt = t - 4.2; show("hour1", lt < 1.4);
          if (lt < 1.4) { K.pip.position.set(7.9, lerp(0.2, 1.2, ease(cl(lt / 0.4))), 3.1); K.pip.rotation.y = 0.3 + Math.sin(lt * 5) * 0.6; K.lids.forEach((l) => (l.rotation.x = -0.5)); }
          else { const k = cl((lt - 1.4) / 1.4); K.pip.position.set(lerp(8.6, 10.6, k), Math.abs(Math.sin(k * 9)) * 0.3, lerp(3.4, 4.1, k)); K.pip.rotation.y = 1.4; K.pipBody.rotation.x = k > 0.6 ? (k - 0.6) * 6 : 0; }
          hatFlower.visible = true; hatFlower.position.copy(headPos()).add(v3(0, 0.05, 0));
          bushes.forEach((b, i) => (b.rotation.z = lt < 0.6 ? Math.sin(lt * 30 + i) * 0.1 : 0));
          K.cam(v3(8.6, 1.3, 7.6), v3(9.0, 0.8, 3.6), 32, 0.004);
        } else if (t < 9.0) { // SPLASH
          const lt = t - 7.0; const k = cl(lt / 0.5);
          K.pip.position.set(lerp(10.6, 12.2, k), lt < 0.5 ? Math.sin(k * Math.PI) * 0.9 : lerp(0, -0.95, cl((lt - 0.5) / 0.3)), 4.4); K.pip.rotation.y = 0.4; K.pipBody.rotation.x = lt < 0.5 ? k * 3 : 0;
          if (lt > 0.5) { K.smile.visible = false; K.mouthO.visible = true; K.pipEyes.forEach((e) => e.scale.setScalar(1.25)); }
          ripple.visible = lt > 0.5; ripple.scale.setScalar(1 + (lt - 0.5) * 2.2); ripple.material.opacity = Math.max(0, 1 - (lt - 0.5) / 1.4);
          K.puffs(12.2, 0.1, 4.4, 7.5, t, 0x8fd3ff);
          show("splash", lt > 0.5);
          K.cam(v3(12.6, 0.9, 7.6), v3(12.2, 0.4, 4.4), 32, 0.004);
        } else if (t < 11.5) { // meanwhile, Pebble on the normal road
          const lt = t - 9.0; K.pip.visible = false; K.peb.rotation.y = 0;
          K.peb.position.set(lerp(18.4, 20.0, lt / 2.5), 0, 0.6);
          K.glint.scale.setScalar(Math.max(0.001, Math.sin(cl((lt - 1.0) / 0.4) * Math.PI) * 0.06));
          show("meanwhile", true);
          K.cam(v3(18.4 + lt * 0.5, 0.75, 3.6), v3(20.2 + lt * 0.4, 0.6, 0.4), 32, 0.004);
        } else { // Pip arrives soaked; loop wink
          const lt = t - 11.5;
          K.peb.position.set(22.4, 0, 1.6); K.peb.rotation.y = -2.2; K.plateFood.scale.setScalar(Math.max(0.001, 1 - cl(lt / 1.0)));
          if (lt > 1.0) K.pebBody.scale.set(1.15, 1.08, 1.15);
          K.pip.position.set(lerp(17.0, 20.1, ease(cl(lt / 0.8))), 0, 1.4); K.pip.rotation.y = lt < 0.8 ? Math.PI / 2 : 0.7;
          K.pipBody.scale.set(1, lt > 0.8 && lt < 2.6 ? 1 + 0.06 * Math.sin(lt * 18) : 1, 1);
          lily.visible = true; lily.position.copy(headPos()).add(v3(0, 0.02, 0)); hatFlower.visible = true; hatFlower.position.copy(headPos()).add(v3(0.15, 0.06, 0.05));
          show("hours", lt > 0.8 && lt < 2.9);
          if (lt > 3.0) { K.lids[1].rotation.x = lt > 3.2 && lt < 3.9 ? 1.35 : -1.6; show("better", true); K.pip.rotation.y = 0.3; }
          K.cam(v3(20.8, 1.5, 6.2), v3(21.2, 0.85, 1.3), 34, 0.003);
        }
      }
