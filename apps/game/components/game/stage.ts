// Everything around the cards: the floating table, its lights and the deep-space backdrop.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/** Walnut grain for the table edge: dark streaks running around the circumference. */
function woodTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c8946a";
  g.fillRect(0, 0, 1024, 64);
  for (let i = 0; i < 260; i++) {
    g.strokeStyle = `rgba(${40 + Math.random() * 30},${18 + Math.random() * 14},8,${0.15 + Math.random() * 0.35})`;
    g.lineWidth = 0.5 + Math.random() * 2;
    const y = Math.random() * 64;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(6, 1);
  return t;
}

/** Velvet felt with gold inlay lines. Table top radius 6.4 maps to S/2 on the cap texture. */
function feltTexture(aniso: number) {
  const S = 1024;
  const felt = document.createElement("canvas");
  felt.width = felt.height = S;
  const g = felt.getContext("2d")!;
  const grad = g.createRadialGradient(S / 2, S / 2, 60, S / 2, S / 2, S / 2);
  grad.addColorStop(0, "#17604f");
  grad.addColorStop(0.65, "#0e4638");
  grad.addColorStop(1, "#072a22");
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 60000; i++) {
    g.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${Math.random() * 0.035})` : `rgba(0,0,0,${Math.random() * 0.06})`;
    g.fillRect(Math.random() * S, Math.random() * S, 1, 1);
  }
  const ring = (r: number, w: number, color: string) => {
    g.strokeStyle = color;
    g.lineWidth = w;
    g.beginPath();
    g.arc(S / 2, S / 2, (r / 6.4) * (S / 2), 0, Math.PI * 2);
    g.stroke();
  };
  ring(5.92, 3, "rgba(212,175,96,0.75)");
  ring(5.78, 1.5, "rgba(212,175,96,0.45)");
  ring(3.05, 1.5, "rgba(212,175,96,0.28)");
  const t = new THREE.CanvasTexture(felt);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

function buildTable(aniso: number) {
  const group = new THREE.Group();
  const wood = new THREE.MeshPhysicalMaterial({ map: woodTexture(), color: "#7a4a2a", roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.12 });
  const table = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.75, 0.5, 128), [
    wood,
    new THREE.MeshPhysicalMaterial({ map: feltTexture(aniso), roughness: 1, sheen: 0.6, sheenColor: "#2a7a64", sheenRoughness: 0.8 }),
    wood,
  ]);
  table.position.y = -0.25;
  table.receiveShadow = true;
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(6.62, 0.36, 32, 160),
    new THREE.MeshPhysicalMaterial({ color: "#2a110c", roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: "#6b2a1c" }),
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.08;
  rail.castShadow = rail.receiveShadow = true;
  const trim = new THREE.Mesh(new THREE.TorusGeometry(6.24, 0.04, 12, 160), new THREE.MeshStandardMaterial({ color: "#d4af60", metalness: 1, roughness: 0.25 }));
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.02;
  // Underside: a gold keel ring and a soft cyan hover glow, so the table reads as floating.
  const keel = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.08, 12, 128), new THREE.MeshStandardMaterial({ color: "#d4af60", metalness: 1, roughness: 0.3 }));
  keel.rotation.x = Math.PI / 2;
  keel.position.y = -0.55;
  const hover = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 96),
    new THREE.MeshBasicMaterial({ map: glowDisc("#5ad1ff"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }),
  );
  hover.rotation.x = -Math.PI / 2;
  hover.position.y = -0.9;
  group.add(table, rail, trim, keel, hover);
  return group;
}

/** Radial glow, bright in the middle and fading to nothing. */
function glowDisc(color: string, size = 256) {
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

/** Stars on a far shell, a few nebula clouds, a ringed gas giant and a small moon. */
function buildSpace() {
  const sky = new THREE.Group();
  const N = 4000;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const tint = [new THREE.Color("#ffffff"), new THREE.Color("#cfe0ff"), new THREE.Color("#ffe6c4"), new THREE.Color("#ffd1e8")];
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(150 + Math.random() * 80);
    pos.set([v.x, v.y, v.z], i * 3);
    const c = tint[i % tint.length].clone().multiplyScalar(0.5 + Math.random() * 0.5);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  sky.add(new THREE.Points(geo, new THREE.PointsMaterial({
    size: 1.6, map: starSprite(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  })));

  for (const [color, x, y, z, s] of [
    // The default camera looks down past the table, so most of the show sits below the horizon.
    ["#6a2cff", -70, -110, -90, 150], ["#ff3d9a", 90, -80, -110, 130], ["#1fb6ff", 10, -150, -40, 170], ["#ff9a3d", -120, -40, 60, 110], ["#3d6bff", 60, 60, -120, 140],
  ] as const) {
    const cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowDisc(color), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    cloud.position.set(x, y, z);
    cloud.scale.setScalar(s);
    sky.add(cloud);
  }

  const planet = new THREE.Group();
  const bands = document.createElement("canvas");
  bands.width = 512;
  bands.height = 256;
  const bg = bands.getContext("2d")!;
  for (let y = 0; y < 256; y += 4) {
    const t = Math.sin(y * 0.09) * 0.5 + Math.sin(y * 0.031) * 0.5;
    bg.fillStyle = `hsl(${26 + t * 14}, ${45 + t * 15}%, ${42 + t * 14}%)`;
    bg.fillRect(0, y, 512, 4);
  }
  const bandTex = new THREE.CanvasTexture(bands);
  bandTex.colorSpace = THREE.SRGBColorSpace;
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
  sky.add(planet, moon);
  return { sky, globe };
}

/** Adds the lights, table and space to the scene. Returns what the render loop animates. */
export function buildStage(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  // A soft studio environment gives the lacquer and gold something to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = envTex;
  scene.environmentIntensity = 0.25;
  scene.background = new THREE.Color("#02030a");
  scene.add(new THREE.HemisphereLight("#d9e4ff", "#140c06", 0.35));
  // One warm spotlight over the felt, like a lamp hanging in the void.
  const lamp = new THREE.SpotLight("#ffe2b0", 480, 0, 0.6, 0.7, 2);
  lamp.position.set(0, 12, 1);
  lamp.target.position.set(0, 0, 0.5);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.0004;
  lamp.shadow.radius = 4;
  scene.add(lamp, lamp.target);
  // Gentle fill from the player's side so the hand stays readable, and a cool rim from deep space.
  const fill = new THREE.DirectionalLight("#fff1dc", 0.6);
  fill.position.set(0, 6, 12);
  const rim = new THREE.DirectionalLight("#7fb2ff", 0.8);
  rim.position.set(-8, 3, -12);
  scene.add(fill, rim);

  scene.add(buildTable(renderer.capabilities.getMaxAnisotropy()));
  const { sky, globe } = buildSpace();
  scene.add(sky);

  return {
    envTex,
    /** Slow drift of the sky and a turning planet. */
    tick(dt: number) {
      sky.rotation.y += dt * 0.004;
      globe.rotation.y += dt * 0.03;
    },
  };
}
