// The 3D table. Holds no game logic: each update() sets target positions for cards and
// the render loop eases every card toward its target, which gives all the animation.
import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Face } from "@/game/cards";
import type { RoomView } from "@/game/protocol";
import type { ThemeId } from "@/game/themes";
import { ordinal } from "@/game/help";
import { HEX, backTexture, faceTexture, setAnisotropy } from "./card-art";

const CARD_W = 1;
const CARD_H = 1.5;
// Side by side on wide screens, stacked on phones where side seats sit close in.
const DECK_WIDE = new THREE.Vector3(-1.1, 0.06, -0.2);
const PILE_WIDE = new THREE.Vector3(0.9, 0.06, -0.1);
const DECK_TALL = new THREE.Vector3(0, 0.06, -1.7);
const PILE_TALL = new THREE.Vector3(0, 0.06, 0.4);

type CardObj = { group: THREE.Group; front: THREE.Mesh; glow?: THREE.Mesh; shade?: THREE.Mesh; target: THREE.Vector3; rot: THREE.Quaternion; faceKey: string; seen: boolean };
type Callbacks = { onPlay: (cardId: number) => void; onDraw: () => void };

const planeGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
const glowGeo = new THREE.PlaneGeometry(CARD_W * 1.36, CARD_H * 1.26);

/** Soft gold halo drawn behind cards you can play. */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = 272;
  c.height = 378;
  const g = c.getContext("2d")!;
  g.shadowColor = "#ffc23d";
  g.shadowBlur = 34;
  g.strokeStyle = "#ffe08a";
  g.lineWidth = 14;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.roundRect(40, 40, 192, 298, 26);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Card shape (white) for the dark veil over cards you can't play; the material colour makes it black. */
function shadeTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 192;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.beginPath();
  g.roundRect(0, 0, 128, 192, 13);
  g.fill();
  return new THREE.CanvasTexture(c);
}
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
const mat = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.5, roughness: 0.55 });

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export class TableScene {
  private renderer: THREE.WebGLRenderer;
  private labels = new CSS2DRenderer();
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private cards = new Map<string, CardObj>();
  private seats = new Map<string, { anchor: THREE.Object3D; label: CSS2DObject; el: HTMLDivElement }>();
  private ring: THREE.Mesh;
  private deck: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(9, 9);
  private hovered: string | null = null;
  private playable = new Set<number>();
  private view: RoomView | null = null;
  private clock = new THREE.Clock();
  private frame = 0;
  private resizeObs: ResizeObserver;
  private portrait = false;
  private glowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  private shadeMat = new THREE.MeshBasicMaterial({ color: "#000", map: shadeTexture(), transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
  private mustDraw = false;
  private envTex: THREE.Texture;
  private theme: ThemeId = "classic";
  private get deckPos() { return this.portrait ? DECK_TALL : DECK_WIDE; }
  private get pilePos() { return this.portrait ? PILE_TALL : PILE_WIDE; }

  constructor(private host: HTMLElement, private cb: Callbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    setAnisotropy(this.renderer.capabilities.getMaxAnisotropy());
    host.appendChild(this.renderer.domElement);
    this.labels.domElement.style.cssText = "position:absolute;inset:0;pointer-events:none";
    host.appendChild(this.labels.domElement);

    // A dark room lit by one warm lamp over the table. The room itself is a CSS gradient
    // behind a transparent canvas; a soft studio environment gives the lacquer and gold
    // something to reflect.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envTex;
    this.scene.environmentIntensity = 0.25;
    this.scene.add(new THREE.HemisphereLight("#ffe9c7", "#140c06", 0.35));
    const lamp = new THREE.SpotLight("#ffe2b0", 480, 0, 0.6, 0.7, 2);
    lamp.position.set(0, 12, 1);
    lamp.target.position.set(0, 0, 0.5);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(2048, 2048);
    lamp.shadow.bias = -0.0004;
    lamp.shadow.radius = 4;
    this.scene.add(lamp, lamp.target);
    // Gentle fill from the player's side so the hand stays readable.
    const fill = new THREE.DirectionalLight("#fff1dc", 0.6);
    fill.position.set(0, 6, 12);
    this.scene.add(fill);

    // Velvet felt with a gold inlay line, a lacquered walnut edge and a padded leather rail.
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
    // Table top radius 6.4 maps to S/2 on the cap texture.
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
    const feltTex = new THREE.CanvasTexture(felt);
    feltTex.colorSpace = THREE.SRGBColorSpace;
    feltTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    const wood = new THREE.MeshPhysicalMaterial({ map: woodTexture(), color: "#7a4a2a", roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.12 });
    const table = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.75, 0.5, 128), [
      wood,
      new THREE.MeshPhysicalMaterial({ map: feltTex, roughness: 1, sheen: 0.6, sheenColor: "#2a7a64", sheenRoughness: 0.8 }),
      wood,
    ]);
    table.position.y = -0.25;
    table.receiveShadow = true;
    this.scene.add(table);
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(6.62, 0.36, 32, 160),
      new THREE.MeshPhysicalMaterial({ color: "#2a110c", roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: "#6b2a1c" }),
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 0.08;
    rail.castShadow = rail.receiveShadow = true;
    this.scene.add(rail);
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(6.24, 0.04, 12, 160),
      new THREE.MeshStandardMaterial({ color: "#d4af60", metalness: 1, roughness: 0.25 }),
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 0.02;
    this.scene.add(trim);

    // Direction ring: chevrons that spin with play direction, tinted by the current colour.
    const ringCanvas = document.createElement("canvas");
    ringCanvas.width = 1024;
    ringCanvas.height = 64;
    const rg = ringCanvas.getContext("2d")!;
    rg.fillStyle = "#fff";
    for (let x = 0; x < 1024; x += 64) {
      rg.beginPath(); rg.moveTo(x, 8); rg.lineTo(x + 28, 32); rg.lineTo(x, 56); rg.lineTo(x + 14, 32); rg.fill();
    }
    const ringTex = new THREE.CanvasTexture(ringCanvas);
    ringTex.wrapS = THREE.RepeatWrapping;
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(2.3, 2.6, 96, 1),
      new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, opacity: 0.55, color: "#ffffff", side: THREE.DoubleSide }),
    );
    // Map the strip around the ring.
    const uv = this.ring.geometry.attributes.uv as THREE.BufferAttribute;
    const pos = this.ring.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      const a = Math.atan2(pos.getY(i), pos.getX(i));
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      uv.setXY(i, (a / (Math.PI * 2) + 0.5) * 8, (r - 2.3) / 0.3);
    }
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.012;
    this.scene.add(this.ring);

    // Draw pile: one box whose height follows the card count.
    this.deck = new THREE.Mesh(
      new THREE.BoxGeometry(CARD_W, 1, CARD_H),
      [0, 1, 2, 3, 4, 5].map((i) => i === 2
        ? new THREE.MeshStandardMaterial({ map: backTexture(this.theme), transparent: true, alphaTest: 0.5 })
        : new THREE.MeshStandardMaterial({ color: "#efe6d0" })),
    );
    this.deck.castShadow = true;
    this.deck.position.copy(this.deckPos);
    this.scene.add(this.deck);

    host.addEventListener("pointermove", this.onMove);
    host.addEventListener("pointerdown", this.onDown);
    host.addEventListener("pointerleave", this.onLeave);
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.resize();
    this.loop();
  }

  private resize() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    // Portrait screens need a higher, further camera to fit the table.
    const portrait = w / h < 1;
    const changed = portrait !== this.portrait;
    this.portrait = portrait;
    this.camera.position.set(0, portrait ? 15 : 10.5, portrait ? 11 : 9.2);
    this.camera.lookAt(0, 0, portrait ? 1.2 : 0.9);
    this.camera.updateProjectionMatrix();
    if (changed && this.view) this.update(this.view);
  }

  private onMove = (e: PointerEvent) => {
    const r = this.host.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  private onLeave = () => this.pointer.set(9, 9);
  private onDown = (e: PointerEvent) => {
    this.onMove(e);
    const hit = this.pick();
    if (hit === "deck") this.cb.onDraw();
    else if (hit?.startsWith("c")) {
      const id = Number(hit.slice(1));
      if (this.playable.has(id)) this.cb.onPlay(id);
    }
  };

  private pick(): string | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const mine = this.view?.game?.hand.map((c) => this.cards.get(`c${c.id}`)?.front).filter(Boolean) as THREE.Mesh[] ?? [];
    const hits = this.raycaster.intersectObjects([...mine, this.deck], false);
    const obj = hits[0]?.object;
    if (!obj) return null;
    return obj === this.deck ? "deck" : (obj.userData.key as string);
  }

  private card(key: string, f: Face | null, spawn: THREE.Vector3): CardObj {
    let c = this.cards.get(key);
    const faceKey = f ? `${f.color}:${f.value}` : "back";
    if (!c) {
      const group = new THREE.Group();
      const front = new THREE.Mesh(planeGeo, mat(f ? faceTexture(f, this.theme) : backTexture(this.theme)));
      const back = new THREE.Mesh(planeGeo, mat(backTexture(this.theme)));
      back.rotation.y = Math.PI;
      front.castShadow = back.castShadow = true;
      front.userData.key = key;
      group.add(front, back);
      group.position.copy(spawn);
      group.rotation.x = -Math.PI / 2;
      this.scene.add(group);
      c = { group, front, target: spawn.clone(), rot: group.quaternion.clone(), faceKey, seen: true };
      this.cards.set(key, c);
    } else if (c.faceKey !== faceKey) {
      (c.front.material as THREE.MeshStandardMaterial).map = f ? faceTexture(f, this.theme) : backTexture(this.theme);
      c.faceKey = faceKey;
    }
    c.seen = true;
    return c;
  }

  private seatPos(index: number, total: number) {
    // Me at the front; everyone else around the far side in seating order.
    const a = Math.PI / 2 + (index / total) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * (this.portrait ? 2.1 : 4.6), 0, Math.sin(a) * (this.portrait ? 4.4 : 3.9));
  }

  update(view: RoomView) {
    const g = view.game;
    const prev = this.view;
    this.view = view;
    this.playable = new Set(g?.playable ?? []);
    const theme = view.theme ?? "classic";
    if (theme !== this.theme) {
      // New card art: drop every card so it is rebuilt with the theme's textures.
      this.theme = theme;
      (this.deck.material as THREE.MeshStandardMaterial[])[2].map = backTexture(theme);
      for (const c of this.cards.values()) this.scene.remove(c.group);
      this.cards.clear();
    }
    for (const c of this.cards.values()) c.seen = false;

    const players = view.players;
    const meIdx = Math.max(0, players.findIndex((p) => p.id === view.you));
    const ordered = players.map((_, i) => players[(meIdx + i) % players.length]);
    const seatOf = new Map(ordered.map((p, i) => [p.id, this.seatPos(i, ordered.length)]));

    // Seat labels.
    for (const [id, s] of this.seats) if (!seatOf.has(id)) { this.scene.remove(s.anchor); this.seats.delete(id); }
    ordered.forEach((p, i) => {
      let s = this.seats.get(p.id);
      if (!s) {
        const el = document.createElement("div");
        const anchor = new THREE.Object3D();
        const label = new CSS2DObject(el);
        anchor.add(label);
        this.scene.add(anchor);
        s = { anchor, label, el };
        this.seats.set(p.id, s);
      }
      const at = seatOf.get(p.id)!;
      s.anchor.position.set(at.x * (this.portrait ? 1 : 1.12), 0.3, at.z * 1.12);
      // Your own info lives in the action bar; a tag here would sit on your hand.
      s.label.visible = !(i === 0 && g);
      const turn = g?.turn === p.id && g.phase === "playing";
      s.el.className = `seat-tag${turn ? " is-turn" : ""}${p.out ? " is-out" : ""}${!p.connected ? " is-away" : ""}`;
      s.el.innerHTML = "";
      const name = document.createElement("b");
      name.textContent = p.id === view.you ? "You" : p.name;
      const meta = document.createElement("span");
      meta.textContent = g ? `${p.count} cards · ${p.score} pts${p.calledUno && p.count <= 1 ? " · WILDCARD!" : ""}${p.place ? ` · ${ordinal(p.place)}` : p.out ? " · out" : ""}${!p.connected ? " · away" : p.auto ? " · autopilot" : ""}` : p.bot ? "bot" : p.connected ? "ready" : "away";
      s.el.append(name, meta);
    });

    if (g) {
      // Discard pile, newest on top. A card that just arrived flies in from whoever played it.
      const playedBy = prev?.game?.turn;
      const from = (playedBy && seatOf.get(playedBy)) || this.pilePos;
      g.pile.forEach((c, i) => {
        const obj = this.card(`c${c.id}`, c.face, from.clone().setY(0.6));
        // A card you just played keeps its hand glow or veil otherwise.
        if (obj.glow) obj.glow.visible = false;
        if (obj.shade) obj.shade.visible = false;
        obj.target.set(this.pilePos.x + (hash(c.id) - 0.5) * 0.35, 0.02 + i * 0.012, this.pilePos.z + (hash(c.id + 7) - 0.5) * 0.35);
        obj.rot.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, (hash(c.id + 3) - 0.5) * 1.2));
      });

      // My hand: a fan facing the camera. New cards come from the deck when drawn, or from
      // whoever played last when hands were swapped (7) or passed round (0).
      const drew = !prev?.game || g.drawCount !== prev.game.drawCount;
      const handFrom = drew ? this.deckPos : (playedBy && seatOf.get(playedBy)) || this.deckPos;
      const n = g.hand.length;
      const spread = Math.min(0.75, (this.portrait ? 4.6 : 7.5) / Math.max(1, n));
      g.hand.forEach((c, i) => {
        const key = `c${c.id}`;
        const obj = this.card(key, c.face, handFrom.clone().setY(0.5));
        const x = (i - (n - 1) / 2) * spread;
        // Playable cards glow, stand a little proud and stay bright; the rest go dark on your turn.
        const ok = this.playable.has(c.id);
        const hover = this.hovered === key;
        const myTurn = g.turn === view.you && g.phase === "playing";
        const lift = ok ? (hover ? 0.6 : 0.3) : hover ? 0.1 : myTurn ? -0.12 : 0;
        if (!obj.shade) {
          obj.shade = new THREE.Mesh(planeGeo, this.shadeMat);
          obj.shade.position.z = 0.004;
          obj.shade.renderOrder = 2; // after the card, or the card paints over it
          obj.shade.userData.shared = true;
          obj.group.add(obj.shade);
        }
        // A dark veil, not a colour tint: the scene's tone mapping washes tints out.
        obj.shade.visible = myTurn && !ok;
        if (!obj.glow) {
          obj.glow = new THREE.Mesh(glowGeo, this.glowMat);
          obj.glow.position.z = -0.01;
          obj.glow.renderOrder = -1;
          obj.glow.userData.shared = true;
          obj.group.add(obj.glow);
        }
        obj.glow.visible = ok;
        obj.target.set(x, 1.3 + lift * 0.6 + i * 0.002, 4.75 - lift * 0.5 + Math.abs(x) * 0.05);
        obj.rot.setFromEuler(new THREE.Euler(-0.95, 0, -x * 0.04));
      });

      // Opponents: face-down fans (in Flipside you see the other side of their cards).
      ordered.slice(1).forEach((p) => {
        const at = seatOf.get(p.id)!;
        const facing = Math.atan2(at.x, at.z);
        const count = Math.min(p.count, 30);
        for (let i = 0; i < count; i++) {
          const key = `o${p.id}:${i}`;
          // Once you have finished you watch with every hand face up.
          const obj = this.card(key, p.reveal?.[i] ?? p.backs?.[i] ?? null, this.deckPos.clone().setY(0.5));
          // Face-up hands spread wider so every card can be read.
          const off = (i - (count - 1) / 2) * Math.min(p.reveal ? 0.62 : 0.32, (p.reveal ? 6 : 4) / Math.max(1, count));
          obj.target.set(at.x + Math.cos(facing) * off, 0.03 + i * 0.004, at.z - Math.sin(facing) * off);
          obj.rot.setFromEuler(new THREE.Euler(-Math.PI / 2, facing, 0, "YXZ"));
        }
      });

      const tint = new THREE.Color(HEX[g.color]);
      (this.ring.material as THREE.MeshBasicMaterial).color.copy(tint);
      this.deck.scale.y = Math.max(0.02, g.drawCount * 0.006);
      this.deck.position.set(this.deckPos.x, this.deck.scale.y / 2, this.deckPos.z);
      this.deck.visible = g.drawCount > 0;
      // Nothing to play on your turn: the deck pulses to show where to go.
      this.mustDraw = g.phase === "playing" && g.turn === view.you && !g.playable.length && g.drawn === null;
    } else {
      this.deck.scale.y = 0.4;
      this.deck.position.set(this.deckPos.x, 0.2, this.deckPos.z);
    }

    for (const [key, c] of this.cards) {
      if (!c.seen) {
        this.scene.remove(c.group);
        c.group.traverse((o) => (o as THREE.Mesh).isMesh && !o.userData.shared && ((o as THREE.Mesh).material as THREE.Material).dispose());
        this.cards.delete(key);
      }
    }
  }

  private loop = () => {
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    const k = 1 - Math.exp(-dt * 9);
    const g = this.view?.game;
    const ringMap = (this.ring.material as THREE.MeshBasicMaterial).map!;
    ringMap.offset.x -= dt * 0.25 * (g?.direction ?? 1);
    const t = this.clock.elapsedTime;
    this.glowMat.opacity = 0.8 + 0.2 * Math.sin(t * 4);
    const top = (this.deck.material as THREE.MeshStandardMaterial[])[2];
    top.emissive.set("#ffb020");
    top.emissiveIntensity = this.mustDraw ? 0.35 + 0.3 * Math.sin(t * 5) : 0;

    const hit = this.pick();
    const hoverKey = hit?.startsWith("c") ? hit : null;
    this.host.style.cursor = hit === "deck" || (hoverKey && this.playable.has(Number(hoverKey.slice(1)))) ? "pointer" : "default";
    if (hoverKey !== this.hovered) {
      this.hovered = hoverKey;
      if (this.view) this.update(this.view);
    }
    for (const c of this.cards.values()) {
      c.group.position.lerp(c.target, k);
      c.group.quaternion.slerp(c.rot, k);
    }
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObs.disconnect();
    this.host.removeEventListener("pointermove", this.onMove);
    this.host.removeEventListener("pointerdown", this.onDown);
    this.host.removeEventListener("pointerleave", this.onLeave);
    this.envTex.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.domElement.remove();
  }
}
