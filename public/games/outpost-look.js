/** Device-local FPS camera preferences. Angles never depend on render resolution. */
export const LOOK_KEY = 'midnry-outpost-look';
// buttons / buttonAlpha: touch control size and opacity (phones and tablets).
export const LOOK_DEFAULTS = Object.freeze({ fov: 100, sensitivity: 2, vertical: 1, touch: 1, invert: false, raw: true, buttons: 1, buttonAlpha: 1 });
export const PITCH_LIMIT = 75 * Math.PI / 180;
const limits = { fov: [75, 120], sensitivity: [0.1, 10], vertical: [0.25, 2], touch: [0.25, 3], buttons: [0.8, 1.25], buttonAlpha: [0.4, 1] };
export function sanitizeLook(saved = {}) {
  const result = { ...LOOK_DEFAULTS };
  for (const [key, [min, max]] of Object.entries(limits))
    if (typeof saved?.[key] === 'number' && Number.isFinite(saved[key])) result[key] = Math.max(min, Math.min(max, saved[key]));
  for (const key of ['invert', 'raw']) if (typeof saved?.[key] === 'boolean') result[key] = saved[key];
  return result;
}
export function viewGeometry(width, height, fov) {
  const aspect = width / Math.max(1, height);
  // Hor+ on wide screens. Portrait gets a bounded vertical view for comfort.
  const vertical = Math.min(110 * Math.PI / 180, 2 * Math.atan(Math.tan(fov * Math.PI / 360) / Math.max(1, Math.min(16 / 9, aspect))));
  const projection = height / (2 * Math.tan(vertical / 2));
  return { vertical, projection, plane: width / (2 * projection) };
}
export function lookDelta(dx, dy, settings, touch = false) {
  const scale = touch ? 0.004 * settings.touch : 0.022 * Math.PI / 180 * settings.sensitivity;
  return { yaw: dx * scale, pitch: -dy * scale * (touch ? 1 : settings.vertical) * (settings.invert ? -1 : 1) };
}
export async function requestAimLock(canvas, raw, failed = () => {}) {
  if (!canvas.requestPointerLock) { failed(); return; }
  try { await canvas.requestPointerLock(raw ? { unadjustedMovement: true } : {}); }
  catch (error) {
    if (raw && error?.name === 'NotSupportedError') {
      try { await canvas.requestPointerLock(); } catch { failed(); }
    } else failed();
  }
}
export class LookSettings {
  constructor(g) {
    this.g = g;
    let saved; try { saved = JSON.parse(localStorage.getItem(LOOK_KEY)); } catch {}
    this.values = sanitizeLook(saved);
  }
  mount(target) {
    const specs = [ ['fov', 'Field of view', 75, 120, 1, '°'], ['sensitivity', 'Mouse sensitivity', 0.1, 10, 0.05, ''], ['vertical', 'Vertical sensitivity multiplier', 0.25, 2, 0.05, '×'], ['touch', 'Touch look sensitivity', 0.25, 3, 0.05, '×'], ['buttons', 'Touch button size', 0.8, 1.25, 0.05, '×'], ['buttonAlpha', 'Touch button opacity', 0.4, 1, 0.05, ''] ];
    target.innerHTML = '<p>A wider view shows more surroundings. FOV is horizontal at 16:9; wider screens expand naturally and portrait screens adapt.</p>' + specs.map(([key, title, min, max, step, unit]) => `<label class="mf-looklabel"><span>${title} <output data-look-output="${key}"></output></span><span class="mf-lookrow"><input type="range" data-look="${key}" aria-label="${title}" min="${min}" max="${max}" step="${step}"><input type="number" data-look="${key}" aria-label="${title} value" min="${min}" max="${max}" step="${step}" data-unit="${unit}"></span></label>`).join('') + '<p>Touch buttons can be smaller on any device; larger sizes apply on tablets, where there is room (phones keep the standard size at most so nothing overlaps). Lower opacity shows more of the scene; a pressed button is always fully visible.</p><p>Lower mouse sensitivity helps precise aim. Both axes use the same angular speed at 1× vertical; FOV and graphics resolution do not change your turn distance.</p><label><span>Invert vertical look</span><input type="checkbox" data-look="invert"></label><label><span>Raw mouse input (where supported)</span><input type="checkbox" data-look="raw"></label><p>No added mouse acceleration or smoothing. Raw input bypasses system acceleration where your browser supports it. Changes apply immediately and save on this device.</p><button class="mf-lookreset">Reset camera & aim</button>';
    const update = (e) => {
      const input = e.target, key = input.dataset.look;
      if (!key) return;
      if (input.type === 'number' && (e.type !== 'change' || input.value === '' || !Number.isFinite(input.valueAsNumber))) return;
      this.values = sanitizeLook({ ...this.values, [key]: input.type === 'checkbox' ? input.checked : input.valueAsNumber });
      this.save(); this.refresh(target); this.g.resize();
    };
    this.g.on(target, 'input', update); this.g.on(target, 'change', update);
    this.g.on(target.querySelector('.mf-lookreset'), 'click', () => { this.values = { ...LOOK_DEFAULTS }; this.save(); this.refresh(target); this.g.resize(); });
    this.refresh(target);
  }
  refresh(target) {
    for (const input of target.querySelectorAll('[data-look]')) {
      const value = this.values[input.dataset.look];
      if (input.type === 'checkbox') input.checked = value; else input.value = value;
    }
    for (const output of target.querySelectorAll('[data-look-output]')) {
      const key = output.dataset.lookOutput;
      output.value = key === 'fov' ? `${this.values[key]}°` : key === 'buttonAlpha' ? `${Math.round(this.values[key] * 100)}%` : `${this.values[key].toFixed(2)}${key === 'sensitivity' ? '' : '×'}`;
    }
    this.apply();
  }
  /** Touch controls follow the size and opacity settings (CSS variables). */
  apply() {
    const shell = this.g.shell;
    if (!shell) return;
    shell.style.setProperty('--mf-btn', String(this.values.buttons));
    shell.style.setProperty('--mf-btn-alpha', String(this.values.buttonAlpha));
  }
  save() { try { localStorage.setItem(LOOK_KEY, JSON.stringify(this.values)); } catch {} }
}
