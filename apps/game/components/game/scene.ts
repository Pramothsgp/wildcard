// The 3D table. Holds no game logic: each update() sets target positions for cards and
// the render loop eases every card toward its target, which gives all the animation.
import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Face } from "@/game/cards";
import type { RoomView } from "@/game/protocol";
import type { ThemeId } from "@/game/themes";
import { ordinal } from "@/game/help";
import { HEX, backTexture, faceTexture, setAnisotropy } from "./card-art";
import { buildStage } from "./stage";
import { Confetti } from "./effects";
import { avatarUrl } from "./avatars";
import { REACTION_MS } from "@/game/help";

const CARD_W = 1;
const CARD_H = 1.5;
const MIN_DIST = 5;
const MAX_DIST = 32;
// A click that moves further than this (px) was a drag of the camera, not a card pick.
const DRAG_PX = 6;
// Side by side on wide screens, stacked on phones where side seats sit close in.
const DECK_WIDE = new THREE.Vector3(-1.1, 0.06, -0.2);
const PILE_WIDE = new THREE.Vector3(0.9, 0.06, -0.1);
const DECK_TALL = new THREE.Vector3(0, 0.06, -1.7);
const PILE_TALL = new THREE.Vector3(0, 0.06, 0.4);

type CardObj = {
  group: THREE.Group; front: THREE.Mesh; glow?: THREE.Mesh; shade?: THREE.Mesh; trail: THREE.Mesh;
  target: THREE.Vector3; rot: THREE.Quaternion; faceKey: string; seen: boolean;
  /** The winning card: eases in slowly, like a slow-motion replay. */
  slow?: boolean;
};
/** A floating seat tag: avatar, name and meta, plus a reaction bubble that outlives re-renders. */
type Seat = { anchor: THREE.Object3D; label: CSS2DObject; el: HTMLDivElement; info: HTMLDivElement; avatar: HTMLImageElement; bubble: HTMLDivElement | null; bubbleAt: number };
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
const mat = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.5, roughness: 0.55 });

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export class TableScene {
  private renderer: THREE.WebGLRenderer;
  private labels = new CSS2DRenderer();
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);
  private cards = new Map<string, CardObj>();
  private seats = new Map<string, Seat>();
  private ring: THREE.Mesh;
  private deck: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(9, 9);
  private hovered: string | null = null;
  private chosen: number | null = null; // card raised with the arrow keys
  private playable = new Set<number>();
  private view: RoomView | null = null;
  private clock = new THREE.Clock();
  private frame = 0;
  private resizeObs: ResizeObserver;
  private portrait = false;
  /** Soft light that follows a card while it flies. */
  private trailMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: "#fff2c8", transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  private confetti!: Confetti;
  private glowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  private shadeMat = new THREE.MeshBasicMaterial({ color: "#000", map: shadeTexture(), transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
  private mustDraw = false;
  private envTex: THREE.Texture;
  private stage: ReturnType<typeof buildStage>;
  private controls: OrbitControls;
  private downAt: { x: number; y: number } | null = null;
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

    this.stage = buildStage(this.renderer, this.scene);
    this.stage.setTheme(this.theme);
    this.confetti = new Confetti(this.scene);
    this.envTex = this.stage.envTex;

    // Drag to orbit, wheel or pinch to zoom, right-drag or two fingers to pan.
    this.controls = new OrbitControls(this.camera, host);
    Object.assign(this.controls, {
      enableDamping: true, dampingFactor: 0.08, minDistance: MIN_DIST, maxDistance: MAX_DIST,
      maxPolarAngle: 1.3, screenSpacePanning: false, zoomToCursor: true,
    });

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
    host.addEventListener("pointerup", this.onUp);
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
    this.camera.updateProjectionMatrix();
    // Keep the player's own camera on a plain resize; only re-frame when the layout flips.
    if (changed || !this.framed) this.resetView();
    if (changed && this.view) this.update(this.view);
  }

  private framed = false;
  /** Back to the default seat view. Portrait screens need a higher, further camera to fit the table. */
  resetView() {
    this.framed = true;
    this.camera.position.set(0, this.portrait ? 15 : 10.5, this.portrait ? 11 : 9.2);
    this.controls.target.set(0, 0, this.portrait ? 1.2 : 0.9);
    this.controls.update();
  }

  /** Step the camera toward (factor < 1) or away from (factor > 1) what it looks at. */
  /** Arrow keys: raise the next playable card left or right. */
  step(dir: 1 | -1) {
    const ids = this.view?.game?.hand.map((c) => c.id).filter((id) => this.playable.has(id)) ?? [];
    if (!ids.length) return;
    const at = ids.indexOf(this.chosen ?? -1);
    this.chosen = ids[at < 0 ? (dir > 0 ? 0 : ids.length - 1) : (at + dir + ids.length) % ids.length];
    this.update(this.view!);
  }

  /** The raised card, if it can still be played. */
  get selected() {
    return this.chosen !== null && this.playable.has(this.chosen) ? this.chosen : null;
  }

  zoom(factor: number) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, MIN_DIST, MAX_DIST));
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  private onMove = (e: PointerEvent) => {
    const r = this.host.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  private onLeave = () => this.pointer.set(9, 9);
  private onDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY };
  };
  private onUp = (e: PointerEvent) => {
    const d = this.downAt;
    this.downAt = null;
    if (!d || e.button !== 0 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_PX) return;
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
      const trail = new THREE.Mesh(glowGeo, this.trailMat);
      trail.position.z = -0.02;
      trail.renderOrder = -2;
      trail.visible = false;
      trail.userData.shared = true;
      group.add(front, back, trail);
      group.position.copy(spawn);
      group.rotation.x = -Math.PI / 2;
      this.scene.add(group);
      c = { group, front, trail, target: spawn.clone(), rot: group.quaternion.clone(), faceKey, seen: true };
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
      this.stage.setTheme(theme);
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
        const avatar = document.createElement("img");
        avatar.className = "seat-avatar";
        avatar.alt = "";
        const info = document.createElement("div");
        info.className = "seat-info";
        el.append(avatar, info);
        const anchor = new THREE.Object3D();
        const label = new CSS2DObject(el);
        anchor.add(label);
        this.scene.add(anchor);
        s = { anchor, label, el, info, avatar, bubble: null, bubbleAt: 0 };
        this.seats.set(p.id, s);
      }
      // Newest reaction from this player gets a bubble; the CSS animation fades it out.
      const react = view.reactions?.findLast((r) => r.id === p.id);
      if (react && react.at !== s.bubbleAt) {
        s.bubble?.remove();
        s.bubble = document.createElement("div");
        s.bubble.className = "seat-bubble";
        s.bubble.textContent = react.text;
        s.el.append(s.bubble);
        s.bubbleAt = react.at;
        const b = s.bubble;
        setTimeout(() => b.remove(), REACTION_MS);
      }
      const at = seatOf.get(p.id)!;
      s.anchor.position.set(at.x * (this.portrait ? 1 : 1.12), 0.3, at.z * 1.12);
      // Your own info lives in the action bar; a tag here would sit on your hand, so it only
      // shows while your reaction bubble is up.
      s.label.visible = !(i === 0 && g) || (!!s.bubble?.isConnected);
      s.avatar.hidden = !p.avatar;
      if (p.avatar) s.avatar.src = avatarUrl(p.avatar);
      const turn = g ? g.turn === p.id && g.phase === "playing" : !!view.party && view.party.turn === p.id;
      // Big tables get smaller tags so neighbours don't cover each other.
      s.el.className = `seat-tag${view.players.length > 14 ? " is-compact" : ""}${turn ? " is-turn" : ""}${p.out ? " is-out" : ""}${!p.connected ? " is-away" : ""}`;
      s.info.innerHTML = "";
      const name = document.createElement("b");
      name.textContent = p.id === view.you ? "You" : p.name;
      const meta = document.createElement("span");
      meta.textContent = g ? `${p.count} cards · ${p.score} pts${p.calledUno && p.count <= 1 ? " · WILDCARD!" : ""}${p.place ? ` · ${ordinal(p.place)}` : p.out ? " · out" : ""}${!p.connected ? " · away" : p.auto ? " · autopilot" : ""}` : view.party ? `${p.score} pts${p.out ? " · out" : ""}${view.party.done.includes(p.id) ? " · voted" : ""}${!p.connected ? " · away" : ""}` : p.bot ? "bot" : p.connected ? "ready" : "away";
      s.info.append(name, meta);
    });

    if (g) {
      // Discard pile, newest on top. A card that just arrived flies in from whoever played it.
      const playedBy = prev?.game?.turn;
      const from = (playedBy && seatOf.get(playedBy)) || this.pilePos;
      const over = g.phase !== "playing";
      if (over && prev?.game?.phase === "playing") this.confetti.burst();
      g.pile.forEach((c, i) => {
        const obj = this.card(`c${c.id}`, c.face, from.clone().setY(0.6));
        // A card you just played keeps its hand glow or veil otherwise.
        if (obj.glow) obj.glow.visible = false;
        if (obj.shade) obj.shade.visible = false;
        // The winning card rises over the pile and turns to face you.
        obj.slow = over && i === g.pile.length - 1;
        if (obj.slow) {
          obj.target.set(this.pilePos.x, 1.8, this.pilePos.z + 0.6);
          obj.rot.setFromEuler(new THREE.Euler(-0.9, 0, 0));
          return;
        }
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
        const hover = this.hovered === key || (this.chosen === c.id && ok);
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
    this.controls.update();
    this.stage.tick(dt);
    this.glowMat.opacity = 0.8 + 0.2 * Math.sin(t * 4);
    const top = (this.deck.material as THREE.MeshStandardMaterial[])[2];
    top.emissive.set("#ffb020");
    top.emissiveIntensity = this.mustDraw ? 0.35 + 0.3 * Math.sin(t * 5) : 0;

    const hit = this.pick();
    const hoverKey = hit?.startsWith("c") ? hit : null;
    this.host.style.cursor = hit === "deck" || (hoverKey && this.playable.has(Number(hoverKey.slice(1)))) ? "pointer" : "grab";
    if (hoverKey !== this.hovered) {
      this.hovered = hoverKey;
      if (this.view) this.update(this.view);
    }
    this.confetti.tick(dt);
    const slowK = 1 - Math.exp(-dt * 1.6);
    for (const c of this.cards.values()) {
      const dist = c.group.position.distanceTo(c.target);
      c.trail.visible = dist > 0.35;
      if (c.trail.visible) c.trail.scale.setScalar(1 + Math.min(dist, 3) * 0.3);
      c.group.position.lerp(c.target, c.slow ? slowK : k);
      c.group.quaternion.slerp(c.rot, c.slow ? slowK : k);
    }
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObs.disconnect();
    this.host.removeEventListener("pointermove", this.onMove);
    this.host.removeEventListener("pointerdown", this.onDown);
    this.host.removeEventListener("pointerup", this.onUp);
    this.controls.dispose();
    this.host.removeEventListener("pointerleave", this.onLeave);
    this.envTex.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.domElement.remove();
  }
}
