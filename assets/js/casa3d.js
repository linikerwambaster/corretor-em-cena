// Corretor em Cena · casa sendo erguida com a rolagem (Three.js 0.160)
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const fase = (p, a, b) => clamp((p - a) / (b - a));
const eOut = (t) => 1 - Math.pow(1 - t, 3);
const eIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- ruído para texturas procedurais ----------
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const mod = (a, n) => ((a % n) + n) % n;
function vnoise(x, y, per) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(mod(xi, per), mod(yi, per)), b = hash(mod(xi + 1, per), mod(yi, per));
  const c = hash(mod(xi, per), mod(yi + 1, per)), d = hash(mod(xi + 1, per), mod(yi + 1, per));
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, per, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * per * f, y * per * f, per * f); a *= 0.5; f *= 2; }
  return s;
}

export function iniciarCasa(el, getP, secao) {
  const movel = window.matchMedia('(max-width: 820px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, movel ? 1.6 : 1.8));
  renderer.setSize(el.clientWidth, el.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.62;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  function canvasTex(size, fn, { srgb = true, rep = [1, 1] } = {}) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'), img = ctx.createImageData(size, size), d = img.data;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const [r, g, b] = fn(x / size, y / size), i = (y * size + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = aniso;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  }

  // ---------- texturas ----------
  const S = movel ? 128 : 256;
  const txConcreto = canvasTex(S, (u, v) => { const n = fbm(u, v, 6) * 34 + (hash(u * 999 | 0, v * 999 | 0) > 0.985 ? -30 : 0); const g = 168 + n; return [g, g - 2, g - 6]; }, { rep: [2, 2] });
  const txReboco = canvasTex(S, (u, v) => { const n = fbm(u, v, 8, 3) * 10; const g = 236 + n; return [g, g - 3, g - 8]; }, { rep: [3, 3] });
  const txMadeira = canvasTex(S, (u, v) => {
    const veio = Math.sin((u * 26 + fbm(u, v, 3) * 5) * Math.PI) * 0.5 + 0.5, n = fbm(u, v * 0.2, 5, 3);
    const k = 0.72 + veio * 0.18 + n * 0.25; return [156 * k, 98 * k, 60 * k];
  }, { rep: [1, 1] });
  const txDeck = canvasTex(S, (u, v) => {
    const tabua = Math.floor(v * 8), junta = (v * 8) % 1 < 0.05 ? 0.55 : 1;
    const n = fbm(u * 0.4 + tabua * 0.37, v, 6, 3), veio = Math.sin((u * 40 + n * 8) * Math.PI) * 0.06;
    const k = (0.78 + n * 0.3 + veio) * junta; return [150 * k, 104 * k, 72 * k];
  }, { rep: [3, 1] });
  const txTerra = canvasTex(S, (u, v) => { const n = fbm(u, v, 8), g = hash(u * S | 0, v * S | 0) * 26 - 13; const s = hash(u * 777 | 0, v * 777 | 0) > 0.975 ? 24 : 0; return [122 + n * 38 + g + s, 100 + n * 30 + g + s, 78 + n * 22 + g + s]; }, { rep: [6, 6] });
  const txGrama = canvasTex(S, (u, v) => { const n = fbm(u, v, 9), m = fbm(u + 3.1, v + 1.7, 3, 2); const g = hash(u * S | 0, v * S | 0) * 30 - 15; return [78 + n * 26 + m * 22 + g * 0.6, 98 + n * 30 + m * 10 + g, 58 + n * 14 + g * 0.4]; }, { rep: [60, 60] });
  const txAsfalto = canvasTex(S, (u, v) => { const n = fbm(u, v, 10, 3) * 16, g = hash(u * S | 0, v * S | 0) * 22; const k = 58 + n + g; return [k, k, k + 2]; }, { rep: [40, 1] });
  const txPedra = canvasTex(S, (u, v) => { const n = fbm(u, v, 4, 3) * 16; const j = (u * 4) % 1 < 0.012 || (v * 4) % 1 < 0.012 ? -26 : 0; const g = 214 + n + j; return [g, g - 5, g - 13]; }, { rep: [6, 6] });
  const txAguaN = canvasTex(S, (u, v) => {
    const e = 1 / S, h = (a, b) => fbm(a, b, 4, 4);
    const dx = (h(u + e, v) - h(u - e, v)) * 6, dy = (h(u, v + e) - h(u, v - e)) * 6;
    const l = Math.hypot(dx, dy, 1); return [(-dx / l * 0.5 + 0.5) * 255, (-dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255];
  }, { srgb: false, rep: [3, 1] });

  // ---------- cena, céu e luz ----------
  const scene = new THREE.Scene();
  const fogCor = new THREE.Color('#bfcad6');
  scene.fog = new THREE.Fog(fogCor, 70, 240);
  const camera = new THREE.PerspectiveCamera(movel ? 56 : 42, el.clientWidth / el.clientHeight, 0.1, 2000);

  const sky = new Sky(); sky.scale.setScalar(1500); scene.add(sky);
  const U = sky.material.uniforms;
  U.turbidity.value = 2.6; U.rayleigh.value = 1.2; U.mieCoefficient.value = 0.004; U.mieDirectionalG.value = 0.8;
  const sol = new THREE.Vector3();

  const envScene = new THREE.Scene(); const skyEnv = new Sky(); skyEnv.scale.setScalar(100); envScene.add(skyEnv);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null, envElev = 999;
  function atualizaEnv(elev) {
    if (Math.abs(elev - envElev) < 2.2) return;
    envElev = elev;
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) skyEnv.material.uniforms[k].value = U[k].value;
    skyEnv.material.uniforms.sunPosition.value.copy(sol);
    const novo = pmrem.fromScene(envScene, 0, 0.1, 1000);
    scene.environment = novo.texture;
    if (envRT) envRT.dispose();
    envRT = novo;
  }

  const hemi = new THREE.HemisphereLight('#cfe0f5', '#6d5d4b', 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1df', 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(movel ? 1024 : 2048, movel ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 120 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  // ---------- materiais ----------
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    concreto: std({ color: '#c9c5bd', map: txConcreto, roughness: 0.92 }),
    reboco: std({ color: '#ffffff', map: txReboco, roughness: 0.86 }),
    grafite: std({ color: '#2e2c2b', roughness: 0.62, metalness: 0.05 }),
    madeira: std({ color: '#ffffff', map: txMadeira, roughness: 0.55 }),
    aluminio: std({ color: '#151515', roughness: 0.32, metalness: 0.7 }),
    pedra: std({ color: '#d4ccbf', map: txPedra, roughness: 0.82 }),
    asfalto: std({ color: '#ffffff', map: txAsfalto, roughness: 0.95 }),
    calcada: std({ color: '#b8b3aa', map: txConcreto, roughness: 0.95 }),
    deck: std({ color: '#ffffff', map: txDeck, roughness: 0.7 }),
    pisoInt: std({ color: '#d9c3a5', roughness: 0.5 }),
    tecido: std({ color: '#3b3735', roughness: 0.95 }),
    tapete: std({ color: '#cbbfae', roughness: 1 }),
    folha: std({ color: '#3f5a2c', roughness: 0.9 }),
    folha2: std({ color: '#566f37', roughness: 0.9 }),
    tronco: std({ color: '#5b4636', roughness: 0.95 }),
    azulejo: std({ color: '#cfe4e6', roughness: 0.35 }),
    luzQuente: std({ color: '#2a2622', emissive: '#ffcb85', emissiveIntensity: 0, roughness: 0.6 }),
  };
  const vidroBase = new THREE.MeshPhysicalMaterial({ color: '#9fb3bb', roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.38, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false });
  const agua = new THREE.MeshPhysicalMaterial({ color: '#13667f', roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, normalMap: txAguaN, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.9, envMapIntensity: 1.3 });

  // ---------- utilidades de construção ----------
  const casa = new THREE.Group(); scene.add(casa);
  const anims = [];
  function caixa(w, h, d, mat, x, y, z, { sombra = true, base = true } = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (base) g.translate(0, h / 2, 0);
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z);
    m.castShadow = sombra; m.receiveShadow = true; casa.add(m); return m;
  }
  // caixa por limites (x0..x1, y0..y1, z0..z1)
  const bx = (x0, x1, y0, y1, z0, z1, mat, op) => caixa(x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, y0, (z0 + z1) / 2, op);
  function anima(o, a, b, tipo, extra = {}) {
    anims.push({ o, a, b, tipo, extra, by: o.position.y, bx: o.position.x, bz: o.position.z, bs: o.scale.clone() });
    o.visible = false; return o;
  }

  const Y0 = 0.45; // nível do piso (terraço)

  // chão: bairro gramado, lote de terra (vira jardim no fim) e rua na frente
  const chaoG = new THREE.CircleGeometry(240, 72); chaoG.rotateX(-Math.PI / 2);
  const grama = new THREE.Mesh(chaoG, std({ color: '#d6dccb', map: txGrama, roughness: 1 })); grama.receiveShadow = true; scene.add(grama);
  const loteMat = std({ color: '#ffffff', map: txTerra, roughness: 1, transparent: true, opacity: 1 });
  const lote = new THREE.Mesh(new THREE.PlaneGeometry(30, 24).rotateX(-Math.PI / 2), loteMat); lote.position.set(-1, 0.012, 3); lote.receiveShadow = true; scene.add(lote);
  const rua = new THREE.Mesh(new THREE.PlaneGeometry(480, 7).rotateX(-Math.PI / 2), M.asfalto); rua.position.set(0, 0.02, 20.5); rua.receiveShadow = true; scene.add(rua);
  [[16.2, 1.7], [24.8, 1.7]].forEach(([z, d]) => { const c = new THREE.Mesh(new THREE.BoxGeometry(480, 0.16, d), M.calcada); c.position.set(0, 0.08, z); c.receiveShadow = true; scene.add(c); });

  // ---------- FASE 1: gabarito riscado no chão ----------
  const riscos = new THREE.Group(); scene.add(riscos);
  const riscoMat = new THREE.MeshBasicMaterial({ color: '#f6f1e7', transparent: true, depthWrite: false, toneMapped: false });
  const segs = [];
  function seg(x0, z0, x1, z1, w = 0.07) {
    const len = Math.hypot(x1 - x0, z1 - z0); const g = new THREE.PlaneGeometry(len, w); g.rotateX(-Math.PI / 2); g.translate(len / 2, 0, 0);
    const m = new THREE.Mesh(g, riscoMat); m.position.set(x0, 0.03, z0); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); m.scale.x = 0.0001;
    riscos.add(m); segs.push(m);
  }
  function ret(x0, x1, z0, z1, w) { seg(x0, z0, x1, z0, w); seg(x1, z0, x1, z1, w); seg(x1, z1, x0, z1, w); seg(x0, z1, x0, z0, w); }
  function cota(x0, x1, z) { seg(x0, z, x1, z, 0.04); seg(x0, z - 0.35, x0, z + 0.35, 0.04); seg(x1, z - 0.35, x1, z + 0.35, 0.04); }
  ret(-12, 10, -5.5, 10.5, 0.09);           // terreno/terraço
  ret(-7, 3, -4, 4);                        // sala
  ret(-10.6, -7, -3, 4);                    // átrio
  ret(-4, 6.5, -4, 3.6, 0.05);              // projeção do pavimento de cima
  ret(-2.5, 8.5, 6.2, 9.4);                 // piscina
  seg(-2.4, -4, -2.4, 4, 0.04); seg(1, -4, 1, 4, 0.04); // divisões
  cota(-12, 10, 12.2); cota(-10.6, -7, -6.6); cota(-2.5, 8.5, 11.3);
  function etiqueta(txt, x, z, larg = 6, rot = 0) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 160; const g = c.getContext('2d');
    g.fillStyle = '#f6f1e7'; g.font = '500 76px "IBM Plex Mono", monospace'; g.textBaseline = 'middle'; g.fillText(txt, 8, 84);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(larg, larg * 160 / 1024), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, 0.04, z); m.material.opacity = 0; riscos.add(m); return m;
  }
  const etiquetas = [etiqueta('SALA 80 m²', -3.6, 0.6, 5.2), etiqueta('ÁTRIO', -9.7, 0.4, 3.6), etiqueta('PISCINA', 0.6, 7.9, 4.6), etiqueta('22,00 m', -2.4, 13.2, 4.2), etiqueta('LOTE 01 · QUADRA A', -11.6, -6.4, 7.4)];

  // ---------- FASE 2: estrutura ----------
  const terraco = [
    bx(-12, 10, 0, Y0, -5.5, 6.2, M.pedra), bx(-12, 10, 0, Y0, 9.4, 10.5, M.pedra),
    bx(-12, -2.5, 0, Y0, 6.2, 9.4, M.pedra), bx(8.5, 10, 0, Y0, 6.2, 9.4, M.pedra),
  ];
  terraco.forEach((m, i) => anima(m, 0.18 + i * 0.008, 0.23 + i * 0.008, 'sobe'));
  for (let i = 0; i < 2; i++) anima(bx(-10.4, -7.2, 0, Y0 - 0.15 * (i + 1), 10.5 + i * 0.4, 10.9 + i * 0.4, M.pedra), 0.2, 0.24, 'sobe');
  // piscina (cuba)
  const cuba = new THREE.Group(); casa.add(cuba);
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(11, 3.2).rotateX(-Math.PI / 2), M.azulejo); fundo.position.set(3, -1.1, 7.8); fundo.receiveShadow = true; cuba.add(fundo);
  [[3, 6.2, 11, 0], [3, 9.4, 11, Math.PI], [-2.5, 7.8, 3.2, Math.PI / 2], [8.5, 7.8, 3.2, -Math.PI / 2]].forEach(([x, z, w, r]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.55), M.azulejo); p.position.set(x, Y0 - 0.775, z); p.rotation.y = r; p.receiveShadow = true; cuba.add(p);
  });
  anima(cuba, 0.19, 0.23, 'cresce');

  const colunas = [];
  const colTerreo = [];
  [-6.8, -2.4, 1.0, 2.8].forEach((x) => [-3.8, 0, 3.8].forEach((z) => colTerreo.push([x, z])));
  [[-10.4, -2.8], [-10.4, 3.8], [-7.2, -2.8], [-7.2, 3.8]].forEach((c) => colTerreo.push(c));
  colTerreo.forEach(([x, z], i) => colunas.push(anima(caixa(0.3, 3.2, 0.3, M.concreto, x, Y0, z), 0.22 + i * 0.004, 0.27 + i * 0.004, 'sobe')));
  [[6.25, -3.8], [6.25, 3.3]].forEach(([x, z]) => anima(caixa(0.18, 3.2, 0.18, M.aluminio, x, Y0, z), 0.24, 0.29, 'sobe'));
  const L1 = anima(bx(-7.25, 6.75, 3.65, 3.95, -4.2, 4.3, M.concreto), 0.28, 0.32, 'desce', { h: 7 });
  const colSup = [];
  [-3.8, 1.2, 6.25].forEach((x) => [-3.8, 3.35].forEach((z) => colSup.push([x, 3.95, z, 3.0])));
  [[-10.4, -2.8], [-10.4, 3.8], [-7.2, -2.8], [-7.2, 3.8]].forEach(([x, z]) => colSup.push([x, 3.65, z, 3.55]));
  colSup.forEach(([x, y, z, h], i) => anima(caixa(0.3, h, 0.3, M.concreto, x, y, z), 0.31 + i * 0.003, 0.35 + i * 0.003, 'sobe'));
  anima(bx(-4.3, 6.8, 6.95, 7.2, -4.3, 3.9, M.reboco), 0.34, 0.37, 'desce', { h: 6 });
  anima(bx(-10.85, -6.75, 7.2, 7.45, -3.25, 4.25, M.reboco), 0.35, 0.38, 'desce', { h: 6 });

  // sombra de contato (oclusão falsa) sob a casa
  const ao = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    g.filter = 'blur(14px)'; g.fillStyle = '#000'; g.fillRect(34, 30, 188, 68);
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(22, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false }));
    m.position.set(-2, Y0 + 0.004, 0.1); scene.add(m); return m;
  })();

  // ---------- FASE 3: fechamento e acabamento ----------
  const paredes = [
    bx(-7, 3, Y0, 3.65, -4, -3.8, M.reboco), bx(2.8, 3, Y0, 3.65, -3.8, 4, M.reboco),
    bx(1, 1.6, Y0, 3.65, 3.8, 4, M.reboco), bx(2.6, 3, Y0, 3.65, 3.8, 4, M.reboco), bx(1.6, 2.6, 3.25, 3.65, 3.8, 4, M.reboco),
    bx(-10.6, -10.4, Y0, 7.2, -3, 4, M.reboco), bx(-10.4, -7.2, Y0, 7.2, -3, -2.8, M.reboco), bx(-7.2, -7, Y0, 7.2, -3, 4, M.reboco),
    bx(-4, 6.5, 3.95, 6.95, -4, -3.8, M.grafite), bx(-4, -3.8, 3.95, 6.95, -3.8, 3.6, M.grafite), bx(6.3, 6.5, 3.95, 6.95, -3.8, 3.6, M.grafite),
    bx(-4, 6.5, 3.95, 4.5, 3.4, 3.6, M.grafite), bx(-4, 6.5, 6.5, 6.95, 3.4, 3.6, M.grafite), bx(2.6, 6.5, 4.5, 6.5, 3.4, 3.6, M.grafite), bx(-4, -3.6, 4.5, 6.5, 3.4, 3.6, M.grafite),
  ];
  paredes.forEach((m, i) => anima(m, 0.40 + i * 0.0045, 0.45 + i * 0.0045, 'sobe'));
  // porta pivotante de madeira
  anima(bx(1.62, 2.58, Y0, 3.23, 3.86, 3.94, M.madeira), 0.54, 0.57, 'sobe');

  // vidros
  function vidro(w, h, x, y, z, a, b, dx = 0) {
    const mat = vidroBase.clone(); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y + h / 2, z); m.renderOrder = 2; casa.add(m);
    anims.push({ o: m, a, b, tipo: 'vidro', extra: { dx, op: vidroBase.opacity }, bx: x, by: m.position.y, bz: z, bs: m.scale.clone() }); m.visible = false; return m;
  }
  vidro(2.65, 3.1, -5.65, 0.5, 3.92, 0.46, 0.51, -2);
  vidro(2.65, 3.1, -2.95, 0.5, 3.92, 0.47, 0.52, -2);
  vidro(2.55, 3.1, -0.3, 0.5, 3.92, 0.48, 0.53, -2);
  const vidroAtrio = vidro(3.2, 6.3, -8.8, 0.6, 3.97, 0.47, 0.53, 0);
  vidro(6.2, 2.0, -0.5, 4.5, 3.5, 0.48, 0.54, 2);
  // caixilhos
  const caix = [
    [-7, 1, 3.55, 3.65, 3.86, 4.0], [-4.33, -4.27, Y0, 3.6, 3.86, 4.0], [-1.63, -1.57, Y0, 3.6, 3.86, 4.0], [0.95, 1.0, Y0, 3.6, 3.86, 4.0],
    [-10.45, -7.15, 6.85, 6.95, 3.9, 4.05], [-10.45, -7.15, 0.5, 0.6, 3.9, 4.05],
    [-3.6, 2.6, 4.44, 4.5, 3.42, 3.62], [-3.6, 2.6, 6.5, 6.56, 3.42, 3.62], [-0.53, -0.47, 4.5, 6.5, 3.42, 3.62],
  ];
  caix.forEach((c, i) => anima(bx(...c, M.aluminio), 0.50 + i * 0.002, 0.54 + i * 0.002, 'sobe'));

  // ripado (instanciado)
  const ripas = [];
  for (let x = 2.85; x <= 6.3; x += 0.2) ripas.push([x, 3.72, 0]);
  for (let z = 3.45; z >= -3.7; z -= 0.2) ripas.push([6.58, z, 1]);
  const ripaG = new THREE.BoxGeometry(0.07, 3.0, 0.14); ripaG.translate(0, 1.5, 0);
  const ripado = new THREE.InstancedMesh(ripaG, M.madeira, ripas.length); ripado.castShadow = true; ripado.receiveShadow = true; casa.add(ripado);
  const dum = new THREE.Object3D();
  function atualizaRipas(p) {
    for (let i = 0; i < ripas.length; i++) {
      const [a, b, lado] = ripas[i], u = eOut(fase(p, 0.51 + i / ripas.length * 0.08, 0.53 + i / ripas.length * 0.08));
      if (lado === 0) { dum.position.set(a, 3.95, b); dum.rotation.y = 0; } else { dum.position.set(a, 3.95, b); dum.rotation.y = Math.PI / 2; }
      dum.scale.set(1, Math.max(u, 0.0001), 1); dum.updateMatrix(); ripado.setMatrixAt(i, dum.matrix);
    }
    ripado.instanceMatrix.needsUpdate = true;
    ripado.visible = p > 0.51;
  }

  // interior: piso, sofá, tapete, mesa, parede de madeira do átrio e pendentes
  const interior = [
    bx(-10.4, 2.8, Y0, Y0 + 0.02, -3.8, 3.8, M.pisoInt, { sombra: false }),
    bx(-6.2, -3.0, Y0 + 0.02, Y0 + 0.03, -1.2, 1.8, M.tapete, { sombra: false }),
    bx(-6.0, -3.2, Y0, Y0 + 0.45, -2.6, -1.6, M.tecido), bx(-6.0, -3.2, Y0, Y0 + 0.9, -3.0, -2.6, M.tecido),
    bx(-5.2, -4.0, Y0, Y0 + 0.38, -0.3, 0.7, M.madeira),
    bx(-10.35, -7.25, Y0, 7.15, -2.78, -2.62, M.madeira),
    bx(-6.8, 2.6, 3.5, 3.6, -3.6, -3.4, M.luzQuente, { sombra: false }),
  ];
  interior.forEach((m, i) => anima(m, 0.55 + i * 0.004, 0.6 + i * 0.004, 'cresce'));
  const pendentes = [];
  [-9.6, -8.8, -8.0].forEach((x, i) => {
    const fio = caixa(0.015, 1.6 + i * 0.5, 0.015, M.aluminio, x, 7.2 - (1.6 + i * 0.5), 0.6, { sombra: false });
    const bola = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), M.luzQuente); bola.position.set(x, 7.2 - (1.6 + i * 0.5) - 0.2, 0.6); casa.add(bola);
    anima(fio, 0.57, 0.6, 'cresce'); anima(bola, 0.57, 0.6, 'cresce'); pendentes.push(bola);
  });

  // ---------- FASE 4: paisagismo, deck e piscina ----------
  const borda = [bx(-2.85, 8.85, Y0, Y0 + 0.06, 5.85, 6.25, M.pedra), bx(-2.85, 8.85, Y0, Y0 + 0.06, 9.35, 9.75, M.pedra), bx(-2.85, -2.45, Y0, Y0 + 0.06, 6.25, 9.35, M.pedra), bx(8.45, 8.85, Y0, Y0 + 0.06, 6.25, 9.35, M.pedra)];
  borda.forEach((m) => anima(m, 0.62, 0.66, 'sobe'));
  anima(bx(-11.8, -3.0, Y0, Y0 + 0.05, 5.4, 10.3, M.deck), 0.63, 0.68, 'sobe');
  const aguaM = new THREE.Mesh(new THREE.PlaneGeometry(11, 3.2).rotateX(-Math.PI / 2), agua); aguaM.position.set(3, -1.05, 7.8); aguaM.renderOrder = 1; casa.add(aguaM);
  aguaM.visible = false;
  // espreguiçadeiras
  [[-1, 10.0], [1.2, 10.0]].forEach(([x, z]) => anima(bx(x - 0.35, x + 0.35, Y0, Y0 + 0.32, z - 0.05, z + 0.4, M.pedra), 0.7, 0.74, 'cresce'));

  function deformar(geo, amp, freq, seed) {
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = vnoise(v.x * freq + seed, v.y * freq + v.z * freq, 64) - 0.5; v.multiplyScalar(1 + n * amp); p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals(); return geo;
  }
  const verde = [];
  // folhagem: muitos tufos pequenos fundidos numa malha só por árvore (leve e com textura de folha)
  let semente = 1;
  const rnd = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647; };
  function tufos(n, raioX, raioY, raioZ, cy, tam, seed) {
    const gs = [[], []];
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, b = Math.acos(2 * rnd() - 1), r = Math.cbrt(rnd());
      const x = Math.sin(b) * Math.cos(a) * raioX * r, y = Math.cos(b) * raioY * r, z = Math.sin(b) * Math.sin(a) * raioZ * r;
      const s = tam * (0.7 + rnd() * 0.6);
      const g = deformar(new THREE.IcosahedronGeometry(s, 1), 0.5, 3.2, seed + i * 3.7); g.translate(x, cy + y, z);
      gs[i % 2].push(g);
    }
    return gs.map((l) => mergeGeometries(l));
  }
  function arvore(x, z, gsFolha, tronco) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const t = new THREE.Mesh(tronco, M.tronco); t.castShadow = true; g.add(t);
    gsFolha.forEach((gf, i) => { const m = new THREE.Mesh(gf, i ? M.folha2 : M.folha); m.castShadow = true; m.receiveShadow = true; g.add(m); });
    scene.add(g); verde.push(g); return g;
  }
  function cipreste(x, z, h, seed) {
    const tr = new THREE.CylinderGeometry(0.08, 0.13, 1.2, 8); tr.translate(0, 0.6, 0);
    return arvore(x, z, tufos(Math.round(h * (movel ? 7 : 11)), 0.72, h / 2, 0.72, 0.8 + h / 2, 0.3, seed), tr);
  }
  function copa(x, z, s, seed) {
    const tr = new THREE.CylinderGeometry(0.16 * s, 0.28 * s, 3.4 * s, 9); tr.translate(0, 1.7 * s, 0);
    return arvore(x, z, tufos(movel ? 60 : 100, 2.6 * s, 1.6 * s, 2.4 * s, 4.2 * s, 0.52 * s, seed), tr);
  }
  function cerca(x0, x1, z, seed) {
    const m = new THREE.Mesh(deformar(new THREE.BoxGeometry(x1 - x0, 1.1, 0.8, 10, 4, 3), 0.12, 1.8, seed), M.folha2);
    m.geometry.translate(0, 0.55, 0); m.position.set((x0 + x1) / 2, Y0, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); verde.push(m); return m;
  }
  cerca(-11.8, -3.5, -5.2, 1); cerca(3.5, 9.8, -5.2, 2);
  [[-14.4, 1.5, 7], [-14.8, -3.2, 6.2], [-13.8, -7.4, 7.4], [12.4, 1.2, 6.4], [12.8, -3.6, 7.2], [11.9, -7.6, 6]].forEach(([x, z, h], i) => cipreste(x, z, h, i * 13.7 + 2));
  copa(-19, -12, 1.25, 5); copa(16.5, -12.5, 1.1, 9); copa(-24, 9, 1.05, 3); copa(21, 7, 0.95, 11);
  // linha de árvores ao fundo (bairro arborizado)
  [[-40, -26, 1.4], [-24, -30, 1.2], [-6, -32, 1.5], [12, -31, 1.3], [30, -27, 1.4], [46, -14, 1.2], [-48, -8, 1.3], [-44, 30, 1.2], [40, 34, 1.3]].forEach(([x, z, s2], i) => copa(x, z, s2, 60 + i * 5));
  // grama baixa em volta do terraço (canteiros)
  [[-15.6, -14.2, -8, 13], [12.2, 13.8, -8, 13]].forEach(([x0, x1, z0, z1], i) => {
    const m = new THREE.Mesh(deformar(new THREE.BoxGeometry(x1 - x0, 0.7, z1 - z0, 4, 3, 16), 0.1, 1.4, 40 + i), M.folha2);
    m.geometry.translate(0, 0.35, 0); m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); m.castShadow = true; m.receiveShadow = true; scene.add(m); verde.push(m);
  });
  verde.forEach((g, i) => { g.userData.s = g.scale.clone(); anima(g, 0.66 + i * 0.0045, 0.71 + i * 0.0045, 'cresce'); });

  // balizadores de jardim
  const balizas = [];
  [-11, -9, -7, -5].forEach((x) => {
    const b = bx(x - 0.07, x + 0.07, Y0, Y0 + 0.55, 10.25, 10.39, M.aluminio);
    const l = bx(x - 0.08, x + 0.08, Y0 + 0.47, Y0 + 0.53, 10.23, 10.41, M.luzQuente, { sombra: false });
    anima(b, 0.7, 0.73, 'sobe'); anima(l, 0.7, 0.73, 'sobe'); balizas.push(l);
  });

  // luzes internas (acendem no fim)
  const luzes = [[-4.5, 2.6, 0.5, 9], [-8.8, 4.2, 0.8, 11], [-0.8, 2.6, 0.5, 8], [1.5, 5.6, 0, 7]].map(([x, y, z, d]) => {
    const l = new THREE.PointLight('#ffc27a', 0, d, 1.6); l.position.set(x, y, z); scene.add(l); return l;
  });

  // vídeo no vidro do átrio
  const video = document.createElement('video');
  video.muted = true; video.loop = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.crossOrigin = 'anonymous'; video.preload = 'none';
  const vtex = new THREE.VideoTexture(video); vtex.colorSpace = THREE.SRGBColorSpace;
  const aspPlano = 3.2 / 6.3, aspVideo = 9 / 16; vtex.repeat.set(aspPlano / aspVideo, 1); vtex.offset.set((1 - aspPlano / aspVideo) / 2, 0);
  const telaMat = new THREE.MeshBasicMaterial({ map: vtex, transparent: true, opacity: 0, toneMapped: false });
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(3.18, 6.28), telaMat); tela.position.set(-8.8, 0.6 + 3.15, 3.9); tela.visible = false; casa.add(tela);
  let videoPedido = false, videoTocando = false;

  // ---------- câmera ----------
  const K = [
    [0.0, [16, 30, 30], [-1, 0, 2]],
    [0.18, [-18, 19, 26], [-1, 1.5, 1]],
    [0.4, [24, 11, 22], [-1, 3, 0]],
    [0.62, [-24, 8, 24], [-1, 3, 1]],
    [0.8, [12, 4.8, 27], [-2, 3.2, 2]],
    [1.0, [-3.0, 3.5, 19.5], [-8.3, 3.8, 3.8]],
  ];
  function chave(i, retrato) {
    const [, pos, alvo] = K[i];
    const P = new THREE.Vector3(...pos), A = new THREE.Vector3(...alvo);
    if (retrato) { const f = i === K.length - 1 ? 1.32 : 1.3; P.sub(A).multiplyScalar(f).add(A); }
    return [P, A];
  }
  let curvaP, curvaA;
  function montaCurvas() {
    const retrato = el.clientWidth / el.clientHeight < 0.85;
    const ps = [], as = [];
    for (let i = 0; i < K.length; i++) { const [P, A] = chave(i, retrato); ps.push(P); as.push(A); }
    curvaP = new THREE.CatmullRomCurve3(ps, false, 'centripetal');
    curvaA = new THREE.CatmullRomCurve3(as, false, 'centripetal');
  }
  montaCurvas();
  function paramCurva(p) {
    for (let i = 0; i < K.length - 1; i++) {
      if (p <= K[i + 1][0]) { const t = (p - K[i][0]) / (K[i + 1][0] - K[i][0]); return (i + eIO(t)) / (K.length - 1); }
    }
    return 1;
  }

  // ---------- atualização por progresso ----------
  const corDia = { fog: new THREE.Color('#bfcad6'), sun: new THREE.Color('#fff1df'), hc: new THREE.Color('#cfe0f5') };
  const corOuro = { fog: new THREE.Color('#e2c1a0'), sun: new THREE.Color('#ffb36e'), hc: new THREE.Color('#d9c4ae') };
  const corNoite = { fog: new THREE.Color('#2d3140'), sun: new THREE.Color('#ff8456'), hc: new THREE.Color('#4a5678') };
  const tmp = new THREE.Color();

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  if (!movel) window.addEventListener('pointermove', (e) => { mouse.x = e.clientX / window.innerWidth - 0.5; mouse.y = e.clientY / window.innerHeight - 0.5; }, { passive: true });

  function atualiza(p, t) {
    // gabarito
    const nS = segs.length;
    segs.forEach((m, i) => { const u = eOut(fase(p, 0.025 + (i / nS) * 0.11, 0.045 + (i / nS) * 0.11)); m.scale.x = Math.max(u, 0.0001); m.visible = u > 0.001; });
    const someRisco = 1 - fase(p, 0.19, 0.24);
    riscoMat.opacity = someRisco;
    etiquetas.forEach((m, i) => { m.material.opacity = fase(p, 0.1 + i * 0.012, 0.14 + i * 0.012) * someRisco; m.visible = m.material.opacity > 0.01; });
    riscos.visible = someRisco > 0.001;

    for (const k of anims) {
      const u = eOut(fase(p, k.a, k.b)), o = k.o;
      o.visible = u > 0.0005;
      if (!o.visible) continue;
      if (k.tipo === 'sobe') o.scale.y = k.bs.y * Math.max(u, 0.0005);
      else if (k.tipo === 'desce') o.position.y = k.by + (1 - u) * (k.extra.h || 6);
      else if (k.tipo === 'cresce') o.scale.copy(k.bs).multiplyScalar(Math.max(u, 0.0005));
      else if (k.tipo === 'vidro') { o.position.x = k.bx + (1 - u) * k.extra.dx; o.material.opacity = k.extra.op * u; }
    }
    atualizaRipas(p);

    // terra vira grama, água enche
    loteMat.opacity = 1 - eIO(fase(p, 0.62, 0.71)); lote.visible = loteMat.opacity > 0.01;
    ao.material.opacity = 0.42 * eIO(fase(p, 0.4, 0.5)); ao.visible = ao.material.opacity > 0.01;
    const ua = eIO(fase(p, 0.66, 0.74));
    aguaM.visible = ua > 0.001; aguaM.position.y = lerp(-1.05, Y0 - 0.08, ua);
    txAguaN.offset.set(t * 0.012, t * 0.007);

    // sol: tarde → dourado → anoitecer
    const elev = p < 0.55 ? 42 : p < 0.8 ? lerp(42, 13, eIO(fase(p, 0.55, 0.8))) : lerp(13, 1.2, eIO(fase(p, 0.8, 0.95)));
    const az = lerp(38, 58, fase(p, 0.5, 1));
    sol.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elev), THREE.MathUtils.degToRad(az));
    U.sunPosition.value.copy(sol);
    U.rayleigh.value = lerp(1.2, 3.4, fase(p, 0.6, 0.95));
    U.turbidity.value = lerp(2.6, 6, fase(p, 0.6, 0.95));
    sun.position.copy(sol).multiplyScalar(60).add(new THREE.Vector3(-1, 0, 2)); sun.target.position.set(-1, 0, 2);
    const ouro = fase(p, 0.55, 0.8), noite = fase(p, 0.8, 0.95);
    tmp.copy(corDia.fog).lerp(corOuro.fog, ouro).lerp(corNoite.fog, noite); scene.fog.color.copy(tmp);
    tmp.copy(corDia.sun).lerp(corOuro.sun, ouro).lerp(corNoite.sun, noite); sun.color.copy(tmp);
    tmp.copy(corDia.hc).lerp(corOuro.hc, ouro).lerp(corNoite.hc, noite); hemi.color.copy(tmp);
    sun.intensity = lerp(lerp(2.7, 2.3, ouro), 0.1, noite);
    hemi.intensity = lerp(lerp(0.8, 0.7, ouro), 0.3, noite);
    renderer.toneMappingExposure = lerp(0.58, 0.68, noite);
    atualizaEnv(elev);

    // luzes acendem
    const acende = eIO(fase(p, 0.8, 0.87));
    M.luzQuente.emissiveIntensity = acende * 2.6;
    luzes.forEach((l, i) => { l.intensity = acende * [14, 22, 10, 9][i]; });

    // vídeo no átrio
    if (p > 0.6 && !videoPedido) { videoPedido = true; video.src = new URL('media/estilo_planta.mp4', document.baseURI).href; video.load(); }
    const uv = eIO(fase(p, 0.84, 0.92));
    tela.visible = uv > 0.001; telaMat.opacity = uv;
    vidroAtrio.material.opacity = vidroBase.opacity * (1 - uv * 0.55);
    if (uv > 0 && !videoTocando) { videoTocando = true; const pr = video.play(); if (pr && pr.catch) pr.catch(() => { videoTocando = false; }); }
    if (uv === 0 && videoTocando) { video.pause(); videoTocando = false; }

    // câmera
    const u = paramCurva(p);
    const pos = curvaP.getPoint(u), alvo = curvaA.getPoint(u);
    mouse.sx += (mouse.x - mouse.sx) * 0.05; mouse.sy += (mouse.y - mouse.sy) * 0.05;
    const amp = 1 - fase(p, 0.85, 1) * 0.7;
    pos.x += mouse.sx * 2.4 * amp; pos.y -= mouse.sy * 1.2 * amp;
    pos.y += Math.sin(t * 0.4) * 0.12;
    camera.position.copy(pos); camera.lookAt(alvo);
  }

  // ---------- laço ----------
  let visivel = true, pS = getP(), relogio = new THREE.Clock();
  const io = new IntersectionObserver((es) => { visivel = es[0].isIntersecting; }, { rootMargin: '100px 0px' });
  io.observe(secao || el);
  function redimensiona() {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 0.85 ? 58 : 42;
    if (w / h > 1.2) camera.setViewOffset(w, h, -w * 0.17, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix(); montaCurvas();
  }
  new ResizeObserver(redimensiona).observe(el);
  redimensiona();
  function laco() {
    requestAnimationFrame(laco);
    if (!visivel || document.hidden) return;
    const alvoP = getP(); pS += (alvoP - pS) * 0.09; if (Math.abs(alvoP - pS) < 0.0004) pS = alvoP;
    atualiza(pS, relogio.getElapsedTime());
    renderer.render(scene, camera);
  }
  atualiza(pS, 0); renderer.render(scene, camera);
  laco();
  el.classList.add('pronto');
}
