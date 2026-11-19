// Boot: wires every system together — renderer, dusk sky, camera,
// the main loop, the start screen and pause. Pause MUST freeze the
// world: while paused (or before starting) the loop renders one
// frame and updates nothing.
import * as THREE from 'three';
import { CFG, SHOT_SEED, MISSIONS } from './config.js';
import { mulberry32, clamp, lerpAngle, dist2D, rand } from './util.js';
import { buildCity } from './city.js';
import { createCarSystem } from './cars.js';
import { createPedestrians } from './people.js';
import { createWanted } from './wanted.js';
import { createCombat } from './combat.js';
import { createStory } from './story.js';
import { createHUD } from './hud.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { setupShots } from './shots.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(CFG.fogColor, CFG.fogNear, CFG.fogFar);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
scene.add(camera); // the camera carries the muzzle flash

// --- Dusk sky: a gradient dome + a low sun glow -----------------
function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1a0b3d');
  grad.addColorStop(0.45, '#4a2a63');
  grad.addColorStop(0.72, '#c94f6a');
  grad.addColorStop(0.88, '#ff7a3c');
  grad.addColorStop(1, '#ffb347');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(700, 24, 16),
  new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
);
scene.add(sky);

// Low sun: a glowing sprite on the western horizon.
function sunTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,220,150,1)');
  grad.addColorStop(0.35, 'rgba(255,150,60,0.75)');
  grad.addColorStop(1, 'rgba(255,110,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture(), fog: false, depthWrite: false }));
sun.position.set(-420, 55, -260);
sun.scale.setScalar(190);
scene.add(sun);

// Lights: dim purple ambient, a warm low sun, a cool hemisphere.
scene.add(new THREE.AmbientLight(0x6a4a8a, 0.85));
const sunLight = new THREE.DirectionalLight(0xff8a4a, 1.6);
sunLight.position.set(-180, 90, -120);
scene.add(sunLight);
scene.add(new THREE.HemisphereLight(0x8a5aa8, 0x2a1a33, 0.7));

// --- Shared state ------------------------------------------------
const rng = mulberry32(SHOT_SEED);
const state = {
  time: 0,
  clockMinutes: CFG.clockStartMinutes,
  playerPos: new THREE.Vector3(0, 0, 10),
  playerAngle: Math.PI,
  playerHealth: CFG.playerHealth,
  money: CFG.startMoney,
  ammo: CFG.startAmmo,
  reserveAmmo: CFG.reserveAmmo,
  stars: 0,
  heat: 0,
  lastCrimeAt: -100,
  lastDamageAt: -100,
  missionIndex: 0,
  missionStage: 'briefing',
  speedKmh: 0,
  inCar: false,
  started: false,
  paused: false,
  kills: 0,
  carX: 0, carZ: 10, carAngle: Math.PI,
};

// --- World --------------------------------------------------------
const city = buildCity(scene, rng);
const carSystem = createCarSystem(scene, rng, city);
const pedestrians = createPedestrians(scene, rng);
const wanted = createWanted(scene, rng, carSystem);
const combat = createCombat(scene, rng, state);
const story = createStory(scene, state, city);
const hud = createHUD(state, story);
const input = createInput(canvas);
const audio = createAudio();

// Rook on foot: dark jacket, teal scarf — visible at dusk.
const playerMesh = new THREE.Group();
const pBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.3, 0.36, 1.0, 8),
  new THREE.MeshStandardMaterial({ color: 0x22222e, roughness: 0.9 }),
);
pBody.position.y = 1.0;
playerMesh.add(pBody);
const pHead = new THREE.Mesh(
  new THREE.SphereGeometry(0.27, 10, 8),
  new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: 0.9 }),
);
pHead.position.y = 1.72;
playerMesh.add(pHead);
const pScarf = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.18, 0.1),
  new THREE.MeshStandardMaterial({ color: CFG.playerCarColor, roughness: 0.8 }),
);
pScarf.position.set(0, 1.42, 0.3);
playerMesh.add(pScarf);
const pLegs = new THREE.Mesh(
  new THREE.BoxGeometry(0.44, 0.55, 0.26),
  new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 1 }),
);
pLegs.position.y = 0.28;
playerMesh.add(pLegs);
playerMesh.position.copy(state.playerPos);
scene.add(playerMesh);

// --- Camera orbit -------------------------------------------------
let camYaw = Math.PI; // behind the player/car, looking north
let camPitch = 0.32;
let camDist = 11;

// --- Start / pause screens ---------------------------------------
const startScreen = document.getElementById('start-screen');
const startTitle = document.getElementById('start-title');
const startSub = document.getElementById('start-sub');
const startBtn = document.getElementById('start-btn');
const continueBtn = document.getElementById('continue-btn');
const pauseScreen = document.getElementById('pause-screen');
if (hasSave()) continueBtn.style.display = 'inline-block';

function applySave(data) {
  state.missionIndex = data.missionIndex;
  state.missionStage = data.missionStage;
  state.money = data.money;
  state.playerHealth = data.health;
  state.ammo = data.ammo;
  state.reserveAmmo = data.reserveAmmo;
  state.heat = data.heat;
  state.stars = data.stars;
  state.clockMinutes = data.clockMinutes;
  state.kills = data.kills;
  state.inCar = data.inCar;
  state.playerPos.set(data.playerPos.x, 0, data.playerPos.z);
  state.playerAngle = data.playerAngle;
  state.carX = data.carPos.x;
  state.carZ = data.carPos.z;
  state.carAngle = data.carPos.angle;
  carSystem.playerCar.x = state.carX;
  carSystem.playerCar.z = state.carZ;
  carSystem.playerCar.angle = state.carAngle;
  carSystem.playerCar.mesh.position.set(state.carX, 0, state.carZ);
  carSystem.playerCar.mesh.rotation.y = state.carAngle;
  playerMesh.position.copy(state.playerPos);
  playerMesh.rotation.y = state.playerAngle;
}

function beginGame(fromSave) {
  audio.ensure();
  audio.resume();
  state.started = true;
  state.paused = false;
  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  if (fromSave) {
    const data = loadGame();
    if (data) applySave(data);
  }
  const m = story.startMission(state.missionIndex, combat);
  if (m) hud.showBanner(m.name + ' — ' + m.objective, 4);
}

startBtn.addEventListener('click', () => beginGame(false));
continueBtn.addEventListener('click', () => beginGame(true));

// --- Story events --------------------------------------------------
function onStoryEvent(ev) {
  if (ev.type === 'mission-complete') {
    hud.showBanner('Mission complete — $' + ev.mission.reward + ' earned', 3.5);
    audio.pickup();
    saveGame(state);
  } else if (ev.type === 'mission-start') {
    hud.showBanner(ev.mission.name + ' — ' + ev.mission.objective, 4);
    audio.blip(520, 0.12, 0.2);
  } else if (ev.type === 'story-complete') {
    hud.showBanner('NEON TIDE complete — Porto Alba is yours, Rook.', 6);
    audio.pickup();
    saveGame(state);
  }
}

// --- Collision helper (on foot) ------------------------------------
function collidePoint(pos, radius) {
  for (const b of city.buildingBoxes) {
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

// --- Steal / exit ---------------------------------------------------
function tryStealOrExit() {
  if (state.inCar) {
    // Get out beside the car.
    state.inCar = false;
    state.playerPos.set(
      carSystem.playerCar.x + Math.cos(carSystem.playerCar.angle) * 3,
      0,
      carSystem.playerCar.z - Math.sin(carSystem.playerCar.angle) * 3,
    );
    state.playerAngle = carSystem.playerCar.angle;
    playerMesh.visible = true;
    playerMesh.position.copy(state.playerPos);
    state.carX = carSystem.playerCar.x;
    state.carZ = carSystem.playerCar.z;
    state.carAngle = carSystem.playerCar.angle;
    audio.blip(440, 0.08, 0.15);
    return;
  }
  const stolen = carSystem.stealNearest(state.playerPos.x, state.playerPos.z);
  if (!stolen) {
    hud.showBanner('No parked car close enough — find one at a kerb.', 2);
    return;
  }
  // Swap: the stolen car becomes the player's car; the old teal car
  // is parked where it stood (it stays a teal car, never stealable
  // as a parked target — parked targets come from the parked list).
  const oldMesh = carSystem.playerCar.mesh;
  const oldX = carSystem.playerCar.x;
  const oldZ = carSystem.playerCar.z;
  const oldAngle = carSystem.playerCar.angle;
  carSystem.setPlayerCar(stolen.mesh, stolen.x, stolen.z, stolen.angle);
  oldMesh.position.set(oldX, 0, oldZ);
  oldMesh.rotation.y = oldAngle;
  state.inCar = true;
  state.carX = stolen.x;
  state.carZ = stolen.z;
  state.carAngle = stolen.angle;
  playerMesh.visible = false;
  wanted.addHeat(CFG.heatPerCrime, state);
  hud.showBanner('Car stolen — the heat is on.', 2.5);
  audio.blip(330, 0.1, 0.2);
}

// --- Main loop -------------------------------------------------------
const clock = new THREE.Clock();
let saveTimer = 0;
let camInit = false;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Pause freezes the world: render one frame, update nothing.
  if (!state.started || state.paused) {
    renderer.render(scene, camera);
    return;
  }

  state.time += dt;
  state.clockMinutes += dt / CFG.clockSecondsPerMinute;

  const inp = input.read();
  if (input.consumePause()) {
    state.paused = true;
    pauseScreen.classList.remove('hidden');
    audio.setEngine(0);
    audio.setSiren(false);
  }

  // Camera orbit from mouse drag.
  camYaw -= inp.mouseDX * 0.005;
  camPitch = clamp(camPitch + inp.mouseDY * 0.004, 0.08, 1.1);

  if (input.consumeInteract()) tryStealOrExit();
  if (inp.reload) combat.reload();

  // Shooting (on foot only).
  if (inp.clicked && !state.inCar) {
    const result = combat.shoot(camera);
    if (result === 'hit' || result === 'kill' || result === 'miss') {
      audio.gunshot();
      if (result !== 'miss') wanted.addHeat(CFG.heatPerCrime * 0.5, state);
      if (result === 'kill') hud.showBanner('Rival down — $120', 1.5);
    }
  }

  // On-foot movement, relative to the camera yaw.
  if (!state.inCar) {
    const speed = inp.run ? CFG.runSpeed : CFG.walkSpeed;
    let mx = 0;
    let mz = 0;
    if (inp.forward) { mx += Math.sin(camYaw); mz += Math.cos(camYaw); }
    if (inp.back) { mx -= Math.sin(camYaw); mz -= Math.cos(camYaw); }
    if (inp.left) { mx -= Math.cos(camYaw); mz += Math.sin(camYaw); }
    if (inp.right) { mx += Math.cos(camYaw); mz -= Math.sin(camYaw); }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      state.playerPos.x += (mx / len) * speed * dt;
      state.playerPos.z += (mz / len) * speed * dt;
      state.playerAngle = lerpAngle(state.playerAngle, Math.atan2(mx, mz), clamp(10 * dt, 0, 1));
    }
    state.playerPos.x = clamp(state.playerPos.x, -CFG.halfMap, CFG.halfMap);
    state.playerPos.z = clamp(state.playerPos.z, -CFG.halfMap, CFG.halfMap);
    collidePoint(state.playerPos, 0.6);
    playerMesh.position.copy(state.playerPos);
    playerMesh.rotation.y = state.playerAngle;
    state.speedKmh = len > 0 ? speed * 3.6 : 0;
  } else {
    state.playerPos.set(carSystem.playerCar.x, 0, carSystem.playerCar.z);
    state.playerAngle = carSystem.playerCar.angle;
    state.carX = carSystem.playerCar.x;
    state.carZ = carSystem.playerCar.z;
    state.carAngle = carSystem.playerCar.angle;
  }

  // World systems.
  carSystem.update(dt, inp, state);
  pedestrians.update(dt, [
    ...carSystem.traffic.map((t) => ({ x: t.x, z: t.z })),
    { x: carSystem.playerCar.x, z: carSystem.playerCar.z },
    ...carSystem.police.map((c) => ({ x: c.x, z: c.z })),
  ]);
  wanted.update(dt, state);
  combat.update(dt, camera);
  story.update(dt, combat, onStoryEvent);
  for (const cloud of city.clouds) {
    cloud.position.x += cloud.userData.speed * dt;
    if (cloud.position.x > 210) cloud.position.x = -210;
  }

  // Slow health regen after 10 quiet seconds.
  if (state.time - state.lastDamageAt > 10 && state.playerHealth > 0 && state.playerHealth < CFG.playerHealth) {
    state.playerHealth = Math.min(CFG.playerHealth, state.playerHealth + 4 * dt);
  }

  // Wasted: hospital bill, respawn at the marina clinic. Police
  // lose the trail while Rook is unconscious, so heat clears.
  if (state.playerHealth <= 0) {
    state.money = Math.max(0, state.money - 200);
    state.playerHealth = CFG.playerHealth;
    state.heat = 0;
    state.stars = 0;
    state.inCar = false;
    playerMesh.visible = true;
    state.playerPos.set(-60, 0, 178);
    playerMesh.position.copy(state.playerPos);
    hud.showBanner('You woke up at the marina clinic — $200 hospital bill.', 4);
    saveGame(state);
  }

  // Camera: chase behind the car, or third-person behind Rook.
  const focusX = state.playerPos.x;
  const focusZ = state.playerPos.z;
  const focusAngle = state.inCar ? carSystem.playerCar.angle : camYaw;
  const dist = state.inCar ? 12 : 8;
  const height = state.inCar ? 4.6 : 3.2;
  const tx = focusX - Math.sin(focusAngle) * dist * Math.cos(camPitch);
  const tz = focusZ - Math.cos(focusAngle) * dist * Math.cos(camPitch);
  const ty = height + Math.sin(camPitch) * dist * 0.5;
  if (!camInit) {
    camera.position.set(tx, ty, tz);
    camInit = true;
  } else {
    camera.position.x += (tx - camera.position.x) * clamp(6 * dt, 0, 1);
    camera.position.y += (ty - camera.position.y) * clamp(6 * dt, 0, 1);
    camera.position.z += (tz - camera.position.z) * clamp(6 * dt, 0, 1);
  }
  camera.lookAt(focusX + Math.sin(focusAngle) * 4, 1.6, focusZ + Math.cos(focusAngle) * 4);

  // Sound follows the world.
  audio.setEngine(state.inCar ? Math.abs(carSystem.playerCar.speed) / CFG.carMaxSpeed : 0);
  audio.setSiren(state.stars >= 2);

  // Periodic save.
  saveTimer += dt;
  if (saveTimer > 20) {
    saveTimer = 0;
    saveGame(state);
  }

  hud.update({ carSystem });
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Resume from pause with P/F or a click on the pause screen.
pauseScreen.addEventListener('click', () => {
  state.paused = false;
  pauseScreen.classList.add('hidden');
  audio.resume();
});
window.addEventListener('keydown', (e) => {
  if ((e.code === 'KeyP' || e.code === 'KeyF') && state.started && state.paused) {
    state.paused = false;
    pauseScreen.classList.add('hidden');
    audio.resume();
  }
});

// Shot staging for screenshots (Phase 2): positions the world for
// each of the 4 shots, then flips window.__shotReady.
setupShots(state, {
  city, carSystem, wanted, combat, story, hud, playerMesh,
  camera, beginGame, setCamYaw: (y) => { camYaw = y; },
});

animate();
window.__portoAlba = { state, story, carSystem, wanted };
