import { startSceneLoading, finishSceneLoading } from "./loading";
import { playerPainted } from "../systems/painted";
import { GAME_FONT } from "../ui/theme";
import * as Phaser from "phaser";
import { fullLook, stageOf } from "../systems/character";

const SEATS = /sofa|armchair|bench|chair|stool|dining|couch/;
import { blocked } from "../systems/citymap";
import { peopleOn, personKey } from "../systems/engine";
import { FURNITURE } from "../systems/furniture";
import { personLook } from "../systems/peoplelook";
import { LAYOUTS, ROOM, type RoomInfo } from "../systems/rooms";
import { bus, getState, input } from "../systems/store";
import type { MapRect } from "../systems/types";
import { INK, animateWalk, pose, figure, furnitureKey, makeArt, queueCharacters, queueFurniture, tileKey, type Figure } from "./art";

const SPEED = 200;
const RADIUS = 12;
const NEAR = 80;
const FURN_RES = 1.6;
/** Things that hang on the wall: drawn flat, nothing to bump into. */
const ON_WALL = new Set(["window", "picture", "clock", "blackboard", "whiteboard", "walldoor", "bathmirror", "wallshelf"]);

type Spot = { kind: "place" | "person" | "exit" | "door" | "item"; id: string; label: string; x: number; y: number };

/** Inside a building: a furnished room you can walk around, use, and leave by the door. */
export class RoomScene extends Phaser.Scene {
  private info!: RoomInfo;
  private player!: Figure;
  private solids: MapRect[] = [];
  private spots: Spot[] = [];
  private staff: { body: Figure; id: string; label: string }[] = [];
  private near: Spot | null = null;
  private seats: { x: number; y: number }[] = [];
  private stillSince = 0;
  private target: { x: number; y: number } | null = null;
  private keys!: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d" | "e" | "space", Phaser.Input.Keyboard.Key>;

  constructor() {
    super("room");
  }

  init(data: RoomInfo) {
    this.info = data;
    this.solids = [];
    this.seats = [];
    this.spots = [];
    this.staff = [];
    this.near = null;
    this.target = null;
  }

  private staffHere() {
    const state = getState();
    if (!state || !this.info.placeId) return [];
    return peopleOn(state, "city").filter((p) => p.place === this.info.placeId);
  }

  preload() {
    startSceneLoading(this, `Entering ${this.info.name}`);
    const layout = LAYOUTS[this.info.type];
    queueFurniture(this, layout.items);
    const state = getState();
    queueCharacters(this, [{ look: fullLook(state?.looks ?? {}), adult: (state?.age ?? 0) >= 18, stage: stageOf(state?.age ?? 0), painted: playerPainted(state) }, ...this.staffHere().map(personLook)]);
  }

  create() {
    makeArt(this);
    const layout = LAYOUTS[this.info.type];
    const { w: W, h: H, wall: WALL, door } = ROOM;
    this.cameras.main.setBackgroundColor("#0b1726");

    // Floor, back wall and a skirting board.
    const floorTile = layout.floor === "tile" ? "floor" : layout.floor;
    this.add.tileSprite(0, WALL, W, H - WALL, tileKey(floorTile)).setOrigin(0);
    const g = this.add.graphics();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(layout.wall).color, 1).fillRect(0, 0, W, WALL);
    g.fillStyle(0xffffff, 0.08);
    for (let x = 0; x < W; x += 32) g.fillRect(x, 0, 14, WALL);
    g.fillStyle(0x6b4426, 1).fillRect(0, WALL - 10, W, 10);
    g.lineStyle(2, INK, 1).lineBetween(0, WALL, W, WALL);
    // Walls around the room, with a doorway at the bottom.
    g.fillStyle(0x3b2a1f, 1).fillRect(-14, -14, 14, H + 28).fillRect(W, -14, 14, H + 28).fillRect(-14, -14, W + 28, 14);
    g.fillRect(-14, H - 10, door.x - 40 + 14, 24).fillRect(door.x + 40, H - 10, W - door.x - 40 + 14, 24);
    g.fillStyle(0x23624f, 1).fillRoundedRect(door.x - 34, H - 22, 68, 18, 5);
    g.lineStyle(2, INK, 1).strokeRoundedRect(door.x - 34, H - 22, 68, 18, 5);
    this.add
      .text(door.x, H - 13, this.info.parent ? "BACK" : "EXIT", { fontFamily: GAME_FONT, fontSize: "11px", fontStyle: "bold", color: "#f7edda" })
      .setResolution(2)
      .setOrigin(0.5)
      .setDepth(2);
    // A name plate on the wall.
    this.add
      .text(W / 2, WALL - 30, this.info.name, { fontFamily: GAME_FONT, fontSize: "13px", fontStyle: "bold", color: "#f7edda", backgroundColor: "#0b1f3d", padding: { x: 8, y: 3 } })
      .setResolution(2)
      .setOrigin(0.5, 0)
      .setDepth(3);

    // Furniture, sorted by where it meets the floor; the bottom of each is solid.
    for (const it of layout.items) {
      const def = FURNITURE[it.id]!;
      const img = this.add.image(it.x - 2, it.y - 2, furnitureKey(it.id, it.accent)).setOrigin(0).setScale(1 / FURN_RES);
      const bottom = it.y + def.h;
      img.setDepth(ON_WALL.has(it.id) ? 1 : it.id === "rug" ? 1.5 : 5 + bottom / 10000);
      if (def.foot && !ON_WALL.has(it.id)) this.solids.push({ x: it.x + 4, y: bottom - def.h * def.foot, w: def.w - 8, h: def.h * def.foot });
      // Somewhere to sit: just in front of seats.
      if (SEATS.test(it.id)) this.seats.push({ x: it.x + def.w / 2, y: bottom + 8 });
    }

    // The people who work here.
    const state = getState();
    const staffSpots = layout.staff;
    const here = staffSpots.length ? this.staffHere() : [];
    here.forEach((p, i) => {
      const at = staffSpots[i % staffSpots.length]!;
      // Two people at one spot stand apart so their names don't overlap.
      const sharing = here.filter((_, j) => j % staffSpots.length === i % staffSpots.length).length;
      const slot = Math.floor(i / staffSpots.length);
      const x = at.x + (slot - (sharing - 1) / 2) * 190;
      const body = figure(this, x, at.y, personLook(p), { name: p.name, unit: 0.28 }).setDepth(5 + at.y / 10000);
      const bubble = this.add.text(14, body.headTop - 4, "💬", { fontSize: "16px" });
      body.add(bubble);
      this.tweens.add({ targets: bubble, y: body.headTop - 10, duration: 800, yoyo: true, repeat: -1 });
      this.staff.push({ body, id: personKey(p), label: p.name });
    });

    // Spots to use: the place's desk or bed, things to do, doors to other rooms, and the way out.
    const ring = (x: number, y: number) => this.add.circle(x, y, 24, 0x70d3ad, 0.18).setStrokeStyle(3, 0x70d3ad, 0.8).setDepth(1.6);
    if (layout.use && this.info.placeId) {
      this.spots.push({ kind: "place", id: this.info.placeId, label: layout.use.label, x: layout.use.x, y: layout.use.y });
      ring(layout.use.x, layout.use.y);
    }
    for (const spot of layout.spots ?? []) {
      this.spots.push({ kind: "item", id: spot.action, label: spot.label, x: spot.x, y: spot.y });
      ring(spot.x, spot.y);
    }
    for (const d of layout.doors ?? []) {
      this.spots.push({ kind: "door", id: `room:${d.to}`, label: d.label, x: d.x, y: WALL + 26 });
      this.add
        .text(d.x, 66, d.label, { fontFamily: GAME_FONT, fontSize: "11px", fontStyle: "bold", color: "#f7edda", backgroundColor: "#0b1f3d", padding: { x: 5, y: 2 } })
        .setResolution(2)
        .setOrigin(0.5, 0)
        .setDepth(3);
    }
    this.spots.push({ kind: "exit", id: "door", label: this.info.parent ? "Back to the living room" : "Leave", x: door.x, y: door.y });

    // You come in at the door.
    this.player = figure(this, door.x, door.y - 30, { look: fullLook(state?.looks ?? {}), adult: (state?.age ?? 0) >= 18, stage: stageOf(state?.age ?? 0), painted: playerPainted(state) }, { name: "YOU", nameColor: "#60a5fa", unit: 0.28 });
    // Coming in through the door.
    pose(this.player, "exit", this.time.now, 600);

    this.fit();
    this.aim(1);
    this.scale.on("resize", this.fit, this);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({ up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT", w: "W", a: "A", s: "S", d: "D", e: "E", space: "SPACE" }) as typeof this.keys;
    kb.disableGlobalCapture();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (input.controls === "tap") this.target = { x: p.worldX, y: p.worldY };
    });
    this.events.once("shutdown", () => {
      this.scale.off("resize", this.fit, this);
      bus.emit("near", null);
    });
    bus.emit("near", null);
    bus.emit("roomReady", null);
    finishSceneLoading(this);
    // Development only: lets automated browser tests move the player.
    if (import.meta.env.DEV) (window as unknown as { __room?: unknown }).__room = { place: (x: number, y: number) => this.player.setPosition(x, y) };
  }

  /** Follow you, but keep the room centred on any side where it fits on screen. */
  private aim(ease: number) {
    const cam = this.cameras.main;
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;
    const { w, h } = ROOM;
    const tx = vw >= w + 40 ? w / 2 : Phaser.Math.Clamp(this.player.x, vw / 2 - 20, w + 20 - vw / 2);
    const ty = vh >= h + 40 ? h / 2 : Phaser.Math.Clamp(this.player.y, vh / 2 - 20, h + 20 - vh / 2);
    const cx = cam.midPoint.x + (tx - cam.midPoint.x) * ease;
    const cy = cam.midPoint.y + (ty - cam.midPoint.y) * ease;
    cam.centerOn(cx, cy);
  }

  /** The whole room on a computer; up close on a phone, following you around. */
  private fit() {
    const { width, height } = this.scale;
    const fitAll = Math.min(width / (ROOM.w + 40), height / (ROOM.h + 40));
    this.cameras.main.setZoom(Phaser.Math.Clamp(Math.min(width, height) < 520 ? Math.max(fitAll, 1.05) : fitAll, 0.6, 1.8));
  }

  private free(x: number, y: number) {
    const { w, h, wall } = ROOM;
    if (x < RADIUS + 4 || x > w - RADIUS - 4 || y < wall + 18 || y > h - 22) return false;
    return !blocked(x, y, RADIUS, this.solids);
  }

  update(time: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    if (input.paused || !getState()) return;
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
    const fromX = this.player.x;
    const fromY = this.player.y;
    if (vx || vy) {
      const nx = fromX + vx * SPEED * dt;
      const ny = fromY + vy * SPEED * dt;
      if (this.free(nx, ny)) this.player.setPosition(nx, ny);
      else if (this.free(nx, fromY)) this.player.setX(nx);
      else if (this.free(fromX, ny)) this.player.setY(ny);
      else this.target = null;
    }
    const moved = this.player.x !== fromX || this.player.y !== fromY;
    // Stand still by a seat for a moment and you sit down.
    if (moved) this.stillSince = time;
    else if (time - this.stillSince > 1500 && this.player.action?.motion !== "sit" && this.seats.some((p) => Math.hypot(p.x - this.player.x, p.y - this.player.y) < 46)) pose(this.player, "sit", time, 1e9);
    animateWalk(this.player, time, moved, this.player.x - fromX, this.player.y - fromY);
    this.player.setDepth(5 + this.player.y / 10000 + 0.5);
    this.aim(0.15);
    for (const s of this.staff) animateWalk(s.body, time, false, 0);

    // What's close enough to use?
    const options: Spot[] = [...this.spots, ...this.staff.map((s) => ({ kind: "person" as const, id: s.id, label: s.label, x: s.body.x, y: s.body.y }))];
    let best: Spot | null = null;
    let bestDist = NEAR;
    for (const o of options) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, o.x, o.y);
      if (d < bestDist) {
        best = o;
        bestDist = d;
      }
    }
    if ((best?.id ?? null) !== (this.near?.id ?? null)) {
      this.near = best;
      bus.emit("near", best ? { kind: best.kind, id: best.id, label: best.label } : null);
    }
    if (Phaser.Input.Keyboard.JustDown(k.e) || Phaser.Input.Keyboard.JustDown(k.space) || input.interact) {
      input.interact = false;
      if (this.near) {
        pose(this.player, this.near.kind === "person" ? "wave" : "interact", time, 800);
        bus.emit("interact", { kind: this.near.kind, id: this.near.id, label: this.near.label });
      }
    }
  }
}
