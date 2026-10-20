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
  if (d.y < 0.015) discard;
  // Project onto a flat cloud deck: distant clouds bunch towards the horizon.
  vec2 uv = d.xz / (d.y + 0.12) * 1.6;
  float c = density(uv);
  if (c < 0.004) discard;
  // Self-shadow: how much cloud lies between this point and the sun.
  float towardSun = density(uv + normalize(sunDir.xz + 1e-4) * 0.09);
  float light = clamp(1.0 - towardSun * 0.75 + (1.0 - c) * 0.35, 0.0, 1.0);
  float rim = pow(max(dot(d, normalize(sunDir)), 0.0), 6.0) * (1.0 - c) * 1.4;
  vec3 color = mix(shade, lit, light) + lit * rim;
  float horizon = smoothstep(0.015, 0.22, d.y);
  gl_FragColor = vec4(color, c * horizon * opacity);
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
    if (night) u.lit.value.set("#5d6a84");
    else u.lit.value.setRGB(1.3, 1.26, 1.18);
    u.shade.value.set(night ? "#1b2130" : "#bcc4cf");
    u.opacity.value = night ? 0.45 : 0.7;
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
