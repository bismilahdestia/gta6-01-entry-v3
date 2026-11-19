// Pistol combat: raycast shooting from the camera, rival gunmen
// with health who shoot back, reload with R, and a cash reward for
// every rival dropped. Rivals spawn around the current mission
// target so fights happen where the story happens.
import * as THREE from 'three';
import { CFG } from './config.js';
import { rand, randInt, pick, dist2D, clamp } from './util.js';

function makeRivalMesh(rng) {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: pick(rng, [0x8a2a2a, 0x2a2a3a, 0x3a2a4a]), roughness: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.0, 8), jacket);
  body.position.y = 1.0;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xc98a5a, roughness: 0.9 }),
  );
  head.position.y = 1.72;
  g.add(head);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.29, 0.12, 10),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 }),
  );
  cap.position.y = 1.92;
  g.add(cap);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.55, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x22222c, roughness: 1 }),
  );
  legs.position.y = 0.28;
  g.add(legs);
  // The gun: a small dark box in the right hand.
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.14, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.5 }),
  );
  gun.position.set(0.35, 1.15, 0.3);
  g.add(gun);
  // Health bar above the head (sprite pair: red back, green front).
  const barBack = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x881111, side: THREE.DoubleSide }),
  );
  barBack.position.y = 2.25;
  g.add(barBack);
  const barFront = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x44dd44, side: THREE.DoubleSide }),
  );
  barFront.position.set(0, 2.25, 0.01);
  g.add(barFront);
  g.userData.barFront = barFront;
  g.userData.barBack = barBack;
  return g;
}

export function createCombat(scene, rng, state) {
  const raycaster = new THREE.Raycaster();
  const rivals = [];
  let reloadUntil = 0;
  let muzzleUntil = 0;
  let muzzle = null;

  // Muzzle flash: a small bright plane at the camera, shown briefly.
  function ensureMuzzle(camera) {
    if (muzzle) return;
    muzzle = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9, depthTest: false }),
    );
    muzzle.position.set(0.35, -0.3, -1);
    camera.add(muzzle);
    muzzle.visible = false;
  }

  function spawnRivals(centre, count) {
    for (let i = 0; i < count; i++) {
      const mesh = makeRivalMesh(rng);
      const a = rand(rng, 0, Math.PI * 2);
      const r = rand(rng, 6, 16);
      const x = clamp(centre.x + Math.cos(a) * r, -195, 195);
      const z = clamp(centre.z + Math.sin(a) * r, -195, 195);
      mesh.position.set(x, 0, z);
      scene.add(mesh);
      rivals.push({ mesh, x, z, hp: 100, shootAt: state.time + rand(rng, 1, 3), strafe: rand(rng, -1, 1) });
    }
  }

  function clearRivals() {
    for (const r of rivals) scene.remove(r.mesh);
    rivals.length = 0;
  }

  // Fire the pistol. Returns 'hit' | 'miss' | 'empty' | 'reloading'.
  function shoot(camera) {
    ensureMuzzle(camera);
    if (state.time < reloadUntil) return 'reloading';
    if (state.ammo <= 0) {
      reload();
      return 'empty';
    }
    state.ammo -= 1;
    muzzle.visible = true;
    muzzleUntil = state.time + 0.07;
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.far = CFG.pistolRange;
    const meshes = rivals.map((r) => r.mesh);
    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length === 0) return 'miss';
    // Walk up to the rival group that owns the hit object.
    let obj = hits[0].object;
    while (obj.parent && obj.parent !== scene) obj = obj.parent;
    const rival = rivals.find((r) => r.mesh === obj);
    if (!rival) return 'miss';
    rival.hp -= CFG.pistolDamage;
    rival.mesh.userData.barFront.scale.x = Math.max(0, rival.hp / 100);
    rival.mesh.userData.barFront.position.x = -0.6 * (1 - Math.max(0, rival.hp / 100));
    if (rival.hp <= 0) {
      scene.remove(rival.mesh);
      rivals.splice(rivals.indexOf(rival), 1);
      state.money += 120;
      state.kills = (state.kills || 0) + 1;
      return 'kill';
    }
    return 'hit';
  }

  function reload() {
    if (state.time < reloadUntil || state.ammo >= CFG.startAmmo || state.reserveAmmo <= 0) return false;
    reloadUntil = state.time + CFG.reloadSeconds;
    const need = CFG.startAmmo - state.ammo;
    const take = Math.min(need, state.reserveAmmo);
    state.ammo += take;
    state.reserveAmmo -= take;
    return true;
  }

  function update(dt, camera) {
    if (muzzle && state.time > muzzleUntil) muzzle.visible = false;
    const px = state.playerPos.x;
    const pz = state.playerPos.z;
    for (const r of rivals) {
      const d = dist2D(r.x, r.z, px, pz);
      // Face the player and strafe when close; close in when far.
      r.mesh.lookAt(px, 0, pz);
      if (d > 26) {
        const a = Math.atan2(px - r.x, pz - r.z);
        r.x += Math.sin(a) * 3.2 * dt;
        r.z += Math.cos(a) * 3.2 * dt;
      } else {
        r.x += Math.cos(state.time + r.strafe) * 1.4 * dt;
        r.z += Math.sin(state.time * 0.8 + r.strafe) * 1.4 * dt;
      }
      r.x = clamp(r.x, -198, 198);
      r.z = clamp(r.z, -198, 198);
      r.mesh.position.set(r.x, 0, r.z);
      // The health bars are children of the rival mesh, which already
      // faces the player (lookAt above), so they face the camera too —
      // no per-bar lookAt needed.
      // Shoot back every couple of seconds when in range and in view.
      if (d < 34 && state.time > r.shootAt && state.playerHealth > 0) {
        r.shootAt = state.time + rand(rng, 1.6, 2.8);
        const hitChance = d < 12 ? 0.55 : 0.3;
        if (rng() < hitChance) {
          state.playerHealth = Math.max(0, state.playerHealth - randInt(rng, 5, 11));
          state.lastDamageAt = state.time;
        }
      }
    }
  }

  return { rivals, spawnRivals, clearRivals, shoot, reload, update };
}
