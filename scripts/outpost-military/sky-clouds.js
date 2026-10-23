/** Drifting clouds over the photographed sky. The sky photograph is a still
 * 360° image; this shader layer adds clouds that move with the wind, lit by
 * the sun (bright rims towards it, grey undersides) and thinning towards the
 * horizon, while the photograph itself slowly turns. It draws only where sky is visible, after the opaque world, so
 * walls and roofs cost it nothing. Storm skies draw over it. */
import * as THREE from "three";

const vertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p;
}`;

const fragment = /* glsl */ `
uniform float time;
uniform float coverage;
uniform float opacity;
uniform vec3 sunDir;
uniform vec3 lit;
uniform vec3 shade;
uniform vec3 haze;
uniform float hazeAlpha;
uniform float hazeHeight;
uniform vec3 zenith;
uniform vec3 horizonSky;
uniform vec3 sunGlow;
uniform float skyAlpha;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < OCTAVES; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
float density(vec2 uv) {
  // Large shapes drift with the wind; detail boils a little faster.
  float n = fbm(uv + vec2(time * 0.012, time * 0.004));
  n += 0.35 * (fbm(uv * 3.1 - vec2(time * 0.03, 0.0)) - 0.5);
  return smoothstep(coverage, coverage + 0.32, n);
}
void main() {
  vec3 d = normalize(vDir);
  if (d.y < 0.0) discard;
  // The arena's own haze: a warm (or cool) band over the photograph's
  // grey horizon, fading out with height. It gives each map its colour.
  float band = (1.0 - smoothstep(0.0, hazeHeight, d.y)) * hazeAlpha;
  // Project onto a flat cloud deck: distant clouds bunch towards the horizon.
  vec2 uv = d.xz / (d.y + 0.12) * 1.6;
  float c = d.y < 0.015 ? 0.0 : density(uv);
  if (c < 0.004 && band < 0.004) discard;
  // Self-shadow: how much cloud lies between this point and the sun.
  float towardSun = density(uv + normalize(sunDir.xz + 1e-4) * 0.09);
  float light = clamp(1.0 - towardSun * 0.75 + (1.0 - c) * 0.35, 0.0, 1.0);
  float rim = pow(max(dot(d, normalize(sunDir)), 0.0), 6.0) * (1.0 - c) * 1.4;
  vec3 color = mix(shade, lit, light) + lit * rim;
  float horizon = smoothstep(0.015, 0.22, d.y);
  float cloud = c * horizon * opacity;
  // The arena's own sky (skyAlpha 1): a gradient from the horizon colour to
  // the zenith, the sun's glow, then the clouds and the haze band over it.
  // With skyAlpha 0 the photographed sky shows through as before.
  float s = max(dot(d, normalize(sunDir)), 0.0);
  vec3 base = mix(horizonSky, zenith, smoothstep(0.0, 0.55, d.y));
  base += sunGlow * (pow(s, 24.0) * 0.9 + pow(s, 6.0) * 0.18);
  vec3 over = mix(base, color, cloud);
  over = mix(over, haze, band);
  float a = max(skyAlpha, cloud + band * (1.0 - cloud));
  vec3 mixed = skyAlpha > 0.5 ? over : (a > 0.0 ? (color * cloud + haze * band * (1.0 - cloud)) / a : color);
  gl_FragColor = vec4(mixed, a);
  #include <colorspace_fragment>
}`;

export class SkyClouds {
  constructor(r, { mobile = false } = {}) {
    this.r = r;
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      defines: { OCTAVES: mobile ? 4 : 5 },
      uniforms: {
        time: { value: 0 },
        coverage: { value: 0.46 },
        opacity: { value: 1 },
        sunDir: { value: new THREE.Vector3(-0.5, 0.6, -0.4) },
        lit: { value: new THREE.Color("#fff6e8") },
        shade: { value: new THREE.Color("#7a8494") },
        haze: { value: new THREE.Color("#d4c8ad") },
        hazeAlpha: { value: 0 },
        hazeHeight: { value: 0.25 },
        zenith: { value: new THREE.Color("#7fa3c4") },
        horizonSky: { value: new THREE.Color("#e9c9a0") },
        sunGlow: { value: new THREE.Color("#ffd9a0") },
        skyAlpha: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      fog: false,
    });
    // Upper hemisphere inside the camera's far plane, following the camera.
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), this.material);
    this.mesh.name = "Drifting clouds";
    this.mesh.renderOrder = -2;
    this.mesh.frustumCulled = false;
    r.scene.add(this.mesh);
    this.sun = new THREE.Vector3();
  }
  /** Follow the camera; day clouds are bright, night clouds dim and blue. */
  update(time, night, still) {
    const r = this.r,
      u = this.material.uniforms;
    this.mesh.position.copy(r.camera.position);
    // Reduced motion: clouds hold still.
    u.time.value = still ? 0 : time;
    this.sun.copy(r.sun.position).sub(r.sun.target.position).normalize();
    u.sunDir.value.copy(this.sun);
    // Day clouds are brighter than the dimmed sky photograph behind them,
    // with soft blue-grey undersides; night clouds are faint and dark.
    const sky = r.skyProfile?.();
    if (night) u.lit.value.set("#5d6a84");
    else u.lit.value.setRGB(...(sky?.lit || [1.3, 1.26, 1.18]));
    u.shade.value.set(night ? "#1b2130" : sky?.shade || "#bcc4cf");
    u.opacity.value = night ? 0.45 : 0.7;
    u.coverage.value = sky?.coverage ?? 0.46;
    // The haze band is the arena's by day; at night the starry sky shows.
    u.haze.value.set(sky?.horizon || "#d4c8ad");
    u.hazeAlpha.value = night ? 0 : sky?.hazeAlpha ?? 0;
    u.hazeHeight.value = sky?.hazeHeight ?? 0.25;
    // Arenas with their own palette replace the photographed sky by day.
    const own = !night && !!sky?.zenith;
    u.skyAlpha.value = own ? 1 : 0;
    if (own) {
      u.zenith.value.set(sky.zenith);
      u.horizonSky.value.set(sky.horizonSky);
      u.sunGlow.value.set(sky.sunGlow || "#ffd9a0");
    }
    // The photographed sky drifts too (its own clouds), slower than the
    // shader layer, so the two read as separate heights. Lighting
    // reflections (the environment map) stay fixed.
    r.scene.backgroundRotation.y = still ? 0 : time * 0.0035;
  }
  dispose() {
    this.r.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
