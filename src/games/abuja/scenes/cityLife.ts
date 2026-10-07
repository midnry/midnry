import { crowdPainted } from "../systems/painted";
import { GAME_FONT } from "../ui/theme";
import * as Phaser from "phaser";
import { blocked, freePoint } from "../systems/citymap";
import { findPath, type Point } from "../systems/path";
import { building } from "../systems/city/catalog";
import { BEAT_MS, ageOn, citizens, crowdIndex, doing, isOut, lookOf, planFor, rng, type Activity, type Citizen } from "../systems/city/citizens";
import { RAIL, ROADS, lotDoor, type Lot } from "../systems/city/layout";
import { FLEET } from "../systems/vehicles";
import type { GameState, MapRect } from "../systems/types";
import { animateWalk, characterReady, faceVehicle, figure, loadCharacters, pose, vehicle, type Figure, type Person, type Vehicle } from "./art";

// The city's people on screen. Everyone in `citizens()` follows their own day
// all the time, but only as a line of data: where they mean to be. When that
// changes near the camera, someone steps out of a door, walks the streets
// (or gets off a bus), and goes in at the other end. Far from the camera
// nothing is drawn or routed, so the city can hold thousands of people.

/** Most people drawn at once (fewer on small screens). */
const MAX_DESKTOP = 26;
const MAX_PHONE = 16;
/** Looks per life stage and gender: people share a handful of outfits, so textures stay few. */
const VARIANTS = 6;
/** Trips longer than this go by bus. */
const BUS_TRIP = 950;

type Agent = {
  c: Citizen;
  fig: Figure;
  path: Point[];
  phase: "out" | "walk" | "in" | "wait" | "sit" | "pause";
  until: number;
  speed: number;
  to: string;
  activity: Activity;
  /** Where the walk ends: a door, a bus stop or a bench. */
  end: "door" | "bus" | "seat" | "park";
  greeted: number;
};

type Service = { v: Vehicle; light?: Phaser.GameObjects.Arc; axis: "x" | "y"; speed: number; stopAt: number; stopped: number; stopMs: number; parcel?: Phaser.GameObjects.Text; done: boolean };

const crowdPeople = new Map<string, Person>();

/** The look someone gets on the street: one of a few for their age and gender. */
function personFor(c: Citizen, day: number): Person {
  const { stage } = lookOf(c, day);
  const key = `${stage}-${c.gender}-${crowdIndex(c) % VARIANTS}`;
  let p = crowdPeople.get(key);
  if (!p) {
    const v = crowdIndex(c) % VARIANTS;
    const seed = (v + 1) * 7919 + (c.gender === "male" ? 0 : 3) + stage.length * 101;
    const age = { child: 8, teen: 15, young: 24, adult: 40, senior: 70 }[stage];
    const rep = lookOf({ ...c, seed, age }, 0);
    // Painted passers-by where there's art for this age and gender; drawn otherwise.
    p = { look: rep.look, adult: stage !== "child" && stage !== "teen", stage, painted: crowdPainted(c.gender, stage, v) };
    crowdPeople.set(key, p);
  }
  return p;
}

/** A few common looks to load with the scene so the street isn't empty at first. */
export function crowdStarters(day: number): Person[] {
  const out: Person[] = [];
  for (const c of citizens()) {
    const p = personFor(c, day);
    if (!out.includes(p)) out.push(p);
    if (out.length >= 8) break;
  }
  return out;
}

export class CityLife {
  private agents: Agent[] = [];
  private services: Service[] = [];
  private where = new Map<string, string>();
  private clock = "";
  private queue: { c: Citizen; from: string; to: string; activity: Activity; at: number }[] = [];
  private loading = false;
  private wanted = new Set<Person>();
  private nextThink = 0;
  private nextService = 0;
  private tag: Phaser.GameObjects.Container;
  private tagText: Phaser.GameObjects.Text;
  private tagBox: Phaser.GameObjects.Graphics;
  private lotById: Map<string, Lot>;
  private free: (x: number, y: number) => boolean;
  private max: number;
  private day = 0;

  constructor(
    private scene: Phaser.Scene,
    private lots: Lot[],
    private solids: MapRect[],
    private stops: Point[],
    private seats: Point[],
    private size: { width: number; height: number },
  ) {
    this.lotById = new Map(lots.map((l) => [l.id, l]));
    this.free = (x, y) => x > 8 && y > 8 && x < size.width - 8 && y < size.height - 8 && !blocked(x, y, 6, solids);
    this.max = Math.min(scene.scale.width, scene.scale.height) < 600 ? MAX_PHONE : MAX_DESKTOP;
    // The train brings people in too.
    this.stops = [...stops, freePoint(RAIL.station.x, RAIL.station.y - 40, solids)];
    // A name card in the same rounded style as the other names on the map.
    this.tagText = scene.add
      .text(0, 0, "", { fontFamily: GAME_FONT, fontSize: "9px", fontStyle: "800", color: "#ffffff", align: "center", lineSpacing: 1 })
      .setOrigin(0.5)
      .setResolution(3);
    this.tagBox = scene.add.graphics();
    this.tag = scene.add.container(0, 0, [this.tagBox, this.tagText]).setDepth(28).setVisible(false);
  }

  /** How many people are on screen, for tests. */
  get count() {
    return this.agents.length;
  }

  /** Where they are, for tests. */
  get positions() {
    return this.agents.map((a) => ({ x: Math.round(a.fig.x), y: Math.round(a.fig.y), phase: a.phase }));
  }

  update(time: number, dt: number, state: GameState, player: Point) {
    const view = this.view(260);
    if (time >= this.nextThink) {
      this.nextThink = time + 600;
      this.think(time, state, view);
    }
    this.moveAgents(time, dt, view, player);
    this.moveServices(time, dt, state);
  }

  private view(pad: number) {
    const v = this.scene.cameras.main.worldView;
    return new Phaser.Geom.Rectangle(v.x - pad, v.y - pad, v.width + pad * 2, v.height + pad * 2);
  }

  private nearView(id: string, view: Phaser.Geom.Rectangle, pad = 300) {
    const l = this.lotById.get(id);
    if (!l) return false;
    const d = lotDoor(l);
    return d.x > view.x - pad && d.x < view.right + pad && d.y > view.y - pad && d.y < view.bottom + pad;
  }

  /** Every so often: who changes plans, who should appear, who's waiting to set off. */
  private think(time: number, state: GameState, view: Phaser.Geom.Rectangle) {
    const day = state.day;
    this.day = day;
    const slot = Math.min(3, state.slot);
    const beat = Math.floor(time / BEAT_MS);
    const clock = `${day}:${slot}:${beat}`;
    const people = citizens();
    if (clock !== this.clock) {
      const first = !this.clock;
      this.clock = clock;
      // A rush hour when the time of day moves on; just a trickle between beats.
      for (const c of people) {
        const plan = planFor(c, day, slot, beat);
        const before = this.where.get(c.id);
        this.where.set(c.id, plan.lot);
        if (first || before === undefined || before === plan.lot) continue;
        if (!this.nearView(before, view) && !this.nearView(plan.lot, view)) continue;
        if (this.agents.some((a) => a.c === c)) continue;
        this.queue.push({ c, from: before, to: plan.lot, activity: plan.activity, at: time + Math.random() * 14_000 });
      }
      this.queue.sort((a, b) => a.at - b.at);
      if (this.queue.length > 80) this.queue.length = 80;
    }
    // Keep the streets alive: someone near the camera pops out to the shop or the park.
    const night = slot >= 3;
    const floor = night ? 3 : Math.round(this.max * 0.6);
    if (this.agents.length + this.queue.filter((q) => q.at < time + 3000).length < floor) {
      const r = rng(Math.floor(time));
      const here = this.lots.filter((l) => this.nearView(l.id, view, 0));
      const homes = here.filter((l) => building(l.def)?.category === "residential" || building(l.def)?.jobs);
      const local = people.filter((c) => {
        const at = this.where.get(c.id);
        return at && !isOut(at) && homes.some((l) => l.id === at) && !this.agents.some((a) => a.c === c);
      });
      const targets = here.filter((l) => {
        const cat = building(l.def)?.category;
        return cat === "commercial" || cat === "park" || cat === "civic" || cat === "landmark";
      });
      if (local.length && targets.length && !night) {
        const c = local[Math.floor(r() * local.length)]!;
        const to = targets[Math.floor(r() * targets.length)]!;
        const cat = building(to.def)!.category;
        const activity: Activity = cat === "park" ? "park" : cat === "commercial" ? "shopping" : "errand";
        this.queue.unshift({ c, from: this.where.get(c.id)!, to: to.id, activity, at: time });
        this.where.set(c.id, to.id);
      } else if (!night && this.stops.length) {
        // Or someone gets off the bus on the way somewhere.
        const c = people[Math.floor(r() * people.length)]!;
        const to = targets[Math.floor(r() * targets.length)] ?? here[0];
        if (to && !this.agents.some((a) => a.c === c)) this.queue.unshift({ c, from: "out:bus", to: to.id, activity: "errand", at: time });
      }
    }
    // Set off whoever's due, as long as there's room on screen.
    let routed = 0;
    while (this.queue.length && this.queue[0]!.at <= time && this.agents.length < this.max && routed < 3) {
      const trip = this.queue.shift()!;
      if (this.spawn(trip, state.day, time, this.view(-30))) routed += 1;
    }
    this.loadWanted();
  }

  private loadWanted() {
    if (this.loading || !this.wanted.size) return;
    const batch = [...this.wanted].slice(0, 4);
    this.loading = true;
    loadCharacters(this.scene, batch, () => {
      this.loading = false;
      batch.forEach((p) => this.wanted.delete(p));
    });
  }

  private nearestStop(p: Point) {
    let best = this.stops[0]!;
    for (const s of this.stops) if (Math.hypot(s.x - p.x, s.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y)) best = s;
    return best;
  }

  /** Put someone on the street for a trip. Returns false if they can't go yet. */
  private spawn(trip: { c: Citizen; from: string; to: string; activity: Activity }, day: number, time: number, view: Phaser.Geom.Rectangle): boolean {
    const person = personFor(trip.c, day);
    if (!characterReady(this.scene, person)) {
      this.wanted.add(person);
      // Try again in a moment, once their clothes are drawn.
      this.queue.push({ ...trip, at: time + 1500 });
      return false;
    }
    const fromLot = this.lotById.get(trip.from);
    const toLot = this.lotById.get(trip.to);
    const fromDoor = fromLot ? lotDoor(fromLot) : null;
    const toDoor = toLot ? lotDoor(toLot) : null;
    const inView = (p: Point | null) => Boolean(p && view.contains(p.x, p.y));
    // Where they appear: their door, or a bus stop if they come from far away.
    let start: Point;
    let fromBus = false;
    if (fromDoor && (inView(fromDoor) || !toDoor || Math.hypot(fromDoor.x - toDoor.x, fromDoor.y - toDoor.y) < BUS_TRIP)) start = fromDoor;
    else if (toDoor) {
      start = this.nearestStop(toDoor);
      fromBus = true;
    } else return false;
    // Where they go: the door, a park bench, or a bus stop if it's far.
    let goal: Point;
    let end: Agent["end"] = "door";
    const def = toLot ? building(toLot.def) : undefined;
    if (toLot && def?.category === "park") {
      const seat = this.seats.find((s) => s.x > toLot.x && s.x < toLot.x + toLot.w && s.y > toLot.y && s.y < toLot.y + toLot.h + 20 && !this.agents.some((a) => a.end === "seat" && a.path.at(-1) === s));
      const r = rng(trip.c.seed + time);
      goal = seat ?? freePoint(toLot.x + toLot.w * (0.25 + r() * 0.5), toLot.y + toLot.h * (0.45 + r() * 0.4), this.solids);
      end = seat ? "seat" : "park";
    } else if (toDoor && (inView(toDoor) || Math.hypot(toDoor.x - start.x, toDoor.y - start.y) < BUS_TRIP)) goal = toDoor;
    else {
      goal = this.nearestStop(start);
      end = "bus";
    }
    if (fromBus && end === "bus") return false;
    if (!inView(start) && !inView(goal)) return false;
    const route = findPath(start, goal, this.size.width, this.size.height, this.free, 20);
    if (!route) return false;
    const fig = figure(this.scene, start.x, start.y, person, { unit: 0.17 });
    fig.setAlpha(0).setDepth(5 + start.y / 10000);
    this.scene.tweens.add({ targets: fig, alpha: 1, duration: 450 });
    pose(fig, fromBus ? "idle" : "exit", time, 450);
    const r = rng(trip.c.seed);
    const kid = person.stage === "child";
    this.agents.push({
      c: trip.c,
      fig,
      path: route,
      phase: "out",
      until: time + 450,
      speed: (kid ? 58 : person.stage === "senior" ? 34 : 44) + r() * 16,
      to: trip.to,
      activity: trip.activity,
      end,
      greeted: 0,
    });
    return true;
  }

  private release(a: Agent) {
    this.scene.tweens.add({ targets: a.fig, alpha: 0, duration: 380, onComplete: () => a.fig.destroy() });
    this.agents = this.agents.filter((x) => x !== a);
  }

  private moveAgents(time: number, dt: number, view: Phaser.Geom.Rectangle, player: Point) {
    let closest: { a: Agent; d: number } | null = null;
    for (const a of [...this.agents]) {
      const f = a.fig;
      // Wandered off screen: back to being a line of data.
      if (!view.contains(f.x, f.y)) {
        a.fig.destroy();
        this.agents = this.agents.filter((x) => x !== a);
        continue;
      }
      const d = Math.hypot(f.x - player.x, f.y - player.y);
      if (d < 60 && (!closest || d < closest.d)) closest = { a, d };
      if (a.phase === "out" || a.phase === "pause") {
        animateWalk(f, time, false, 0);
        if (time >= a.until) a.phase = "walk";
        continue;
      }
      if (a.phase === "wait") {
        animateWalk(f, time, false, 0);
        // The bus comes: on they get.
        if (time >= a.until) this.release(a);
        continue;
      }
      if (a.phase === "sit") {
        if (time >= a.until) this.release(a);
        continue;
      }
      if (a.phase === "in") continue;
      const next = a.path[0];
      if (!next) {
        this.arrive(a, time);
        continue;
      }
      const dx = next.x - f.x;
      const dy = next.y - f.y;
      const dist = Math.hypot(dx, dy);
      const step = a.speed * dt;
      if (dist <= step) {
        f.setPosition(next.x, next.y);
        a.path.shift();
      } else f.setPosition(f.x + (dx / dist) * step, f.y + (dy / dist) * step);
      f.setDepth(5 + f.y / 10000);
      animateWalk(f, time, true, dx, dy);
      // Neighbours stop to say hello now and then.
      if (time > a.greeted) {
        const other = this.agents.find((o) => o !== a && o.phase === "walk" && time > o.greeted && Math.hypot(o.fig.x - f.x, o.fig.y - f.y) < 26);
        if (other) {
          a.greeted = other.greeted = time + 20_000;
          if ((a.c.seed + other.c.seed) % 3 === 0) {
            for (const x of [a, other]) {
              x.phase = "pause";
              x.until = time + 1000;
              pose(x.fig, "wave", time, 1000);
            }
          }
        } else if (d < 70 && a.c.trait === "social") {
          a.greeted = time + 30_000;
          a.phase = "pause";
          a.until = time + 1100;
          pose(f, "wave", time, 1100);
        }
      }
    }
    // Who's that? A name tag on whoever's right next to you.
    if (closest) {
      const { a } = closest;
      const verb = a.end === "bus" ? "catching a bus" : a.phase === "sit" ? "taking a break" : `off ${doing(a.c, { activity: a.activity, lot: a.to }).replace(/^at the |^at /, "to ").replace("to home", "home")}`;
      const age = ageOn(a.c, this.day);
      const text = `${a.c.name}, ${age} · ${a.c.occupation}\n${verb}`;
      if (this.tagText.text !== text) {
        this.tagText.setText(text);
        const w = this.tagText.width + 14;
        const h = this.tagText.height + 8;
        this.tagBox.clear();
        this.tagBox.fillStyle(0x000000, 0.22).fillRoundedRect(-w / 2, -h / 2 + 2, w, h, 9);
        this.tagBox.fillStyle(0x141b2d, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, 9);
        this.tagBox.lineStyle(1, 0xffffff, 0.14).strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
      }
      // Standing right beside you: lift the card clear of your YOU tag.
      const lift = Math.abs(a.fig.x - player.x) < 80 ? 34 : 0;
      this.tag.setPosition(a.fig.x, Math.min(a.fig.y, player.y) + a.fig.headTop - this.tagText.height / 2 - 10 - lift).setVisible(true);
    } else this.tag.setVisible(false);
  }

  private arrive(a: Agent, time: number) {
    const f = a.fig;
    if (a.end === "bus") {
      a.phase = "wait";
      a.until = time + 3000 + Math.random() * 4000;
      return;
    }
    if (a.end === "seat") {
      a.phase = "sit";
      a.until = time + 14_000 + Math.random() * 14_000;
      pose(f, "sit", time, 1e9);
      return;
    }
    if (a.end === "park") {
      a.phase = "sit";
      a.until = time + 6000 + Math.random() * 8000;
      pose(f, a.c.age < 13 ? "celebrate" : "idle", time, a.c.age < 13 ? 1400 : 1e9);
      return;
    }
    a.phase = "in";
    pose(f, "enter", time, 450);
    this.release(a);
  }

  // ── Deliveries and emergencies ─────────────────────────────────────────────

  /** Now and then a van pulls up at a shop, or an ambulance heads out on a call. */
  private moveServices(time: number, dt: number, state: GameState) {
    if (time >= this.nextService && this.services.length < 2) {
      this.nextService = time + 9000 + Math.random() * 9000;
      this.dispatch(state);
    }
    for (const s of this.services) {
      const pos = s.axis === "x" ? s.v.x : s.v.y;
      if (s.stopped) {
        if (time - s.stopped > s.stopMs) {
          s.stopped = -1;
          s.parcel?.destroy();
        }
      } else if (s.stopped === 0 && Math.abs(pos - s.stopAt) < Math.abs(s.speed * dt) + 1) {
        s.stopped = time;
        if (s.parcel) this.scene.tweens.add({ targets: s.parcel, y: s.parcel.y - 14, alpha: 0, delay: 800, duration: 1600 });
      }
      if (s.stopped <= 0) {
        if (s.axis === "x") s.v.x += s.speed * dt;
        else s.v.y += s.speed * dt;
        s.parcel?.setPosition(s.v.x, s.v.y - 30);
      }
      s.v.setDepth(5 + s.v.y / 10000);
      if (s.light) {
        s.light.setPosition(s.v.x, s.v.y - 34).setDepth(s.v.depth + 0.001);
        s.light.setFillStyle(Math.floor(time / 220) % 2 ? 0xef4444 : 0x3b82f6);
      }
      const max = s.axis === "x" ? this.size.width : this.size.height;
      if ((s.axis === "x" ? s.v.x : s.v.y) < -80 || (s.axis === "x" ? s.v.x : s.v.y) > max + 80) s.done = true;
    }
    for (const s of this.services.filter((x) => x.done)) {
      s.v.destroy();
      s.light?.destroy();
      s.parcel?.destroy();
    }
    this.services = this.services.filter((x) => !x.done);
  }

  private dispatch(state: GameState) {
    const view = this.view(0);
    const here = this.lots.filter((l) => this.nearView(l.id, view, 0));
    const slot = Math.min(3, state.slot);
    const r = Math.random();
    const emergency = here.find((l) => l.def === "hospital_bld" || l.def === "fire_station" || l.def === "police");
    let lot: Lot | undefined;
    let style = FLEET.find((f) => f.kind === "van")!;
    let siren = false;
    if (emergency && r < 0.35) {
      lot = emergency;
      const kind = lot.def === "hospital_bld" ? "ambulance" : lot.def === "fire_station" ? "firetruck" : "police";
      style = FLEET.find((f) => f.kind === kind) ?? style;
      siren = true;
    } else {
      const shops = here.filter((l) => {
        const d = building(l.def);
        return (d?.category === "commercial" || d?.category === "industrial") && (!d.hours || (slot >= d.hours[0] && slot <= d.hours[1]));
      });
      lot = shops[Math.floor(Math.random() * shops.length)];
      if (lot && building(lot.def)?.category === "industrial") style = FLEET.find((f) => f.kind === "truck") ?? style;
    }
    if (!lot) return;
    // The road in front of the building: the nearest one, either way.
    const door = lotDoor(lot);
    const nx = ROADS.xs.reduce((b, x) => (Math.abs(x - door.x) < Math.abs(b - door.x) ? x : b));
    const ny = ROADS.ys.reduce((b, y) => (Math.abs(y - door.y) < Math.abs(b - door.y) ? y : b));
    const axis: "x" | "y" = Math.abs(ny - door.y) <= Math.abs(nx - door.x) ? "x" : "y";
    const dir = Math.random() < 0.5 ? 1 : -1;
    const lane = dir * 11;
    const line = (axis === "x" ? ny : nx) + lane;
    const stopAt = axis === "x" ? door.x : door.y;
    // Siren vehicles leave from the station; deliveries come in from off screen.
    const start = siren ? stopAt : stopAt - dir * ((axis === "x" ? view.width : view.height) / 2 + 160);
    const v = vehicle(this.scene, axis === "x" ? start : line, axis === "x" ? line : start, style);
    faceVehicle(v, axis === "x" ? dir : 0, axis === "y" ? dir : 0);
    const speed = dir * (siren ? 190 : 95);
    const service: Service = { v, axis, speed, stopAt, stopped: siren ? -1 : 0, stopMs: 5000, done: false };
    if (siren) service.light = this.scene.add.circle(v.x, v.y - 34, 3.5, 0xef4444);
    else service.parcel = this.scene.add.text(v.x, v.y - 30, building(lot.def)?.category === "industrial" ? "🏗️" : "📦", { fontSize: "13px" }).setOrigin(0.5).setDepth(28);
    this.services.push(service);
  }

  destroy() {
    this.agents.forEach((a) => a.fig.destroy());
    this.services.forEach((s) => {
      s.v.destroy();
      s.light?.destroy();
      s.parcel?.destroy();
    });
    this.agents = [];
    this.services = [];
    this.tag.destroy();
  }
}
