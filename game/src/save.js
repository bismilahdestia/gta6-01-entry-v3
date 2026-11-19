// Save / load through localStorage: mission, money, health, ammo,
// wanted heat and the player's position. A save is written after
// every mission and every 20 seconds of play; loading restores the
// run exactly where it stopped.
import { CFG } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      version: 6,
      missionIndex: state.missionIndex,
      missionStage: state.missionStage,
      money: Math.round(state.money),
      health: Math.round(state.playerHealth),
      ammo: state.ammo,
      reserveAmmo: state.reserveAmmo,
      heat: state.heat,
      stars: state.stars,
      clockMinutes: state.clockMinutes,
      kills: state.kills || 0,
      inCar: state.inCar,
      playerPos: { x: state.playerPos.x, z: state.playerPos.z },
      playerAngle: state.playerAngle,
      carPos: { x: state.carX, z: state.carZ, angle: state.carAngle },
      savedAt: Date.now(),
    };
    localStorage.setItem(CFG.saveKey, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(CFG.saveKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Only saves written by this version (v6) are trusted.
    if (!data || data.version !== 6) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(CFG.saveKey);
  } catch {
    // Storage unavailable — the game still plays, it just won't save.
  }
}

export function hasSave() {
  return loadGame() !== null;
}
