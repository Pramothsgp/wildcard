// Win confetti: one instanced mesh of small paper pieces that burst up over the table and flutter down.
import * as THREE from "three";

const N = 260;
const COLORS = ["#d4af60", "#f3d27a", "#e5383b", "#1f7ae0", "#2fa84f", "#f4b400", "#ffffff"];

export class Confetti {
  private mesh: THREE.InstancedMesh;
  private pos: THREE.Vector3[] = [];
  private vel: THREE.Vector3[] = [];
  private spin: THREE.Vector3[] = [];
  private rot: THREE.Euler[] = [];
  private age = Infinity;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private one = new THREE.Vector3(1, 1, 1);

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.12, 0.22),
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, metalness: 0.4, roughness: 0.4 }),
      N,
    );
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      this.mesh.setColorAt(i, c.set(COLORS[i % COLORS.length]));
      this.pos.push(new THREE.Vector3());
      this.vel.push(new THREE.Vector3());
      this.spin.push(new THREE.Vector3());
      this.rot.push(new THREE.Euler());
    }
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  burst() {
    this.age = 0;
    this.mesh.visible = true;
    for (let i = 0; i < N; i++) {
      this.pos[i].set((Math.random() - 0.5) * 2, 0.5, (Math.random() - 0.5) * 2);
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 4;
      this.vel[i].set(Math.cos(a) * s, 6 + Math.random() * 5, Math.sin(a) * s);
      this.spin[i].set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
    }
  }

  tick(dt: number) {
    if (this.age > 5) {
      this.mesh.visible = false;
      return;
    }
    this.age += dt;
    for (let i = 0; i < N; i++) {
      const v = this.vel[i];
      // Gravity, then air drag so pieces flutter instead of dropping.
      v.y -= 9 * dt;
      v.multiplyScalar(1 - 1.6 * dt);
      this.pos[i].addScaledVector(v, dt);
      if (this.pos[i].y < 0.03) { this.pos[i].y = 0.03; v.set(0, 0, 0); }
      const r = this.rot[i];
      r.set(r.x + this.spin[i].x * dt, r.y + this.spin[i].y * dt, r.z + this.spin[i].z * dt);
      this.m.compose(this.pos[i], this.q.setFromEuler(r), this.one);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
