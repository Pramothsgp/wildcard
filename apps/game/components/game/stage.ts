// Everything around the cards: the floating table, its lights and the world it floats in.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { type ThemeId, themeOf } from "@/game/themes";
import { type World, buildCity, buildFestival, buildSpace, buildTemple, glowDisc } from "./backdrops";

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
function feltTexture(aniso: number, colors: readonly [string, string, string]) {
  const S = 1024;
  const felt = document.createElement("canvas");
  felt.width = felt.height = S;
  const g = felt.getContext("2d")!;
  const grad = g.createRadialGradient(S / 2, S / 2, 60, S / 2, S / 2, S / 2);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.65, colors[1]);
  grad.addColorStop(1, colors[2]);
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

function buildTable(felt: THREE.MeshPhysicalMaterial) {
  const group = new THREE.Group();
  const wood = new THREE.MeshPhysicalMaterial({ map: woodTexture(), color: "#7a4a2a", roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.12 });
  const table = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.75, 0.5, 128), [
    wood,
    felt,
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

  const aniso = renderer.capabilities.getMaxAnisotropy();
  const felt = new THREE.MeshPhysicalMaterial({ roughness: 1, sheen: 0.6, sheenRoughness: 0.8 });
  scene.add(buildTable(felt));

  // Worlds are built the first time a theme needs them, then kept and toggled.
  const builders: Record<string, () => World> = {
    space: buildSpace, temple: buildTemple, city: buildCity, festival: () => buildFestival(false), snow: () => buildFestival(true),
  };
  const worlds = new Map<string, World>();
  let world: World | null = null;
  let current: ThemeId | null = null;

  return {
    envTex,
    setTheme(id: ThemeId) {
      if (id === current) return;
      current = id;
      const t = themeOf(id);
      felt.map?.dispose();
      felt.map = feltTexture(aniso, t.felt);
      felt.sheenColor.set(t.felt[0]).offsetHSL(0, 0, 0.12);
      felt.needsUpdate = true;
      const key = id === "christmas" ? "snow" : t.backdrop;
      if (world) world.group.visible = false;
      world = worlds.get(key) ?? builders[key]();
      if (!worlds.has(key)) {
        worlds.set(key, world);
        scene.add(world.group);
      }
      world.group.visible = true;
      (scene.background as THREE.Color).set(world.background);
    },
    tick(dt: number) {
      world?.tick(dt);
    },
  };
}
