/* ============================================================
   STOCKIST — FPS world (Three.js)
   A large first-person trade-floor walkthrough. Pointer-lock look,
   WASD movement, AABB collision around booth structures. Walk up to
   a brand booth → React mounts its 3D showroom.
   Exports createFPSWorld(canvas, opts) -> controller.

   NOTE: pinned to three@0.128.0. This uses THREE.sRGBEncoding /
   renderer.outputEncoding, which were removed in r152+ (replaced by
   colorSpace / outputColorSpace). Upgrading three requires porting
   those two call sites.
   ============================================================ */
import * as THREE from 'three';
import { BRANDS, PRODUCTS, brandById, getBooth } from '../data/store.js';

// brand booth accent (hex — Three can't parse oklch)
const BRAND_HEX = {
  b1: '#5b4eaa', b2: '#8f3a36', b3: '#3f6b50', b4: '#4a6a8a',
  b5: '#7a4a78', b6: '#34323c', b7: '#2f7d6b', b8: '#b0823a',
};

// ---- layout (world units = metres) ----
const HALL = { minX: -48, maxX: 48, minZ: -82, maxZ: 8 };
const WALL_H = 24, BOOTH_H = 3.5, R = 0.62, EYE = 1.7, ARCH_H = 7.8;

const COLS = [-34, -20, 20, 34];
const ROWS = [-6, -20, -34, -48, -62];
const BW = 11, BD = 9;

// brand assignments by "col,row"
const BRAND_AT = {
  '0,0': 'b4', '1,0': 'b3', '2,0': 'b7', '3,0': 'b8',
  '2,1': 'b5', '3,1': 'b6',
  '0,2': 'b2', '1,2': 'b1',
};
// neutral stands (numbered) to build the maze
const STAND_AT = {
  '2,2': 'A12', '3,2': 'A14',
  '0,3': 'B02', '1,3': 'B04', '2,3': 'B06', '3,3': 'B08',
  '1,4': 'C03', '2,4': 'C05',
};
// zone banners { name, x, z, hex }
const ZONE_BANNERS = [
  { name: 'Apparel', x: -27, z: -6, hex: '#3f6b50' },
  { name: 'Beauty', x: 20, z: -6, hex: '#2f7d6b' },
  { name: 'Accessories', x: 34, z: -6, hex: '#b0823a' },
  { name: 'Home', x: 27, z: -20, hex: '#7a4a78' },
  { name: 'Food & Drink', x: -27, z: -34, hex: '#8f3a36' },
];
// zone regions for the HUD readout
const ZONE_RECTS = [
  { name: 'Apparel', x0: -42, x1: -13, z0: -14, z1: 0 },
  { name: 'Beauty', x0: 13, x1: 27, z0: -14, z1: 0 },
  { name: 'Accessories', x0: 27, x1: 42, z0: -14, z1: 0 },
  { name: 'Home', x0: 13, x1: 42, z0: -28, z1: -14 },
  { name: 'Food & Drink', x0: -42, x1: -13, z0: -42, z1: -26 },
];

export function createFPSWorld(canvas, opts) {
  opts = opts || {};
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9e6dd');
  scene.fog = new THREE.Fog('#e9e6dd', 40, 110);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 240);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, EYE, 3);

  // ---- lights ----
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x8f8676, 0.62));
  scene.add(new THREE.AmbientLight(0x36332b, 0.2));
  const dir = new THREE.DirectionalLight(0xfff0dd, 0.5);
  dir.position.set(26, 70, 22); scene.add(dir);
  // warm pools hung high in the great hall
  [[-26, -10], [24, -10], [0, -34], [-26, -40], [26, -50], [0, -64]].forEach(([x, z]) => {
    const pl = new THREE.PointLight(0xffe4ba, 0.6, 64, 2); pl.position.set(x, 10, z); scene.add(pl);
  });

  // ---- text texture helper ----
  function textTexture(lines, o) {
    o = o || {};
    const W = o.w || 512, H = o.h || 256;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = o.bg || '#faf9f4'; g.fillRect(0, 0, W, H);
    if (o.bar) { g.fillStyle = o.bar; g.fillRect(0, 0, W, H * 0.16); }
    g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
    const cxp = o.align === 'left' ? 28 : W / 2;
    lines.forEach((ln) => {
      g.fillStyle = ln.color || '#1d1b16';
      g.font = (ln.weight || 700) + ' ' + (ln.size || 64) + 'px ' + (ln.font || "'Bricolage Grotesque', sans-serif");
      g.fillText(ln.text, cxp, ln.y);
    });
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = maxAniso; t.encoding = THREE.sRGBEncoding; t.needsUpdate = true;
    return t;
  }

  // ---- floor (polished, textured concrete — warm, not washed out) ----
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xb6ae9c, roughness: 0.8, metalness: 0.05 });
  (function () {
    const S = 256;
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#c2baa9'; g.fillRect(0, 0, S, S);
    // mottled aggregate speckle
    for (let i = 0; i < 2800; i++) {
      const x = Math.random() * S, y = Math.random() * S, r = Math.random() * 1.6 + 0.3;
      g.fillStyle = Math.random() < 0.5
        ? 'rgba(86,80,66,' + (0.04 + Math.random() * 0.08) + ')'
        : 'rgba(255,251,243,' + (0.05 + Math.random() * 0.10) + ')';
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    // faint diagonal polish streaks
    g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 1;
    for (let i = -S; i < S; i += 13) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + S, S); g.stroke(); }
    // tile seam
    g.strokeStyle = 'rgba(52,47,38,0.18)'; g.lineWidth = 2; g.strokeRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set((HALL.maxX - HALL.minX) / 4, (HALL.maxZ - HALL.minZ) / 4);
    tex.anisotropy = maxAniso; floorMat.map = tex;
  })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL.maxX - HALL.minX, HALL.maxZ - HALL.minZ), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((HALL.minX + HALL.maxX) / 2, 0, (HALL.minZ + HALL.maxZ) / 2);
  scene.add(floor);

  // trade-show carpet runners — warm the floor and guide the eye down the aisles
  (function () {
    const HWf = HALL.maxX - HALL.minX, HDf = HALL.maxZ - HALL.minZ;
    function runner(w, d, x, z, hex) {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      g.fillStyle = hex; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 1600; i++) { g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.05) + ')'; g.fillRect(Math.random() * 128, Math.random() * 128, 1, 2); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 3, d / 3); t.anisotropy = maxAniso;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, color: hex, roughness: 0.97 }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); scene.add(m);
    }
    runner(13, HDf - 6, 0, (HALL.minZ + HALL.maxZ) / 2, '#453b62');     // central aisle
    [-13, -27, -41, -55, -69].forEach(z => runner(HWf - 10, 5.5, 0, z, '#554a76')); // cross aisles
  })();

  // ---- ceiling: a vast, high roof with exposed trusses ----
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALL.maxX - HALL.minX, HALL.maxZ - HALL.minZ),
    new THREE.MeshStandardMaterial({ color: 0xc7c1b3, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set((HALL.minX + HALL.maxX) / 2, WALL_H + 0.6, (HALL.minZ + HALL.maxZ) / 2);
  scene.add(ceil);
  (function () {
    const HWf = HALL.maxX - HALL.minX, HDf = HALL.maxZ - HALL.minZ, cz = (HALL.minZ + HALL.maxZ) / 2;
    const tm = new THREE.MeshStandardMaterial({ color: 0xa9a291, roughness: 0.92 });
    for (let z = HALL.minZ + 6; z <= HALL.maxZ - 4; z += 11) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(HWf, 0.7, 0.7), tm); t.position.set(0, WALL_H - 2.4, z); scene.add(t);
    }
    [-26, 0, 26].forEach(x => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, HDf), tm); b.position.set(x, WALL_H - 1.9, cz); scene.add(b); });
  })();

  // ---- outer walls ----
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1eee7, roughness: 0.95 });
  function wall(w, d, x, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMat);
    m.position.set(x, WALL_H / 2, z); scene.add(m);
  }
  const HW = HALL.maxX - HALL.minX, HD = HALL.maxZ - HALL.minZ;
  wall(HW, 0.6, 0, HALL.minZ);   // north (far)
  wall(0.6, HD, HALL.minX, (HALL.minZ + HALL.maxZ) / 2); // west (Hudson)
  wall(0.6, HD, HALL.maxX, (HALL.minZ + HALL.maxZ) / 2); // east (11th Ave)
  // south wall split for the Crystal Palace entrance gap
  wall(38, 0.6, -29, HALL.maxZ);
  wall(38, 0.6, 29, HALL.maxZ);

  // edge geography signs
  function edgeSign(text, x, z, ry, hex) {
    const t = textTexture([{ text, size: 60, weight: 600, color: hex || '#8c8779', font: "'JetBrains Mono', monospace" }], { w: 1024, h: 128, bg: '#f1eee7' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 3.2), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
    m.position.set(x, 6.6, z); m.rotation.y = ry; scene.add(m);
  }
  edgeSign('HUDSON RIVER', HALL.minX + 0.4, -36, Math.PI / 2, '#3c6e86');
  edgeSign('ELEVENTH AVENUE', HALL.maxX - 0.4, -36, -Math.PI / 2);

  // ---- booths ----
  const obstacles = []; // {minX,maxX,minZ,maxZ}
  const brandBooths = []; // {brandId,x,z,name,hex}
  const layoutBooths = []; // for minimap

  function addObstacle(x, z, w, d) { obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); }

  function makeBooth(x, z, brandId, no) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const front = x < 0 ? 1 : -1; // open side faces central aisle
    const isBrand = !!brandId;
    const hex = isBrand ? BRAND_HEX[brandId] : '#cdc7b8';
    const brand = isBrand ? brandById(brandId) : null;
    const cfg = isBrand ? getBooth(brandId) : null;

    const baseMat = new THREE.MeshStandardMaterial({ color: 0xf6f3ec, roughness: 0.9 });
    const accentMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7, emissive: new THREE.Color(hex), emissiveIntensity: isBrand ? 0.18 : 0.05 });

    // floor pad
    const pad = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.12, BD), new THREE.MeshStandardMaterial({ color: isBrand ? hex : 0xd8d2c4, roughness: 0.85, transparent: true, opacity: 0.5 }));
    pad.position.y = 0.06; g.add(pad);

    // back wall (rear = away from aisle)
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, BOOTH_H, BD), baseMat);
    back.position.set(-front * (BW / 2), BOOTH_H / 2, 0); g.add(back);
    // side walls
    [-1, 1].forEach(s => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(BW * 0.86, BOOTH_H * 0.92, 0.3), baseMat);
      sw.position.set(-front * (BW * 0.07), BOOTH_H * 0.46, s * (BD / 2)); g.add(sw);
    });
    // fascia header (accent) across the front top
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.95, BD), accentMat);
    fascia.position.set(front * (BW / 2 - 0.2), BOOTH_H - 0.5, 0); g.add(fascia);

    // signage plane facing the aisle
    if (isBrand) {
      const tex = textTexture([
        { text: 'BOOTH ' + no, y: 60, size: 40, weight: 600, color: '#ffffff', font: "'JetBrains Mono', monospace" },
        { text: brand.name, y: 150, size: 70, weight: 800, color: '#1d1b16' },
        { text: cfg.kicker.toUpperCase(), y: 215, size: 34, weight: 600, color: '#6b6657', font: "'JetBrains Mono', monospace" },
      ], { w: 1024, h: 256, bg: '#faf9f4', bar: hex });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(BD * 0.92, 2.0), new THREE.MeshBasicMaterial({ map: tex }));
      sign.position.set(front * (BW / 2 + 0.05), BOOTH_H - 0.95, 0);
      sign.rotation.y = front > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(sign);

      // brand totem near the front corner
      const totem = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 1.1), accentMat);
      totem.position.set(front * (BW / 2 - 1.4), 1.2, BD / 2 - 1.4); g.add(totem);
      const monoTex = textTexture([{ text: brand.name[0], y: 150, size: 200, weight: 800, color: '#ffffff' }], { w: 256, h: 256, bg: hex });
      const mono = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: monoTex }));
      mono.position.set(front * (BW / 2 - 1.4) + front * 0.56, 1.5, BD / 2 - 1.4);
      mono.rotation.y = front > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(mono);

      // product plinths with tinted tops
      const sku = PRODUCTS.filter(p => p.b === brandId).slice(0, 3);
      sku.forEach((p, i) => {
        const pl = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
        pl.position.set(-front * (BW / 2 - 2.2 - i * 0), 0.5, (i - 1) * 2.4); g.add(pl);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), new THREE.MeshStandardMaterial({ color: cssToHex(p.tint), roughness: 0.8 }));
        cap.position.set(-front * (BW / 2 - 2.2), 1.25, (i - 1) * 2.4); g.add(cap);
      });
      brandBooths.push({ brandId, x, z, name: brand.name, hex });
    } else {
      const tex = textTexture([
        { text: 'STAND', y: 96, size: 40, weight: 600, color: '#8c8779', font: "'JetBrains Mono', monospace" },
        { text: no, y: 170, size: 86, weight: 800, color: '#aaa394' },
      ], { w: 512, h: 256, bg: '#f1ede4' });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(BD * 0.7, 1.6), new THREE.MeshBasicMaterial({ map: tex }));
      sign.position.set(front * (BW / 2 + 0.05), BOOTH_H - 1.1, 0);
      sign.rotation.y = front > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(sign);
    }

    scene.add(g);
    addObstacle(x, z, BW, BD);
    layoutBooths.push({ x, z, w: BW, d: BD, hex, brandId: brandId || null, no });
  }

  // place booths from the grid
  COLS.forEach((cx, ci) => ROWS.forEach((rz, ri) => {
    const key = ci + ',' + ri;
    const brandId = BRAND_AT[key];
    if (brandId) { const n = BRANDS.findIndex(b => b.id === brandId) + 1; makeBooth(cx, rz, brandId, String(n).padStart(2, '0')); }
    else if (STAND_AT[key]) makeBooth(cx, rz, null, STAND_AT[key]);
  }));

  // a partition wall to break sightlines (a twist)
  (function () {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, BOOTH_H, 16), new THREE.MeshStandardMaterial({ color: 0xeae6dd, roughness: 0.95 }));
    m.position.set(8, BOOTH_H / 2, -41); scene.add(m); addObstacle(8, -41, 0.6, 16);
  })();

  // zone banners overhead
  ZONE_BANNERS.forEach(zb => {
    const tex = textTexture([{ text: zb.name.toUpperCase(), y: 96, size: 64, weight: 700, color: '#ffffff', font: "'JetBrains Mono', monospace" }], { w: 1024, h: 192, bg: zb.hex });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.0), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    m.position.set(zb.x, 5.0, zb.z + BD / 2 + 0.6); scene.add(m);
  });

  // Crystal Palace entrance arch (south)
  (function () {
    const beamMat = new THREE.MeshStandardMaterial({ color: 0xdfe7ec, roughness: 0.6, metalness: 0.1 });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 0.6), beamMat);
    beam.position.set(0, ARCH_H - 0.6, HALL.maxZ - 0.3); scene.add(beam);
    [-9.5, 9.5].forEach(x => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, ARCH_H, 0.6), beamMat); leg.position.set(x, ARCH_H / 2, HALL.maxZ - 0.3); scene.add(leg); });
    const tex = textTexture([{ text: 'CRYSTAL PALACE', y: 96, size: 56, weight: 700, color: '#3c6e86', font: "'JetBrains Mono', monospace" }], { w: 1024, h: 160, bg: '#eef4f7' });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    sign.position.set(0, ARCH_H - 0.6, HALL.maxZ - 0.65); sign.rotation.y = Math.PI; scene.add(sign);
  })();

  // River Pavilion destination (far north)
  (function () {
    const m = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x9fc2d6, roughness: 0.5, transparent: true, opacity: 0.5 }));
    m.position.set(0, 0.25, -74); scene.add(m); addObstacle(0, -74, 18, 6);
    const tex = textTexture([{ text: 'RIVER PAVILION', y: 96, size: 60, weight: 700, color: '#ffffff', font: "'JetBrains Mono', monospace" }], { w: 1024, h: 160, bg: '#5e93ad' });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(13, 1.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    sign.position.set(0, 3.2, -71); scene.add(sign);
  })();

  // css color → hex (handles the oklch tints via a canvas)
  function cssToHex(css) {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const g = c.getContext('2d'); g.fillStyle = '#cccccc'; g.fillStyle = css; g.fillRect(0, 0, 1, 1);
    const d = g.getImageData(0, 0, 1, 1).data;
    return (d[0] << 16) | (d[1] << 8) | d[2];
  }

  // ---- controls / state ----
  const keys = {};
  let yaw = 0, pitch = 0, locked = false, dragging = false, paused = false, running = false, raf = 0;
  const vel = new THREE.Vector3();
  let nearBooth = null;
  let lastZone = '';

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
    if (k === 'e' || e.key === 'Enter') { if (nearBooth && opts.onEnter) opts.onEnter(nearBooth.brandId); return; }
    keys[k] = true;
  }
  function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
  function onMouseMove(e) {
    if (paused) return;
    if (locked) { yaw -= e.movementX * 0.0022; pitch -= e.movementY * 0.0022; }
    else if (dragging) { yaw -= (e.movementX || 0) * 0.003; pitch -= (e.movementY || 0) * 0.003; }
    else return;
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
  }
  function onCanvasDown() { if (!locked) dragging = true; }
  function onUp() { dragging = false; }
  function onLockChange() {
    locked = document.pointerLockElement === canvas;
    if (locked) dragging = false;
    if (opts.onLockChange) opts.onLockChange(locked);
  }

  function collide(nx, nz) {
    // clamp to hall
    nx = Math.max(HALL.minX + R, Math.min(HALL.maxX - R, nx));
    nz = Math.max(HALL.minZ + R, Math.min(HALL.maxZ - R, nz));
    for (const o of obstacles) {
      if (nx > o.minX - R && nx < o.maxX + R && nz > o.minZ - R && nz < o.maxZ + R) return null;
    }
    return [nx, nz];
  }

  function zoneAt(x, z) {
    for (const r of ZONE_RECTS) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.name;
    if (z > -2) return 'Crystal Palace';
    if (z < -66) return 'River Pavilion';
    return 'The Concourse';
  }

  let lastT = performance.now();
  function animate(now) {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (!paused) {
      camera.rotation.y = yaw; camera.rotation.x = pitch;
      // movement (camera-relative, planar)
      const speed = (keys['shift'] ? 18 : 11.5) * dt;
      let fz = 0, fx = 0;
      if (keys['w'] || keys['arrowup']) fz += 1;
      if (keys['s'] || keys['arrowdown']) fz -= 1;
      if (keys['d'] || keys['arrowright']) fx += 1;
      if (keys['a'] || keys['arrowleft']) fx -= 1;
      if (fz || fx) {
        const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        vel.set(0, 0, 0).addScaledVector(fwd, fz).addScaledVector(right, fx);
        if (vel.lengthSq() > 0) {
          vel.normalize().multiplyScalar(speed);
          const p = camera.position;
          let r1 = collide(p.x + vel.x, p.z + vel.z);
          if (r1) { p.x = r1[0]; p.z = r1[1]; }
          else {
            const rx = collide(p.x + vel.x, p.z); if (rx) p.x = rx[0];
            const rz = collide(p.x, p.z + vel.z); if (rz) p.z = rz[1];
          }
        }
      }
      camera.position.y = EYE;

      // proximity (distance to booth footprint edge)
      const p = camera.position;
      let best = null, bd = 2.6;
      for (const b of brandBooths) {
        const ex = Math.max(b.x - BW / 2 - p.x, 0, p.x - (b.x + BW / 2));
        const ez = Math.max(b.z - BD / 2 - p.z, 0, p.z - (b.z + BD / 2));
        const d = Math.hypot(ex, ez);
        if (d < bd) { bd = d; best = b; }
      }
      const nb = best ? best.brandId : null;
      if ((nearBooth && nearBooth.brandId) !== nb) { nearBooth = best; if (opts.onNear) opts.onNear(best); }

      const zn = zoneAt(p.x, p.z);
      if (zn !== lastZone) { lastZone = zn; if (opts.onZone) opts.onZone(zn); }

      if (opts.onPose) opts.onPose({ x: p.x, z: p.z, yaw });
    }
    renderer.render(scene, camera);
  }

  function resize() {
    const pw = canvas.clientWidth || (canvas.parentNode && canvas.parentNode.clientWidth) || 0;
    const ph = canvas.clientHeight || (canvas.parentNode && canvas.parentNode.clientHeight) || 0;
    if (!pw || !ph) return;
    renderer.setSize(pw, ph, false);
    camera.aspect = pw / ph; camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(resize);

  return {
    start() {
      if (running) return; running = true;
      resize(); ro.observe(canvas);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      document.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('pointerdown', onCanvasDown);
      window.addEventListener('pointerup', onUp);
      document.addEventListener('pointerlockchange', onLockChange);
      lastT = performance.now(); raf = requestAnimationFrame(animate);
      if (opts.onReady) opts.onReady({ bounds: HALL, booths: layoutBooths });
    },
    stop() {
      running = false; cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('pointerdown', onCanvasDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerlockchange', onLockChange);
      renderer.dispose();
    },
    lock() { try { const p = canvas.requestPointerLock && canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} },
    unlock() { document.exitPointerLock && document.exitPointerLock(); },
    pause() { paused = true; for (const k in keys) keys[k] = false; if (document.pointerLockElement) document.exitPointerLock(); },
    resume() { paused = false; lastT = performance.now(); },
    getLayout() { return { bounds: HALL, booths: layoutBooths }; },
    getNear() { return nearBooth; },
    resize,
    // debug hooks (used for scripted verification only)
    _camera: camera, _scene: scene, _renderer: renderer,
    _setView(x, z, yw, pt) { camera.position.set(x, EYE, z); yaw = yw; pitch = pt || 0; },
    _render() { renderer.render(scene, camera); },
  };
}
