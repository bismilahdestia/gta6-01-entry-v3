// Wanted system: 0–5 stars driven by heat. Crimes add heat; heat
// decays while the player stays quiet. One police interceptor per
// star chases the player; at 4–5 stars a helicopter with a visible
// searchlight cone circles overhead and roadblocks go up on the
// streets ahead. When heat hits zero the stars clear.
import * as THREE from 'three';
import { CFG } from './config.js';
import { clamp, rand } from './util.js';

function makeHelicopter() {
  const heli = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.4, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 6), bodyMat);
  heli.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 5), bodyMat);
  tail.position.set(0, 0.3, -5);
  heli.add(tail);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x9fd4ff, roughness: 0.15, metalness: 0.7 }),
  );
  glass.position.set(0, 0.3, 2.6);
  heli.add(glass);
  // Main rotor (spins) + tail rotor.
  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.5), bladeMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  rotor.position.y = 1.2;
  heli.add(rotor);
  heli.userData.rotor = rotor;
  // Searchlight cone: translucent yellow, aimed straight down at
  // the player, so the helicopter reads clearly at dusk.
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b0, transparent: true, opacity: 0.18,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 34, 20, 1, true), coneMat);
  cone.position.y = -18;
  cone.rotation.x = Math.PI;
  heli.add(cone);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  );
  lamp.position.y = -0.9;
  heli.add(lamp);
  return heli;
}

function makeRoadblock() {
  const group = new THREE.Group();
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.8 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.8 });
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.7, 0.4),
      i % 2 === 0 ? stripeMat : orangeMat,
    );
    bar.position.y = 1.1 + i * 0.75;
    group.add(bar);
  }
  for (const x of [-4.4, 4.4]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.6, 0.4), stripeMat);
    leg.position.set(x, 1.3, 0);
    group.add(leg);
  }
  return group;
}

export function createWanted(scene, rng, carSystem) {
  let heli = null;
  let heliAngle = 0;
  const roadblocks = [];

  function ensureHeli() {
    if (heli) return;
    heli = makeHelicopter();
    scene.add(heli);
  }
  function removeHeli() {
    if (!heli) return;
    scene.remove(heli);
    heli = null;
  }

  function ensureRoadblocks(state) {
    if (roadblocks.length >= 2) return;
    // Drop a striped barrier + a parked police car on the street
    // ahead of the player, so the roadblock is in the player's path.
    const px = state.inCar ? carSystem.playerCar.x : state.playerPos.x;
    const pz = state.inCar ? carSystem.playerCar.z : state.playerPos.z;
    const ahead = 40;
    const spots = [
      { x: clamp(Math.round(px / 40) * 40, -200, 200), z: pz + ahead },
      { x: px + ahead, z: clamp(Math.round(pz / 40) * 40, -200, 200) },
    ];
    for (const s of spots) {
      if (roadblocks.length >= 2) break;
      const block = makeRoadblock();
      block.position.set(clamp(s.x, -196, 196), 0, clamp(s.z, -196, 196));
      block.rotation.y = Math.abs(s.x - px) > Math.abs(s.z - pz) ? 0 : Math.PI / 2;
      scene.add(block);
      roadblocks.push(block);
    }
  }
  function clearRoadblocks() {
    for (const b of roadblocks) scene.remove(b);
    roadblocks.length = 0;
  }

  function addHeat(amount, state) {
    state.heat = Math.min(CFG.maxStars * CFG.heatPerStar, state.heat + amount);
    state.lastCrimeAt = state.time;
  }

  function update(dt, state) {
    // Heat decays only after 5 quiet seconds.
    if (state.time - (state.lastCrimeAt || 0) > 5) {
      state.heat = Math.max(0, state.heat - CFG.heatDecay * dt);
    }
    const stars = Math.min(CFG.maxStars, Math.floor(state.heat / CFG.heatPerStar));
    if (stars !== state.stars) {
      state.stars = stars;
      // One interceptor per star.
      const have = carSystem.police.length;
      if (stars > have) {
        for (let i = 0; i < stars - have; i++) carSystem.spawnPolice();
      } else if (stars < have) {
        carSystem.removePolice(have - stars);
      }
    }
    if (stars >= CFG.heliStars) {
      ensureHeli();
      ensureRoadblocks(state);
    } else {
      removeHeli();
      clearRoadblocks();
    }
    // Helicopter circles the player with its searchlight on them.
    if (heli) {
      heliAngle += dt * 0.5;
      const px = state.inCar ? carSystem.playerCar.x : state.playerPos.x;
      const pz = state.inCar ? carSystem.playerCar.z : state.playerPos.z;
      heli.position.set(
        px + Math.cos(heliAngle) * 24,
        42 + Math.sin(state.time * 0.7) * 2,
        pz + Math.sin(heliAngle) * 24,
      );
      heli.rotation.y = Math.atan2(px - heli.position.x, pz - heli.position.z);
      heli.userData.rotor.rotation.y += dt * 22;
    }
    return stars;
  }

  return { update, addHeat, get heli() { return heli; } };
}
