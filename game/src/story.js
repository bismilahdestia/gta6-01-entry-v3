// Story: 4 missions for Rook in Porto Alba. Each mission names a
// real place in the city; a tall gold beacon (top at y = 22, base
// ring on the ground) marks the destination, and a briefing is shown
// before it starts. Completing a mission pays cash and opens the
// next; the last mission forces 5 stars for the escape to the pier.
import * as THREE from 'three';
import { MISSIONS } from './config.js';
import { dist2D } from './util.js';

function makeBeacon() {
  const group = new THREE.Group();
  // Gold column: transparent, 22 tall, centred at y = 11 — its top
  // clears the low warehouse roofline (8) from across the city.
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 22, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffc93c, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  column.position.y = 11;
  group.add(column);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.2, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  group.add(ring);
  const light = new THREE.PointLight(0xffc93c, 60, 40);
  light.position.y = 6;
  group.add(light);
  group.userData.column = column;
  group.userData.ring = ring;
  return group;
}

export function createStory(scene, state, city) {
  const beacon = makeBeacon();
  scene.add(beacon);
  beacon.visible = false;

  function targetOf(mission) {
    return city.landmarks[mission.place];
  }

  function currentMission() {
    return MISSIONS[state.missionIndex] || null;
  }

  function startMission(index, combat) {
    const m = MISSIONS[index];
    if (!m) return null;
    state.missionIndex = index;
    state.missionStage = 'active';
    const target = targetOf(m);
    beacon.position.set(target.x, 0, target.z);
    beacon.visible = true;
    if (m.forceStars) {
      state.heat = m.forceStars * 25;
      state.lastCrimeAt = state.time;
    }
    if (combat) {
      combat.clearRivals();
      if (index >= 1) combat.spawnRivals(target, index + 1);
    }
    return m;
  }

  function update(dt, combat, onEvent) {
    const m = currentMission();
    if (!m || state.missionStage !== 'active') return;
    const target = targetOf(m);
    const px = state.playerPos.x;
    const pz = state.playerPos.z;
    // Beacon pulse: the column breathes so it reads at dusk.
    const pulse = 0.28 + Math.sin(state.time * 3) * 0.1;
    beacon.userData.column.material.opacity = pulse;
    beacon.userData.ring.scale.setScalar(1 + Math.sin(state.time * 2) * 0.12);
    // Arrival radius 10: generous enough to trigger on foot or in
    // the car without parking exactly on the beacon.
    if (dist2D(px, pz, target.x, target.z) < 10) {
      state.money += m.reward;
      state.missionStage = 'done';
      beacon.visible = false;
      if (combat) combat.clearRivals();
      onEvent({ type: 'mission-complete', mission: m });
      if (state.missionIndex + 1 < MISSIONS.length) {
        const next = startMission(state.missionIndex + 1, combat);
        onEvent({ type: 'mission-start', mission: next });
      } else {
        state.missionStage = 'finished';
        onEvent({ type: 'story-complete' });
      }
    }
  }

  function objectiveText() {
    const m = currentMission();
    if (!m) return 'Porto Alba is yours — free roam.';
    if (state.missionStage === 'done') return 'Mission complete — next job incoming…';
    return m.objective;
  }

  function hintText() {
    const m = currentMission();
    return m ? m.hint : '';
  }

  return {
    beacon, currentMission, startMission, update,
    objectiveText, hintText, targetOf,
  };
}
