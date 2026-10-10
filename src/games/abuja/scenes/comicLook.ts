import * as Phaser from "phaser";
import { lookIsComic } from "../systems/look";

// The comic look: one full-screen pass over each scene's camera, in the
// spirit of bold illustrated game posters. Dark ink lines where colours
// change sharply, richer colour, flatter cel-style shading, and a split tone
// by time of day (warm highlights over cool shadows; pink and orange at dusk,
// teal and purple at night). WebGL only: in canvas mode the game stays as it is.

const FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uTexel;
uniform float uInk;
uniform float uSat;
uniform float uContrast;
uniform float uCel;
uniform vec3 uShadow;
uniform vec3 uLight;
uniform float uTone;
uniform float uAmount;
varying vec2 outTexCoord;

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float at(vec2 o) { return lum(texture2D(uMainSampler, outTexCoord + o * 1.5 * uTexel).rgb); }

void main() {
  vec4 src = texture2D(uMainSampler, outTexCoord);
  vec3 c = src.rgb;

  // Ink: a Sobel edge on brightness, so outlines appear wherever shapes meet.
  float tl = at(vec2(-1.0, -1.0)), t = at(vec2(0.0, -1.0)), tr = at(vec2(1.0, -1.0));
  float l = at(vec2(-1.0, 0.0)), r = at(vec2(1.0, 0.0));
  float bl = at(vec2(-1.0, 1.0)), b = at(vec2(0.0, 1.0)), br = at(vec2(1.0, 1.0));
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float edge = smoothstep(0.2, 0.6, sqrt(gx * gx + gy * gy));
  // Only the darker side of an edge takes ink, so light lettering and
  // highlights keep their shape and the line hugs the outside of bright things.
  float around = (tl + t + tr + l + r + bl + b + br) / 8.0;
  edge *= smoothstep(-0.01, 0.05, around - lum(c));

  // Flatter, cel-style shading: pull brightness towards a few bands.
  float y = max(lum(c), 0.001);
  float f = y * 4.0;
  float band = (floor(f) + smoothstep(0.3, 0.7, fract(f))) / 4.0;
  c *= mix(1.0, clamp(band / y, 0.6, 1.5), uCel);

  // Richer colour and a little more punch.
  float g = lum(c);
  c = mix(vec3(g), c, uSat);
  c = (c - 0.5) * uContrast + 0.5;

  // Split tone: shadows lean one way, highlights the other.
  float y2 = clamp(lum(c), 0.0, 1.0);
  c += (uShadow - 0.5) * (1.0 - y2) * uTone + (uLight - 0.5) * y2 * uTone;

  // Ink last, so lines stay dark whatever the grade does.
  c = mix(c, c * vec3(0.10, 0.07, 0.16), edge * uInk);
  gl_FragColor = vec4(mix(src.rgb, clamp(c, 0.0, 1.0), uAmount), src.a);
}
`;

export type Mood = "morning" | "afternoon" | "dusk" | "night" | "inside";

/** Per time of day: shadow and highlight tints (0.5 = neutral), and strengths. */
const MOODS: Record<Mood, { shadow: [number, number, number]; light: [number, number, number]; tone: number; sat: number; contrast: number; ink: number }> = {
  morning: { shadow: [0.42, 0.5, 0.62], light: [0.62, 0.55, 0.42], tone: 0.22, sat: 1.32, contrast: 1.08, ink: 0.85 },
  afternoon: { shadow: [0.38, 0.52, 0.6], light: [0.6, 0.53, 0.45], tone: 0.2, sat: 1.38, contrast: 1.1, ink: 0.85 },
  dusk: { shadow: [0.48, 0.4, 0.62], light: [0.68, 0.52, 0.44], tone: 0.24, sat: 1.38, contrast: 1.08, ink: 0.8 },
  night: { shadow: [0.46, 0.46, 0.58], light: [0.62, 0.54, 0.5], tone: 0.14, sat: 1.25, contrast: 1.02, ink: 0.6 },
  inside: { shadow: [0.44, 0.46, 0.58], light: [0.6, 0.54, 0.45], tone: 0.18, sat: 1.28, contrast: 1.06, ink: 0.8 },
};

export class ComicFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private target = { ...MOODS.afternoon };
  private now = { ...MOODS.afternoon };

  constructor(game: Phaser.Game) {
    super({ game, name: "ComicFX", fragShader: FRAG });
  }

  /** Ease towards a time of day's look (instantly the first time). */
  mood(m: Mood, instant = false) {
    this.target = { ...MOODS[m] };
    if (instant) this.now = { ...MOODS[m] };
  }

  onPreRender() {
    const k = 0.04;
    const n = this.now;
    const t = this.target;
    const mix3 = (a: [number, number, number], b: [number, number, number]) => a.map((v, i) => v + (b[i]! - v) * k) as [number, number, number];
    n.shadow = mix3(n.shadow, t.shadow);
    n.light = mix3(n.light, t.light);
    for (const key of ["tone", "sat", "contrast", "ink"] as const) n[key] += (t[key] - n[key]) * k;
    this.set2f("uTexel", 1 / this.renderer.width, 1 / this.renderer.height);
    this.set1f("uInk", n.ink);
    this.set1f("uSat", n.sat);
    this.set1f("uContrast", n.contrast);
    this.set1f("uCel", 0.22);
    this.set3f("uShadow", ...n.shadow);
    this.set3f("uLight", ...n.light);
    this.set1f("uTone", n.tone);
    amount += ((lookIsComic() ? 1 : 0) - amount) * 0.12;
    this.set1f("uAmount", amount);
  }
}

let amount = lookIsComic() ? 1 : 0;

/** Put the comic look on this scene's camera (it fades in and out with the switch). Returns it, or null in canvas mode. */
export function addComic(scene: Phaser.Scene, mood: Mood): ComicFX | null {
  if (!(scene.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return null;
  const pipelines = scene.game.renderer.pipelines;
  if (!pipelines.getPostPipeline("ComicFX")) pipelines.addPostPipeline("ComicFX", ComicFX);
  const cam = scene.cameras.main;
  cam.setPostPipeline(ComicFX);
  const fx = cam.getPostPipeline(ComicFX) as ComicFX | ComicFX[];
  const one = Array.isArray(fx) ? fx[0] : fx;
  one?.mood(mood, true);
  return one ?? null;
}

/** Time of day from the game's slot (0 morning … 3 night). */
export const moodFor = (slot: number): Mood => (["morning", "afternoon", "dusk", "night"] as const)[Math.min(3, Math.max(0, slot))]!;
