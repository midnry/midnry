import { CHAPTERS, EVENTS, FIXERS, HOMES, JOBS, LOANS, MAPS, PEOPLE, PLACES, POSTING_STATES, chapter, district, job, place } from "./data";
import { citySolids, freePoint } from "./citymap";
import type { Look } from "./character";
import { RIDE_INFO, fare, fuelCost, type RideMode } from "./rides";
import {
  DAYS_PER_YEAR,
  END_AGE,
  FIXER_PRICE,
  FIXER_SUCCESS,
  FREEDOM_TARGET,
  SLOTS,
  addLog,
  addSkill,
  addStat,
  apply,
  canPick,
  check,
  clamp,
  debt,
  fill,
  naira,
  netWorth,
  rel,
  rollStars,
} from "./rules";
import { bus, update } from "./store";
import { MENU, DELIVERY_FEE, burn, daysUnwashed, isDirty, life, offense, overnight } from "./life";
import { caseStatus, nightlyCase, reportScam, resolveFreeze, surrender, withoutBankCheck } from "./bank";
import { buyCar, drivingTest, frscStop, hasCar, nightlyCar, rentCar, toggleDriving, useFuel } from "./drive";
import { hurt, injured, nightlyHealth, payHospital, payPower, rollHit, tooHurtFor, treat, weeklyPower, type HitBy } from "./health";
import { closeDay, closePosition, deposit, ensureMarket, insiderTip, openPosition, tick, withdraw } from "./market";
import {
  askOut,
  breakUp,
  dailyRomance,
  giveGift,
  goOnDate,
  intimacy,
  meet,
  propose,
  syncPeople,
  textPartner,
  wed,
  weeklyRomance,
} from "./romance";
import type { Choice, EndingId, GameState, PersonDef, Scene, TaskStep } from "./types";

// ── Story ────────────────────────────────────────────────────────────────────

function enterChapter(s: GameState, id: string) {
  const def = chapter(id);
  if (!def) return;
  s.chapter = def.id;
  s.stage = def.stage;
  s.age = Math.max(s.age, def.age);
  if (def.stage === "adult") startAdulthood(s);
  goScene(s, def.start);
}

function goScene(s: GameState, sceneId: string) {
  const def = chapter(s.chapter ?? "");
  let target = sceneId;
  // Follow auto-branches until a scene with choices.
  for (let guard = 0; guard < 10; guard += 1) {
    const scene: Scene | undefined = def?.scenes[target];
    if (!scene) return;
    if (scene.branch) {
      const next = scene.branch.find((item) => check(s, item.if));
      // A branching scene's own text is an intro: show it before the scene it leads to.
      if (next && scene.text && !s.result) s.result = fill(s, scene.text);
      if (next) {
        if (next.next.startsWith("@")) return go(s, next.next);
        target = next.next;
        continue;
      }
    }
    s.scene = target;
    apply(s, scene.effects);
    if (scene.special === "fixers" && s.fixers.length === 0) rollFixers(s);
    return;
  }
}

function go(s: GameState, next: string | undefined) {
  if (!next) return;
  if (next.startsWith("@chapter:")) return enterChapter(s, next.slice(9));
  if (next === "@adult") return enterChapter(s, "adult");
  if (next === "@world") {
    s.chapter = null;
    s.scene = null;
    s.stage = "adult";
    return;
  }
  if (next === "posting" && !s.postingState && !s.flags.stay_abuja) assignPosting(s);
  goScene(s, next);
}

export function startGame() {
  update((s) => enterChapter(s, CHAPTERS[0]!.id));
}

export function choose(choice: Choice) {
  update((s) => {
    if (!canPick(s, choice)) return;
    const toasts = apply(s, choice.effects);
    if (s.ending) return;
    const result = [choice.result ? fill(s, choice.result) : "", ...toasts].filter(Boolean).join("\n\n");
    if (result) {
      s.result = result;
      s.pendingNext = choice.next ?? null;
    } else {
      go(s, choice.next);
    }
  });
}

export function continueStory() {
  update((s) => {
    const next = s.pendingNext;
    s.result = null;
    s.pendingNext = null;
    go(s, next ?? undefined);
  });
}

function rollFixers(s: GameState) {
  const names = [...FIXERS].sort(() => Math.random() - 0.5).slice(0, 4);
  s.fixers = names.map((fixer) => {
    const stars = rollStars();
    return { ...fixer, stars, price: FIXER_PRICE[stars]! };
  });
}

function assignPosting(s: GameState) {
  const pick = POSTING_STATES[Math.floor(Math.random() * POSTING_STATES.length)]!;
  s.postingState = pick.name;
  s.flags.posting_event = Math.floor(Math.random() * pick.events.length);
  apply(s, pick.events[Number(s.flags.posting_event)]?.effects);
}

export function payFixer(index: number) {
  update((s) => {
    const fixer = s.fixers[index];
    if (!fixer || s.stats.money < fixer.price) return;
    addStat(s, "money", -fixer.price);
    addStat(s, "heat", 4);
    s.flags.paid_fixer = true;
    const worked = Math.random() < FIXER_SUCCESS[fixer.stars]!;
    if (worked) {
      s.flags.stay_abuja = true;
      addLog(s, `Paid ${fixer.name} (${fixer.stars}★) ${naira(fixer.price)} to stay in Abuja for NYSC. It worked.`);
      s.result = `${fixer.name} counts the money twice. Two weeks later, a quiet call: "Your name dey Abuja list." It worked.`;
    } else {
      addLog(s, `Paid ${fixer.name} (${fixer.stars}★) ${naira(fixer.price)} to stay in Abuja. Scammed.`);
      s.result =
        fixer.stars <= 2
          ? `${fixer.name} takes your ${naira(fixer.price)} and is never seen again. Their phone is switched off. Of course. One- and two-star fixers always run.`
          : `${fixer.name} swears it is "processing". It is not. Your money is gone, and so is your Abuja posting.`;
    }
    s.pendingNext = "posting";
  });
}

// ── Adulthood ────────────────────────────────────────────────────────────────

function startAdulthood(s: GameState) {
  s.age = Math.max(18, s.age);
  s.slot = 0;
  addStat(s, "money", s.background === "lapo" ? 15000 : 60000);
  const home = place(HOMES[s.background])!;
  s.district = home.district;
  s.pos = { x: home.x, y: home.y + 95 };
  s.flags.adult_day0 = s.day;
  ensureMarket(s);
  syncPeople(s);
}

function toast(s: GameState, text: string) {
  s.toast = text;
}

/** Add a line after whatever the toast already says. */
function note(s: GameState, ...lines: string[]) {
  const text = lines.filter(Boolean).join(" ");
  if (text) s.toast = `${s.toast ? `${s.toast} ` : ""}${text}`;
}

export function clearToast() {
  update((s) => {
    s.toast = null;
  });
}

/** Wash up at home: a shower, or a bucket bath. Once per part of the day. */
export function freshenUp(poor: boolean) {
  update((s) => {
    const stamp = `${s.day}:${s.slot}:${s.age}`;
    if (s.flags.fresh === stamp) return toast(s, "You're already fresh. Any more and you'll wash away.");
    s.flags.fresh = stamp;
    addStat(s, "stress", -3);
    addStat(s, "energy", 4);
    toast(s, poor ? "Bucket bath done, cold water and all. You feel like a new person. 🪣" : "Hot shower, nice soap. Life is good. 🚿");
  });
}

/** Kill time until night falls. */
export function skipToNight() {
  update((s) => {
    if (s.chapter || s.ending) return;
    if (s.slot >= SLOTS.length - 1) return toast(s, "It's already night. Go home and sleep, or see what Abuja does after dark.");
    s.slot = SLOTS.length - 1;
    addStat(s, "stress", -2);
    toast(s, "You gist, scroll and gist some more. The sun goes down on Abuja. 🌙");
  });
}

/** New outfit or hairstyle from the wardrobe. */
export function changeLooks(look: Look) {
  update((s) => {
    s.looks = { ...look, outfit: look.topColor };
  });
}

/** Bills app: pay electricity or the hospital from your phone. */
export function payBill(kind: "power" | "hospital") {
  update((s) => {
    if (s.ending) return;
    toast(s, kind === "power" ? payPower(s) : payHospital(s));
  });
}

/** ChopNow: a rider brings food to wherever you are. */
export function orderMeal(id: string) {
  update((s) => {
    const meal = MENU.find((m) => m.id === id);
    if (!meal || s.chapter || s.ending) return;
    const total = meal.price + DELIVERY_FEE;
    if (s.stats.money < total) return toast(s, `You need ${naira(total)} for that, delivery included.`);
    addStat(s, "money", -total);
    apply(s, [{ food: meal.food }, { water: meal.water }]);
    toast(s, `${meal.icon} Your ${meal.name} from ${meal.from} arrives. The rider says "Enjoy!" ${naira(total)} with delivery.`);
  });
}

export function savePosition(x: number, y: number, districtId: string) {
  update((s) => {
    s.pos = { x: Math.round(x), y: Math.round(y) };
    s.district = districtId;
  });
}

export function doAction(placeId: string, actionId: string): "loans" | void {
  let open: "loans" | undefined;
  update((s) => {
    const p = place(placeId);
    const a = p?.actions.find((item) => item.id === actionId);
    if (!p || !a || s.ending || s.event) return;
    if (!check(s, a.if)) return toast(s, a.lockedText ?? "You can't do that yet.");
    if (a.kind === "sleep") return sleep(s);
    if (a.kind === "paybill") return toast(s, payHospital(s));
    if (a.kind === "unfreeze" || a.kind === "efcc") {
      if (a.slots && s.slot + a.slots > SLOTS.length) return toast(s, "They've closed for the day. Come back tomorrow morning.");
      const line =
        a.kind === "unfreeze" ? resolveFreeze(s) : a.id === "efcc_surrender" ? surrender(s) : a.id === "efcc_report" ? reportScam(s) : caseStatus(s);
      toast(s, line);
      spend(s, a.slots, a.energy);
      return checkEndings(s);
    }
    if (a.kind === "doctor") {
      if (s.slot + a.slots > SLOTS.length) return toast(s, "The doctors on duty are only taking emergencies. Come back in the morning.");
      toast(s, treat(s));
      spend(s, a.slots, a.energy);
      return;
    }
    const hurtLine = tooHurtFor(s, a.energy);
    if (hurtLine && (a.energy <= -20 || a.kind === "drive" || a.kind === "work")) return toast(s, hurtLine);
    if (a.kind === "loans") {
      open = "loans";
      return;
    }
    if (a.kind === "drive") {
      if (s.task) return toast(s, "Finish what you're doing first.");
      if (s.skills.driving < 20) return toast(s, "You need Driving 20 to drive for ride-hailing apps. Take lessons at the Garki hub.");
      if (a.cost && s.stats.money < a.cost) return toast(s, `Car rental is ${naira(a.cost)} for the day.`);
      if (s.slot + a.slots > SLOTS.length) return toast(s, "It's too late to start driving. Go home and sleep.");
      if (a.cost) addStat(s, "money", -a.cost);
      spend(s, a.slots, a.energy);
      startTask(s, "ride", a.id === "drive_ownprice" ? "ownprice" : "zoom");
      return;
    }
    if (a.kind === "meet") {
      if (s.slot + a.slots > SLOTS.length) return toast(s, "It's too late for that. Go home and sleep.");
      toast(s, meet(s, p.id));
      spend(s, a.slots, a.energy);
      return;
    }
    if (a.kind === "japa") {
      if (!s.certs.degree) return toast(s, "The visa officer flips through your file: no degree. \"Come back when you have one.\"");
      addLog(s, "Japa'd: left Nigeria for a new life abroad.");
      return end(s, "japa");
    }
    if (a.slots > 0 && s.slot + a.slots > SLOTS.length) {
      return toast(s, "It's too late for that. Go home and sleep.");
    }
    if (a.energy < 0 && s.stats.energy + a.energy < 0) return toast(s, "You're too tired. Rest or sleep first.");
    if (a.cost && s.stats.money < a.cost) return toast(s, `You need ${naira(a.cost)} for that.`);
    if (a.kind === "apply") return applyForJob(s, a.job!);
    if (a.kind === "drivetest" || a.kind === "rentcar" || a.kind === "buycar") {
      if (a.kind === "buycar" && life(s).car === "owned") return toast(s, "You already own a car.");
      if (a.kind === "drivetest" && life(s).license) return toast(s, "You already have your licence.");
      if (a.cost) addStat(s, "money", -a.cost);
      toast(s, a.kind === "drivetest" ? drivingTest(s) : a.kind === "rentcar" ? rentCar(s) : buyCar(s));
      spend(s, a.slots, a.energy);
      return checkEndings(s);
    }
    if (a.kind === "work") {
      if (s.job !== a.job) return toast(s, "You don't work here. Apply first.");
      if (s.task) return toast(s, "Finish what you're doing first.");
      if (a.job === "delivery_rider" || a.job === "market_sales") {
        spend(s, a.slots, a.energy);
        if (s.slot === 0) return; // the day ended while getting ready
        startTask(s, a.job === "delivery_rider" ? "delivery" : "hawk");
        return;
      }
      const def = job(a.job)!;
      if (isDirty(s)) {
        const line = offense(s, "dirty");
        note(s, `Your boss looks at your shirt and sighs. ${line}`);
      }
      const bonus = 1 + Math.min(0.5, (s.skills.hustle + s.skills.education) / 400);
      const pay = Math.round(def.pay * bonus);
      addStat(s, "money", pay);
      apply(s, def.shift);
      s.flags.shifts = Number(s.flags.shifts ?? 0) + 1;
      toast(s, `Shift done as ${def.title}: +${naira(pay)}.`);
      spend(s, a.slots, a.energy);
      return checkEndings(s);
    }
    if (a.cost) addStat(s, "money", -a.cost);
    const toasts = apply(s, a.effects);
    spend(s, a.slots, a.energy);
    toast(s, [fill(s, a.text), ...toasts].filter(Boolean).join(" "));
    afterAction(s);
  });
  return open;
}

function spend(s: GameState, slots: number, energy: number) {
  s.slot += slots;
  addStat(s, "energy", energy);
  note(s, ...burn(s, slots));
  const crashes = tick(s, slots);
  if (crashes.length) s.toast = `${s.toast ? `${s.toast} ` : ""}${crashes.join(" ")}`;
  if (s.slot >= SLOTS.length) {
    s.toast = `${s.toast ? `${s.toast} ` : ""}It's late. You head home and crash.`;
    sleep(s);
  }
}

function afterAction(s: GameState) {
  checkEndings(s);
}

function applyForJob(s: GameState, jobId: string) {
  const def = job(jobId);
  if (!def) return;
  if (s.job === jobId) return toast(s, `You already work as ${def.title}.`);
  const missing = def.requires.filter((cond) => !check(s, cond));
  if (missing.length) {
    toast(s, `Not hired. Needs: ${def.requiresText}`);
  } else {
    const previous = job(s.job);
    s.job = jobId;
    addLog(s, `Hired as ${def.title}.`);
    toast(s, `Hired as ${def.title}! ${previous ? `You resign from ${previous.title}. ` : ""}Pay: ${naira(def.pay)} per shift.`);
  }
  spend(s, 1, -5);
}

export function jobStatus(s: GameState) {
  return JOBS.map((def) => ({ def, ok: def.requires.every((cond) => check(s, cond)), current: s.job === def.id }));
}

export function quitJob() {
  update((s) => {
    const def = job(s.job);
    if (!def) return;
    s.job = null;
    toast(s, `You resigned as ${def.title}.`);
  });
}

// ── Loans ────────────────────────────────────────────────────────────────────

export function borrow(index: number) {
  update((s) => {
    const offer = LOANS.offers[index];
    if (!offer || !check(s, offer.requires)) return;
    if (s.loans.length >= 3) return toast(s, "Mr. Felix: \"Ah, you get three loans already. Pay one first.\"");
    const owed = Math.round(offer.amount * (1 + offer.interest));
    s.loans.push({
      id: `${s.day}-${s.loans.length}-${offer.amount}`,
      principal: offer.amount,
      owed,
      weekly: Math.ceil(owed / offer.weeks),
      nextDue: s.day + 7,
      missed: 0,
    });
    withoutBankCheck(() => addStat(s, "money", offer.amount));
    if (!s.flags.first_loan) {
      s.flags.first_loan = true;
      addLog(s, `Took a first QuickKash loan of ${naira(offer.amount)}.`);
    }
    toast(s, `${naira(offer.amount)} credited. You owe ${naira(owed)}, ${naira(Math.ceil(owed / offer.weeks))} every week.`);
  });
}

export function repay(loanId: string) {
  update((s) => {
    const loan = s.loans.find((item) => item.id === loanId);
    if (!loan) return;
    const amount = Math.min(loan.owed, s.stats.money);
    if (amount <= 0) return toast(s, "You have no money to repay with.");
    addStat(s, "money", -amount);
    loan.owed -= amount;
    if (loan.owed <= 0) {
      s.loans = s.loans.filter((item) => item.id !== loanId);
      toast(s, "Loan fully repaid. Mr. Felix looks almost disappointed.");
    } else toast(s, `Paid ${naira(amount)}. Still owing ${naira(loan.owed)}.`);
  });
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export function callContact(id: string) {
  update((s) => {
    const entry = s.npcs[id];
    if (!entry) return;
    if (s.flags[`called_${id}`] === s.day) return toast(s, "You already talked today.");
    s.flags[`called_${id}`] = s.day;
    entry.rel = clamp(entry.rel + 2);
    entry.lastSeen = s.day;
    toast(s, "A good long call. The relationship stays warm.");
  });
}

// ── Travel ───────────────────────────────────────────────────────────────────

export function travel(placeId: string, mode: RideMode) {
  update((s) => {
    const p = place(placeId);
    if (!p) return;
    const d = district(p.district);
    if (d?.gate && !check(s, d.gate.if)) return toast(s, d.gate.message);
    const to = { x: p.x, y: p.y + 95 };
    const cost = fare(mode, s.pos, to);
    const name = RIDE_INFO[mode].label.toLowerCase();
    if (s.stats.money < cost) return toast(s, `You need ${naira(cost)} for the ${name}.`);
    if (mode === "bus" && s.slot + 1 > SLOTS.length - 1) return toast(s, "No more buses tonight. Take a taxi, a keke or an okada.");
    addStat(s, "money", -cost);
    if (mode === "bus") s.slot += 1;
    if (mode === "taxi") addStat(s, "stress", -3);
    if (mode === "okada") addStat(s, "stress", 1);
    const from = { ...s.pos };
    s.pos = to;
    s.district = p.district;
    const lines: Record<RideMode, string> = {
      okada: `Your okada man weaves through traffic like a man with no fear and drops you at ${p.name}. ${naira(cost)}.`,
      keke: `The keke rattles you to ${p.name}. The man beside you ate onions for breakfast. ${naira(cost)}.`,
      taxi: `The green-and-white taxi glides you to ${p.name}, AC on full. ${naira(cost)}.`,
      bus: `You squeeze onto the bus to ${p.name}. It takes forever.`,
    };
    toast(s, lines[mode]);
    bus.emit("ride", { mode, from, to });
  });
}

// ── Driving ──────────────────────────────────────────────────────────────────

/** Get in or out of your car on the map. */
export function drive() {
  update((s) => {
    if (s.chapter || s.ending) return;
    toast(s, toggleDriving(s));
  });
}

/** The world reports distance driven; fuel is paid as you go. */
export function fuel(px: number) {
  update((s) => {
    const line = useFuel(s, px);
    if (line) toast(s, line);
  });
}

/** Driving past an FRSC checkpoint. */
export function frsc() {
  update((s) => {
    const ev = frscStop(s);
    if (ev) s.event = ev;
  });
}

/** Rides app: drive yourself there in your own (or rented) car. */
export function driveTo(placeId: string) {
  update((s) => {
    const p = place(placeId);
    if (!p || s.chapter || s.ending) return;
    if (!hasCar(s)) return toast(s, "You don't have a car right now.");
    if (injured(s) === "fracture") return toast(s, "You can't drive with your leg in a cast.");
    const d = district(p.district);
    if (d?.gate && !check(s, d.gate.if)) return toast(s, d.gate.message);
    const to = { x: p.x, y: p.y + 95 };
    const cost = fuelCost(s.pos, to);
    if (s.stats.money < cost) return toast(s, `You need ${naira(cost)} for fuel.`);
    addStat(s, "money", -cost);
    const from = { ...s.pos };
    s.pos = to;
    s.district = p.district;
    toast(s, `You drive yourself to ${p.name}. Fuel: ${naira(cost)}.`);
    bus.emit("ride", { mode: "car", from, to });
    // No licence? FRSC might be on the way.
    if (!life(s).license && Math.random() < 0.3 && s.flags.frsc_day !== s.day && !s.event) {
      s.flags.frsc_day = s.day;
      s.event = "frsc_nolicense";
    }
  });
}

// ── Day cycle ────────────────────────────────────────────────────────────────

const RENT: Record<string, number> = { lapo: 8000, average: 15000 };

function sleep(s: GameState) {
  s.day += 1;
  s.slot = 0;
  const restore = 100 - Math.round(s.stats.stress / 4);
  s.stats.energy = clamp(restore);
  if (s.stats.stress >= 85) addStat(s, "health", -3);
  else addStat(s, "health", 2);
  addStat(s, "stress", -8);
  if (!s.flags.fraud) addStat(s, "heat", -1);
  note(s, ...overnight(s));
  note(s, ...nightlyHealth(s));
  note(s, ...nightlyCar(s));
  life(s).driving = false;
  if (isDirty(s)) {
    note(s, `Your clothes haven't been washed in ${daysUnwashed(s)} days and it shows.`, offense(s, "dirty"), "Wash them at home or a laundry.");
  }
  const home = place(HOMES[s.background])!;
  s.pos = { x: home.x, y: home.y + 95 };
  s.district = home.district;
  bus.emit("teleport", s.pos);
  const adultDays = s.day - Number(s.flags.adult_day0 ?? s.day);
  if (adultDays > 0 && adultDays % DAYS_PER_YEAR === 0) {
    s.age += 1;
    s.toast = `${s.toast ? `${s.toast} ` : ""}Happy birthday. You are ${s.age}.`;
  }
  const crashes = closeDay(s);
  if (crashes.length) s.toast = `${s.toast ? `${s.toast} ` : ""}${crashes.join(" ")}`;
  if (adultDays > 0 && adultDays % 7 === 0) {
    weeklyBills(s);
    if (!s.event) s.event = weeklyRomance(s);
    if (!s.event && s.flags.bolaji_connect && Math.random() < 0.3) {
      insiderTip(s);
      s.event = "insider";
    }
  }
  if (!s.event) s.event = nightlyCase(s);
  if (!s.event) s.event = dailyRomance(s);
  neglect(s);
  pickEvent(s);
  checkEndings(s);
}

function weeklyBills(s: GameState) {
  const rent = RENT[s.background] ?? 10000;
  // Food is now bought meal by meal; this is transport and data.
  const living = 3000 + 1500;
  addStat(s, "money", -(rent + living));
  const lines = [`Weekly bills: rent ${naira(rent)}, transport and data ${naira(living)}.`];
  let missed = false;
  for (const loan of s.loans) {
    if (loan.nextDue > s.day) continue;
    const due = Math.min(loan.weekly, loan.owed);
    if (s.stats.money >= due) {
      addStat(s, "money", -due);
      loan.owed -= due;
      lines.push(`QuickKash repayment: ${naira(due)}.`);
    } else {
      loan.missed += 1;
      loan.owed = Math.round(loan.owed * (1 + LOANS.missedPenalty));
      missed = true;
      lines.push(`Missed a QuickKash repayment. Penalty added: you now owe ${naira(loan.owed)}.`);
    }
    loan.nextDue += 7;
  }
  s.loans = s.loans.filter((loan) => loan.owed > 0);
  lines.push(...weeklyPower(s));
  if (life(s).hospitalBill > 0) {
    addStat(s, "stress", 3);
    lines.push(`The hospital accountant called about your ₦${life(s).hospitalBill.toLocaleString("en")} bill.`);
  }
  s.toast = `${s.toast ? `${s.toast} ` : ""}${lines.join(" ")}`;
  if (missed) {
    s.event = "collectors";
    addStat(s, "reputation", -4);
  }
  if (s.stats.money < 0) s.flags.broke_weeks = Number(s.flags.broke_weeks ?? 0) + 1;
  else s.flags.broke_weeks = 0;
}

/** Friends you never see drift away, a little each week. */
function neglect(s: GameState) {
  if (s.day % 7 !== 0) return;
  for (const entry of Object.values(s.npcs)) {
    if (entry.met && s.day - entry.lastSeen > 21) entry.rel = clamp(entry.rel - 3);
  }
}

function pickEvent(s: GameState) {
  if (s.event || s.ending) return;
  if (s.stats.heat >= 100) {
    s.flags.arrested = true;
    return;
  }
  if (s.stats.heat >= 40 && Math.random() < s.stats.heat / 250) {
    s.event = "checkpoint";
    return;
  }
  if (Math.random() > 0.4) return;
  const pool = EVENTS.filter(
    (item) => item.weight > 0 && check(s, item.if) && !(item.once && s.usedEvents.includes(item.id)),
  );
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) {
      s.event = item.id;
      return;
    }
  }
}

export function resolveEvent(choice: Choice) {
  update((s) => {
    const ev = EVENTS.find((item) => item.id === s.event);
    if (!ev || !canPick(s, choice)) return;
    if (ev.once || ev.id.startsWith("doubleup")) s.usedEvents.push(ev.id);
    s.event = null;
    const toasts = apply(s, choice.effects);
    const line = [choice.result ? fill(s, choice.result) : "", ...toasts].filter(Boolean).join(" ");
    if (line) toast(s, line);
    const forced = s.flags.force_event;
    if (typeof forced === "string" && forced) {
      s.flags.force_event = "";
      s.event = forced;
    }
    checkEndings(s);
  });
}

// ── Endings ──────────────────────────────────────────────────────────────────

function end(s: GameState, id: EndingId) {
  s.ending = id;
  s.stage = "ended";
}

function checkEndings(s: GameState) {
  if (s.ending) return;
  if (s.flags.arrested) {
    if (s.flags.fraud || Number(s.stats.heat) >= 90) {
      addLog(s, "Arrested by the EFCC. The evidence was on your laptop.");
      return end(s, "jail");
    }
    s.flags.arrested = false;
    addStat(s, "money", -100000);
    addStat(s, "stress", 20);
    s.stats.heat = 20;
    toast(s, "Arrested and held for two days. No charges stuck, but 'bail' cost ₦100,000.");
  }
  if (s.stats.health <= 15) collapse(s);
  if (netWorth(s) >= FREEDOM_TARGET && debt(s) === 0) {
    addLog(s, `Reached a net worth of ${naira(netWorth(s))}.`);
    return end(s, s.background === "lapo" ? "grass" : "freedom");
  }
  if (Number(s.flags.broke_weeks ?? 0) >= 4 && debt(s) > 0) {
    addLog(s, "Four weeks in the red with QuickKash at the door.");
    return end(s, "broke");
  }
  if (s.age >= END_AGE) {
    const salaried = job(s.job)?.salaried;
    if (netWorth(s) >= FREEDOM_TARGET) return end(s, s.background === "lapo" ? "grass" : "freedom");
    if (salaried && netWorth(s) > 0) return end(s, "ninefive");
    return end(s, netWorth(s) > 500000 ? "ninefive" : "broke");
  }
}

/** Burnout puts the MC in hospital: money and days lost, never death. */
function collapse(s: GameState) {
  addLog(s, "Collapsed from stress and exhaustion. Spent days in hospital.");
  const paid = Math.min(30000, Math.max(0, s.stats.money));
  addStat(s, "money", -paid);
  life(s).hospitalBill += 30000 - paid;
  s.day += 2;
  s.slot = 0;
  s.stats.health = 55;
  s.stats.energy = 60;
  addStat(s, "stress", -30);
  s.toast = "You collapsed and woke up in Garki General Hospital. Two days gone, ₦30,000 in bills. The doctor says: \"Rest, or next time it will be worse.\"";
}

// ── Phone: relationships ─────────────────────────────────────────────────────

type RomanceAction =
  | { kind: "text"; id: string }
  | { kind: "date"; id: string; date: string }
  | { kind: "gift"; id: string }
  | { kind: "ask"; id: string }
  | { kind: "propose"; id: string }
  | { kind: "wed"; id: string; wedding: string }
  | { kind: "breakup"; id: string }
  | { kind: "night"; id: string; safe: boolean };

const ROMANCE_SLOTS: Record<RomanceAction["kind"], number> = { text: 0, date: 1, gift: 0, ask: 0, propose: 1, wed: 2, breakup: 0, night: 1 };

export function romance(action: RomanceAction) {
  update((s) => {
    if (s.event || s.ending) return;
    const slots = ROMANCE_SLOTS[action.kind];
    if (slots && s.slot + slots > SLOTS.length) return toast(s, "It's too late for that today.");
    let text = "";
    if (action.kind === "text") text = textPartner(s, action.id);
    if (action.kind === "date") text = goOnDate(s, action.id, action.date);
    if (action.kind === "gift") text = giveGift(s, action.id);
    if (action.kind === "ask") text = askOut(s, action.id);
    if (action.kind === "propose") text = propose(s, action.id);
    if (action.kind === "wed") text = wed(s, action.id, action.wedding);
    if (action.kind === "breakup") text = breakUp(s, action.id);
    if (action.kind === "night") text = intimacy(s, action.id, action.safe);
    if (text) toast(s, text);
    const spent = text && !/^You need|isn't|too soon|already texted|Slow down/.test(text);
    if (spent && slots) spend(s, slots, action.kind === "date" ? -15 : -5);
    checkEndings(s);
  });
}

export function syncRomance() {
  update((s) => syncPeople(s));
}

// ── Phone: trading ───────────────────────────────────────────────────────────

export function trade(action: { kind: "open"; asset: string; side: "long" | "short"; margin: number; leverage: number } | { kind: "close"; id: string } | { kind: "deposit" | "withdraw"; amount: number }) {
  update((s) => {
    ensureMarket(s);
    if (action.kind === "open") toast(s, openPosition(s, action.asset, action.side, action.margin, action.leverage));
    if (action.kind === "close") toast(s, closePosition(s, action.id));
    if (action.kind === "deposit") toast(s, deposit(s, action.amount));
    if (action.kind === "withdraw") toast(s, withdraw(s, action.amount));
    checkEndings(s);
  });
}

export function retire() {
  update((s) => {
    s.age = END_AGE;
    checkEndings(s);
  });
}

export { rel };

// ── Walkable story, people, street life and on-map work ──────────────────────

export function mapIdFor(s: GameState): string {
  return s.chapter && MAPS[s.chapter] ? s.chapter : "city";
}

/** The story beat the player still has to walk to, if any. */
export function currentBeat(s: GameState): { key: string; spot: { x: number; y: number; label: string } } | null {
  if (!s.chapter || s.result) return null;
  const map = MAPS[s.chapter];
  const spotId = map?.beats[s.scene ?? ""];
  if (!map || !spotId) return null;
  const key = `${s.chapter}:${s.scene}`;
  if (s.flags.beat_at === key) return null;
  const spot = map.spots[spotId];
  return spot ? { key, spot } : null;
}

export function storyOpen(s: GameState): boolean {
  return Boolean(s.chapter) && (Boolean(s.result) || !currentBeat(s));
}

export function reachBeat() {
  update((s) => {
    const beat = currentBeat(s);
    if (beat) s.flags.beat_at = beat.key;
  });
}

export function personKey(p: PersonDef): string {
  return `${p.map}:${p.id}`;
}

/** Where a person stands on their map. */
export function personAt(p: PersonDef): { x: number; y: number } {
  if (p.place) {
    const pl = place(p.place);
    if (pl) return { x: pl.x + (p.dx ?? 95), y: pl.y + (p.dy ?? -10) };
  }
  return { x: p.x ?? 0, y: p.y ?? 0 };
}

export function peopleOn(s: GameState, mapId: string): PersonDef[] {
  return PEOPLE.filter((p) => p.map === mapId && check(s, p.if) && (!p.place || check(s, (place(p.place) as { if?: never })?.if)));
}

export function findPerson(key: string): PersonDef | undefined {
  return PEOPLE.find((p) => personKey(p) === key);
}

/** What a person says today: one of their lines, the same all day. */
export function lineFor(s: GameState, p: PersonDef): string {
  let hash = s.day * 17;
  for (const char of p.id) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return fill(s, p.lines[hash % p.lines.length] ?? "");
}

export function offerFor(s: GameState, p: PersonDef) {
  if (s.flags[`offer_${personKey(p)}`] === s.day) return null;
  return p.talks?.find((t) => check(s, t.if)) ?? null;
}

export function talk(key: string) {
  update((s) => {
    const p = findPerson(key);
    if (!p || s.flags[`talked_${key}`] === s.day) return;
    s.flags[`talked_${key}`] = s.day;
    if (p.npc) {
      const current = s.npcs[p.npc] ?? { rel: 0, met: false, lastSeen: s.day };
      s.npcs[p.npc] = { rel: clamp(current.rel + 1), met: true, lastSeen: s.day };
    }
  });
}

const COMEBACKS = [
  "\"Is it me you're talking to like that?\" They hiss and walk off, telling everyone who will listen.",
  "\"Your mates are building houses and you're here insulting people.\" A small crowd laughs at you.",
  "They stare at you for a long second. \"God will judge you.\" Somebody filmed it.",
  "\"Ehn? Say that one again!\" People hold them back. You leave quickly.",
];

/** Insult someone: people remember, and so does your reputation. */
export function insult(key: string) {
  update((s) => {
    const p = findPerson(key);
    if (!p || s.flags[`insulted_${key}`] === s.day) return;
    s.flags[`insulted_${key}`] = s.day;
    if (p.npc) {
      const current = s.npcs[p.npc] ?? { rel: 0, met: true, lastSeen: s.day };
      s.npcs[p.npc] = { ...current, rel: clamp(current.rel - 12), met: true };
    }
    addStat(s, "stress", -2);
    toast(s, `${COMEBACKS[(s.day + key.length) % COMEBACKS.length]} ${offense(s, "insult")}`);
  });
}

export function takeOffer(key: string, choice: Choice) {
  update((s) => {
    const p = findPerson(key);
    if (!p || !canPick(s, choice) || s.flags[`offer_${key}`] === s.day) return;
    const time = (choice.effects ?? []).reduce((sum, e) => sum + (e.time ?? 0), 0);
    if (s.stage === "adult" && !s.chapter && time && s.slot + time > SLOTS.length) return toast(s, "It's too late for that today.");
    s.flags[`offer_${key}`] = s.day;
    const toasts = apply(s, choice.effects);
    const line = [choice.result ? fill(s, choice.result) : "", ...toasts].filter(Boolean).join(" ");
    if (line) toast(s, line);
    if (time && !s.chapter) spend(s, time, 0);
    checkEndings(s);
  });
}

/** Traffic catches you on the road: a near miss, an injury, or worse. */
export function bump(by: HitBy = "car") {
  update((s) => {
    if (s.ending || s.flags.bumped === s.day * 10 + s.slot) return;
    s.flags.bumped = s.day * 10 + s.slot;
    addStat(s, "stress", 3);
    const { kind, who } = rollHit(by);
    if (!kind) {
      toast(s, ["A keke swerves past, missing you by an inch. The driver shouts something about your mother.", "A danfo screeches to a stop. \"You wan die?!\" Look before you cross.", "An okada brushes your arm. You're fine. Your heart is not."][s.day % 3]!);
      return;
    }
    if (kind === "death") {
      addLog(s, `Hit by ${who} while crossing the road in Abuja. Gone too soon.`);
      return end(s, "cut");
    }
    const line = hurt(s, kind);
    addStat(s, "stress", kind === "minor" ? 4 : 12);
    if (kind !== "minor") addLog(s, `Hit by ${who}: ${kind === "fracture" ? "a broken leg" : "a dislocated shoulder"}.`);
    toast(s, `💥 You're hit by ${who}! ${line} ${kind === "minor" ? "A doctor can clean it up, or it'll heal in a couple of days." : "Get to Garki General Hospital. It will get worse if you don't."}`);
    checkEndings(s);
  });
}

/** Walking into a police checkpoint while your Heat is high. */
export function checkpoint() {
  update((s) => {
    if (s.event || s.ending || s.stats.heat < 40 || s.flags.checkpoint_day === s.day) return;
    s.flags.checkpoint_day = s.day;
    s.event = "checkpoint";
  });
}

// Tasks: deliveries, market hawking and ride-hailing, played on the map.

const PASSENGERS = ["Mrs. Danjuma", "a corper in khaki", "Alhaji Musa", "two students from UniAbuja", "a nurse coming off shift", "a man on three phone calls", "Pastor Femi", "a tourist from Lagos"];

function openSpots(s: GameState) {
  const solids = citySolids();
  return PLACES.filter((p) => {
    if (!check(s, (p as { if?: never }).if)) return false;
    const d = district(p.district);
    return !d?.gate || check(s, d.gate.if);
  }).map((p) => ({ ...freePoint(p.x, p.y + 95, solids), label: p.name }));
}

function stepLimit(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 150 + 10);
}

function startTask(s: GameState, kind: "delivery" | "hawk" | "ride", app?: "zoom" | "ownprice") {
  const spots = openSpots(s).sort(() => Math.random() - 0.5);
  const steps: TaskStep[] = [];
  if (kind === "delivery") {
    const hub = place("garki_hub")!;
    const pickup = { ...freePoint(hub.x, hub.y + 95, citySolids()), label: "Garki Delivery Hub" };
    for (const drop of spots.filter((sp) => sp.label !== "Garki Delivery Hub").slice(0, 3)) {
      steps.push({ ...pickup, kind: "pickup" }, { ...drop, label: `Deliver to ${drop.label}`, kind: "dropoff" });
    }
  }
  if (kind === "hawk") {
    const market = place("wuse_market")!;
    const d = district("wuse")!;
    for (let i = 0; i < 5; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const r = 140 + Math.random() * 220;
      const x = Math.min(d.x + d.w - 40, Math.max(d.x + 40, market.x + Math.cos(angle) * r));
      const y = Math.min(d.y + d.h - 40, Math.max(d.y + 40, market.y + Math.sin(angle) * r));
      steps.push({ ...freePoint(x, y, citySolids()), label: "Customer waving at you", kind: "customer" });
    }
  }
  if (kind === "ride") {
    for (let i = 0; i < 3; i += 1) {
      const from = spots[(i * 2) % spots.length]!;
      const to = spots[(i * 2 + 1) % spots.length]!;
      steps.push({ ...from, label: `Pick up at ${from.label}`, kind: "pickup" }, { ...to, label: `Drop off at ${to.label}`, kind: "dropoff" });
    }
  }
  s.task = { kind, app, steps, index: 0, limit: 25, stepStarted: Date.now(), earned: 0, late: 0, fare: 0, rating: [], haggle: null };
  s.task.limit = stepLimit(s.pos, steps[0]!);
  const intro: Record<string, string> = {
    delivery: "Shift started: three deliveries. Pick up at the hub, then drop off. Faster means bigger tips.",
    hawk: "Shift started: walk to the customers waving at you around Wuse Market.",
    ride: app === "ownprice" ? "You're online on OwnPrice. Passengers name their price. You can haggle." : "You're online on Zoom. Pick up your first passenger.",
  };
  toast(s, intro[kind]!);
}

function nextStep(s: GameState, from: { x: number; y: number }) {
  const t = s.task!;
  t.index += 1;
  if (t.index >= t.steps.length) return finishTask(s);
  t.stepStarted = Date.now();
  t.limit = stepLimit(from, t.steps[t.index]!);
}

function finishTask(s: GameState) {
  const t = s.task!;
  let line = "";
  if (t.kind === "ride" && t.rating.length) {
    const avg = t.rating.reduce((a, b) => a + b, 0) / t.rating.length;
    const bonus = avg >= 4.5 ? 3000 : 0;
    addStat(s, "money", bonus);
    t.earned += bonus;
    line = ` Rating ${avg.toFixed(1)}★${bonus ? `, top-driver bonus ${naira(bonus)}` : ""}.`;
    addSkill(s, "driving", 2);
  }
  if (t.kind === "delivery") addSkill(s, "driving", 1);
  if (t.kind === "hawk") addSkill(s, "trade", 2);
  s.flags.shifts = Number(s.flags.shifts ?? 0) + 1;
  toast(s, `Done for this shift: you earned ${naira(t.earned)}${t.late ? ` (${t.late} late)` : ""}.${line}`);
  s.task = null;
  checkEndings(s);
}

/** The player reached the current task target. */
export function taskReach() {
  update((s) => {
    const t = s.task;
    if (!t || t.haggle) return;
    const step = t.steps[t.index]!;
    const late = (Date.now() - t.stepStarted) / 1000 > t.limit;
    if (t.kind === "delivery") {
      if (step.kind === "dropoff") {
        const pay = late ? 2000 : 3500;
        addStat(s, "money", pay);
        t.earned += pay;
        if (late) t.late += 1;
        toast(s, late ? `Delivered late. The customer complains. +${naira(pay)}.` : `Delivered on time, with a tip. +${naira(pay)}.`);
      } else toast(s, "Package collected. Go!");
    }
    if (t.kind === "hawk") {
      const pay = late ? 900 : 1600;
      addStat(s, "money", pay);
      t.earned += pay;
      if (late) t.late += 1;
      toast(s, late ? `The customer almost left. Sold small. +${naira(pay)}.` : `Sold! +${naira(pay)}.`);
    }
    if (t.kind === "ride") {
      if (step.kind === "pickup") {
        const drop = t.steps[t.index + 1]!;
        const fair = Math.round((800 + Math.hypot(drop.x - step.x, drop.y - step.y) * 2.2) / 100) * 100;
        const passenger = PASSENGERS[(t.index + s.day) % PASSENGERS.length]!;
        if (t.app === "ownprice") {
          t.haggle = { offer: Math.round((fair * (0.55 + Math.random() * 0.3)) / 100) * 100, passenger };
          return;
        }
        t.fare = fair;
        toast(s, `${passenger} gets in. Zoom fare: ${naira(fair)}.`);
      } else {
        const stars = late ? 3 : 5;
        t.rating.push(stars);
        addStat(s, "money", t.fare - 500);
        t.earned += t.fare - 500;
        if (late) t.late += 1;
        toast(s, `Trip done: ${naira(t.fare)} minus ₦500 fuel. ${"★".repeat(stars)}${late ? " \"You took the long way.\"" : ""}`);
      }
    }
    nextStep(s, step);
  });
}

/** OwnPrice: accept the passenger's offer, or counter. */
export function haggle(accept: boolean) {
  update((s) => {
    const t = s.task;
    if (!t?.haggle) return;
    const { offer, passenger } = t.haggle;
    t.haggle = null;
    const step = t.steps[t.index]!;
    if (accept) {
      t.fare = offer;
      toast(s, `${passenger} gets in. Agreed fare: ${naira(offer)}.`);
      return nextStep(s, step);
    }
    const counter = Math.round((offer * 1.4) / 100) * 100;
    if (Math.random() < 0.55) {
      t.fare = counter;
      toast(s, `"Ah, you too dey price!" ${passenger} agrees to ${naira(counter)}.`);
      return nextStep(s, step);
    }
    toast(s, `${passenger} cancels the ride. "Bolt dey cheaper." Find the next passenger.`);
    // Skip this trip.
    t.index += 1;
    nextStep(s, step);
  });
}

export function abandonTask() {
  update((s) => {
    const t = s.task;
    if (!t) return;
    s.task = null;
    toast(s, `You stop for today with ${naira(t.earned)} earned.`);
  });
}
