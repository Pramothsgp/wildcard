// Outdoor worlds: a Pongal harvest field at sunrise and a floodlit cricket stadium at night.
import * as THREE from "three";
import { type World, canvasTex, glowDisc, skyDome, spriteMat } from "./backdrops";

function ground(tex: THREE.Texture, radius: number, y: number) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
}

// ---------- Pongal: paddy and sugarcane fields at sunrise, a kolam under the table ----------

export function buildHarvest(): World {
  const group = new THREE.Group();
  group.add(skyDome([[0, "#6fb6e8"], [0.4, "#ffd9a0"], [0.5, "#ffb35c"], [0.56, "#6a8a2a"], [1, "#2a3a10"]]));
  const field = canvasTex(256, 256, (g) => {
    g.fillStyle = "#5f8f2a";
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 8) { g.fillStyle = y % 16 ? "#6ea432" : "#557f24"; g.fillRect(0, y, 256, 4); }
  }, [30, 30]);
  group.add(ground(field, 240, -10));
  // A big kolam painted on the ground right under the table.
  const kolamTex = canvasTex(512, 512, (g) => {
    g.fillStyle = "#c98a3a";
    g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#fff6e0";
    g.lineWidth = 6;
    for (let y = 96; y <= 416; y += 64) for (let x = 96; x <= 416; x += 64) {
      g.fillStyle = "#fff6e0"; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
      if ((x + y) % 128 === 0) { g.beginPath(); g.arc(x, y, 28, 0, Math.PI * 2); g.stroke(); }
    }
    g.lineWidth = 10;
    g.strokeStyle = "#e5383b";
    g.beginPath(); g.arc(256, 256, 236, 0, Math.PI * 2); g.stroke();
  });
  const kolam = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshStandardMaterial({ map: kolamTex, transparent: true, roughness: 1 }));
  kolam.rotation.x = -Math.PI / 2;
  kolam.position.y = -9.95;
  group.add(kolam);
  // Clumps of sugarcane: purple stalks with green tops, swaying.
  const stalk = new THREE.CylinderGeometry(0.18, 0.22, 7, 6);
  const stalkMat = new THREE.MeshStandardMaterial({ color: "#6a2f5e", roughness: 0.6 });
  const topGeo = new THREE.ConeGeometry(1.2, 2.6, 6);
  const topMat = new THREE.MeshStandardMaterial({ color: "#5aa02c", roughness: 0.8 });
  const clumps: THREE.Group[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + Math.random() * 0.1;
    const r = 32 + Math.random() * 40;
    const clump = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const s = new THREE.Mesh(stalk, stalkMat);
      s.position.set((Math.random() - 0.5) * 2, 3.5, (Math.random() - 0.5) * 2);
      s.rotation.z = (Math.random() - 0.5) * 0.2;
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = 4.4;
      s.add(top);
      clump.add(s);
    }
    clump.position.set(Math.cos(a) * r, -10, Math.sin(a) * r);
    clump.userData.phase = Math.random() * 6;
    clumps.push(clump);
    group.add(clump);
  }
  // Clay pots boiling over around the kolam.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), new THREE.MeshStandardMaterial({ color: "#a0522d", roughness: 0.8 }));
    pot.position.set(Math.cos(a) * 26, -9.2, Math.sin(a) * 26);
    const foam = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshStandardMaterial({ color: "#fffaf0" }));
    foam.position.y = 0.8;
    pot.add(foam);
    group.add(pot);
  }
  const sun = new THREE.Sprite(spriteMat(glowDisc("#fff2b0"), 1));
  sun.position.set(-60, 8, -150);
  sun.scale.setScalar(70);
  group.add(sun);
  const warm = new THREE.HemisphereLight("#ffe2b0", "#3a5a1a", 0.6);
  group.add(warm);
  let t = 0;
  return {
    group,
    background: "#ffd9a0",
    tick(dt) {
      t += dt;
      for (const c of clumps) c.rotation.z = Math.sin(t * 1.2 + c.userData.phase) * 0.04;
    },
  };
}

// ---------- Cricket: a floodlit stadium at night, the table over the pitch ----------

export function buildStadium(): World {
  const group = new THREE.Group();
  group.add(skyDome([[0, "#04061a"], [0.45, "#0c1a3a"], [0.52, "#1a2a5a"], [0.6, "#05060f"], [1, "#020208"]]));
  const grass = canvasTex(512, 512, (g) => {
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#2f8a3a" : "#277a32"; g.fillRect(0, i * 32, 512, 32); }
  }, [6, 6]);
  group.add(ground(grass, 90, -12));
  // The pitch: a brown strip with white creases, straight under the table.
  const pitchTex = canvasTex(64, 256, (g) => {
    g.fillStyle = "#c9a46a";
    g.fillRect(0, 0, 64, 256);
    g.fillStyle = "#ffffff";
    for (const y of [28, 228]) g.fillRect(0, y, 64, 3);
    for (const y of [12, 244]) g.fillRect(8, y, 48, 3);
  });
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(6, 26), new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 1 }));
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.y = -11.95;
  group.add(pitch);
  const rope = new THREE.Mesh(new THREE.TorusGeometry(70, 0.3, 8, 160), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  rope.rotation.x = Math.PI / 2;
  rope.position.y = -11.8;
  group.add(rope);
  // Stands: tiers of seats packed with a crowd in many colours.
  const crowd = canvasTex(256, 64, (g) => {
    g.fillStyle = "#1a1d2e";
    g.fillRect(0, 0, 256, 64);
    const cols = ["#ff9933", "#ffffff", "#138808", "#1f7ae0", "#e5383b", "#f4b400"];
    for (let y = 3; y < 64; y += 6) for (let x = 2; x < 256; x += 5) {
      g.fillStyle = cols[Math.floor(Math.random() * cols.length)];
      g.fillRect(x, y, 3, 3);
    }
  }, [12, 1]);
  for (let tier = 0; tier < 3; tier++) {
    const r = 96 + tier * 14;
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(r + 12, r, 10, 96, 1, true),
      new THREE.MeshStandardMaterial({ map: crowd, side: THREE.BackSide, roughness: 0.9, emissive: "#ffffff", emissiveMap: crowd, emissiveIntensity: 0.25 }),
    );
    stand.position.y = -8 + tier * 9;
    group.add(stand);
  }
  // Four floodlight towers with bright lamp banks.
  const flood = spriteMat(glowDisc("#f4f8ff"), 1);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 60, 8), new THREE.MeshStandardMaterial({ color: "#5a6070" }));
    tower.position.set(Math.cos(a) * 118, 16, Math.sin(a) * 118);
    group.add(tower);
    const lamp = new THREE.Sprite(flood);
    lamp.position.set(Math.cos(a) * 116, 48, Math.sin(a) * 116);
    lamp.scale.setScalar(26);
    group.add(lamp);
  }
  const light = new THREE.HemisphereLight("#e8f0ff", "#1a3a1a", 0.7);
  group.add(light);
  return { group, background: "#020208", tick() {} };
}
