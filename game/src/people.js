// Pedestrians: Porto Alba residents strolling the pavements.
// They walk between waypoints along the streets and step clear of
// any car that comes at them, so traffic feels alive without
// scripting a crowd simulation.
import * as THREE from 'three';
import { CFG } from './config.js';
import { rand, randInt, pick, dist2D, clamp } from './util.js';

const SHIRTS = [0xe8e8e8, 0xd84a4a, 0x4a7ad8, 0x4ad87a, 0xe8c84a, 0xb44ad8, 0x4ad8d0, 0xd88a4a];
const SKINS = [0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf0c8a0];

function makePedMesh(rng) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: pick(rng, SHIRTS), roughness: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.95, 8), shirt);
  body.position.y = 0.95;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshStandardMaterial({ color: pick(rng, SKINS), roughness: 0.9 }),
  );
  head.position.y = 1.65;
  g.add(head);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.5, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 1 }),
  );
  legs.position.y = 0.25;
  g.add(legs);
  return g;
}

// A pavement waypoint: beside a road, offset from its centre line.
function pavementPoint(rng) {
  const streets = [];
  for (let c = -CFG.halfMap; c <= CFG.halfMap; c += CFG.roadStep) streets.push(c);
  const street = pick(rng, streets);
  const along = rand(rng, -CFG.halfMap + 10, CFG.halfMap - 10);
  const side = pick(rng, [-9.5, 9.5]);
  if (rng() < 0.5) return { x: along, z: street + side };
  return { x: street + side, z: along };
}

export function createPedestrians(scene, rng) {
  const peds = [];
  for (let i = 0; i < CFG.pedCount; i++) {
    const mesh = makePedMesh(rng);
    const start = pavementPoint(rng);
    mesh.position.set(start.x, 0, start.z);
    scene.add(mesh);
    peds.push({
      mesh,
      x: start.x,
      z: start.z,
      target: pavementPoint(rng),
      speed: rand(rng, CFG.pedSpeedMin, CFG.pedSpeedMax),
      bob: rng() * Math.PI * 2,
    });
  }

  function update(dt, cars) {
    for (const p of peds) {
      // Step clear: if a car is close and approaching, sidestep away
      // from it (perpendicular push, scaled by closeness).
      let dodgeX = 0;
      let dodgeZ = 0;
      for (const c of cars) {
        const d = dist2D(p.x, p.z, c.x ?? c.mesh.position.x, c.z ?? c.mesh.position.z);
        if (d < CFG.pedClearRadius) {
          const cx = c.x ?? c.mesh.position.x;
          const cz = c.z ?? c.mesh.position.z;
          const away = Math.max(0.001, d);
          dodgeX += ((p.x - cx) / away) * (CFG.pedClearRadius - d);
          dodgeZ += ((p.z - cz) / away) * (CFG.pedClearRadius - d);
        }
      }
      const dx = p.target.x - p.x + dodgeX * 3;
      const dz = p.target.z - p.z + dodgeZ * 3;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < 1.5 && dodgeX === 0 && dodgeZ === 0) {
        p.target = pavementPoint(rng);
      } else if (d > 0.01) {
        const step = Math.min(p.speed * dt, d);
        p.x += (dx / d) * step;
        p.z += (dz / d) * step;
        p.mesh.rotation.y = Math.atan2(dx, dz);
      }
      p.x = clamp(p.x, -CFG.halfMap, CFG.halfMap);
      p.z = clamp(p.z, -CFG.halfMap, CFG.halfMap);
      p.bob += dt * 6;
      p.mesh.position.set(p.x, Math.abs(Math.sin(p.bob)) * 0.06, p.z);
    }
  }

  return { peds, update };
}
