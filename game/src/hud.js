// HUD: health bar + HP, wanted stars, speed, money, ammo, the
// objective chip (names a PLACE), a high-contrast circular minimap
// with district labels, the in-game clock, the wave label and a
// slim top banner that never covers the scene.
import { CFG, DISTRICTS } from './config.js';
import { formatClock } from './util.js';

export function createHUD(state, story) {
  const el = (id) => document.getElementById(id);
  const healthFill = el('health-fill');
  const healthText = el('health-text');
  const starsEl = el('stars');
  const speedEl = el('speed');
  const moneyEl = el('money');
  const ammoEl = el('ammo');
  const objectiveEl = el('objective');
  const hintEl = el('hint');
  const bannerEl = el('banner');
  const clockEl = el('clock');
  const waveEl = el('wave');
  const mapCanvas = el('minimap');
  const mapCtx = mapCanvas.getContext('2d');
  const crosshair = el('crosshair');

  let bannerUntil = 0;

  function showBanner(text, seconds = 3) {
    bannerEl.textContent = text;
    bannerEl.classList.add('show');
    bannerUntil = state.time + seconds;
  }

  function drawMinimap(world) {
    const size = mapCanvas.width;
    const c = mapCtx;
    const scale = size / (CFG.mapSize + 40);
    const toMap = (x, z) => [size / 2 + x * scale, size / 2 + z * scale];
    c.clearRect(0, 0, size, size);
    // Circular clip: the map is a round radar.
    c.save();
    c.beginPath();
    c.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = '#14101f';
    c.fillRect(0, 0, size, size);
    // Roads.
    c.strokeStyle = '#5a5470';
    c.lineWidth = 3;
    for (let r = -CFG.halfMap; r <= CFG.halfMap; r += CFG.roadStep) {
      const [x1, y1] = toMap(r, -CFG.halfMap);
      const [x2, y2] = toMap(r, CFG.halfMap);
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      const [x3, y3] = toMap(-CFG.halfMap, r);
      const [x4, y4] = toMap(CFG.halfMap, r);
      c.beginPath(); c.moveTo(x3, y3); c.lineTo(x4, y4); c.stroke();
    }
    // Water + promenade at the south edge.
    c.fillStyle = '#1d3a5f';
    c.fillRect(0, toMap(0, CFG.halfMap - 4)[1], size, size);
    // District labels.
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.font = 'bold 9px sans-serif';
    c.textAlign = 'center';
    for (const d of DISTRICTS) {
      const [x, y] = toMap(d.x, d.z);
      c.fillText(d.name, x, y);
    }
    // Mission beacon.
    if (story && story.beacon.visible) {
      const [x, y] = toMap(story.beacon.position.x, story.beacon.position.z);
      c.fillStyle = '#ffc93c';
      c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#ffc93c';
      c.beginPath(); c.arc(x, y, 8 + Math.sin(state.time * 3) * 2, 0, Math.PI * 2); c.stroke();
    }
    // Police dots.
    if (world && world.carSystem) {
      c.fillStyle = '#ff4040';
      for (const cop of world.carSystem.police) {
        const [x, y] = toMap(cop.x, cop.z);
        c.beginPath(); c.arc(x, y, 2.5, 0, Math.PI * 2); c.fill();
      }
    }
    // Player arrow (teal, points along the heading).
    const [px, py] = toMap(state.playerPos.x, state.playerPos.z);
    c.save();
    c.translate(px, py);
    c.rotate(state.playerAngle || 0);
    c.fillStyle = '#14b8a6';
    c.beginPath();
    c.moveTo(0, -6); c.lineTo(4.5, 5); c.lineTo(-4.5, 5); c.closePath();
    c.fill();
    c.restore();
    c.restore();
    // Ring around the radar.
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    c.stroke();
  }

  function update(world) {
    const hp = Math.max(0, Math.round(state.playerHealth));
    healthFill.style.width = hp + '%';
    healthFill.style.background = hp > 50 ? '#44dd55' : hp > 25 ? '#ffaa22' : '#ff4040';
    healthText.textContent = hp + ' HP';
    let stars = '';
    for (let i = 0; i < CFG.maxStars; i++) stars += i < state.stars ? '★' : '☆';
    starsEl.textContent = stars;
    starsEl.classList.toggle('hot', state.stars >= 3);
    speedEl.textContent = Math.round(state.speedKmh || 0) + ' km/h';
    moneyEl.textContent = '$' + Math.round(state.money).toLocaleString('en-US');
    ammoEl.textContent = state.ammo + ' / ' + state.reserveAmmo;
    objectiveEl.textContent = story ? story.objectiveText() : '';
    hintEl.textContent = story ? story.hintText() : '';
    clockEl.textContent = formatClock(state.clockMinutes);
    waveEl.textContent = 'WAVE ' + (state.missionIndex + 1) + ' — Neon Tide';
    crosshair.style.display = state.inCar || !state.started ? 'none' : 'block';
    if (bannerEl.classList.contains('show') && state.time > bannerUntil) {
      bannerEl.classList.remove('show');
    }
    drawMinimap(world);
  }

  return { update, showBanner };
}
