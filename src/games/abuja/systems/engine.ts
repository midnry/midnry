import { CHAPTERS, EVENTS, FIXERS, HOMES, JOBS, LOANS, MAPS, PEOPLE, PLACES, POSTING_STATES, chapter, district, job, place } from "./data";
import { arrivalOf, citySolids, freePoint } from "./citymap";
import type { Look } from "./character";
import { RIDE_INFO, fare, fuelCost, rideBan, type RideMode } from "./rides";
import { weatherOf } from "./weather";
import * as CE from "./cityEvents";
import * as DA from "./daily";
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
  beatKey,
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
import { acceptCounter, argue, bluff, closeNegotiation, propose as proposeOffer, setTerms, startNegotiation, walkAway, weeklyNegotiation } from "./negotiate/core";
import type { Approach, Bluff } from "./negotiate/types";
import { addLot, CROPS, harvest as harvestPlot, kitchen, moveLot, nightlyGarden, plant as plantPlot, price as foodPrice, SOURCES, sells, spoil, water as waterGarden, weeklyMarket } from "./cooking/kitchen";
import { cleanKitchen, cookMinutes, cookRecipe, eatDish, experiment as experimentDish, learn, repair as repairKit, saveCustom, type CookResult } from "./cooking/cook";
import { callMum, guestList, shareMeal, type MealKind } from "./cooking/social";
import * as V from "./cooking/venues";
import { buyLot, lotInfo, redevelop, sellLot, upgradeLot, weeklyRent } from "./city/sim";
import { lateCatering, nightlyVenues, placeKit, weeklyVenues } from "./cooking/venues";
import { BOOKS, CLASSES, recipe as recipeDef, RECIPES } from "./cooking/recipes";
import { equipment as equipDef, stats as equipStats } from "./cooking/equipment";
import { ingredient as ingDef } from "./cooking/ingredients";
import type { EquipTier, Method, Performance, Storage, Tier } from "./cooking/types";
import { collect, growBusiness, startBusiness, visitBusiness, weeklyBusiness } from "./business";
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
import { report } from "./news";
import * as SO from "./social";
import { nightlySocial } from "./social";
import * as BK from "./banking";
import { nightlyBanking } from "./banking";
import * as JU from "./justice";
import * as NE from "./nepo";
import * as BT from "./betting";
import * as MI from "./missions";
import * as EK from "./emeka";
import * as PH from "./phones";
import { storyEvent } from "./story";
import { fadeMemories, forget, memoriesOf, recalled, remember, sinceWhen } from "./memory";
import { SPORTS, sportOf, sportOptions, type SportId } from "./tournament";

// ── Story ────────────────────────────────────────────────────────────────────

function enterChapter(s: GameState, id: string) {
  const def = chapter(id);
  if (!def) return;
  s.chapter = def.id;
  s.stage = def.stage;
  // A new school, a clean record.
  s.flags.strikes = 0;
  s.flags.discipline_due = "";
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
    if (!s.nepoMeet) s.nepoMeet = NE.schoolBump(s);
    // Emeka D walks in on your second scene of secondary school.
    if (s.chapter === "secondary") s.flags.sec_scenes = Number(s.flags.sec_scenes ?? 0) + 1;
    if (EK.shouldAppear(s) && Number(s.flags.sec_scenes ?? 0) >= 2 && !s.nepoMeet) s.emekaMeet = true;
    const pocket = EK.payAllowance(s, true);
    if (pocket) s.result = s.result ? `${s.result}\n\n${pocket}` : pocket;
    if (scene.special === "fixers" && s.fixers.length === 0) rollFixers(s);
    return;
  }
}

function go(s: GameState, next: string | undefined) {
  if (!next) return;
  // Back from a suspension or expulsion scene to where the story was heading.
  if (next === "@resume") {
    const back = String(s.flags.resume_next ?? "");
    s.flags.resume_next = "";
    return go(s, back || undefined);
  }
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
  update((s) => {
    // A brand-new life: show the guide for the first few minutes.
    s.flags.guide = 0;
    enterChapter(s, CHAPTERS[0]!.id);
  });
}

export function choose(choice: Choice) {
  update((s) => {
    if (!canPick(s, choice)) return;
    const toasts = apply(s, choice.effects);
    if (s.ending) return;
    // A sports-day event: play it first; finishGame shows the result and moves on.
    if (choice.game) {
      // A tournament match is played in your sport (picked once, at the first match).
      const kind = choice.game.kind === "tourney" ? SPORTS[(s.flags.tourney_sport = sportOf(s))].game : choice.game.kind;
      s.minigame = { ...choice.game, kind, next: choice.next };
      return;
    }
    const next = disciplineDetour(s, choice.next);
    const result = [choice.result ? fill(s, choice.result) : "", ...toasts].filter(Boolean).join("\n\n");
    if (result) {
      s.result = result;
      s.pendingNext = next ?? null;
    } else {
      go(s, next);
    }
  });
}

/** The end of a sports-day mini-game: apply what winning or losing does, show it, then carry on. */
/** Ask the house captain for a different sport in the interhouse tournament (only ones you're good enough for). */
export function pickSport(id: SportId) {
  update((s) => {
    const o = sportOptions(s).options.find((x) => x.id === id);
    if (o?.open) s.flags.tourney_sport = id;
  });
}

export function finishGame(won: boolean) {
  update((s) => {
    const g = s.minigame;
    if (!g) return;
    s.minigame = null;
    const toasts = apply(s, won ? g.win : g.lose);
    const text = won ? g.winText : g.loseText;
    const next = disciplineDetour(s, g.next);
    s.result = [text ? fill(s, text) : won ? "You win!" : "Not this time.", ...toasts].filter(Boolean).join("\n\n");
    s.pendingNext = next ?? null;
  });
}

/**
 * When strikes at school have added up to a suspension or an expulsion, the
 * story stops off at that scene first, then picks up where it was heading.
 */
function disciplineDetour(s: GameState, next: string | undefined): string | undefined {
  const due = String(s.flags.discipline_due ?? "");
  if (!due || !s.chapter) return next;
  s.flags.discipline_due = "";
  if (!chapter(s.chapter)?.scenes[due]) return next;
  s.flags[`${due}_${s.chapter}`] = true;
  // Expelled while already suspended: keep where the story was heading before either.
  const detouring = next === "suspended" || next === "expelled" || next === "@resume";
  if (!detouring) s.flags.resume_next = next ?? "";
  addLog(s, due === "expelled" ? `Expelled during ${chapter(s.chapter)?.title.split("·")[1]?.trim() ?? "school"}.` : `Suspended during ${chapter(s.chapter)?.title.split("·")[1]?.trim() ?? "school"}.`);
  return due;
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
  s.pos = { ...arrivalOf(home) };
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

/** Out on foot when the rain starts: soaked, and a little fed up. Once per downpour. */
export function caughtInRain() {
  update((s) => {
    if (s.chapter || s.ending || s.event) return;
    const w = weatherOf(s.day, s.slot);
    const key = `${s.day}:${s.slot}`;
    if (!w.wet || s.flags.soaked === key) return;
    s.flags.soaked = key;
    addStat(s, "stress", w.sky === "storm" ? 4 : 2);
    addStat(s, "energy", -2);
    toast(s, w.sky === "storm" ? "⛈️ The heavens open. You're soaked to the skin. Get indoors, or take a taxi." : "🌧️ Rain dey fall! You're getting wet. Duck into a building or under a bus stop.");
  });
}

/** At night: head home and sleep through to the next morning. */
export function skipToMorning() {
  update((s) => {
    if (s.chapter || s.ending || s.event) return;
    if (s.slot < SLOTS.length - 1) return toast(s, "It's not night yet. Skip to night first, or keep hustling.");
    toast(s, JU.jailed(s) ? "Lights out. You lie on your bunk and count the ceiling cracks." : "You head home and sleep. ☀️ Good morning, Abuja.");
    sleep(s);
  });
}

/** New outfit or hairstyle from the wardrobe. */
export function changeLooks(look: Look, painted?: string) {
  update((s) => {
    s.looks = { ...look, outfit: look.topColor, ...(painted ? { painted } : {}) };
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
    const total = Math.round(meal.price * CE.foodSurge(s)) + DELIVERY_FEE;
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
    if (!s.chapter) DA.visited(s, districtId);
  });
}

// ── Coming back: daily gifts, the weekly challenge and the guide for new players ──

/** Opening the game: make sure this week's challenge exists. */
export const openDay = () => update((s) => void DA.weekly(s));
export const claimDailyGift = () => update((s) => toast(s, DA.claimDaily(s)));
export const claimWeeklyChallenge = () => update((s) => toast(s, DA.claimWeekly(s)));
/** Move the new-player guide on (see ui/Guide.tsx), remembering your money when the earning step starts. */
export const setGuide = (step: number) =>
  update((s) => {
    s.flags.guide = step;
    s.flags.guide_money = s.stats.money;
  });

export function doAction(placeId: string, actionId: string): "loans" | "business" | void {
  let open: "loans" | "business" | undefined;
  update((s) => {
    const p = place(placeId);
    const a = p?.actions.find((item) => item.id === actionId);
    if (!p || !a || s.ending || s.event) return;
    if (!check(s, a.if)) return toast(s, a.lockedText ?? "You can't do that yet.");
    if (a.kind === "sleep") return sleep(s);
    if (a.kind === "paybill") return toast(s, payHospital(s));
    if (a.kind === "kitchen" || a.kind === "foodshop" || a.kind === "cookclass") {
      kitchen(s);
      const at = a.kind === "kitchen" ? "home" : null;
      const market = a.kind === "cookclass" ? "academy" : (a.deal ?? null);
      const tab = a.kind === "kitchen" ? "cook" : a.kind === "cookclass" ? "school" : "shop";
      setTimeout(() => bus.emit("kitchen", { at, market, tab }), 0);
      return;
    }
    if (a.kind === "negotiate" && a.deal) {
      const why = startNegotiation(s, a.deal);
      if (why) toast(s, why);
      return;
    }
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
    if (a.kind === "bizapp") {
      open = "business";
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
      const quiet = a.kind === "buycar" ? JU.layLowBlocks(s, "spend", a.cost ?? 0) : null;
      if (quiet) return toast(s, quiet);
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
  note(s, ...MI.checkMissions(s));
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
  if (s.banking?.job) return toast(s, "You work at a bank. Resign in the Careers app first."); 
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
      if (!s.loans.length) forget(s, "kash", "You missed a loan repayment");
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
    forget(s, id, "You went quiet for weeks");
    toast(s, "A good long call. The relationship stays warm.");
  });
}

// ── Travel ───────────────────────────────────────────────────────────────────

export function travel(placeId: string, mode: RideMode) {
  update((s) => {
    const p = place(placeId);
    if (!p) return;
    const d = district(p.district);
    if (shutOut(s, p.district)) return toast(s, d!.gate!.message);
    const banned = rideBan(mode, s.district, p.district);
    if (banned) return toast(s, banned);
    const stop = CE.rideStop(s);
    if (stop) return toast(s, stop);
    const to = arrivalOf(p);
    const cost = fare(mode, s.pos, to, CE.fareSurge(s, mode, p.district));
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
    DA.visited(s, p.district);
    const lines: Record<RideMode, string> = {
      okada: `Your okada man weaves through traffic like a man with no fear and drops you at ${p.name}. ${naira(cost)}.`,
      keke: `The keke rattles you to ${p.name}. The man beside you ate onions for breakfast. ${naira(cost)}.`,
      taxi: `The green-and-white taxi glides you to ${p.name}, AC on full. ${naira(cost)}.`,
      bus: `You squeeze onto the bus to ${p.name}. It takes forever.`,
    };
    toast(s, lines[mode]);
    // Ride along, seen from behind the okada, keke, taxi or bus.
    bus.emit("chaseDrive", { from, to, name: p.name, ride: mode });
  });
}

// ── Negotiation ──────────────────────────────────────────────────────────────

/** Sit down to negotiate a deal. */
export function negotiate(dealId: string) {
  update((s) => {
    if (s.chapter || s.ending || s.event) return;
    if (s.slot >= SLOTS.length) return toast(s, "It's too late to do business today. Come back tomorrow.");
    const why = startNegotiation(s, dealId);
    if (why) toast(s, why);
  });
}

export function negArgue(a: Approach) {
  update((s) => argue(s, a));
}

export function negTerms(terms: { id: string; included: boolean; amount?: number }[]) {
  update((s) => setTerms(s, terms));
}

export function negPropose(terms: { id: string; included: boolean; amount?: number }[]) {
  update((s) => {
    setTerms(s, terms);
    proposeOffer(s);
  });
}

export function negAccept() {
  update((s) => acceptCounter(s));
}

export function negBluff(kind: Bluff) {
  update((s) => bluff(s, kind));
}

export function negWalk() {
  update((s) => walkAway(s));
}

/** Leave the negotiation screen. Talking took time. */
export function negClose() {
  update((s) => {
    const n = s.life?.neg?.active;
    if (!n) return;
    const talked = n.attempts + n.rounds > 0;
    closeNegotiation(s);
    if (talked) spend(s, 1, -5);
    checkEndings(s);
  });
}

// ── Businesses ───────────────────────────────────────────────────────────────

export function business(action: { kind: "start" | "grow" | "visit" | "collect"; id: string }) {
  update((s) => {
    if (s.chapter || s.ending || s.event) return;
    if (action.kind === "start") toast(s, startBusiness(s, action.id));
    if (action.kind === "grow") toast(s, growBusiness(s, action.id));
    if (action.kind === "visit") {
      if (s.slot + 1 > SLOTS.length) return toast(s, "It's too late today. Check in tomorrow.");
      if (s.stats.energy < 10) return toast(s, "You're too tired. Rest first.");
      toast(s, visitBusiness(s, action.id));
      spend(s, 1, -10);
    }
    if (action.kind === "collect") {
      const cash = collect(s, action.id);
      if (cash <= 0) return toast(s, "There's no profit to take out yet.");
      toast(s, `You transfer ${naira(cash)} of profit to your account.`);
      addStat(s, "money", cash);
    }
    checkEndings(s);
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
/** FRSC at a checkpoint: on the map while driving, or on a drive somewhere (`onTrip`). */
export function frsc(onTrip = false) {
  update((s) => {
    const ev = frscStop(s, onTrip);
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
    if (shutOut(s, p.district)) return toast(s, d!.gate!.message);
    const stop = CE.rideStop(s);
    if (stop) return toast(s, stop);
    const to = arrivalOf(p);
    const cost = Math.round(fuelCost(s.pos, to) * CE.fuelSurge(s));
    if (s.stats.money < cost) return toast(s, `You need ${naira(cost)} for fuel${CE.fuelSurge(s) > 1 ? " (fuel scarcity prices)" : ""}.`);
    addStat(s, "money", -cost);
    const from = { ...s.pos };
    s.pos = to;
    s.district = p.district;
    DA.visited(s, p.district);
    toast(s, `You drive yourself to ${p.name}. Fuel: ${naira(cost)}.`);
    // Behind the wheel the whole way (FRSC may be on the route).
    bus.emit("chaseDrive", { from, to, name: p.name });
  });
}

// ── Day cycle ────────────────────────────────────────────────────────────────

const RENT: Record<string, number> = { lapo: 8000, average: 15000 };

function sleep(s: GameState) {
  if (JU.jailed(s)) return prisonSleep(s);
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
  if (s.kitchen) {
    const spoiled = spoil(s, s.kitchen.pantry, s.kitchen.leftovers, s.kitchen.waste);
    if (spoiled.length) note(s, `🗑️ Spoiled overnight: ${spoiled.slice(0, 4).join(", ")}${spoiled.length > 4 ? ` and ${spoiled.length - 4} more` : ""}.`);
    note(s, ...nightlyGarden(s));
    for (const v of s.kitchen.venues) spoil(s, v.stock, null, s.kitchen.waste);
    note(s, ...nightlyVenues(s));
    note(s, ...lateCatering(s));
  }
  life(s).driving = false;
  if (isDirty(s)) {
    note(s, `Your clothes haven't been washed in ${daysUnwashed(s)} days and it shows.`, offense(s, "dirty"), "Wash them at home or a laundry.");
  }
  const home = place(HOMES[s.background])!;
  s.pos = { ...arrivalOf(home) };
  s.district = home.district;
  bus.emit("teleport", s.pos);
  const adultDays = s.day - Number(s.flags.adult_day0 ?? s.day);
  if (adultDays > 0 && adultDays % DAYS_PER_YEAR === 0) {
    s.age += 1;
    s.toast = `${s.toast ? `${s.toast} ` : ""}Happy birthday. You are ${s.age}.`;
  }
  // What Abuja is going through today, and the markets' reaction to today's story.
  const before = new Set(CE.cityEvents(s.day - 1, 3).map((e) => e.id));
  for (const e of CE.cityEvents(s.day, 0)) if (!before.has(e.id) && e.id !== "flood") note(s, `${e.icon} ${e.headline}.`);
  CE.applyViral(s);
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
  const bankLines = nightlyBanking(s);
  if (bankLines.length) s.toast = `${s.toast ? `${s.toast} ` : ""}${bankLines.join(" ")}`;
  const fund = nightlySocial(s);
  if (fund) s.toast = `${s.toast ? `${s.toast} ` : ""}${fund}`;
  fadeMemories(s);
  note(s, JU.layLowNight(s) ?? "");
  note(s, JU.fugitiveNight(s) ?? "");
  note(s, BT.settleBets(s) ?? "");
  note(s, EK.payAllowance(s) ?? "");
  note(s, ...MI.checkMissions(s));
  pickEvent(s);
  checkEndings(s);
}

/** A night in the custodial centre: no bills, no city, just the count. */
function prisonSleep(s: GameState) {
  s.day += 1;
  s.slot = 0;
  s.stats.energy = clamp(100 - Math.round(s.stats.stress / 4));
  addStat(s, "stress", s.stats.stress > 40 ? -2 : 2);
  note(s, ...overnight(s));
  const lines = JU.prisonNight(s);
  note(s, ...lines);
  if (!JU.jailed(s)) bus.emit("teleport", s.pos);
  const adultDays = s.day - Number(s.flags.adult_day0 ?? s.day);
  if (adultDays > 0 && adultDays % DAYS_PER_YEAR === 0) {
    s.age += 1;
    note(s, `Happy birthday. You are ${s.age}, behind bars.`);
  }
  fadeMemories(s);
  if (s.stats.health <= 15) {
    s.stats.health = 40;
    note(s, "You collapse in the cell and wake up in the infirmary.");
  }
}

function weeklyBills(s: GameState) {
  const neg = s.life?.neg;
  const prepaid = (neg?.rentPrepaidUntil ?? 0) >= s.day;
  const rent = prepaid ? 0 : (neg?.rent ?? RENT[s.background] ?? 10000);
  // Food is now bought meal by meal; this is transport and data.
  const living = 3000 + 1500;
  addStat(s, "money", -(rent + living));
  // The Senator's envelope, every week you're still his liaison.
  if (s.flags.cap_liaison && !s.flags.cap_quit_senator && !s.flags.cap_truth && !s.flags.cap_bolaji) {
    withoutBankCheck(() => addStat(s, "money", 250000));
    toast(s, "An aide drops off the Senator's envelope: ₦250,000, cash.");
  }
  const lines = [`Weekly bills: ${prepaid ? "rent already paid ahead" : `rent ${naira(rent)}`}, transport and data ${naira(living)}.`];
  const flex = PH.weeklyPhone(s);
  if (flex) lines.push(flex);
  if (neg?.staff) {
    if (s.stats.money >= neg.staff.salary) {
      addStat(s, "money", -neg.staff.salary);
      lines.push(`${neg.staff.name}'s salary: ${naira(neg.staff.salary)}.`);
    } else {
      lines.push(`You couldn't pay ${neg.staff.name}. She has resigned.`);
      const mem = neg.npcs.blessing;
      if (mem) mem.rel = Math.max(-100, mem.rel - 20);
      neg.staff = null;
    }
  }
  lines.push(...weeklyNegotiation(s));
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
      remember(s, "kash", { what: "You missed a loan repayment", say: "\"My guy, you missed my repayment. My boys have your contacts list. Just saying.\"", tone: "debt", weight: loan.missed >= 2 ? 2 : 1 });
      missed = true;
      lines.push(`Missed a QuickKash repayment. Penalty added: you now owe ${naira(loan.owed)}.`);
    }
    loan.nextDue += 7;
  }
  s.loans = s.loans.filter((loan) => loan.owed > 0);
  if (s.kitchen?.utilities) {
    // Cooking gas and electricity go on the bill.
    const fuel = Math.round(s.kitchen.utilities);
    s.kitchen.utilities = 0;
    addStat(s, "money", -fuel);
    lines.push(`Cooking gas and power: ${naira(fuel)}.`);
  }
  if (s.kitchen) lines.push(...weeklyMarket(s), ...weeklyVenues(s));
  lines.push(...weeklyRent(s));
  lines.push(...weeklyPower(s));
  lines.push(...weeklyBusiness(s));
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
  for (const [id, entry] of Object.entries(s.npcs)) {
    if (entry.met && s.day - entry.lastSeen > 21)
      remember(s, id, { what: "You went quiet for weeks", say: "\"Ah, look who remembered me. I thought you'd travelled.\"", tone: "hurt", weight: 1 });
  }
}

function pickEvent(s: GameState) {
  if (s.event || s.ending) return;
  if (storyEvent(s)) return;
  if (s.stats.heat >= 100) {
    s.flags.arrested = true;
    return;
  }
  if (s.stats.heat >= 40 && Math.random() < s.stats.heat / 250) {
    s.event = "checkpoint";
    return;
  }
  if (Math.random() > 0.4) return;
  const quiet = JU.layingLow(s) || JU.fugitive(s);
  const pool = EVENTS.filter(
    (item) => item.weight > 0 && check(s, item.if) && !(item.once && s.usedEvents.includes(item.id)) && !(quiet && item.id.startsWith("fraud_")),
  );
  // While something is happening across the city, its own events come up far more often.
  const weight = (item: (typeof pool)[number]) => item.weight * (item.if?.cityEvent ? 5 : 1);
  const total = pool.reduce((sum, item) => sum + weight(item), 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= weight(item);
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
    const wasClean = !s.flags.fraud;
    const toasts = apply(s, choice.effects);
    if (s.flags.fraud && (wasClean || ev.id.startsWith("fraud_"))) JU.freshFraud(s);
    const line = [choice.result ? fill(s, choice.result) : "", ...toasts].filter(Boolean).join(" ");
    if (line) toast(s, line);
    // Escorted out: you end up back home.
    if (s.flags.escort) {
      s.flags.escort = false;
      s.flags.trespass_secs = 0;
      const home = place(HOMES[s.background])!;
      s.pos = { ...arrivalOf(home) };
      s.district = home.district;
      bus.emit("teleport", s.pos);
    }
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
    const charge = JU.chargeFor(s);
    if (charge) {
      note(s, JU.arrest(s, charge));
      return;
    }
    s.flags.arrested = false;
    addStat(s, "money", -100000);
    addStat(s, "stress", 20);
    s.stats.heat = 20;
    toast(s, "Arrested and held for two days. No charges stuck, but 'bail' cost ₦100,000.");
    report(s, { tag: "Crime", icon: "🚓", you: true, headline: "Young Abuja resident released after police detention", body: `${s.name} was held for two days and released without charge. Family members say 'bail' was paid. Police say bail is free.` });
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
    const salaried = job(s.job)?.salaried || Boolean(s.banking?.job);
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

/** Set up the trading account for a grown-up who doesn't have one yet. */
export function openTrading() {
  update((s) => {
    if (s.stage === "adult" && !s.chapter) ensureMarket(s);
  });
}

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

/** Whose memories a person keeps: their story character's, or their own for city folk. */
export function memoryKey(p: PersonDef): string {
  return p.npc ?? p.id;
}

/** What a person says today: one of their lines, the same all day. */
export function lineFor(s: GameState, p: PersonDef): string {
  let hash = s.day * 17;
  for (const char of p.id) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return fill(s, p.lines[hash % p.lines.length] ?? "");
}

export function offerFor(s: GameState, p: PersonDef) {
  if (s.flags[`offer_${personKey(p)}`] === beatKey(s)) return null;
  return p.talks?.find((t) => check(s, t.if)) ?? null;
}

export function talk(key: string) {
  update((s) => {
    const p = findPerson(key);
    if (!p || s.flags[`talked_${key}`] === beatKey(s)) return;
    s.flags[`talked_${key}`] = beatKey(s);
    const who = memoryKey(p);
    recalled(s, who);
    if (p.npc) {
      const current = s.npcs[p.npc] ?? { rel: 0, met: false, lastSeen: s.day };
      s.npcs[p.npc] = { rel: clamp(current.rel + 1), met: true, lastSeen: s.day };
      if (!current.met) remember(s, who, { what: sinceWhen(s), tone: "warm", weight: 3 });
      // You came back after a long silence: the hurt fades.
      forget(s, who, "You went quiet for weeks");
    }
  });
}

const COMEBACKS = [
  "\"Is it me you're talking to like that?\" They hiss and walk off, telling everyone who will listen.",
  "\"Your mates are building houses and you're here insulting people.\" A small crowd laughs at you.",
  "They stare at you for a long second. \"God will judge you.\" Somebody filmed it.",
  "\"Ehn? Say that one again!\" People hold them back. You leave quickly.",
];

/** Caught at school outside a story scene: the suspension or expulsion scene plays now. */
function schoolTrouble(s: GameState) {
  if (!s.chapter || !s.flags.discipline_due || !s.scene) return;
  const detour = disciplineDetour(s, s.scene);
  if (detour && detour !== s.scene) goScene(s, detour);
}

type Loot = { what: string; value: number; kind: "food" | "money" | "item" };

/** What there is to steal from someone, by where you are in life. */
const LOOT: Record<string, Loot[]> = {
  primary: [
    { what: "their lunch", value: 300, kind: "food" },
    { what: "₦200 from their school bag", value: 200, kind: "money" },
    { what: "their new pencil case", value: 600, kind: "item" },
  ],
  secondary: [
    { what: "their provisions (Milo, Peak milk, Indomie)", value: 3000, kind: "food" },
    { what: "₦2,000 from their locker", value: 2000, kind: "money" },
    { what: "their phone", value: 15000, kind: "item" },
  ],
  university: [
    { what: "their foodstuff from the hostel kitchen", value: 5000, kind: "food" },
    { what: "₦10,000 from their wallet", value: 10000, kind: "money" },
    { what: "their laptop charger", value: 8000, kind: "item" },
  ],
  nysc: [
    { what: "their provisions", value: 3000, kind: "food" },
    { what: "₦8,000 of their allawee", value: 8000, kind: "money" },
    { what: "their NYSC kit", value: 6000, kind: "item" },
  ],
  city: [
    { what: "food from their stall", value: 2500, kind: "food" },
    { what: "₦12,000 from their wallet", value: 12000, kind: "money" },
    { what: "their phone", value: 40000, kind: "item" },
  ],
};

/**
 * Steal from someone. Get away with it and you keep it (things you sell for
 * half). Get caught and the punishment fits the theft: buy food for everyone
 * you took food from, pay money back double, pay the full worth of a thing;
 * at school, strikes by how much it was worth; in the city, the police.
 */
export function steal(key: string) {
  update((s) => {
    const p = findPerson(key);
    if (!p || p.story) return;
    if (s.flags[`stole_${key}`] === beatKey(s)) return toast(s, "They're holding their things tight now. Not today.");
    s.flags[`stole_${key}`] = beatKey(s);
    const table = LOOT[p.map] ?? LOOT.city!;
    const loot = table[Math.floor(Math.random() * table.length)]!;
    const who = memoryKey(p);
    const odds = Math.min(0.75, 0.4 + s.skills.hustle / 250);
    if (Math.random() < odds) {
      if (loot.kind === "money") withoutBankCheck(() => addStat(s, "money", loot.value));
      else if (loot.kind === "item") (s.stash ??= []).push({ what: loot.what.replace(/^their /, ""), value: loot.value, from: key, day: s.day });
      else addStat(s, "stress", -3);
      if (!s.chapter) addStat(s, "heat", 2);
      s.flags.thefts = Number(s.flags.thefts ?? 0) + 1;
      toast(s, `You take ${loot.what} and nobody sees. ${loot.kind === "money" ? `+${naira(loot.value)}.` : loot.kind === "item" ? "It's in your bag. Now find someone to sell it to." : "It tastes like guilt."}`);
      return;
    }
    // Caught.
    const cost = loot.kind === "money" ? loot.value * 2 : loot.kind === "food" ? loot.value * 3 : loot.value;
    const how =
      loot.kind === "food"
        ? `You're made to buy food for everyone you took from: ${naira(cost)}.`
        : loot.kind === "money"
          ? `You pay it back double: ${naira(cost)}.`
          : `It goes back, and you pay its full worth: ${naira(cost)}.`;
    addStat(s, "money", -Math.min(cost, Math.max(0, s.stats.money)));
    if (p.npc) {
      const n = s.npcs[p.npc] ?? { rel: 0, met: true, lastSeen: s.day };
      s.npcs[p.npc] = { ...n, rel: clamp(n.rel - 15), met: true };
    }
    remember(s, who, { what: "You stole from them", say: "\"Keep your hands where I can see them. I haven't forgotten what you did.\"", tone: "hurt", weight: 2 });
    const lines: string[] = [`Caught taking ${loot.what}! ${how}`];
    if (s.chapter) {
      // At school: strikes by how much it was worth, enough for a suspension when it's big.
      const strikes = loot.value >= 10000 ? 3 : loot.value >= 1000 ? 2 : 1;
      lines.push(...apply(s, [{ discipline: strikes }]));
      if (s.stage === "primary") lines.push("And you sweep the classroom every day for a week.");
    } else {
      lines.push(offense(s, "steal"));
      addStat(s, "heat", Math.ceil(loot.value / 2000));
      if (loot.value >= 20000 && Math.random() < 0.5) {
        s.flags.arrested = true;
        s.flags.arrest_theft = true;
        lines.push("Someone calls the police.");
      }
    }
    toast(s, lines.join(" "));
    schoolTrouble(s);
    checkEndings(s);
  });
}

/** People who buy stolen things without asking questions: better prices, less risk. */
const FENCES = new Set(["slim", "agbero", "okada", "tobi", "chuka", "kiosk", "pos_agent", "hawker"]);

/** What someone would pay for your stash, and whether they might turn you in. */
export function stashOffer(s: GameState, key: string): { pay: number; risk: number; owner: boolean } | null {
  const p = findPerson(key);
  if (!p || p.story || !s.stash?.length) return null;
  const owner = s.stash.some((x) => x.from === key);
  const fence = FENCES.has(p.id) || FENCES.has(p.npc ?? "");
  const worth = s.stash.reduce((n, x) => n + x.value, 0);
  return { pay: Math.round((worth * (fence ? 0.6 : 0.4)) / 50) * 50, risk: owner ? 1 : fence ? 0.08 : 0.3, owner };
}

/** Sell everything you've stolen to this person. Some will turn you in; never try it on the owner. */
export function sellStash(key: string) {
  update((s) => {
    const offer = stashOffer(s, key);
    const p = findPerson(key);
    if (!offer || !p || !s.stash) return;
    if (Math.random() < offer.risk) {
      const worth = s.stash.reduce((n, x) => n + x.value, 0);
      const theirs = s.stash.find((x) => x.from === key)?.what ?? "thing";
      s.stash = [];
      addStat(s, "money", -Math.min(worth, Math.max(0, s.stats.money)));
      remember(s, memoryKey(p), { what: "You tried to sell them stolen goods", say: "\"You tried to sell me stolen things. Do I look like a thief to you?\"", tone: "hurt", weight: 2 });
      const lines = [offer.owner ? `"That's MY ${theirs}!" You tried to sell it back to its owner.` : `${p.name} recognises the goods as stolen and reports you.`, `Everything is taken back, and you pay its full worth: ${naira(worth)}.`];
      if (s.chapter) lines.push(...apply(s, [{ discipline: 2 }]));
      else {
        lines.push(offense(s, "steal"));
        addStat(s, "heat", 6);
      }
      toast(s, lines.join(" "));
      schoolTrouble(s);
      return;
    }
    const n = s.stash.length;
    s.stash = [];
    withoutBankCheck(() => addStat(s, "money", offer.pay));
    if (!s.chapter) addStat(s, "heat", 2);
    toast(s, `${p.name} looks over the ${n > 1 ? `${n} things` : "goods"}, asks no questions, and pays ${naira(offer.pay)}.`);
  });
}

// ── Banking careers ──────────────────────────────────────────────────────────

/** Run a banking action and show its line. Actions that take time spend slots and energy. */
function bankDo(fn: (s: GameState) => string, slots = 0, energy = 0) {
  update((s) => {
    if (s.chapter || s.ending) return;
    if (slots && s.slot + slots > SLOTS.length) return toast(s, "It's too late for that today. Come back tomorrow morning.");
    const line = fn(s);
    if (line) toast(s, line);
    if (slots) spend(s, slots, energy);
    checkEndings(s);
  });
}
export const bankApply = (v: BK.Vacancy) => bankDo((s) => BK.apply(s, v), 1, -5);
export const bankAutoStage = (id: string) => bankDo((s) => BK.runAutoStage(s, id), 1, -5);
export const bankSubmitStage = (id: string, score: number, conduct: number) => bankDo((s) => BK.submitStage(s, id, score, conduct), 1, -5);
export const bankWithdraw = (id: string) => bankDo((s) => (BK.withdraw(s, id), "Application withdrawn."));
export const bankAccept = (id: string) => bankDo((s) => BK.acceptOffer(s, id));
export const bankTraining = (correct: number, of: number) => bankDo((s) => BK.finishTraining(s, correct, of), 1, -10);
export const bankWorkday = (results: BK.TaskResult[]) => bankDo((s) => BK.finishWorkday(s, results), 2, -25);
export const bankLeave = () => bankDo((s) => BK.takeLeave(s), SLOTS.length - 1, 0);
export const bankFinance = (amount: number, item: string) => bankDo((s) => BK.takeFinance(s, amount, item));
export const bankPromotion = (score: number) => bankDo((s) => BK.promotionPanel(s, score), 1, -5);
export const bankAppointment = (accept: boolean) => bankDo((s) => BK.respondAppointment(s, accept));
export const bankResign = () => bankDo((s) => BK.resign(s));

// ── Instaflex ────────────────────────────────────────────────────────────────

export const socialCreate = (handle: string) => update((s) => toast(s, SO.createAccount(s, handle)));
export function socialPost(kind: SO.ContentKind, collab?: string) {
  update((s) => {
    const quiet = JU.layLowBlocks(s, "post");
    if (quiet) return toast(s, quiet);
    const r = SO.post(s, kind, collab);
    toast(s, [r.text, ...(r.strike ? apply(s, [{ discipline: 1 }]) : [])].join(" "));
    schoolTrouble(s);
  });
}
export const socialBuyFollowers = (n: number, price: number) => update((s) => toast(s, SO.buyFollowers(s, n, price)));
export const socialBuyLikes = () => update((s) => toast(s, SO.buyLikes(s)));
export function socialReply(id: string, how: Parameters<typeof SO.reply>[2]) {
  update((s) => {
    const line = SO.reply(s, id, how);
    if (line) toast(s, line);
  });
}
export const socialAddFriend = (id: string) => update((s) => toast(s, SO.addFriend(s, id)));
export function socialDeal(id: string, take: boolean) {
  update((s) => {
    if (!take) return SO.declineDeal(s, id);
    const r = SO.takeDeal(s, id);
    toast(s, [r.text, ...(r.strike ? apply(s, [{ discipline: 2 }]) : [])].join(" "));
    schoolTrouble(s);
  });
}

/** Insult someone: people remember, and so does your reputation. */
export function insult(key: string) {
  update((s) => {
    const p = findPerson(key);
    if (!p || s.flags[`insulted_${key}`] === beatKey(s)) return;
    s.flags[`insulted_${key}`] = beatKey(s);
    if (p.npc) {
      const current = s.npcs[p.npc] ?? { rel: 0, met: true, lastSeen: s.day };
      s.npcs[p.npc] = { ...current, rel: clamp(current.rel - 12), met: true };
    }
    const before = memoriesOf(s, memoryKey(p)).find((m) => m.what === "You insulted them in public");
    remember(s, memoryKey(p), {
      what: "You insulted them in public",
      say: before
        ? "\"This is the second time you've disgraced me in public. I'm counting, o.\""
        : "\"I haven't forgotten how you insulted me in front of everybody. Just so you know.\"",
      tone: "hurt",
      weight: before ? 3 : 2,
    });
    addStat(s, "stress", -2);
    toast(s, `${COMEBACKS[(s.day + key.length) % COMEBACKS.length]} ${offense(s, "insult")}`);
  });
}

export function takeOffer(key: string, choice: Choice) {
  update((s) => {
    const p = findPerson(key);
    if (!p || !canPick(s, choice) || s.flags[`offer_${key}`] === beatKey(s)) return;
    const time = (choice.effects ?? []).reduce((sum, e) => sum + (e.time ?? 0), 0);
    if (s.stage === "adult" && !s.chapter && time && s.slot + time > SLOTS.length) return toast(s, "It's too late for that today.");
    s.flags[`offer_${key}`] = beatKey(s);
    const rel = (choice.effects ?? []).reduce((sum, e) => sum + (e.npc ? (e.rel ?? 0) : 0), 0);
    const toasts = apply(s, choice.effects);
    schoolTrouble(s);
    // A conversation can lead straight into a story scene.
    const forced = s.flags.force_event;
    if (typeof forced === "string" && forced) {
      s.flags.force_event = "";
      s.event = forced;
    }
    if (p.npc && !(choice.effects ?? []).some((e) => e.remember)) {
      if (rel >= 4) remember(s, memoryKey(p), { what: "You came through for them", say: "\"You came through for me that time. I won't forget it.\"", tone: "warm", weight: rel >= 10 ? 2 : 1 });
      else if (rel <= -4) remember(s, memoryKey(p), { what: "You let them down", say: "\"Last time, you let me down. Let's see about today.\"", tone: "hurt", weight: rel <= -10 ? 2 : 1 });
    }
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

// ── Who belongs where ─────────────────────────────────────────────────────────

/** Whether you belong in a district: no gate, or you meet its condition. */
export function welcome(s: GameState, districtId: string): boolean {
  const d = district(districtId);
  return !d?.gate || check(s, d.gate.if);
}

/** A district you can't enter at all (a hard gate you don't pass). */
export function shutOut(s: GameState, districtId: string): boolean {
  const d = district(districtId);
  return Boolean(d?.gate?.hard) && !check(s, d!.gate!.if);
}

/** Dressed the part: the smart painted outfits (senator wear, blazers) draw fewer looks. */
function looksThepart(s: GameState): boolean {
  return /-(3|4)$/.test(s.looks.painted ?? "") || s.stats.reputation >= 35;
}

/**
 * A second spent somewhere you don't belong (a soft-gated rich area). The
 * longer you hang about, the likelier security or a police patrol stops you.
 * Driving your own car or looking the part halves the risk.
 */
export function trespass(districtId: string, driving: boolean) {
  update((s) => {
    if (s.event || s.ending || s.chapter || welcome(s, districtId)) return;
    const secs = Number(s.flags.trespass_secs ?? 0) + 1;
    s.flags.trespass_secs = secs;
    // A quiet first minute, then rising odds.
    if (secs < 20) return;
    let p = Math.min(0.06, 0.008 + (secs - 20) * 0.0006);
    if (driving) p /= 2;
    if (looksThepart(s)) p /= 2;
    if (s.slot >= 2) p *= 1.5;
    if (Math.random() >= p) return;
    s.flags.trespass_secs = 0;
    s.event = s.slot >= 2 || Math.random() < 0.4 ? "trespass_police" : "trespass_security";
  });
}

/** Out of the rich areas: the clock resets. */
export function leftRichArea() {
  update((s) => {
    if (Number(s.flags.trespass_secs ?? 0) > 0) s.flags.trespass_secs = 0;
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
  }).map((p) => ({ ...arrivalOf(p), label: p.name }));
}

/** Seconds allowed for a leg: a fair walk (or ride) by road, plus a little slack. */
function stepLimit(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return Math.round((Math.abs(to.x - from.x) + Math.abs(to.y - from.y)) / 119 + 15);
}

function startTask(s: GameState, kind: "delivery" | "hawk" | "ride", app?: "zoom" | "ownprice") {
  const spots = openSpots(s).sort(() => Math.random() - 0.5);
  const steps: TaskStep[] = [];
  if (kind === "delivery") {
    const hub = place("garki_hub")!;
    const pickup = { ...arrivalOf(hub), label: "Garki Delivery Hub" };
    // Drops around the hub's side of town, not across the whole city.
    const nearHub = spots.filter((sp) => sp.label !== "Garki Delivery Hub" && Math.hypot(sp.x - pickup.x, sp.y - pickup.y) < 1875);
    for (const drop of (nearHub.length >= 3 ? nearHub : spots.filter((sp) => sp.label !== "Garki Delivery Hub")).slice(0, 3)) {
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

// ── Cooking ──────────────────────────────────────────────────────────────────

/** Minutes of cooking become time out of your day. */
function cookTime(s: GameState, minutes: number) {
  const slots = minutes >= 150 ? 2 : minutes >= 35 ? 1 : 0;
  if (slots) spend(s, slots, -4 * slots);
  else addStat(s, "energy", -2);
}

/** Cook a recipe at home (or at your venue). Returns what happened for the screen. */
export function cookAt(where: "home" | string, recipeId: string, perf: Performance, opts: { custom?: string; tier?: Tier } = {}): CookResult {
  let out: CookResult = { ok: false, text: "" };
  update((s) => {
    if (s.chapter || s.ending) return;
    const r = recipeDef(recipeId);
    if (r && s.slot >= SLOTS.length) {
      out = { ok: false, text: "It's too late to start cooking. Sleep first." };
      return;
    }
    out = cookRecipe(s, where, recipeId, perf, opts);
    if (out.ok) cookTime(s, out.minutes ?? 30);
    if (out.text) toast(s, out.text);
  });
  return out;
}

export function experimentAt(picks: { lot: string; qty: number }[], method: Method, perf: Performance): CookResult {
  let out: CookResult = { ok: false, text: "" };
  update((s) => {
    if (s.chapter || s.ending) return;
    out = experimentDish(s, picks, method, perf);
    if (out.ok) cookTime(s, 40);
    if (out.text) toast(s, out.text);
  });
  return out;
}

export function eatLeftover(dishId: string) {
  update((s) => {
    const line = eatDish(s, dishId, (food, water) => {
      const l = life(s);
      l.food = Math.min(100, l.food + food);
      l.water = Math.min(100, l.water + water);
    });
    if (line) toast(s, line);
  });
}

export function throwAway(kind: "lot" | "dish", id: string) {
  update((s) => {
    const k = kitchen(s);
    if (kind === "lot") {
      const l = k.pantry.find((x) => x.id === id);
      if (l) k.waste.push({ day: s.day, what: `${l.qty} × ${ingDef(l.ing)?.name ?? l.ing} (thrown away)`, value: (ingDef(l.ing)?.price ?? 0) * l.qty });
      k.pantry = k.pantry.filter((x) => x.id !== id);
    } else {
      const d = k.leftovers.find((x) => x.id === id);
      if (d) k.waste.push({ day: s.day, what: `${d.portions} × ${d.name} (thrown away)`, value: 0 });
      k.leftovers = k.leftovers.filter((x) => x.id !== id);
    }
  });
}

export function storeLot(id: string, to: Storage) {
  update((s) => {
    const k = kitchen(s);
    toast(s, moveLot(s, k.pantry, k.equipment, id, to));
  });
}

/** Buy ingredients from a market or delivery service. */
export function buyFood(sourceId: string, id: string, tier: Tier, qty: number, where: "home" | string = "home") {
  update((s) => {
    const src = SOURCES.find((x) => x.id === sourceId);
    const def = ingDef(id);
    if (!src || !def || !src.tiers.includes(tier) || !sells(src, def) || qty <= 0) return;
    const k = kitchen(s);
    const total = foodPrice(s, id, tier, src) * qty + (src.fee && !s.flags[`chopnow_fee_${s.day}_${s.slot}`] ? src.fee : 0);
    if (s.stats.money < total) return toast(s, `You need ${naira(total)}.`);
    addStat(s, "money", -total);
    if (src.fee) s.flags[`chopnow_fee_${s.day}_${s.slot}`] = true;
    const v = where === "home" ? null : k.venues.find((x) => x.id === where);
    const placed = addLot(s, v ? v.stock : k.pantry, v ? v.equipment : k.equipment, id, tier, qty, null);
    toast(s, `Bought ${qty} × ${def.name.toLowerCase()} (${tier}) for ${naira(total)}. Stored in the ${placed === "pantry" ? "cupboard" : placed}.`);
  });
}

/** Buy kitchen equipment: delivered and installed. */
export function buyEquipment(id: string, tier: EquipTier, where: "home" | string = "home") {
  update((s) => {
    const def = equipDef(id);
    const st = equipStats(id, tier);
    if (!def || !st) return;
    const k = kitchen(s);
    const v = where === "home" ? null : k.venues.find((x) => x.id === where);
    if (where === "home" && def.scope === "pro") return toast(s, "That's commercial kit. It won't fit a home kitchen.");
    if (v && def.scope === "home") return toast(s, "That's home kit. Buy the commercial version for a business.");
    const delivery = st.price > 100_000 ? 5000 : 1500;
    if (s.stats.money < st.price + delivery) return toast(s, `You need ${naira(st.price + delivery)} including delivery.`);
    const kit = v ? v.equipment : k.equipment;
    const item = { uid: `e${Date.now().toString(36)}${kit.length}`, def: id, tier, condition: 100, clean: 100, broken: false };
    if (v && !placeKit(v, item)) return toast(s, "There's no room left in the kitchen. Sell something first.");
    kit.push(item);
    addStat(s, "money", -(st.price + delivery));
    toast(s, `${def.icon} New ${def.name.toLowerCase()} (${tier}) delivered and installed for ${naira(st.price)} plus ${naira(delivery)} delivery.`);
  });
}

export function sellEquipment(uidValue: string, where: "home" | string = "home") {
  update((s) => {
    const k = kitchen(s);
    const v = where === "home" ? null : k.venues.find((x) => x.id === where);
    const kit = v ? v.equipment : k.equipment;
    const o = kit.find((x) => x.uid === uidValue);
    if (!o) return;
    const value = Math.round((equipStats(o.def, o.tier)?.price ?? 0) * (o.broken ? 0.1 : 0.35 * (o.condition / 100)));
    if (v) v.equipment = v.equipment.filter((x) => x.uid !== uidValue);
    else k.equipment = k.equipment.filter((x) => x.uid !== uidValue);
    addStat(s, "money", value);
    toast(s, `Sold your ${equipDef(o.def)?.name.toLowerCase()} for ${naira(value)}.`);
  });
}

export function repairEquipment(uidValue: string, where: "home" | string = "home") {
  update((s) => {
    const k = kitchen(s);
    const v = where === "home" ? null : k.venues.find((x) => x.id === where);
    toast(s, repairKit(s, v ? v.equipment : k.equipment, uidValue));
  });
}

export function scrubKitchen() {
  update((s) => {
    if (s.slot >= SLOTS.length) return toast(s, "Too late for cleaning. Sleep.");
    toast(s, cleanKitchen(s));
    const dishwasher = kitchen(s).equipment.some((o) => o.def === "dishwasher" && !o.broken);
    if (dishwasher) addStat(s, "energy", -4);
    else spend(s, 1, -8);
  });
}

export function saveRecipeVersion(base: string, name: string, flavor: Performance["season"], signature: boolean) {
  update((s) => toast(s, saveCustom(s, base, name, flavor, signature)));
}

export function toggleFavorite(id: string) {
  update((s) => {
    const k = kitchen(s);
    k.favorites = k.favorites.includes(id) ? k.favorites.filter((x) => x !== id) : [...k.favorites, id];
  });
}

export function gardenAction(action: { kind: "plant"; plot: number; crop: string } | { kind: "water" } | { kind: "harvest"; plot: number }) {
  update((s) => {
    if (action.kind === "plant") toast(s, plantPlot(s, action.plot, action.crop));
    if (action.kind === "water") toast(s, waterGarden(s));
    if (action.kind === "harvest") toast(s, harvestPlot(s, action.plot));
  });
}

/** Buy a cookbook: learn every recipe in it. */
export function buyBook(title: string) {
  update((s) => {
    const book = BOOKS.find((b) => b.id === title);
    if (!book) return;
    const k = kitchen(s);
    k.books ??= [];
    if (k.books.includes(title)) return toast(s, "You already own that book.");
    if (s.stats.money < book.price) return toast(s, `The book costs ${naira(book.price)}.`);
    addStat(s, "money", -book.price);
    k.books.push(title);
    const learned = RECIPES.filter((r) => r.source === "book" && r.from === title && learn(s, r.id));
    toast(s, `📖 ${title}: ${learned.length} new recipes in your book (${learned.map((r) => r.name).slice(0, 4).join(", ")}${learned.length > 4 ? "…" : ""}).`);
  });
}

export function takeClass(id: string) {
  update((s) => {
    const c = CLASSES.find((x) => x.id === id);
    if (!c) return;
    if (s.slot + 2 > SLOTS.length) return toast(s, "The class runs for half a day. Come back in the morning.");
    if (s.stats.money < c.price) return toast(s, `The class costs ${naira(c.price)}.`);
    addStat(s, "money", -c.price);
    const k = kitchen(s);
    const learned = c.recipes.filter((r) => learn(s, r));
    k.skills.cooking = Math.min(100, k.skills.cooking + 4);
    k.skills.baking = Math.min(100, k.skills.baking + (id === "class_pastry" ? 8 : 2));
    k.skills.presentation = Math.min(100, k.skills.presentation + 3);
    spend(s, 2, -15);
    toast(s, `👩‍🍳 ${c.title}: you learned ${learned.map((r) => recipeDef(r)?.name).join(", ") || "techniques you already knew"}, and your skills improved.`);
  });
}

export { CROPS, cookMinutes };

/** Share a cooked dish: a quick meal, a dinner party, or a romantic dinner. Returns what people said. */
export function hostMeal(dishId: string, guestIds: string[], kind: MealKind): { ok: boolean; lines: string[]; avg: number } {
  let out: { ok: boolean; lines: string[]; avg: number } = { ok: false, lines: [], avg: 0 };
  update((s) => {
    if (s.chapter || s.ending) return;
    if (kind !== "meal" && s.slot >= SLOTS.length) {
      out = { ok: false, lines: ["It's too late to host anyone tonight."], avg: 0 };
      return;
    }
    const all = guestList(s);
    const guests = guestIds.map((id) => all.find((g) => g.id === id)).filter((g): g is NonNullable<typeof g> => Boolean(g && !g.fedToday));
    out = shareMeal(s, dishId, guests, kind, (g, change) => {
      if (g.kind === "partner") {
        const p = s.partners[g.id];
        if (p) {
          p.affection = Math.max(0, Math.min(100, p.affection + change));
          p.lastSeen = s.day;
        }
      } else if (g.kind === "family") {
        addStat(s, "stress", -Math.max(0, change));
      } else {
        const n = s.npcs[g.id] ?? { rel: 0, met: true, lastSeen: s.day };
        s.npcs[g.id] = { ...n, rel: Math.max(0, Math.min(100, n.rel + change)), lastSeen: s.day };
        const dish = (recipeDef(dishId)?.name ?? "your food").toLowerCase();
        if (change >= 4) remember(s, g.id, { what: `You cooked ${dish} for them`, say: `"That ${dish} you made me… I'm still thinking about it. When are you cooking again?"`, tone: "warm", weight: change >= 8 ? 2 : 1 });
        else if (change < 0) remember(s, g.id, { what: `Your ${dish} didn't go down well`, say: `"No offence, but that ${dish} you gave me… my stomach is still recovering."`, tone: "hurt", weight: 1 });
      }
    });
    if (!out.ok) return;
    if (kind === "meal") addStat(s, "energy", -2);
    else spend(s, 1, -6);
    toast(s, out.lines[out.lines.length - 1] ?? "");
  });
  return out;
}

export function phoneMum() {
  update((s) => toast(s, callMum(s)));
}

// ── Food businesses ──────────────────────────────────────────────────────────

/** Most venue actions are a call into venues.ts and a toast. */
function venueDo(fn: (s: GameState) => string) {
  update((s) => {
    if (s.chapter || s.ending) return;
    kitchen(s);
    const line = fn(s);
    if (line) toast(s, line);
  });
}

export const openFoodVenue = (type: string, district: string, name: string) => venueDo((s) => V.openVenue(s, type, district, name));
export const hireStaff = (vid: string, candidate: string) => venueDo((s) => V.hire(s, vid, candidate));
export const fireStaff = (vid: string, staff: string) => venueDo((s) => V.fire(s, vid, staff));
export const addMenuItem = (vid: string, recipeId: string, custom?: string) => venueDo((s) => V.addToMenu(s, vid, recipeId, custom));
export const venueDeepClean = (vid: string) => venueDo((s) => V.deepClean(s, vid));
export const venuePromote = (vid: string) => venueDo((s) => V.promote(s, vid));
export const venueSell = (vid: string) => venueDo((s) => V.sellVenue(s, vid));
export const truckMove = (vid: string, district: string) => venueDo((s) => V.moveTruck(s, vid, district));
export const cateringAccept = (id: string) => venueDo((s) => V.acceptCatering(s, id));
export const cateringDeliver = (id: string) => venueDo((s) => V.deliverCatering(s, id));
export const competitionEnter = (eventId: string, dishId: string) => venueDo((s) => V.enterCompetition(s, eventId, dishId));
export const festivalSell = (eventId: string) =>
  venueDo((s) => {
    if (s.slot >= SLOTS.length) return "The festival is over for today.";
    const line = V.sellAtFestival(s, eventId);
    if (line.startsWith("🎪")) spend(s, 2, -15);
    return line;
  });
export const cateringCook = (id: string, vid: string, recipeId: string) =>
  venueDo((s) => {
    if (s.slot >= SLOTS.length) return "Too late to cook tonight.";
    const line = V.cookForCatering(s, id, vid, recipeId);
    if (line.startsWith("Cooked")) spend(s, 1, -8);
    return line;
  });

export function editMenu(vid: string, recipeId: string, custom: string | undefined, patch: { price?: number; tier?: Tier; active?: boolean; remove?: boolean }) {
  update((s) => {
    const v = kitchen(s).venues.find((x) => x.id === vid);
    if (!v) return;
    const m = v.menu.find((x) => x.recipe === recipeId && x.custom === custom);
    if (!m) return;
    if (patch.remove) v.menu = v.menu.filter((x) => x !== m);
    if (patch.price != null) m.price = Math.max(50, Math.round(patch.price / 50) * 50);
    if (patch.tier) m.tier = patch.tier;
    if (patch.active != null) m.active = patch.active;
  });
}

export function setVenue(vid: string, patch: { delivery?: boolean; portion?: number; autoStock?: boolean; name?: string }) {
  update((s) => {
    const v = kitchen(s).venues.find((x) => x.id === vid);
    if (!v) return;
    if (patch.delivery != null && !V.venueType(v.type)?.delivery) v.delivery = patch.delivery;
    if (patch.portion != null) v.portion = Math.max(0.8, Math.min(1.4, Math.round(patch.portion * 20) / 20));
    if (patch.autoStock != null) v.autoStock = patch.autoStock;
    if (patch.name) v.name = patch.name.trim().slice(0, 36) || v.name;
  });
}

export function moveVenueKit(vid: string, kitUid: string, cell: number) {
  update((s) => {
    const v = kitchen(s).venues.find((x) => x.id === vid);
    if (v) V.moveKit(v, kitUid, cell);
  });
}

/** Run a service. Working it yourself takes a time slot and energy. */
export function venueService(vid: string, you: boolean): V.ServiceReport {
  let out: V.ServiceReport = { ok: false, text: "" };
  update((s) => {
    if (s.chapter || s.ending) return;
    if (s.slot >= SLOTS.length) {
      out = { ok: false, text: "Everything's closed. Sleep and open tomorrow." };
      return;
    }
    if (you) {
      const hurt = tooHurtFor(s, -12);
      if (hurt) {
        out = { ok: false, text: hurt };
        return;
      }
    }
    out = V.runService(s, vid, you);
    if (out.ok && you) spend(s, 1, -12);
    toast(s, out.text);
  });
  return out;
}

// ── City property and buildings ─────────────────────────────────────────────

export const buyProperty = (id: string) => venueDo((s) => JU.layLowBlocks(s, "spend", 1_000_000) ?? buyLot(s, id));
export const sellProperty = (id: string) => venueDo((s) => sellLot(s, id));
export const upgradeProperty = (id: string) => venueDo((s) => upgradeLot(s, id));
export const redevelopProperty = (id: string, def: string) => venueDo((s) => redevelop(s, id, def));

/** Do something at a city building (eat, study, pray…): same rules as a place action. */
export function lotAction(lotId: string, actionId: string) {
  update((s) => {
    const info = lotInfo(s, lotId);
    const a = info?.def.actions?.find((x) => x.id === actionId);
    if (!info || !a || s.ending || s.event) return;
    if (a.open && !info.open) return toast(s, `${info.def.name} is closed right now.`);
    if (a.slots && s.slot + a.slots > SLOTS.length) return toast(s, "It's too late for that today.");
    const cost = a.cost ?? 0;
    if (cost && s.stats.money < cost) return toast(s, `You need ${naira(cost)}.`);
    if (cost) addStat(s, "money", -cost);
    const lines = apply(s, a.effects);
    spend(s, a.slots, a.energy);
    toast(s, lines[0] ?? a.text ?? `${a.label.replace(/\s*\(.*\)$/, "")}: done.`);
  });
}

/** Make sure the kitchen exists before the screen shows it. */
export function openKitchen() {
  update((s) => {
    kitchen(s);
  });
}

// ── Court, prison and evidence ───────────────────────────────────────────────

export const courtHire = (id: JU.LawyerId) => update((s) => toast(s, JU.hireLawyer(s, id)));
export const courtSettle = () => update((s) => toast(s, JU.settleCourt(s).line));
export function courtPlead(guilty: boolean) {
  update((s) => {
    const v = JU.plead(s, guilty);
    toast(s, v.line);
    bus.emit("teleport", s.pos);
  });
}

export function prisonDo(act: JU.PrisonAct) {
  update((s) => {
    if (!JU.jailed(s)) return;
    const a = JU.ACTS[act];
    if (a.slots && s.slot + a.slots > SLOTS.length) return toast(s, "Lock-up. Back to your cell and sleep.");
    if (a.energy < 0 && s.stats.energy < -a.energy) return toast(s, "You're too tired. Sleep on your bunk.");
    const { line, took } = JU.prisonAct(s, act);
    toast(s, line);
    if (!JU.jailed(s)) {
      bus.emit("teleport", s.pos);
      return;
    }
    if (a.slots && took) spend(s, a.slots, a.energy);
  });
}

/** Rest on your bunk until morning, or let a whole week pass. */
export function prisonSleepNow(days = 1) {
  update((s) => {
    if (!JU.jailed(s)) return;
    toast(s, days > 1 ? `You keep your head down for ${days} days.` : "Lights out on the bunk.");
    for (let i = 0; i < days && JU.jailed(s); i += 1) {
      // A quiet day: the routine of meals, a shift and the yard.
      if (days > 1) {
        JU.prisonAct(s, "eat");
        JU.prisonAct(s, "eat");
        JU.prisonAct(s, "work");
        JU.prisonAct(s, "exercise");
      }
      sleep(s);
    }
    if (days > 1) s.toast = s.toast?.split(" ").slice(0, 120).join(" ") ?? null;
  });
}

export function escapeDone(ok: boolean, stage: string) {
  update((s) => {
    toast(s, JU.escapeResult(s, ok, stage));
    if (ok) bus.emit("teleport", s.pos);
  });
}

export function acceptLifeSentence() {
  update((s) => {
    if (!JU.acceptLife(s)) return;
    addLog(s, "Accepted a life sentence at Kuje.");
    end(s, "jail");
  });
}

export const evidenceClear = (id: string) => update((s) => toast(s, JU.clearEvidence(s, id)));
export const layLow = () => update((s) => toast(s, JU.startLayLow(s)));
export const endLayLow = () => update((s) => toast(s, JU.stopLayLow(s)));
export const turnIn = () => update((s) => toast(s, JU.surrenderFugitive(s)));

// ── Nepo friends ─────────────────────────────────────────────────────────────

/** Visiting a place in town: a nepo friend might be there. */
export function bumpInto(placeId: string) {
  update((s) => {
    const who = NE.townBump(s, placeId);
    if (who) s.nepoMeet = who;
  });
}
export const nepoMeet = (how: NE.MeetChoice) => update((s) => toast(s, NE.meet(s, how)));
export const nepoHang = (id: NE.NepoId) => update((s) => toast(s, NE.hangOut(s, id)));
export function nepoFavour(id: NE.NepoId, favour: string) {
  update((s) => {
    const r = NE.askFavour(s, id, favour);
    toast(s, r.line);
  });
}

// ── Betting and missions ─────────────────────────────────────────────────────

export const placeBet = (picks: { fixture: string; pick: BT.Pick }[], stake: number) => update((s) => toast(s, BT.placeBet(s, picks, stake)));
export const setBetLimit = (limit: number | null) => update((s) => toast(s, BT.setLimit(s, limit)));
export const choosePath = (path: MI.PathId) => update((s) => toast(s, MI.choosePath(s, path)));
export const skipPaths = () => update((s) => { s.flags.missions_seen = true; });
/** Opening the Missions app: tick off anything already done. */
export const refreshMissions = () =>
  update((s) => {
    const lines = MI.checkMissions(s);
    if (lines.length) toast(s, lines.join(" "));
  });

// ── Emeka D ──────────────────────────────────────────────────────────────────

export const emekaMeet = (how: "friend" | "interest" | "ignore") => update((s) => toast(s, EK.meet(s, how)));
export function emekaAct(a: EK.EmekaAct) {
  update((s) => {
    const line = EK.act(s, a);
    if (!line) return;
    toast(s, line);
    // Grown-up dates take an evening.
    if (!s.chapter && (a === "date" || a === "hang") && s.slot < SLOTS.length) spend(s, 1, -5);
  });
}

// ── Phones ───────────────────────────────────────────────────────────────────

export const buyPhone = (id: PH.PhoneId) => update((s) => toast(s, PH.buyPhone(s, id)));
export const usePhone = (id: PH.PhoneId) => update((s) => toast(s, PH.switchPhone(s, id)));
