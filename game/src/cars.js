// Cars: the player's teal car, traffic, kerb-parked steal targets and
// police interceptors with red/blue light bars. Arcade physics for
// the player car; traffic follows the road grid and turns at
// intersections; police steer toward the player.
// Steal rule: E steals the NEAREST parked car only — never the
// player's own teal car.
import * as THREE from 'three';
import { CFG } from './config.js';
import { rand, randInt, pick, clamp, lerpAngle, dist2D } from './util.js';

const TRAFFIC_COLORS = [0xc23b3b, 0x3b6fc2, 0xd8d8d8, 0x2a2a2a, 0xe8a13c, 0x7a3bc2, 0x4a9a5a];
const PARKED_COLORS = [0xb03a2e, 0x2e6db0, 0xcfcfcf, 0x8a5a2e, 0x3c8a6a, 0x9a3b7a];

function makeWheel() {
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 }),
  );
  wheel.rotation.z = Math.PI / 2;
  return wheel;
}

// A low-poly car: body, cabin, wheels, headlights and taillights.
// Police cars get a flashing red/blue light bar on the roof.
export function makeCarMesh(color, isPolice = false) {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
  body.position.y = 0.55;
  car.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.65, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.2, metalness: 0.6 }),
  );
  cabin.position.set(0, 1.2, -0.2);
  car.add(cabin);
  const wheelSpots = [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]];
  for (const [x, z] of wheelSpots) {
    const w = makeWheel();
    w.position.set(x, 0.42, z);
    car.add(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.1), headMat);
    h.position.set(x, 0.6, 2.22);
    car.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const x of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.1), tailMat);
    t.position.set(x, 0.6, -2.22);
    car.add(t);
  }
  let lightBar = null;
  if (isPolice) {
    lightBar = new THREE.Group();
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2020 }),
    );
    red.position.x = -0.35;
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2040ff }),
    );
    blue.position.x = 0.35;
    lightBar.add(red);
    lightBar.add(blue);
    lightBar.position.set(0, 1.65, -0.2);
    lightBar.userData.red = red;
    lightBar.userData.blue = blue;
    car.add(lightBar);
  }
  car.userData.lightBar = lightBar;
  return car;
}

function collideBuildings(pos, boxes, radius) {
  for (const b of boxes) {
    const dx = pos.x - b.x;
    const dz = pos.z - b.z;
    if (Math.abs(dx) < b.hw + radius && Math.abs(dz) < b.hd + radius) {
      const pushX = b.hw + radius - Math.abs(dx);
      const pushZ = b.hd + radius - Math.abs(dz);
      if (pushX < pushZ) pos.x = b.x + Math.sign(dx || 1) * (b.hw + radius);
      else pos.z = b.z + Math.sign(dz || 1) * (b.hd + radius);
    }
  }
}

export function createCarSystem(scene, rng, city) {
  const boxes = city.buildingBoxes;
  const half = CFG.halfMap;

  // --- Player car (teal, never a steal target) -------------------
  const playerCar = {
    mesh: makeCarMesh(CFG.playerCarColor),
    speed: 0,
    angle: Math.PI, // facing north (-z is forward in our heading math)
    x: city.spawn.x,
    z: city.spawn.z,
  };
  playerCar.mesh.position.set(playerCar.x, 0, playerCar.z);
  scene.add(playerCar.mesh);

  // --- Traffic: cars cruising the grid ---------------------------
  const traffic = [];
  const streets = [];
  for (let c = -half; c <= half; c += CFG.roadStep) streets.push(c);
  for (let i = 0; i < CFG.trafficCount; i++) {
    const axis = rng() < 0.5 ? 'x' : 'z';
    const street = pick(rng, streets);
    const lane = pick(rng, [-3.5, 3.5]);
    const along = rand(rng, -half + 10, half - 10);
    const dir = rng() < 0.5 ? 1 : -1;
    const mesh = makeCarMesh(pick(rng, TRAFFIC_COLORS));
    const car = { mesh, axis, street, lane, along, dir, speed: rand(rng, CFG.trafficSpeedMin, CFG.trafficSpeedMax) };
    mesh.position.set(axis === 'x' ? along : street + lane, 0, axis === 'x' ? street + lane : along);
    scene.add(mesh);
    traffic.push(car);
  }

  // --- Parked cars along kerbs (steal targets) -------------------
  const parked = [];
  for (let i = 0; i < CFG.parkedCount; i++) {
    const street = pick(rng, streets);
    const along = rand(rng, -half + 20, half - 20);
    const side = pick(rng, [-8.6, 8.6]);
    const horizontal = rng() < 0.5;
    const mesh = makeCarMesh(pick(rng, PARKED_COLORS));
    mesh.position.set(horizontal ? along : street + side, 0, horizontal ? street + side : along);
    mesh.rotation.y = horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    scene.add(mesh);
    parked.push({ mesh, x: mesh.position.x, z: mesh.position.z, angle: mesh.rotation.y });
  }

  // --- Police interceptors (spawned per wanted star) -------------
  const police = [];
  function spawnPolice() {
    const mesh = makeCarMesh(0x1a1a22, true);
    const a = rand(rng, 0, Math.PI * 2);
    const px = clamp(playerCar.x + Math.cos(a) * 60, -half + 10, half - 10);
    const pz = clamp(playerCar.z + Math.sin(a) * 60, -half + 10, half - 10);
    mesh.position.set(px, 0, pz);
    scene.add(mesh);
    const cop = { mesh, speed: 0, angle: 0, x: px, z: pz, flash: rng() * 2 };
    police.push(cop);
    return cop;
  }
  function removePolice(n) {
    for (let i = 0; i < n && police.length > 0; i++) {
      const cop = police.pop();
      scene.remove(cop.mesh);
    }
  }

  // Steal the NEAREST parked car to (x, z). The player's own teal
  // car is never in the parked list, so it can never be stolen.
  function stealNearest(x, z) {
    let best = null;
    let bestD = Infinity;
    for (const p of parked) {
      const d = dist2D(x, z, p.x, p.z);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (!best || bestD > CFG.stealRange) return null;
    parked.splice(parked.indexOf(best), 1);
    return best;
  }

  function update(dt, input, state) {
    // --- Player car physics --------------------------------------
    const pc = playerCar;
    if (state.inCar) {
      const fwd = input.forward ? 1 : 0;
      const back = input.back ? 1 : 0;
      if (fwd) pc.speed += CFG.carAccel * dt;
      else if (back) pc.speed -= (pc.speed > 0.5 ? CFG.carBrake : CFG.carAccel * 0.5) * dt;
      else pc.speed -= Math.sign(pc.speed) * 8 * dt;
      if (Math.abs(pc.speed) < 0.2 && !fwd && !back) pc.speed = 0;
      pc.speed = clamp(pc.speed, -CFG.carReverseMax, CFG.carMaxSpeed);
      const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      const turnRate = (input.handbrake ? CFG.handbrakeTurn : CFG.carTurn) * Math.sign(pc.speed || 1);
      pc.angle += steer * turnRate * dt * clamp(Math.abs(pc.speed) / 8, 0.25, 1);
      if (input.handbrake) pc.speed *= 1 - 1.6 * dt;
      pc.x += Math.sin(pc.angle) * pc.speed * dt;
      pc.z += Math.cos(pc.angle) * pc.speed * dt;
      pc.x = clamp(pc.x, -half, half);
      pc.z = clamp(pc.z, -half, half);
      const pos = new THREE.Vector3(pc.x, 0, pc.z);
      collideBuildings(pos, boxes, 2.2);
      pc.x = pos.x;
      pc.z = pos.z;
      pc.mesh.position.set(pc.x, 0, pc.z);
      pc.mesh.rotation.y = pc.angle;
      state.speedKmh = Math.abs(pc.speed) * 3.6;
    } else {
      state.speedKmh = 0;
    }

    // --- Traffic ---------------------------------------------------
    for (const t of traffic) {
      t.along += t.dir * t.speed * dt;
      // Turn at an intersection sometimes; wrap at the map edge.
      const nearCross = Math.abs(((t.along % CFG.roadStep) + CFG.roadStep) % CFG.roadStep) < 1.2
        || Math.abs((((t.along % CFG.roadStep) + CFG.roadStep) % CFG.roadStep) - CFG.roadStep) < 1.2;
      if (nearCross && rng() < 0.01) {
        // Turn at the intersection: the new street is the car's
        // position along its old axis, and it continues along the
        // new axis from the old street's coordinate.
        const newStreet = clamp(Math.round(t.along / CFG.roadStep) * CFG.roadStep, -half, half);
        const oldStreet = t.street;
        t.street = newStreet;
        t.axis = t.axis === 'x' ? 'z' : 'x';
        t.along = oldStreet;
      }
      if (t.along > half) t.along = -half;
      if (t.along < -half) t.along = half;
      const x = t.axis === 'x' ? t.along : t.street + t.lane;
      const z = t.axis === 'x' ? t.street + t.lane : t.along;
      t.mesh.position.set(x, 0, z);
      const heading = t.axis === 'x' ? (t.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (t.dir > 0 ? 0 : Math.PI);
      t.mesh.rotation.y = heading;
      t.x = x;
      t.z = z;
    }

    // --- Police chase ----------------------------------------------
    const targetX = state.inCar ? pc.x : state.playerPos.x;
    const targetZ = state.inCar ? pc.z : state.playerPos.z;
    for (const cop of police) {
      const d = dist2D(cop.x, cop.z, targetX, targetZ);
      const want = Math.atan2(targetX - cop.x, targetZ - cop.z);
      cop.angle = lerpAngle(cop.angle, want, clamp(2.2 * dt, 0, 1));
      const top = d > 80 ? CFG.policeTopSpeed : CFG.policeTopSpeed * 0.85;
      cop.speed = clamp(cop.speed + CFG.policeAccel * dt, 0, top);
      cop.x += Math.sin(cop.angle) * cop.speed * dt;
      cop.z += Math.cos(cop.angle) * cop.speed * dt;
      const pos = new THREE.Vector3(cop.x, 0, cop.z);
      collideBuildings(pos, boxes, 2.2);
      cop.x = pos.x;
      cop.z = pos.z;
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = cop.angle;
      // Flash the light bar red/blue, alternating.
      cop.flash += dt * 6;
      const bar = cop.mesh.userData.lightBar;
      if (bar) {
        const on = Math.sin(cop.flash) > 0;
        bar.userData.red.material.color.setHex(on ? 0xff2020 : 0x551111);
        bar.userData.blue.material.color.setHex(on ? 0x111155 : 0x2040ff);
      }
      // Ram the player: a bump costs health and adds heat.
      if (d < 3.4 && state.playerHealth > 0) {
        state.playerHealth = Math.max(0, state.playerHealth - 6 * dt * 10);
        state.heat = Math.min(125, state.heat + 4 * dt);
      }
    }
    return { playerCar, traffic, parked, police };
  }

  return {
    playerCar, traffic, parked, police,
    update, spawnPolice, removePolice, stealNearest,
    setPlayerCar(mesh, x, z, angle) {
      playerCar.mesh = mesh;
      playerCar.x = x;
      playerCar.z = z;
      playerCar.angle = angle;
      playerCar.speed = 0;
      mesh.position.set(x, 0, z);
      mesh.rotation.y = angle;
    },
  };
}
