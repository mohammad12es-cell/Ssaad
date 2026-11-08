      // ---- EP06: midnight snack (night) ----
      const moon = K.mesh(K.SPH, new THREE.MeshBasicMaterial({ color: 0xfff4c8, fog: false }), K.scene, [26, 9, -26], [1.6, 1.6, 1.6]); moon.castShadow = false;
      const flies = []; for (let i = 0; i < 16; i++) { const f = new THREE.Mesh(K.SPH, new THREE.MeshBasicMaterial({ color: 0xfff27a })); f.scale.setScalar(0.035); K.scene.add(f); flies.push(f); }
      const lamp = new THREE.PointLight(0xffd27a, 0, 7, 1.4); lamp.position.set(20.6, 1.7, 2.4); K.scene.add(lamp);
      function fireflies(t, cx, cz) { flies.forEach((f, i) => { const a = i * 1.7 + t * (0.4 + (i % 4) * 0.1); f.position.set(cx + Math.cos(a) * (1.5 + (i % 5) * 0.5), 0.5 + (i % 4) * 0.35 + Math.sin(t * 2 + i) * 0.12, cz + Math.sin(a * 1.3) * 1.6); }); }
      function render(t) {
        fireflies(t, t < 6 ? 16 : 21.5, 1);
        if (t < 2.6) { // asleep -> growl -> eyes snap open
          K.peb.visible = false; K.pip.position.set(15.5, 0, 0.6); K.pip.rotation.y = 0.5;
          K.table.visible = false; const wake = t > 2.0; K.lids.forEach((l) => (l.rotation.x = wake ? -1.6 : 1.35));
          K.pipBody.scale.set(1, 1 + Math.sin(t * 3) * 0.03, 1);
          if (t > 1.3 && t < 2.0) K.pipBody.scale.set(1 + Math.sin(t * 40) * 0.04, 1, 1);
          if (wake) K.pipEyes.forEach((e) => e.scale.setScalar(1.25));
          show("zzz", t < 1.3); show("growl1", t > 1.3 && t < 2.3);
          K.cam(v3(16.2, 1.0, 2.9), v3(15.5, 0.85, 0.6), 30, 0.008);
        } else if (t < 6.0) { // tiptoe in the moonlight
          const lt = t - 2.6; K.peb.visible = false; K.table.visible = false; K.pip.rotation.y = Math.PI / 2;
          const px = 15.5 + 4.6 * (lt / 3.4); const step = Math.abs(Math.sin(lt * 7.2));
          K.pip.position.set(px, step * 0.16, 0.5); K.pipBody.rotation.x = 0.22; K.lids.forEach((l) => (l.rotation.x = -0.75));
          K.cam(v3(px - 1.2, 0.75, 4.4), v3(px + 0.5, 0.6, 0.4), 32, 0.005);
        } else if (t < 8.0) { // sly look, door creaks open
          const lt = t - 6.0; K.peb.visible = false; K.table.visible = false; K.pip.position.set(21.0, 0, 0.5); K.pip.rotation.y = 0.35;
          K.lids.forEach((l) => (l.rotation.x = -0.7));
          const dk = ease(cl((lt - 1.0) / 0.8)); K.doorHinge.rotation.y = -dk * 0.45; K.doorway.visible = dk > 0.01; K.doorLight.intensity = dk * 4;
          K.cam(v3(21.5, 1.15, 3.4), v3(21.2, 0.95, -0.4), 32, 0.006);
        } else if (t < 10.5) { // LIGHTS ON: Pebble is already there
          const lt = t - 8.0; K.table.visible = true; K.pip.position.set(20.2, 0, 0.9); K.pip.rotation.y = 0.9;
          K.smile.visible = false; K.mouthO.visible = true; K.pipEyes.forEach((e) => e.scale.setScalar(1.35));
          K.doorHinge.rotation.y = -1.6; K.doorway.visible = true; K.doorLight.intensity = 4.5; lamp.intensity = 3.5;
          K.peb.position.set(22.5, 0, 1.7); K.peb.rotation.y = -2.2;
          K.glint.scale.setScalar(Math.max(0.001, Math.sin(cl((lt - 0.5) / 0.4) * Math.PI) * 0.06));
          $("flash").style.opacity = Math.max(0, 0.8 - lt * 3);
          show("late", lt > 0.4);
          K.cam(v3(21.1, 1.5, 6.4), v3(21.5, 0.8, 1.0), 34, 0.003);
        } else if (t < 13.0) { // Pebble eats everything, burp
          const lt = t - 10.5; K.table.visible = true; K.pip.position.set(20.2, 0, 0.9); K.pip.rotation.y = 0.9; K.smile.visible = false; K.mouthO.visible = true;
          K.doorHinge.rotation.y = -1.6; K.doorway.visible = true; K.doorLight.intensity = 4.5; lamp.intensity = 3.5;
          K.peb.position.set(22.5, 0, 1.7); K.peb.rotation.y = -2.2;
          const eat = cl(lt / 1.6); K.plateFood.scale.setScalar(Math.max(0.001, 1 - eat)); K.pebBody.rotation.z = lt < 1.6 ? Math.sin(lt * 18) * 0.06 : 0;
          if (lt > 1.8) K.pebBody.scale.set(1.2, 1.1, 1.2);
          show("burp", lt > 1.8 && lt < 2.5);
          K.cam(v3(20.9, 1.25, 5.4), v3(22.3, 1.05, 1.7), 30, 0.005);
        } else { // growl again, pull back to the moon (loops to the start)
          const lt = t - 13.0; K.table.visible = true; K.pip.position.set(20.2, 0, 0.9); K.pip.rotation.y = 0.9; K.plateFood.visible = false;
          K.doorHinge.rotation.y = -1.6; K.doorway.visible = true; K.doorLight.intensity = 4.5; lamp.intensity = 3.5;
          K.peb.position.set(22.5, 0, 1.7); K.peb.rotation.y = -2.2; K.pebBody.scale.set(1.2, 1.1, 1.2);
          K.pipBody.scale.set(1.06, lerp(1, 0.82, ease(cl((lt - 0.4) / 0.6))), 1.06);
          if (lt < 0.6) K.pipBody.scale.x = 1 + Math.sin(lt * 40) * 0.05;
          show("growl2", lt < 1.4);
          const k = ease(cl((lt - 1.2) / 1.8));
          K.cam(v3(21.1, lerp(1.5, 2.2, k), lerp(6.4, 9.5, k)), v3(lerp(21.4, 25, k), lerp(0.8, 8, k), lerp(1.0, -24, k)), 34, 0.002);
        }
      }
