import * as Phaser from "phaser";
import { DISTRICTS, PLACES, WORLD, districtAt } from "../systems/data";
import { HAIR_COLOR } from "../systems/art";
import { savePosition } from "../systems/engine";
import { check } from "../systems/rules";
import { bus, getState, input } from "../systems/store";

const SPEED = 230;
const NEAR = 115;

/**
 * The open-world map of Abuja. Placeholder shapes for now: every visual is a
 * generated texture keyed in createTextures(), so real sprites can replace them.
 */
export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private keys!: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d" | "e" | "space", Phaser.Input.Keyboard.Key>;
  private target: Phaser.Math.Vector2 | null = null;
  private nearId: string | null = null;
  private lastSave = 0;
  private lastBlocked = 0;
  private lastSafe = new Phaser.Math.Vector2();
  private placeMarkers: { id: string; marker: Phaser.GameObjects.Container }[] = [];
  private walkers: { sprite: Phaser.GameObjects.Arc; vx: number; vy: number; d: (typeof DISTRICTS)[number] }[] = [];
  private offs: (() => void)[] = [];

  constructor() {
    super("world");
  }

  create() {
    const state = getState();
    this.cameras.main.setBackgroundColor("#1b1712");
    this.drawCity();
    this.drawPlaces();
    this.spawnWalkers();

    const start = state?.pos.x ? state.pos : { x: PLACES[0]!.x, y: PLACES[0]!.y + 60 };
    this.player = this.makePlayer(start.x, start.y);
    this.lastSafe.set(start.x, start.y);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.fitZoom();
    this.scale.on("resize", () => this.fitZoom());

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT", w: "W", a: "A", s: "S", d: "D", e: "E", space: "SPACE",
    }) as typeof this.keys;
    kb.disableGlobalCapture();

    // Tap or click on the map to walk there.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });

    this.offs.push(
      bus.on("teleport", ({ x, y }) => {
        this.player.setPosition(x, y);
        this.lastSafe.set(x, y);
        this.target = null;
        this.refreshPlaces();
      }),
    );
    this.events.once("shutdown", () => this.offs.forEach((off) => off()));
  }

  private fitZoom() {
    const { width, height } = this.scale;
    const zoom = Math.min(width, height) < 520 ? 0.75 : Math.min(width, height) < 800 ? 0.9 : 1;
    this.cameras.main.setZoom(zoom);
  }

  private drawCity() {
    const g = this.add.graphics();
    for (const d of DISTRICTS) {
      const color = Phaser.Display.Color.HexStringToColor(d.color).color;
      g.fillStyle(color, d.gate ? 0.32 : 0.22).fillRect(d.x, d.y, d.w, d.h);
      g.lineStyle(2, color, 0.7).strokeRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2);
      // Simple blocks so districts feel built up.
      g.fillStyle(0xffffff, 0.04);
      for (let bx = d.x + 40; bx < d.x + d.w - 60; bx += 110) {
        for (let by = d.y + 70; by < d.y + d.h - 60; by += 110) g.fillRoundedRect(bx, by, 70, 60, 8);
      }
      this.add
        .text(d.x + 18, d.y + 14, `${d.name}${d.gate ? "  🔒" : ""}`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "22px",
          fontStyle: "bold",
          color: "#fde68a",
        })
        .setAlpha(0.85);
    }
    // Main roads along district edges.
    g.fillStyle(0x3a352f, 1);
    const xs = [500, 800, 1000, 1500, 1600];
    const ys = [500, 600, 1000, 1100];
    xs.forEach((x) => g.fillRect(x - 12, 0, 24, WORLD.height));
    ys.forEach((y) => g.fillRect(0, y - 12, WORLD.width, 24));
    g.fillStyle(0xfacc15, 0.5);
    xs.forEach((x) => {
      for (let y = 0; y < WORLD.height; y += 40) g.fillRect(x - 1, y, 2, 20);
    });
    ys.forEach((y) => {
      for (let x = 0; x < WORLD.width; x += 40) g.fillRect(x, y - 1, 20, 2);
    });
  }

  private drawPlaces() {
    for (const p of PLACES) {
      const color = Phaser.Display.Color.HexStringToColor(p.color).color;
      const ring = this.add.circle(0, 0, 30, color, 0.18).setStrokeStyle(2, color, 0.9);
      const dot = this.add.circle(0, 0, 14, color, 1);
      const label = this.add
        .text(0, 38, p.name, { fontFamily: "system-ui, sans-serif", fontSize: "15px", color: "#fafaf9", backgroundColor: "#00000088", padding: { x: 6, y: 3 } })
        .setOrigin(0.5, 0);
      const marker = this.add.container(p.x, p.y, [ring, dot, label]);
      this.tweens.add({ targets: ring, scale: 1.25, alpha: 0.4, duration: 1100, yoyo: true, repeat: -1 });
      this.placeMarkers.push({ id: p.id, marker });
    }
    this.refreshPlaces();
  }

  private refreshPlaces() {
    const state = getState();
    if (!state) return;
    for (const { id, marker } of this.placeMarkers) {
      const def = PLACES.find((p) => p.id === id);
      marker.setVisible(check(state, (def as { if?: never })?.if));
    }
  }

  private spawnWalkers() {
    const tones = [0xf59e0b, 0x22c55e, 0x60a5fa, 0xf472b6, 0xa78bfa, 0xfacc15, 0xe5e7eb];
    for (const d of DISTRICTS) {
      const count = d.gate ? 2 : 4;
      for (let i = 0; i < count; i += 1) {
        const sprite = this.add.circle(
          d.x + 40 + Math.random() * (d.w - 80),
          d.y + 60 + Math.random() * (d.h - 100),
          8,
          tones[Math.floor(Math.random() * tones.length)]!,
          0.85,
        );
        this.walkers.push({ sprite, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, d });
      }
    }
  }

  private makePlayer(x: number, y: number) {
    const state = getState();
    const outfit = Phaser.Display.Color.HexStringToColor(state?.looks.outfit ?? "#1d4ed8").color;
    const skin = Phaser.Display.Color.HexStringToColor(state?.looks.skin ?? "#8d5524").color;
    const shadow = this.add.ellipse(0, 20, 34, 10, 0x000000, 0.35);
    const body = this.add.circle(0, 8, 16, outfit);
    const head = this.add.circle(0, -12, 11, skin);
    const hair = this.add.arc(0, -15, 11, 180, 360, false, Phaser.Display.Color.HexStringToColor(HAIR_COLOR).color);
    const halo = this.add.circle(0, 0, 30, 0xfbbf24, 0.18).setStrokeStyle(3, 0xfbbf24, 0.9);
    const me = this.add
      .text(0, -46, "YOU", { fontFamily: "system-ui", fontSize: "14px", fontStyle: "bold", color: "#14110f", backgroundColor: "#fbbf24", padding: { x: 5, y: 2 } })
      .setOrigin(0.5);
    this.tweens.add({ targets: halo, scale: 1.15, duration: 700, yoyo: true, repeat: -1 });
    return this.add.container(x, y, [halo, shadow, body, head, hair, me]).setDepth(10).setScale(1.25);
  }

  update(_time: number, deltaMs: number) {
    const dt = deltaMs / 1000;
    const state = getState();
    if (!state || state.event || state.ending) return;

    let vx = input.x;
    let vy = input.y;
    const k = this.keys;
    if (k.left.isDown || k.a.isDown) vx -= 1;
    if (k.right.isDown || k.d.isDown) vx += 1;
    if (k.up.isDown || k.w.isDown) vy -= 1;
    if (k.down.isDown || k.s.isDown) vy += 1;
    if (vx || vy) this.target = null;
    else if (this.target) {
      const dx = this.target.x - this.player.x;
      const dy = this.target.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) this.target = null;
      else {
        vx = dx / dist;
        vy = dy / dist;
      }
    }
    const len = Math.hypot(vx, vy);
    if (len > 1) {
      vx /= len;
      vy /= len;
    }
    if (vx || vy) {
      const nx = Phaser.Math.Clamp(this.player.x + vx * SPEED * dt, 10, WORLD.width - 10);
      const ny = Phaser.Math.Clamp(this.player.y + vy * SPEED * dt, 10, WORLD.height - 10);
      const d = districtAt(nx, ny);
      if (d?.gate && !check(state, d.gate.if)) {
        this.player.setPosition(this.lastSafe.x, this.lastSafe.y);
        this.target = null;
        if (_time - this.lastBlocked > 2500) {
          this.lastBlocked = _time;
          bus.emit("blocked", d.gate.message);
        }
      } else {
        this.player.setPosition(nx, ny);
        this.lastSafe.set(nx, ny);
      }
      if (_time - this.lastSave > 2000) {
        this.lastSave = _time;
        savePosition(this.player.x, this.player.y, districtAt(this.player.x, this.player.y)?.id ?? state.district);
      }
    }

    // Who's near?
    let best: string | null = null;
    let bestDist = NEAR;
    for (const { id, marker } of this.placeMarkers) {
      if (!marker.visible) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, marker.x, marker.y);
      if (dist < bestDist) {
        best = id;
        bestDist = dist;
      }
    }
    if (best !== this.nearId) {
      this.nearId = best;
      bus.emit("near", best);
    }
    if (Phaser.Input.Keyboard.JustDown(k.e) || Phaser.Input.Keyboard.JustDown(k.space) || input.interact) {
      input.interact = false;
      if (this.nearId) bus.emit("near", this.nearId);
    }

    for (const w of this.walkers) {
      w.sprite.x += w.vx * dt;
      w.sprite.y += w.vy * dt;
      if (w.sprite.x < w.d.x + 20 || w.sprite.x > w.d.x + w.d.w - 20) w.vx *= -1;
      if (w.sprite.y < w.d.y + 40 || w.sprite.y > w.d.y + w.d.h - 20) w.vy *= -1;
      if (Math.random() < 0.005) {
        w.vx = (Math.random() - 0.5) * 60;
        w.vy = (Math.random() - 0.5) * 60;
      }
    }
  }

  /** Called by the UI when state changes that affect the map, such as unlocking a place. */
  sync() {
    this.refreshPlaces();
  }
}

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#1b1712",
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    render: { antialias: true },
    scene: [WorldScene],
    input: { keyboard: true, touch: true },
  });
}
