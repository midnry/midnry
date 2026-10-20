/** Weapon finishes: one catalog for the Locker, the 3D first-person gun and
 * the store server. Cosmetic only — a finish never changes a weapon.
 *
 * - kind "xp": unlocked by XP on this device (free).
 * - kind "premium": bought once with a Midnry account. price is in the
 *   smallest unit of each currency the store takes (kobo, cents).
 * - kind "pass": included while the account has Midnry Pass.
 *
 * drawFinish() paints a tileable swatch on a 2D canvas; the renderer turns
 * it into the coating texture, the Locker shows it as a preview. */
export const FINISHES = [
  { id: "standard", name: "Field Issue", kind: "xp", xp: 0, pattern: "solid", colors: ["#222624"] },
  { id: "copper", name: "Copper Signal", kind: "xp", xp: 200, pattern: "solid", colors: ["#a8683a"] },
  { id: "glacier", name: "Glacier Ink", kind: "xp", xp: 600, pattern: "solid", colors: ["#4f8fa3"] },
  { id: "nightfall", name: "Nightfall", kind: "xp", xp: 1200, pattern: "solid", colors: ["#6b5491"] },
  {
    id: "tiger",
    name: "Tiger Stripe",
    kind: "premium",
    price: { NGN: 150000, USD: 149 },
    pattern: "tiger",
    colors: ["#8b8a5c", "#4d5232", "#1d1f17"],
    blurb: "Jungle brush strokes over olive drab.",
  },
  {
    id: "pixel",
    name: "Desert Pixel",
    kind: "premium",
    price: { NGN: 150000, USD: 149 },
    pattern: "pixel",
    colors: ["#c9b48a", "#a38b62", "#76664a", "#4f4636"],
    blurb: "Four-tone digital camo for the dust.",
  },
  {
    id: "carbon",
    name: "Carbon Weave",
    kind: "premium",
    price: { NGN: 200000, USD: 199 },
    pattern: "carbon",
    colors: ["#17191b", "#3a3f44"],
    blurb: "Woven carbon fibre under clear lacquer.",
  },
  {
    id: "damascus",
    name: "Damascus Steel",
    kind: "premium",
    price: { NGN: 250000, USD: 249 },
    pattern: "damascus",
    colors: ["#2b2e31", "#5f6468", "#999fa4"],
    blurb: "Folded-steel waves, etched and polished.",
  },
  {
    id: "haze",
    name: "Red Haze",
    kind: "premium",
    price: { NGN: 300000, USD: 299 },
    pattern: "haze",
    colors: ["#141213", "#3a1714", "#ff3b25"],
    glow: true,
    blurb: "Burnt black with glowing red fractures.",
  },
  {
    id: "signal",
    name: "Midnry Signal",
    kind: "pass",
    pattern: "signal",
    colors: ["#111214", "#d9a441"],
    blurb: "Black and gold. Included with Midnry Pass.",
  },
];

export const finishOf = (id) => FINISHES.find((f) => f.id === id) || FINISHES[0];

export const CURRENCIES = ["NGN", "USD"];

/** "₦1,500" / "$1.49" for an amount in kobo / cents. */
export const money = (amount, currency = "NGN") =>
  currency === "USD"
    ? `$${(amount / 100).toFixed(2)}`
    : `₦${Math.round(amount / 100).toLocaleString("en")}`;
export const naira = (kobo) => money(kobo, "NGN");

/** Naira for players in Nigeria (by time zone), dollars elsewhere. */
export function defaultCurrency() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === "Africa/Lagos" ? "NGN" : "USD";
  } catch {
    return "NGN";
  }
}

function seeded(seed) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Paint a tileable swatch (size × size). layer "glow" paints only what
 * should shine (black elsewhere); finishes without glow paint nothing. */
export function drawFinish(ctx, size, finish, layer = "base") {
  const f = typeof finish === "string" ? finishOf(finish) : finish,
    [a, b, c, d] = f.colors,
    rand = seeded(f.id.length * 977 + f.id.charCodeAt(0) * 31);
  const glow = layer === "glow";
  ctx.save();
  ctx.fillStyle = glow ? "#000" : a;
  ctx.fillRect(0, 0, size, size);
  // Every mark is drawn at 3 x 3 offsets so the swatch tiles seamlessly.
  const tiled = (draw) => {
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) draw(ox, oy);
  };
  if (f.pattern === "solid" && !glow) {
    for (let i = 0; i < size * 6; i++) {
      ctx.fillStyle = `rgba(${rand() > 0.5 ? "255,255,255" : "0,0,0"},${0.025 + rand() * 0.03})`;
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
    }
  } else if (f.pattern === "tiger" && !glow) {
    for (const [color, count, width] of [[b, 14, 0.07], [c, 18, 0.04]]) {
      ctx.fillStyle = color;
      for (let i = 0; i < count; i++) {
        const x = rand() * size,
          y = rand() * size,
          len = size * (0.25 + rand() * 0.35),
          w = size * width * (0.6 + rand() * 0.6),
          tilt = (rand() - 0.5) * 0.5;
        tiled((ox, oy) => {
          ctx.beginPath();
          ctx.moveTo(x + ox, y + oy);
          ctx.bezierCurveTo(
            x + ox + len * 0.3, y + oy - w + tilt * len,
            x + ox + len * 0.7, y + oy + w * 0.4 + tilt * len,
            x + ox + len, y + oy + tilt * len * 1.2,
          );
          ctx.bezierCurveTo(
            x + ox + len * 0.65, y + oy + w * 1.2 + tilt * len,
            x + ox + len * 0.3, y + oy + w * 0.8 + tilt * len * 0.3,
            x + ox, y + oy,
          );
          ctx.fill();
        });
      }
    }
  } else if (f.pattern === "pixel" && !glow) {
    const cell = size / 32;
    // Clusters: each colour grows a few blobs of square cells.
    for (const [color, blobs] of [[b, 22], [c, 16], [d, 10]]) {
      ctx.fillStyle = color;
      for (let k = 0; k < blobs; k++) {
        let x = Math.floor(rand() * 32),
          y = Math.floor(rand() * 32);
        for (let s = 0; s < 18; s++) {
          tiled((ox, oy) => ctx.fillRect(x * cell + ox, y * cell + oy, cell, cell));
          x = (x + Math.floor(rand() * 3) - 1 + 32) % 32;
          y = (y + Math.floor(rand() * 3) - 1 + 32) % 32;
        }
      }
    }
  } else if (f.pattern === "carbon" && !glow) {
    const n = 16,
      cell = size / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        // 2x2 twill: bundles alternate direction along a diagonal.
        const across = Math.floor((x + y) / 2) % 2 === 0;
        const g = across
          ? ctx.createLinearGradient(x * cell, 0, (x + 1) * cell, 0)
          : ctx.createLinearGradient(0, y * cell, 0, (y + 1) * cell);
        g.addColorStop(0, a);
        g.addColorStop(0.5, b);
        g.addColorStop(1, a);
        ctx.fillStyle = g;
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
  } else if (f.pattern === "damascus" && !glow) {
    // Folded-steel layers: contour lines of a warped field.
    const img = ctx.getImageData(0, 0, size, size),
      px = img.data,
      parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [ca, cb, cc] = [a, b, c].map(parse);
    const tau = Math.PI * 2;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const u = (x / size) * tau,
          v = (y / size) * tau;
        const field =
          Math.sin(v * 3 + Math.sin(u * 2) * 1.6 + Math.sin(u * 5 + v) * 0.5) +
          0.5 * Math.sin(u * 3 - v * 2);
        const band = Math.abs(Math.sin(field * 4.5));
        const t = band < 0.25 ? 0 : band < 0.75 ? 1 : 2,
          col = [ca, cb, cc][t];
        const i = (y * size + x) * 4;
        px[i] = col[0];
        px[i + 1] = col[1];
        px[i + 2] = col[2];
        px[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  } else if (f.pattern === "haze") {
    if (!glow) {
      // Burnt patches under the fractures.
      for (let i = 0; i < 40; i++) {
        const x = rand() * size,
          y = rand() * size,
          r = size * (0.04 + rand() * 0.1);
        tiled((ox, oy) => {
          const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          g.addColorStop(0, b);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        });
      }
    }
    // Fractures: branching random walks, bright on the glow layer.
    ctx.strokeStyle = glow ? c : "#7a1a12";
    ctx.lineCap = "round";
    for (let k = 0; k < 9; k++) {
      let x = rand() * size,
        y = rand() * size,
        angle = rand() * Math.PI * 2;
      ctx.lineWidth = size * (0.004 + rand() * 0.006);
      for (let s = 0; s < 26; s++) {
        const nx = x + Math.cos(angle) * size * 0.025,
          ny = y + Math.sin(angle) * size * 0.025;
        tiled((ox, oy) => {
          ctx.beginPath();
          ctx.moveTo(x + ox, y + oy);
          ctx.lineTo(nx + ox, ny + oy);
          ctx.stroke();
        });
        x = nx;
        y = ny;
        angle += (rand() - 0.5) * 1.2;
      }
    }
  } else if (f.pattern === "signal" && !glow) {
    // Gold chevrons on black, offset rows.
    ctx.strokeStyle = b;
    ctx.lineWidth = size * 0.018;
    const step = size / 6;
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 7; col++) {
        const x = col * step + (row % 2 ? step / 2 : 0),
          y = row * step;
        ctx.beginPath();
        ctx.moveTo(x - step * 0.28, y - step * 0.14);
        ctx.lineTo(x, y + step * 0.12);
        ctx.lineTo(x + step * 0.28, y - step * 0.14);
        ctx.stroke();
      }
  }
  ctx.restore();
}
