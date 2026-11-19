// Porto Alba at dusk: a procedural coastal city on a 40-unit road
// grid (x = 0 IS a street), tall towers with lit windows, a marina
// and promenade on the south edge, a pier, Café Alba with its orange
// awning, a LOW warehouse (<= 8 high, so the gold mission beacon at
// y = 11 clears its roofline), palm trees, neon signs and 9 low clouds.
// All geometry is built once here; collisions come from buildingBoxes.
import * as THREE from 'three';
import { CFG } from './config.js';
import { rand, randInt, pick } from './util.js';

// Canvas texture helper: glowing text for neon signs.
function textTexture(text, fg, bg) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.font = 'bold 64px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = fg;
  g.shadowBlur = 26;
  g.fillStyle = fg;
  g.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function neonSign(scene, text, color, x, y, z, rotY, w = 22) {
  const mat = new THREE.MeshBasicMaterial({
    map: textTexture(text, color, '#0a0618'),
    transparent: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  scene.add(mesh);
  return mesh;
}

// One palm: a leaning trunk and five flat fronds.
function makePalm(rng) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 7, 6), trunkMat);
  trunk.position.y = 3.5;
  trunk.rotation.z = rand(rng, -0.08, 0.08);
  group.add(trunk);
  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x2f7a3d, roughness: 1, side: THREE.DoubleSide,
  });
  for (let i = 0; i < 5; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.4, 4), frondMat);
    const a = (i / 5) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.6, 7.2, Math.sin(a) * 1.6);
    frond.rotation.z = Math.cos(a) * 1.15;
    frond.rotation.x = -Math.sin(a) * 1.15;
    frond.scale.set(1, 1, 0.28);
    group.add(frond);
  }
  return group;
}

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const half = CFG.halfMap;
  const step = CFG.roadStep;

  // Ground: dark dusk asphalt for the whole map.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.mapSize + 120, CFG.mapSize + 120),
    new THREE.MeshStandardMaterial({ color: CFG.groundColor, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  group.add(ground);

  // Roads: dark strips on every grid line, both directions.
  const roadMat = new THREE.MeshStandardMaterial({ color: CFG.roadColor, roughness: 0.9 });
  const roads = [];
  for (let c = -half; c <= half; c += step) {
    const rx = new THREE.Mesh(new THREE.PlaneGeometry(CFG.roadWidth, CFG.mapSize), roadMat);
    rx.rotation.x = -Math.PI / 2;
    rx.position.set(c, 0, 0);
    group.add(rx);
    const rz = new THREE.Mesh(new THREE.PlaneGeometry(CFG.roadWidth, CFG.mapSize), roadMat);
    rz.rotation.x = -Math.PI / 2;
    rz.position.set(0, 0, c);
    group.add(rz);
    roads.push(c);
  }

  // Kerbs: pale strips edging each road, so streets read at dusk.
  const kerbMat = new THREE.MeshStandardMaterial({ color: CFG.kerbColor, roughness: 1 });
  for (let c = -half; c <= half; c += step) {
    for (const off of [-CFG.roadWidth / 2 - 0.6, CFG.roadWidth / 2 + 0.6]) {
      const k1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, CFG.mapSize), kerbMat);
      k1.position.set(c + off, 0.12, 0);
      group.add(k1);
      const k2 = new THREE.Mesh(new THREE.BoxGeometry(CFG.mapSize, 0.25, 1.2), kerbMat);
      k2.position.set(0, 0.12, c + off);
      group.add(k2);
    }
  }

  // Centre dashes: one instanced mesh for the whole grid.
  const dashGeo = new THREE.PlaneGeometry(0.5, 3);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c98a });
  const dashSpots = [];
  for (let c = -half; c <= half; c += step) {
    for (let d = -half + 8; d <= half - 8; d += 8) {
      dashSpots.push([c, d, 0]);
      dashSpots.push([d, c, 1]);
    }
  }
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashSpots.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  // Rotate within the plane (about its normal, local Z) so the
  // dash's long axis runs along the street it marks.
  const normal = new THREE.Vector3(0, 0, 1);
  dashSpots.forEach(([x, z, rot], i) => {
    q.setFromAxisAngle(normal, rot ? Math.PI / 2 : 0);
    m4.compose(new THREE.Vector3(x, 0.02, z), q, new THREE.Vector3(1, 1, 1));
    dashes.setMatrixAt(i, m4);
  });
  // Lay the dashes flat: planes stand vertical by default.
  dashes.rotation.x = -Math.PI / 2;
  group.add(dashes);

  // Buildings: one tower per block centre (±20, ±60, ...), skipping
  // the landmark blocks and a few plazas. Windows are a single
  // instanced mesh — warm orange and cool blue emissive rectangles,
  // some dark — so the city glows at dusk without thousands of meshes.
  const blockCentres = [];
  for (let bx = -half + 20; bx <= half - 20; bx += step) {
    for (let bz = -half + 20; bz <= half - 20; bz += step) blockCentres.push([bx, bz]);
  }
  const landmarkBlocks = new Set(['60,20', '-140,100', '0,180']);
  const buildingBoxes = [];
  const windowSpots = []; // {x, y, z, rotY, w, h, color}
  const winColors = [CFG.windowWarm, CFG.windowWarm, CFG.windowCool, CFG.windowDark];
  const towerMat = new THREE.MeshStandardMaterial({ color: CFG.buildingBase, roughness: 0.85 });
  const towerMat2 = new THREE.MeshStandardMaterial({ color: 0x3a2f5e, roughness: 0.85 });
  const towerMat3 = new THREE.MeshStandardMaterial({ color: 0x24344f, roughness: 0.85 });
  const towerMats = [towerMat, towerMat2, towerMat3];
  for (const [bx, bz] of blockCentres) {
    if (landmarkBlocks.has(bx + ',' + bz)) continue;
    if (rng() < 0.12) continue; // plaza / empty lot
    const w = rand(rng, 16, 26);
    const d = rand(rng, 16, 26);
    const h = rand(rng, 14, 62);
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      pick(rng, towerMats),
    );
    tower.position.set(bx, h / 2, bz);
    group.add(tower);
    // Roof rim light: a thin glowing edge so towers read at dusk.
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4),
      new THREE.MeshBasicMaterial({ color: pick(rng, [0xff8a3c, 0x7fd4ff, 0xff5a8a]) }),
    );
    rim.position.set(bx, h + 0.2, bz);
    group.add(rim);
    buildingBoxes.push({ x: bx, z: bz, hw: w / 2 + 0.5, hd: d / 2 + 0.5, h });
    // Windows on the two street-facing sides.
    const cols = Math.max(2, Math.floor(w / 4));
    const rows = Math.max(3, Math.floor(h / 4));
    for (let r = 0; r < rows; r++) {
      for (let cIdx = 0; cIdx < cols; cIdx++) {
        const wx = bx - w / 2 + 2 + (cIdx + 0.5) * ((w - 4) / cols);
        const wy = 3 + (r + 0.5) * ((h - 5) / rows);
        windowSpots.push({ x: wx, y: wy, z: bz + d / 2 + 0.06, rotY: 0, color: pick(rng, winColors) });
        windowSpots.push({ x: wx, y: wy, z: bz - d / 2 - 0.06, rotY: Math.PI, color: pick(rng, winColors) });
      }
    }
  }
  const winGeo = new THREE.PlaneGeometry(1.6, 2.2);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const windows = new THREE.InstancedMesh(winGeo, winMat, windowSpots.length);
  const col = new THREE.Color();
  windowSpots.forEach((s, i) => {
    q.setFromAxisAngle(up, s.rotY);
    m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(1, 1, 1));
    windows.setMatrixAt(i, m4);
    windows.setColorAt(i, col.setHex(s.color));
  });
  group.add(windows);

  // ---- Landmarks -------------------------------------------------
  // Marisol Pier: wooden deck reaching south over the water, gold lamps.
  const pier = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(16, 1, 34),
    new THREE.MeshStandardMaterial({ color: CFG.pierWood, roughness: 1 }),
  );
  deck.position.set(0, 0.6, 197);
  pier.add(deck);
  for (let i = 0; i < 6; i++) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 3, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 }),
    );
    post.position.set(i % 2 === 0 ? -7.4 : 7.4, 0.4, 184 + i * 5);
    pier.add(post);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd27a }),
    );
    lamp.position.set(i % 2 === 0 ? -7.4 : 7.4, 3.2, 184 + i * 5);
    pier.add(lamp);
  }
  group.add(pier);
  // Water beyond the south edge.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 120),
    new THREE.MeshStandardMaterial({ color: CFG.waterColor, roughness: 0.35, metalness: 0.4 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.4, 260);
  group.add(water);

  // Marina / promenade: pale walkway along the south edge + palms.
  const prom = new THREE.Mesh(
    new THREE.BoxGeometry(CFG.mapSize, 0.4, 16),
    new THREE.MeshStandardMaterial({ color: 0x8a7f6a, roughness: 1 }),
  );
  prom.position.set(0, 0.2, 178);
  group.add(prom);
  for (let px = -180; px <= 180; px += 30) {
    if (Math.abs(px) < 14) continue; // keep the pier mouth clear
    const palm = makePalm(rng);
    palm.position.set(px, 0.4, 172);
    group.add(palm);
  }

  // Café Alba (block 60, 20): low café with the orange awning + sign.
  const cafe = new THREE.Group();
  const cafeBody = new THREE.Mesh(
    new THREE.BoxGeometry(20, 7, 16),
    new THREE.MeshStandardMaterial({ color: 0xf2e3c8, roughness: 0.9 }),
  );
  cafeBody.position.set(60, 3.5, 20);
  cafe.add(cafeBody);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.4, 6),
    new THREE.MeshStandardMaterial({ color: CFG.awningOrange, roughness: 0.8 }),
  );
  awning.position.set(60, 4.6, 11);
  awning.rotation.x = 0.35;
  cafe.add(awning);
  const cafeGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 2.2),
    new THREE.MeshBasicMaterial({ color: 0xffc98a }),
  );
  cafeGlow.position.set(60, 3.4, 11.9);
  cafe.add(cafeGlow);
  group.add(cafe);
  buildingBoxes.push({ x: 60, z: 20, hw: 10.5, hd: 8.5, h: 7 });
  neonSign(scene, 'CAFÉ ALBA', '#ff9a3c', 60, 8.6, 12.2, 0, 18);
  neonSign(scene, 'MARISOL PIER', '#ffd27a', 0, 6.5, 181, 0, 24);
  neonSign(scene, 'NEON TIDE', '#ff5a8a', -140, 26, 84, Math.PI / 2, 20);

  // Alba Warehouse (block -140, 100): LOW — 8 units max, so the gold
  // mission beacon at y = 11 clears its roofline from a distance.
  // Door and sign on the SOUTH face.
  const warehouse = new THREE.Group();
  const whBody = new THREE.Mesh(
    new THREE.BoxGeometry(30, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0x7a6a55, roughness: 1 }),
  );
  whBody.position.set(-140, 4, 100);
  warehouse.add(whBody);
  const whDoor = new THREE.Mesh(
    new THREE.BoxGeometry(8, 6, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x3a3348, roughness: 0.9 }),
  );
  whDoor.position.set(-140, 3, 110.2);
  warehouse.add(whDoor);
  const whStripe = new THREE.Mesh(
    new THREE.BoxGeometry(30.4, 0.8, 20.4),
    new THREE.MeshBasicMaterial({ color: 0xffb347 }),
  );
  whStripe.position.set(-140, 7.6, 100);
  warehouse.add(whStripe);
  group.add(warehouse);
  buildingBoxes.push({ x: -140, z: 100, hw: 15.5, hd: 10.5, h: 8 });

  // Street lamps: poles with warm heads along the main avenues.
  const lampGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 5);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 1 });
  const headGeo = new THREE.SphereGeometry(0.45, 8, 8);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const lampSpots = [];
  for (let c = -half; c <= half; c += step) {
    for (let d = -half + 20; d <= half - 20; d += 40) {
      lampSpots.push([c + 8, d]);
      lampSpots.push([d, c - 8]);
    }
  }
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lampSpots.length);
  const heads = new THREE.InstancedMesh(headGeo, headMat, lampSpots.length);
  lampSpots.forEach(([x, z], i) => {
    m4.compose(new THREE.Vector3(x, 3, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    lamps.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x, 6.2, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    heads.setMatrixAt(i, m4);
  });
  group.add(lamps);
  group.add(heads);

  // 9 low clouds drifting over the city.
  const clouds = [];
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xd8b8e8, roughness: 1, transparent: true, opacity: 0.55,
  });
  for (let i = 0; i < 9; i++) {
    const cloud = new THREE.Group();
    const puffs = randInt(rng, 3, 5);
    for (let p = 0; p < puffs; p++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(rand(rng, 6, 12), 8, 6), cloudMat);
      s.position.set(rand(rng, -12, 12), rand(rng, -1, 1), rand(rng, -5, 5));
      s.scale.y = 0.45;
      cloud.add(s);
    }
    cloud.position.set(rand(rng, -190, 190), rand(rng, 55, 85), rand(rng, -190, 190));
    cloud.userData.speed = rand(rng, 0.4, 1.1);
    group.add(cloud);
    clouds.push(cloud);
  }

  return {
    group,
    roads,
    buildingBoxes,
    clouds,
    landmarks: {
      pier: new THREE.Vector3(0, 1, 200),
      cafe: new THREE.Vector3(60, 1, 8),
      marina: new THREE.Vector3(-120, 1, 178),
      warehouse: new THREE.Vector3(-140, 1, 112),
    },
    spawn: new THREE.Vector3(0, 0, 10),
  };
}
