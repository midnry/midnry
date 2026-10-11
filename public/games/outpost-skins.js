/** Deterministic fabric patterns shared by 3D uniforms and classic sprites. */
const cache = new Map();
export function skinPattern(outfit, size = 512) {
  const key = `${outfit.id}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d"),
    palette = outfit.palette || [outfit.primary, outfit.accent];
  let seed = [...outfit.id].reduce((s, ch) => Math.imul(s, 31) + ch.charCodeAt(0), 19) >>> 0;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  c.fillStyle = palette[0];
  c.fillRect(0, 0, size, size);
  if (outfit.pattern === "digital" || outfit.pattern === "woodland") {
    const step = size / (outfit.pattern === "digital" ? 64 : 40);
    for (let n = 0; n < 750; n++) {
      let x = Math.floor((random() * size) / step) * step,
        y = Math.floor((random() * size) / step) * step;
      c.fillStyle = palette[1 + Math.floor(random() * (palette.length - 1))];
      for (let k = 0; k < 3 + random() * 6; k++) {
        if (outfit.pattern === "woodland") {
          c.beginPath();
          c.ellipse(
            x,
            y,
            step * (1 + random() * 2),
            step * (1 + random()),
            random() * 3,
            0,
            Math.PI * 2,
          );
          c.fill();
        } else
          c.fillRect(
            x,
            y,
            step * (1 + Math.floor(random() * 3)),
            step * (1 + Math.floor(random() * 2)),
          );
        x += (random() - 0.5) * step * 4;
        y += (random() - 0.5) * step * 3;
      }
    }
  } else if (outfit.pattern === "circuit" || outfit.pattern === "fracture") {
    c.strokeStyle = outfit.accent;
    c.lineWidth = size / 350;
    for (let n = 0; n < 65; n++) {
      let x = random() * size,
        y = random() * size;
      c.globalAlpha = 0.4 + random() * 0.45;
      c.beginPath();
      c.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += ((random() - 0.5) * size) / 5;
        y += size / 20 + (random() * size) / 12;
        if (outfit.pattern === "circuit") {
          c.lineTo(x, y - size / 30);
          c.lineTo(x, y);
        } else c.lineTo(x, y);
      }
      c.stroke();
    }
  }
  // Woven cloth and fine wear remain visible without baking lighting into the skin.
  c.globalAlpha = 0.1;
  c.fillStyle = "#ffffff";
  for (let y = 0; y < size; y += 4) c.fillRect(0, y, size, 1);
  c.globalAlpha = 0.12;
  c.fillStyle = "#101817";
  for (let x = 0; x < size; x += 4) c.fillRect(x, 0, 1, size);
  for (let n = 0; n < 1200; n++) {
    c.globalAlpha = random() * 0.14;
    c.fillRect(random() * size, random() * size, 1 + random() * 3, 1);
  }
  c.globalAlpha = 1;
  cache.set(key, canvas);
  return canvas;
}
