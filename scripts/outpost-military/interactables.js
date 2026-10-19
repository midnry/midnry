/** Shared, authored equipment kits, not production/scanned assets. Presentation
 * only: owners retain all transforms, collision, interaction and public state.
 * A trim atlas + packed material data lets each detailed kit draw once. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { textTexture, displayFont, fitDisplay, registerTextMaterial } from './world-text.js';

const CELL = 256,
  COLS = 4;
function cellUV(cell, u, v) {
  return [
    ((cell % COLS) + (2 + u * 252) / CELL) / COLS,
    (3 - Math.floor(cell / COLS) + (2 + v * 252) / CELL) / COLS,
  ];
}
function shared(r) {
  if (r.interactableKit) {
    registerTextMaterial(r,r.interactableKit.material,.1);
    return r.interactableKit;
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 2048;
  const c = canvas.getContext("2d"),
    data = document.createElement("canvas");
  data.width = data.height = 256;
  const d = data.getContext("2d");
  c.scale(2,2);
  const titles = [
    "",
    "",
    "",
    "",
    "MEDICAL",
    "POWER / CIRCUIT",
    "LOGISTICS",
    "COMMUNICATIONS",
    "FIELD SYSTEMS",
    "MEDICAL CARGO",
    "ARMED",
    "DISABLED",
    "RADIO ASSEMBLY",
    "STERILE / FIELD KIT",
    "CAUTION",
    "SERVICE",
  ];
  for (let i = 0; i < 16; i++) {
    const x = (i % 4) * 256,
      y = Math.floor(i / 4) * 256;
    const bg =
      i < 2
        ? "#ffffff"
        : i === 2
          ? "#ffffff"
          : i === 3
            ? "#ffffff"
            : i === 10
              ? "#4a211b"
              : i === 11
                ? "#183f32"
                : i === 4 || i === 9 || i === 13
                  ? "#236056"
                  : "#11252c";
    c.fillStyle = bg;
    c.fillRect(x, y, 256, 256);
    const rough = i === 1 ? 0.5 : i === 2 ? 0.95 : i >= 5 && i <= 8 ? 0.35 : 0.86,
      metal = i === 1 ? 0.78 : 0;
    d.fillStyle = `rgb(255,${Math.round(rough * 255)},${Math.round(metal * 255)})`;
    d.fillRect((i % 4) * 64, Math.floor(i / 4) * 64, 64, 64);
    if (i < 4) continue;
    if(i>=5&&i<=8){
      // Precompensate the square atlas cell for the 0.79 × 0.52 m screen.
      // Glyphs keep the font's proportions after mapping onto that rectangle.
      c.save();c.translate(x,y);c.scale(1,.79/.52);
      c.fillStyle='#c4d7d1';fitDisplay(r,c,titles[i],26,232,20);
      c.fillText(titles[i],12,29);
      c.strokeStyle='#4f7179';c.lineWidth=1;
      for(const y of [45,92,120]){c.beginPath();c.moveTo(14,y);c.lineTo(240,y);c.stroke();}
      c.font=displayFont(r,24);c.fillText('SYSTEM READY',15,78);
      c.font=displayFont(r,21,600);c.fillText('LOCAL CONTROL',15,113);
      c.fillStyle='#adc9c3';c.font=displayFont(r,18,600);
      c.fillText('HOLD TO SERVICE',15,139);
      c.restore();continue;
    }
    c.fillStyle = i === 10 ? "#edbb88" : i === 11 ? "#b2d9ba" : "#c4d7d1";
    fitDisplay(r,c,titles[i],26,232,18);
    c.fillText(titles[i], x + 12, y + 34);
    if ([4, 9, 13].includes(i)) {
      c.fillStyle = "#e2e9dd";
      c.fillRect(x + 106, y + 62, 44, 123);
      c.fillRect(x + 67, y + 101, 123, 44);
      c.font = displayFont(r,16,600);
      c.fillText(i === 9 ? "HANDLE WITH CARE" : "MEDICAL RESUPPLY", x + 16, y + 232);
    } else if (i === 10 || i === 11) {
      c.font = displayFont(r,38);
      c.fillText(i === 10 ? "●  LIVE" : "✓ SAFE", x + 20, y + 118);
      c.font = displayFont(r,18,600);
      c.fillText(i === 10 ? "LINK ACTIVE" : "LINK ISOLATED", x + 18, y + 196);
    } else if (i === 12) {
      c.font = displayFont(r,36);
      c.fillStyle = "#dfb882";
      c.fillText("EMERGENCY", x + 14, y + 106);
      c.fillText("RADIO", x + 14, y + 146);
      c.font = displayFont(r,18,600);
      c.fillText("CALL ASSEMBLY", x + 14, y + 225);
    } else {
      c.strokeStyle = "#4f7179";
      c.lineWidth = 2;
      for (let row = 0; row < 3; row++) {
        c.beginPath();
        c.moveTo(x + 14, y + 70 + row * 52);
        c.lineTo(x + 233, y + 70 + row * 52);
        c.stroke();
      }
      c.font = displayFont(r,24);
      ["SYSTEM READY", "LOCAL CONTROL"].forEach((s, j) =>
        c.fillText(s, x + 15, y + 108 + j * 52),
      );
      c.fillStyle = "#adc9c3";
      c.font = displayFont(r,18,600);
      c.fillText(i === 14 ? "KEEP CLEAR" : "HOLD TO SERVICE", x + 15, y + 232);
    }
  }
  const color = textTexture(r,canvas,'Shared equipment text / Barlow Condensed',{metadata:{font:r.worldTypography?.family,screenAspect:.79/.52,linearScale:2}}),
    response = new THREE.CanvasTexture(data);
  color.colorSpace = THREE.SRGBColorSpace;
  response.colorSpace = THREE.NoColorSpace;
  for (const t of [color, response]) {
    t.anisotropy = r.renderer.capabilities.getMaxAnisotropy();
    r.textures.add(t);
  }
  color.name = "Original shared interactable trim atlas";
  response.name = "Interactable roughness/metalness data";
  const material = r.material({
    map: color,
    roughnessMap: response,
    metalnessMap: response,
    roughness: 1,
    metalness: 1,
    vertexColors: true,
    normalMap: r.realismSurfaces?.weaponMetal?.normal,
    normalScale: new THREE.Vector2(0.025, 0.025),
    emissiveMap:color,emissive:'#dce5df',emissiveIntensity:.1,
  });
  // The first atlas row is plain fabric/metal/rubber, not lettering. Keep
  // those substrates non-emissive without another texture or material/draw.
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance *= 1.0 - step(0.75, vEmissiveMapUv.y);');
  };
  material.customProgramCacheKey=()=> 'equipment-lettering-only-v1';
  registerTextMaterial(r,material,.1);
  material.name = "Paint, rubber and metal / shared interactable trim sheet";
  return (r.interactableKit = { color, response, material, geometries: new Map() });
}

/** Bake small fittings into one cached mesh. Atlas regions carry substrate
 * response; vertex colours preserve the recognizable medical/olive identities. */
function geometry(r, name, make) {
  const kit = shared(r);
  if (kit.geometries.has(name)) return kit.geometries.get(name);
  const parts = [];
  function part(source, p, s, color, cell = 0, rotation = null, mapped = false) {
    let g = source.clone();
    if (g.index) g = g.toNonIndexed();
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...p),
      rotation || new THREE.Quaternion(),
      new THREE.Vector3(...s),
    );
    g.applyMatrix4(matrix);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      // Keep UV derivatives on the plain substrate cells, so the shared
      // photographic normal still has a valid tangent frame on these fittings.
      const [u, v] = cellUV(
        cell,
        mapped ? uv.getX(i) : 0.15 + uv.getX(i) * 0.7,
        mapped ? uv.getY(i) : 0.15 + uv.getY(i) * 0.7,
      );
      uv.setXY(i, u, v);
    }
    const rgb = new THREE.Color(color),
      colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = rgb.r;
      colors[i + 1] = rgb.g;
      colors[i + 2] = rgb.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    parts.push(g);
  }
  const box = r.geo("interactable:unit-box", () => new THREE.BoxGeometry(1, 1, 1));
  const bevel = r.geo("interactable:bevel", () => new RoundedBoxGeometry(1, 1, 1, 1, 0.035));
  const plane = r.geo("interactable:plane", () => new THREE.PlaneGeometry(1, 1));
  const cylinder = r.geo("interactable:cylinder", () => new THREE.CylinderGeometry(1, 1, 1, 8));
  const button = r.geo("interactable:button", () => new THREE.CylinderGeometry(1, 1, 1, 24));
  const zTurn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const api = {
    box: (p, s, color = "#a8bab2", cell = 0) => part(box, p, s, color, cell),
    body: (p, s, color = "#a8bab2", cell = 0) => part(bevel, p, s, color, cell),
    plate: (p, s, cell, color = "#ffffff", q = null) => part(plane, p, s, color, cell, q, true),
    screw: (p, radius = 0.014) => part(cylinder, p, [radius, 0.014, radius], "#aab3ad", 1, zTurn),
    button: (p, radius = 0.13, color = "#a73d32") =>
      part(button, p, [radius, 0.06, radius], color, 0, zTurn),
  };
  make(api);
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw Error("Interactable geometry merge failed: " + name);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  r.geometries.set("interactable:" + name, merged);
  kit.geometries.set(name, merged);
  return merged;
}
function mesh(r, parent, name, make, { dynamic = false, shadow = true } = {}) {
  const m = r.mesh(parent, geometry(r, name, make), shared(r).material);
  m.name = "Equipment / " + name;
  m.castShadow = shadow;
  if (dynamic) m.userData.noBatch = true;
  return m;
}
function faceGeometry(r, cell, w, h) {
  return r.geo(`interactable:face:${cell}:${w}:${h}`, () => {
    const g = new THREE.PlaneGeometry(w, h),
      uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ...cellUV(cell, uv.getX(i), uv.getY(i)));
    return g;
  });
}

export function buildStationTerminal(r, panel, station) {
  const cold = r.g.arena.mapId === "breakwater" && station.id === "coolant-test";
  if (cold) panel.position.y += 0.32; // exact visual mount retained from approved benchmark
  mesh(r, panel, "station", (k) => {
    k.body([0, 0, 0.07], [1.05, 0.88, 0.14], "#53625f");
    for (const x of [-0.48, 0.48]) k.box([x, 0.04, 0.159], [0.035, 0.68, 0.018], "#202c2b", 2);
    k.box([0, -0.37, 0.13], [0.98, 0.1, 0.1], "#87968e");
    for (let i = 0; i < 9; i++)
      k.box([-0.36 + i * 0.09, -0.37, 0.185], [0.045, 0.045, 0.012], "#202b2b", 2);
    for (const x of [-0.455, 0.455]) for (const y of [-0.34, 0.34]) k.screw([x, y, 0.16]);
    for (let i = 0; i < 5; i++)
      k.box([-0.32 + i * 0.16, -0.3, 0.17], [0.1, 0.045, 0.025], i === 4 ? "#b9a16d" : "#223132");
    k.box([0, 0.43, 0.14], [0.91, 0.025, 0.06], "#a8b7af", 1);
  });
  const cell = /power|generator/.test(station.kind)
    ? 5
    : /radio|radar|comms|intel/.test(station.kind)
      ? 7
      : /armory|ammo|suppl|cargo/.test(station.kind)
        ? 6
        : 8;
  // Anti-reflection LCD coating: the flashlight must reveal the lettering
  // rather than turn the entire dark display into a white specular hotspot.
  // PhysicalMaterial's specular control is supported by Three r180; no extra
  // pass/clearcoat/transmission or light is introduced.
  const material = new THREE.MeshPhysicalMaterial({
    map: shared(r).color,
    emissiveMap: shared(r).color,
    color: "#bfd7d3",
    emissive: "#85b9c4",
    emissiveIntensity: 0.32,
    roughness: 0.6,
    metalness: 0,
    specularIntensity:0.04,
  });
  material.userData.world=true;r.materials.add(material);
  const screen = r.mesh(panel, faceGeometry(r, cell, 0.79, 0.52), material, [0, 0.06, 0.17]);
  screen.castShadow = false;
  screen.userData.noBatch = true;
  r.protocolScreens.set(station.id, material);
  const label = r.mesh(
    panel,
    r.geo("protocol-label", () => new THREE.PlaneGeometry(1.18, 0.34)),
    r.protocolSign(station.name, "HOLD TO SERVICE",undefined,[1.18,.34]),
    [0, 0.69, 0.05],
  );
  label.castShadow = false;
  label.userData.noBatch = true;
  if (cold)
    r.protocolFixtures.push({
      x: panel.position.x - 0.9,
      y: 2.05,
      z: panel.position.z,
      color: "#ffdec2",
      intensity: 2.5,
      distance: 4,
    });
  r.interactableInstances ||= [];
  r.interactableInstances.push({ type: "station", id: station.id, root: panel, screen });
}

export function buildMedicalCabinet(r, parent) {
  mesh(r, parent, "medical-cabinet", (k) => {
    k.body([0, 0.01, 0.08], [1.08, 1.12, 0.16], "#71877f");
    for (const x of [-0.495, 0.495]) k.box([x, 0.01, 0.17], [0.05, 1.08, 0.035], "#b6c4b8");
    for (const y of [-0.53, 0.55]) k.box([0, y, 0.17], [1.02, 0.05, 0.035], "#b6c4b8");
    k.box([0, 0.6, 0.1], [1.14, 0.06, 0.23], "#a7b6ac");
    for (const y of [-0.03, 0.43]) k.box([0, y, 0.13], [0.89, 0.022, 0.12], "#263b37", 2);
    for (const x of [-0.49, 0.49]) for (const y of [-0.45, 0.47]) k.screw([x, y, 0.195], 0.012);
  });
}

/** Radio-room stock label sits on the shared chassis below its screen. Other
 * already-approved cabinet labels retain their positions and artwork. */
export function buildCabinetLabel(r, cabinet, fixture, sharedStation) {
  const radio = fixture.id === "cabinet-comms";
  const size=radio?[1.04,.08]:sharedStation?[.65,.24]:[1.55,.45];
  const material=r.protocolSign(fixture.name,radio?'':"MEDICAL RESUPPLY","#a1c7b7",size);
  const label = r.mesh(
    cabinet,
    r.geo(
      radio
        ? "radio-cabinet-nameplate"
        : sharedStation
          ? "medical-label-shared-station"
          : "medical-label",
      () =>
        new THREE.PlaneGeometry(
          radio ? 1.04 : sharedStation ? 0.65 : 1.55,
          radio ? 0.08 : sharedStation ? 0.24 : 0.45,
        ),
    ),
    material,
    radio ? [0, 0.534, 0.205] : [sharedStation ? -0.94 : 0, sharedStation ? 0.2 : 0.98, 0.185],
  );
  label.name = "Cabinet nameplate / " + fixture.id;
  label.castShadow = false;
  label.userData.noBatch = true;
  r.interactableInstances.push({ type: "cabinet-label", id: fixture.id, root: cabinet, label });
  return label;
}
export function buildMedicalCase(r, parent, position, movable = false) {
  const root = new THREE.Group();
  root.position.set(...position);
  parent.add(root);
  mesh(
    r,
    root,
    "medical-kit-case",
    (k) => {
      k.body([0, 0, 0], [0.78, 0.4, 0.26], "#b1c0b5", 3);
      k.box([0, 0.145, 0], [0.77, 0.035, 0.25], "#8fa49b");
      for (const x of [-0.34, 0.34]) k.box([x, 0, 0.12], [0.034, 0.34, 0.035], "#334b45", 2);
      k.box([0, 0.15, 0.135], [0.22, 0.035, 0.025], "#263c35", 2);
      for (const x of [-0.24, 0.24]) k.box([x, 0.1, 0.143], [0.055, 0.06, 0.022], "#b0bbb0", 1);
      k.plate([0, 0, 0.163], [0.33, 0.32, 1], 4);
      const back = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
      k.plate([0, 0, -0.131], [0.33, 0.32, 1], 4, "#ffffff", back);
    },
    { dynamic: movable },
  );
  return root;
}

export function buildSupplyBox(r, parent, size = [1.85, 1.8, 1.85]) {
  const m = mesh(
    r,
    parent,
    "supply-crate",
    (k) => {
      k.body([0, 0.49, 0], [0.96, 0.96, 0.96], "#586759");
      k.box([0, 0.92, 0], [1, 0.09, 1], "#7a8974", 1);
      for (const x of [-0.45, 0.45]) {
        k.box([x, 0.49, 0], [0.06, 0.96, 1], "#344338", 2);
        k.box([x, 0.97, 0], [0.06, 0.025, 0.96], "#92a18c", 1);
      }
      for (const x of [-0.3, 0.3]) k.box([x, 0.64, 0.494], [0.1, 0.09, 0.024], "#9ca991", 1);
      k.plate([0, 0.48, 0.503], [0.45, 0.39, 1], 9);
      k.box([0, 0.72, -0.495], [0.3, 0.08, 0.018], "#24352b", 2);
      for (const side of [-1, 1]) {
        const turn = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          (side * Math.PI) / 2,
        );
        k.plate([side * 0.503, 0.48, 0], [0.45, 0.39, 1], 9, "#ffffff", turn);
        k.box([side * 0.495, 0.72, 0], [0.018, 0.08, 0.3], "#24352b", 2);
      }
    },
    { dynamic: true },
  );
  m.scale.set(...size);
  return m;
}

function chargeGeometry(r, disabled) {
  return geometry(r, disabled ? "charge-disabled" : "charge-armed", (k) => {
    k.body([0, 0.095, 0], [0.46, 0.19, 0.36], "#344847");
    for (const x of [-0.16, 0.16]) k.box([x, 0.195, 0], [0.026, 0.02, 0.3], "#8d9988");
    for (const x of [-0.2, 0.2])
      for (const z of [-0.14, 0.14]) k.box([x, 0.175, z], [0.025, 0.02, 0.025], "#242d2b", 2);
    k.box([0.13, 0.199, 0.07], [0.012, 0.018, 0.12], disabled ? "#6ca17b" : "#b9a069");
    k.box([0.08, 0.193, -0.09], [0.12, 0.015, 0.014], "#202e2e", 2);
  });
}
export function buildCharge(r, parent) {
  const m = r.mesh(parent, chargeGeometry(r, false), shared(r).material);
  m.name = "Concealed charge / armed";
  m.userData.noBatch = true;
  parent.userData.chargeMesh = m;
  const kit = shared(r);
  kit.chargeScreenMaterial ||= r.material({
    map: kit.color,
    emissiveMap: kit.color,
    emissive: "#ffffff",
    emissiveIntensity: 0.6,
    roughness: 0.45,
    metalness: 0,
  });
  kit.disabledChargeMaterial ||= kit.chargeScreenMaterial.clone();
  r.materials.add(kit.disabledChargeMaterial);
  const screen = r.mesh(
    parent,
    faceGeometry(r, 10, 0.18, 0.15),
    kit.chargeScreenMaterial,
    [0, 0.208, 0.03],
  );
  screen.rotation.x = -Math.PI / 2;
  screen.castShadow = false;
  screen.userData.noBatch = true;
  parent.userData.chargeScreen = screen;
  return parent;
}
export function updateChargePresentation(r, root, state, time = r.g.animationTime) {
  const disabled = state === "disabled";
  root.userData.chargeMesh.geometry = chargeGeometry(r, disabled);
  root.userData.chargeMesh.name = "Concealed charge / " + (disabled ? "disabled" : "armed");
  root.userData.chargeScreen.geometry = faceGeometry(r, disabled ? 11 : 10, 0.18, 0.15);
  const kit = shared(r);
  // A gentle one-cycle-per-second pulse on the armed display, not the body.
  // Reduced-motion players get a steady bright indicator; SAFE never blinks.
  kit.chargeScreenMaterial.emissiveIntensity = r.motion.matches
    ? 3.8
    : 1.2 + 3.8 * (0.5 + 0.5 * Math.sin(time * Math.PI * 2));
  root.userData.chargeScreen.material = disabled
    ? kit.disabledChargeMaterial
    : kit.chargeScreenMaterial;
  root.userData.state = state;
}
export function buildEmergencyConsole(r, root) {
  mesh(r, root, "emergency-console", (k) => {
    k.box([0, -0.68, 0], [0.13, 1.28, 0.13], "#8c9991", 1);
    k.box([0, -1.26, 0], [0.55, 0.08, 0.55], "#707e76", 1);
    k.body([0, 0, 0.06], [0.58, 0.82, 0.12], "#7d8d83");
    k.box([0, 0, 0.14], [0.41, 0.56, 0.03], "#b2a169");
    for (const x of [-0.23, 0.23]) k.box([x, 0, 0.18], [0.035, 0.61, 0.1], "#2f4038", 2);
    k.button([0, 0, 0.2], 0.13, "#b44637");
    for (const x of [-0.245, 0.245]) for (const y of [-0.32, 0.32]) k.screw([x, y, 0.14]);
    k.plate([0, 0.3, 0.13], [0.3, 0.1, 1], 12);
  });
  const label = r.mesh(
    root,
    r.geo("protocol-label", () => new THREE.PlaneGeometry(1.18, 0.34)),
    r.protocolSign("RADIO ASSEMBLY", "EMERGENCY MEETING", "#d3ae75",[1.18,.34]),
    [0, 0.7, 0.04],
  );
  label.castShadow = false;
  label.userData.noBatch = true;
  r.interactableInstances ||= [];
  r.interactableInstances.push({ type: "emergency", root });
}
