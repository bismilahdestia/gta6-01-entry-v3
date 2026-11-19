// Shot staging: 4 screenshots for the dossier, all from the same
// seeded world (seed 91). Each shot positions the player, the
// camera, the wanted level and the mission, waits two frames, then
// sets window.__shotReady so the screenshot harness knows the
// scene is settled. No browser automation lives here — Phase 2
// drives the shots.
import { CFG } from './config.js';

const SHOTS = [
  {
    id: 'start',
    label: 'Start screen over the dusk city',
    setup(world) {
      // Start screen stays up; camera high over downtown at dusk.
      world.camera.position.set(60, 90, 160);
      world.camera.lookAt(0, 10, -20);
    },
  },
  {
    id: 'drive',
    label: 'Rook driving the teal car down a neon avenue',
    setup(world) {
      const { state, carSystem } = world;
      state.started = true;
      state.inCar = true;
      carSystem.playerCar.x = 0;
      carSystem.playerCar.z = 60;
      carSystem.playerCar.angle = Math.PI;
      carSystem.playerCar.speed = 26;
      carSystem.playerCar.mesh.position.set(0, 0, 60);
      carSystem.playerCar.mesh.rotation.y = Math.PI;
      state.playerPos.set(0, 0, 60);
      world.setCamYaw(Math.PI);
      world.story.startMission(0, world.combat);
    },
  },
  {
    id: 'chase',
    label: '4-star chase: police, helicopter searchlight, roadblock',
    setup(world) {
      const { state, carSystem } = world;
      state.started = true;
      state.inCar = true;
      carSystem.playerCar.x = -40;
      carSystem.playerCar.z = 120;
      carSystem.playerCar.angle = Math.PI * 0.75;
      carSystem.playerCar.speed = 30;
      carSystem.playerCar.mesh.position.set(-40, 0, 120);
      carSystem.playerCar.mesh.rotation.y = Math.PI * 0.75;
      state.playerPos.set(-40, 0, 120);
      state.heat = 4 * CFG.heatPerStar + 5;
      state.lastCrimeAt = state.time;
      world.setCamYaw(Math.PI * 0.75);
      world.story.startMission(3, world.combat);
      world.wanted.update(0.1, state);
    },
  },
  {
    id: 'mission',
    label: 'On foot at Café Alba with the gold mission beacon',
    setup(world) {
      const { state } = world;
      state.started = true;
      state.inCar = false;
      // Rook stands on the café's south side, facing the awning.
      state.playerPos.set(60, 0, -6);
      state.playerAngle = Math.PI;
      world.playerMesh.position.copy(state.playerPos);
      world.playerMesh.visible = true;
      world.setCamYaw(Math.PI);
      world.story.startMission(1, world.combat);
      world.combat.spawnRivals({ x: 60, z: 20 }, 2);
    },
  },
];

export function setupShots(state, world) {
  const params = new URLSearchParams(window.location.search);
  const shotId = params.get('shot');
  if (!shotId) return;
  const shot = SHOTS.find((s) => s.id === shotId);
  if (!shot) return;
  // Hide the start screen for in-game shots.
  if (shotId !== 'start') {
    document.getElementById('start-screen').classList.add('hidden');
  }
  world.state = state;
  shot.setup(world);
  // Two frames for the scene to settle, then signal readiness.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
      window.__shotId = shotId;
    });
  });
}

export { SHOTS };
