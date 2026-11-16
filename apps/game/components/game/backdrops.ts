// The world around the floating table, one per theme: deep space, a temple courtyard at dusk,
// a neon city at night and a festival sky. The default camera looks down past the table, so most
// of each scene sits below the horizon where the player actually sees it.
import * as THREE from "three";

export type World = { group: THREE.Group; tick: (dt: number) => void; background: string };

export function glowDisc(color: string, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "transparent");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const spriteMat = (map: THREE.Texture, opacity = 1) =>
  new THREE.SpriteMaterial({ map, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });

function starSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function stars(n: number, rMin: number, rMax: number, size: number, onlyUpper = false) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const tint = [new THREE.Color("#ffffff"), new THREE.Color("#cfe0ff"), new THREE.Color("#ffe6c4"), new THREE.Color("#ffd1e8")];
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(rMin + Math.random() * (rMax - rMin));
    if (onlyUpper) v.y = Math.abs(v.y);
    pos.set([v.x, v.y, v.z], i * 3);
    const c = tint[i % tint.length].clone().multiplyScalar(0.5 + Math.random() * 0.5);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size, map: starSprite(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
}

/** A huge inside-out sphere with a vertical gradient, top colour first. */
export function skyDome(stops: [number, string][]) {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  for (const [at, col] of stops) grad.addColorStop(at, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false, toneMapped: false }));
}

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

// ---------- Space: stars, nebulae, a ringed gas giant and a moon ----------

export function buildSpace(): World {
  const group = new THREE.Group();
  group.add(stars(4000, 150, 230, 1.6));
  for (const [color, x, y, z, s] of [
    ["#6a2cff", -70, -110, -90, 150], ["#ff3d9a", 90, -80, -110, 130], ["#1fb6ff", 10, -150, -40, 170], ["#ff9a3d", -120, -40, 60, 110], ["#3d6bff", 60, 60, -120, 140],
  ] as const) {
    const cloud = new THREE.Sprite(spriteMat(glowDisc(color), 0.22));
    cloud.position.set(x, y, z);
    cloud.scale.setScalar(s);
    group.add(cloud);
  }
  const bandTex = canvasTex(512, 256, (g) => {
    for (let y = 0; y < 256; y += 4) {
      const t = Math.sin(y * 0.09) * 0.5 + Math.sin(y * 0.031) * 0.5;
      g.fillStyle = `hsl(${26 + t * 14}, ${45 + t * 15}%, ${42 + t * 14}%)`;
      g.fillRect(0, y, 512, 4);
    }
  });
  const planet = new THREE.Group();
  const globe = new THREE.Mesh(new THREE.SphereGeometry(18, 64, 32), new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.9 }));
  const rings = new THREE.Mesh(
    new THREE.RingGeometry(23, 34, 128),
    new THREE.MeshBasicMaterial({ color: "#e8cfa0", transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  rings.rotation.x = Math.PI / 2.4;
  planet.add(globe, rings);
  planet.position.set(-85, -70, -100);
  planet.rotation.z = 0.35;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 32, 16), new THREE.MeshStandardMaterial({ color: "#b9bcc8", roughness: 1 }));
  moon.position.set(80, -50, -85);
  group.add(planet, moon);
  return {
    group,
    background: "#02030a",
    tick(dt) {
      group.rotation.y += dt * 0.004;
      globe.rotation.y += dt * 0.03;
    },
  };
}

// ---------- Temple courtyard at dusk: stone floor, gopuram towers and oil lamps ----------

/** Carved tier: a row of shrine niches with pillars and a cornice, like a gopuram storey. */
const nicheTex = () => canvasTex(256, 64, (g) => {
  g.fillStyle = "#9a7a56";
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#6a4e34";
  g.fillRect(0, 0, 256, 8);
  g.fillRect(0, 56, 256, 8);
  for (let x = 8; x < 256; x += 32) {
    g.fillStyle = "#3a2818";
    g.beginPath(); g.moveTo(x + 4, 52); g.lineTo(x + 4, 24); g.quadraticCurveTo(x + 12, 10, x + 20, 24); g.lineTo(x + 20, 52); g.fill();
    g.fillStyle = "#b8956a";
    g.fillRect(x, 14, 3, 40);
    g.fillRect(x + 22, 14, 3, 40);
    g.beginPath(); g.arc(x + 12, 36, 4, 0, Math.PI * 2); g.fill();
  }
}, [2, 1]);

function gopuram(scale: number) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: "#c8a47c", map: nicheTex(), roughness: 0.95 });
  const trim = new THREE.MeshStandardMaterial({ color: "#7a5a3a", roughness: 0.8 });
  let y = 0;
  for (let i = 0; i < 7; i++) {
    const w = (14 - i * 1.6) * scale;
    const d = (8 - i * 0.8) * scale;
    const h = (i === 0 ? 6 : 2.6) * scale;
    const tier = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stone);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6 * scale, 0.35 * scale, d + 0.6 * scale), trim);
    ledge.position.y = y + h;
    g.add(ledge);
    tier.position.y = y + h / 2;
    g.add(tier);
    y += h;
  }
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * scale, 2.4 * scale, 3 * scale, 12, 1, false, 0, Math.PI), trim);
  roof.rotation.z = Math.PI / 2;
  roof.position.y = y + 1.2 * scale;
  g.add(roof);
  for (const x of [-3, 0, 3]) {
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.45 * scale, 10, 8), new THREE.MeshStandardMaterial({ color: "#e6c06a", metalness: 0.8, roughness: 0.3 }));
    k.position.set(x * scale, y + 3 * scale, 0);
    g.add(k);
  }
  return g;
}

export function buildTemple(): World {
  const group = new THREE.Group();
  group.add(skyDome([[0, "#1b1640"], [0.42, "#5a2a5a"], [0.5, "#e07a3c"], [0.56, "#3a1c14"], [1, "#120a06"]]));
  group.add(stars(600, 200, 260, 1.2, true));
  const floorTex = canvasTex(256, 256, (g) => {
    g.fillStyle = "#5a4634";
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "rgba(20,12,6,0.6)";
    g.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
  }, [40, 40]);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(220, 64), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -10;
  group.add(floor);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const t = gopuram(i % 2 ? 1.3 : 1.7);
    t.position.set(Math.cos(a) * 44, -10, Math.sin(a) * 44);
    t.lookAt(0, -10, 0);
    group.add(t);
  }
  // A ring of oil lamps on the courtyard floor, flickering.
  const flames: THREE.Sprite[] = [];
  const flameMat = spriteMat(glowDisc("#ffb347"), 0.9);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const f = new THREE.Sprite(flameMat);
    f.position.set(Math.cos(a) * 22, -9.2, Math.sin(a) * 22);
    f.scale.setScalar(2.2);
    f.userData.phase = Math.random() * 10;
    flames.push(f);
    group.add(f);
  }
  const warm = new THREE.PointLight("#ff9a3d", 120, 60, 2);
  warm.position.set(0, -6, 0);
  group.add(warm);
  let t = 0;
  return {
    group,
    background: "#120a06",
    tick(dt) {
      t += dt;
      for (const f of flames) f.scale.setScalar(2 + Math.sin(t * 9 + f.userData.phase) * 0.35);
    },
  };
}

// ---------- Neon city at night: lit towers below the table and neon strips ----------

export function buildCity(): World {
  const group = new THREE.Group();
  group.add(skyDome([[0, "#05030f"], [0.45, "#1c0f3a"], [0.52, "#5a1a6a"], [0.6, "#0a0618"], [1, "#030208"]]));
  const windows = canvasTex(64, 128, (g) => {
    g.fillStyle = "#0b0d18";
    g.fillRect(0, 0, 64, 128);
    for (let y = 4; y < 128; y += 8) {
      for (let x = 4; x < 64; x += 8) {
        if (Math.random() < 0.45) {
          g.fillStyle = ["#ffd98a", "#9ad8ff", "#ffe9c4"][Math.floor(Math.random() * 3)];
          g.fillRect(x, y, 4, 5);
        }
      }
    }
  });
  const neon = ["#ff2e93", "#00e5ff", "#a855f7", "#ffcc00"];
  const signs: THREE.Mesh[] = [];
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 55 + Math.random() * 100;
    const w = 6 + Math.random() * 8;
    const h = 40 + Math.random() * 90;
    const tex = windows.clone();
    tex.needsUpdate = true;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.round(w / 4), Math.round(h / 10));
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, w),
      new THREE.MeshStandardMaterial({ color: "#1a1d2e", emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.9, roughness: 0.6 }),
    );
    // Tops sit just below the table so you look down into the city.
    tower.position.set(Math.cos(a) * r, -26 - h / 2 - Math.random() * 24, Math.sin(a) * r);
    group.add(tower);
    if (i % 3 === 0) {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.6, 0.3), new THREE.MeshBasicMaterial({ color: neon[i % 4], toneMapped: false }));
      sign.position.set(tower.position.x, tower.position.y + h / 2 - 3, tower.position.z);
      sign.lookAt(0, sign.position.y, 0);
      sign.translateZ(w / 2 + 0.2);
      sign.userData.phase = Math.random() * 6;
      signs.push(sign);
      group.add(sign);
    }
  }
  const haze = new THREE.Sprite(spriteMat(glowDisc("#a855f7"), 0.25));
  haze.position.set(0, -70, 0);
  haze.scale.setScalar(260);
  group.add(haze);
  let t = 0;
  return {
    group,
    background: "#030208",
    tick(dt) {
      t += dt;
      // Neon buzz: an occasional flicker, not a strobe.
      for (const s of signs) s.visible = Math.sin(t * 3 + s.userData.phase) > -0.97;
    },
  };
}

/** Move a firework burst somewhere new around the table. */
function place(b: THREE.Group) {
  const a = Math.random() * Math.PI * 2;
  b.position.set(Math.cos(a) * (60 + Math.random() * 40), -40 + Math.random() * 50, Math.sin(a) * (60 + Math.random() * 40));
}

// ---------- Festival night: drifting sky lanterns and fireworks, snow for Christmas ----------

/** Pusvanam fountains and spinning chakkarams on the ground around the table. */
function groundCrackers(group: THREE.Group) {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshStandardMaterial({ color: "#1a1020", roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -12;
  group.add(floor);
  const PER = 70;
  const fountains: { pts: THREE.Points; vel: Float32Array; phase: Float32Array; at: THREE.Vector3 }[] = [];
  const sparkMap = glowDisc("#ffd27a", 64);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const at = new THREE.Vector3(Math.cos(a) * 34, -12, Math.sin(a) * 34);
    const pot = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.1, 12), new THREE.MeshStandardMaterial({ color: ["#e5383b", "#1f7ae0", "#2fa84f", "#f4b400"][i % 4] }));
    pot.position.copy(at).setY(-11.45);
    group.add(pot);
    const vel = new Float32Array(PER * 3);
    const phase = new Float32Array(PER);
    for (let k = 0; k < PER; k++) {
      const ang = Math.random() * Math.PI * 2;
      const spread = Math.random() * 1.6;
      vel.set([Math.cos(ang) * spread, 7 + Math.random() * 4, Math.sin(ang) * spread], k * 3);
      phase[k] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PER * 3), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.9, map: sparkMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    pts.frustumCulled = false;
    group.add(pts);
    fountains.push({ pts, vel, phase, at });
  }
  const wheels: THREE.Sprite[] = [];
  const wheelTex = canvasTex(128, 128, (g) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const grad = g.createLinearGradient(64, 64, 64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60);
      grad.addColorStop(0, "rgba(255,240,180,1)");
      grad.addColorStop(1, "rgba(255,120,30,0)");
      g.strokeStyle = grad;
      g.lineWidth = 4;
      g.beginPath(); g.arc(64, 64, 20 + (i % 3) * 12, a, a + 1.2); g.stroke();
    }
  });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.6;
    const w = new THREE.Sprite(new THREE.SpriteMaterial({ map: wheelTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    w.position.set(Math.cos(a) * 24, -11.4, Math.sin(a) * 24);
    w.scale.setScalar(3);
    wheels.push(w);
    group.add(w);
  }
  let t = 0;
  return (dt: number) => {
    t += dt;
    for (const f of fountains) {
      const p = f.pts.geometry.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < PER; k++) {
        const life = (t * 0.7 + f.phase[k]) % 1;
        const tt = life * 1.6;
        p.setXYZ(k, f.at.x + f.vel[k * 3] * tt, f.at.y + f.vel[k * 3 + 1] * tt - 4.9 * tt * tt, f.at.z + f.vel[k * 3 + 2] * tt);
      }
      p.needsUpdate = true;
    }
    for (const w of wheels) w.material.rotation += dt * 9;
  };
}

export function buildFestival(kind: "diwali" | "christmas"): World {
  const snow = kind === "christmas";
  const group = new THREE.Group();
  group.add(skyDome([[0, "#060a24"], [0.5, "#1b1650"], [0.58, "#2a1a3a"], [1, "#05040c"]]));
  group.add(stars(800, 200, 260, 1.3, true));
  const lanternMat = spriteMat(glowDisc(snow ? "#ffe9b0" : "#ffa13d"), 0.95);
  const lanterns: THREE.Sprite[] = [];
  for (let i = 0; i < 160; i++) {
    const l = new THREE.Sprite(lanternMat);
    const a = Math.random() * Math.PI * 2;
    const r = 12 + Math.random() * 60;
    l.position.set(Math.cos(a) * r, -60 + Math.random() * 100, Math.sin(a) * r);
    l.scale.setScalar(1.5 + Math.random() * 2);
    l.userData.speed = 1 + Math.random() * 2;
    lanterns.push(l);
    group.add(l);
  }
  // Fireworks: a few bursts of coloured sparks that grow and fade, then restart somewhere else.
  const bursts = [0, 1, 2, 3].map((i) => {
    const sparks = new THREE.Group();
    const mat = spriteMat(glowDisc(["#ff4d6d", "#ffd23d", "#4dd2ff", "#a8ff4d"][i]), 1);
    for (let k = 0; k < 40; k++) {
      const s = new THREE.Sprite(mat);
      s.userData.dir = new THREE.Vector3().randomDirection();
      s.scale.setScalar(1.6);
      sparks.add(s);
    }
    sparks.userData.age = i * 0.9;
    group.add(sparks);
    return { sparks, mat };
  });
  bursts.forEach((b) => place(b.sparks));
  const crackers = snow ? null : groundCrackers(group);
  let flakes: THREE.Points | null = null;
  if (snow) {
    flakes = stars(1500, 5, 60, 0.6);
    group.add(flakes);
  }
  return {
    group,
    background: "#05040c",
    tick(dt) {
      crackers?.(dt);
      for (const l of lanterns) {
        l.position.y += dt * l.userData.speed;
        if (l.position.y > 50) l.position.y = -60;
      }
      for (const { sparks, mat } of bursts) {
        const age = (sparks.userData.age += dt);
        const life = age % 3.6;
        if (life < dt) place(sparks);
        for (const s of sparks.children) s.position.copy(s.userData.dir).multiplyScalar(life * 9);
        mat.opacity = Math.max(0, 1 - life / 2.4);
      }
      if (flakes) {
        const p = flakes.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) {
          let y = p.getY(i) - dt * 2.5;
          if (y < -40) y = 40;
          p.setY(i, y);
        }
        p.needsUpdate = true;
      }
    },
  };
}
