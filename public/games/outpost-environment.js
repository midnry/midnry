/** Illustrated materials only. World coordinates and collisions remain owned by Arena. */
const MAP_ORDER = ["outpost", "testblock", "skyport", "freight", "estate"];
export class EnvironmentArt {
  constructor(g) {
    this.g = g;
    this.cache = new Map();
    this.revision = 0;
    this.materials = new Image();
    this.skies = new Image();
    this.ready = Promise.all([
      this.load(this.materials, "./environment/materials-atlas.webp"),
      this.load(this.skies, "./environment/skies-atlas.webp"),
    ]);
  }
  load(image, path) {
    return new Promise((resolve) => {
      image.onload = () => {
        if (!this.g.abort.signal.aborted) {
          this.revision++;
          this.clearCache();
          this.g.academy.materials.clear();
          this.g.academy.floorKey = null;
        }
        resolve(true);
      };
      image.onerror = () => resolve(false); // Procedural materials and skies remain available.
      image.src = new URL(path, import.meta.url).href;
    });
  }
  clearCache() {
    this.cache.clear();
  }
  get loaded() {
    return this.materials.complete && this.materials.naturalWidth > 0;
  }
  // Both surfaces use the same painted source; generate mip levels only once.
  tile(index, n = 256) {
    if (!this.loaded) return null;
    const key = `${index}:${n}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = n;
    const c = canvas.getContext("2d", { willReadFrequently: true });
    const cw = this.materials.naturalWidth / 4,
      ch = this.materials.naturalHeight / 4;
    // A subpixel inset prevents neighboring atlas cells bleeding through filtering.
    c.drawImage(
      this.materials,
      (index % 4) * cw + 0.5,
      Math.floor(index / 4) * ch + 0.5,
      cw - 1,
      ch - 1,
      0,
      0,
      n,
      n,
    );
    const levels = [];
    let current = canvas;
    while (true) {
      levels.push({
        image: current,
        size: current.width,
        pixels: current
          .getContext("2d", { willReadFrequently: true })
          .getImageData(0, 0, current.width, current.height).data,
      });
      if (current.width <= 8) break;
      const next = document.createElement("canvas");
      next.width = next.height = current.width / 2;
      next
        .getContext("2d", { willReadFrequently: true })
        .drawImage(current, 0, 0, next.width, next.height);
      current = next;
    }
    this.cache.set(key, levels);
    return levels;
  }
  ground(map) {
    const n = Math.min(256, this.g.academy.options.texture);
    const ids = {
      outpost: [0],
      testblock: [6, 1, 2, 2],
      skyport: [4, 3, 3, 4],
      freight: [5, 5, 5],
      estate: [6, 7, 6, 3],
    }[map.id] || [0];
    return ids.map((id) => this.tile(id, n));
  }
  wall(c, map, type, side, n, lighting) {
    const index =
      map.id === "estate" && type === 1
        ? 14
        : map.id === "skyport" && type === 1
          ? 13
          : 7 + Math.min(6, Math.max(1, type));
    const texture = this.tile(index, n);
    if (!texture) return false;
    c.drawImage(texture[0].image, 0, 0, n, n);
    if (side || lighting) {
      c.fillStyle = side ? "#111e3640" : "#ffe2ae0c";
      c.fillRect(0, 0, n, n);
    }
    return true;
  }
  sky(map, p, horizon) {
    if (!this.skies.complete || !this.skies.naturalWidth) return false;
    const g = this.g,
      c = g.ctx,
      sw = this.skies.naturalWidth,
      sh = this.skies.naturalHeight / 5;
    const row = Math.max(0, MAP_ORDER.indexOf(map.id));
    // An aspect-correct window preserves distant structures on portrait screens.
    const height = Math.max(horizon, g.h * 0.57),
      span = Math.min(sw, (sh * g.w) / height),
      start = ((((p.a / (Math.PI * 2) - span / (2 * sw)) % 1) + 1) % 1) * sw;
    c.save();
    c.beginPath();
    c.rect(0, 0, g.w, Math.max(0, horizon));
    c.clip();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    const first = Math.min(span, sw - start),
      dest = (first / span) * g.w;
    c.drawImage(
      this.skies,
      start,
      row * sh + 0.5,
      first,
      sh - 1,
      0,
      horizon - height,
      dest,
      height,
    );
    if (first < span)
      c.drawImage(
        this.skies,
        0,
        row * sh + 0.5,
        span - first,
        sh - 1,
        dest,
        horizon - height,
        g.w - dest,
        height,
      );
    c.restore();
    return true;
  }
}
