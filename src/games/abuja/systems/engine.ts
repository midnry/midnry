import { CHAPTERS, EVENTS, FIXERS, HOMES, JOBS, LOANS, POSTING_STATES, chapter, district, job, place } from "./data";
import {
  DAYS_PER_YEAR,
  END_AGE,
  FIXER_PRICE,
  FIXER_SUCCESS,
  FREEDOM_TARGET,
  SLOTS,
  addLog,
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
import type { Choice, EndingId, GameState, Scene } from "./types";

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

export function clearToast() {
  update((s) => {
    s.toast = null;
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
    if (a.kind === "loans") {
      open = "loans";
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
    if (a.kind === "work") {
      if (s.job !== a.job) return toast(s, "You don't work here. Apply first.");
      const def = job(a.job)!;
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
    addStat(s, "money", offer.amount);
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

export function travel(placeId: string, mode: "bus" | "ride") {
  update((s) => {
    const p = place(placeId);
    if (!p) return;
    const d = district(p.district);
    if (d?.gate && !check(s, d.gate.if)) return toast(s, d.gate.message);
    const cost = mode === "bus" ? 500 : 3500;
    if (s.stats.money < cost) return toast(s, `You need ${naira(cost)} for the ${mode === "bus" ? "bus" : "ride"}.`);
    if (mode === "bus" && s.slot + 1 > SLOTS.length - 1) return toast(s, "No more buses tonight. Take a ride, or walk.");
    addStat(s, "money", -cost);
    if (mode === "bus") s.slot += 1;
    s.pos = { x: p.x, y: p.y + 95 };
    s.district = p.district;
    toast(s, mode === "bus" ? `You squeeze into a bus to ${p.name}. It takes forever.` : `Your Zoom driver drops you at ${p.name}.`);
    bus.emit("teleport", s.pos);
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
  if (!s.event) s.event = dailyRomance(s);
  neglect(s);
  pickEvent(s);
  checkEndings(s);
}

function weeklyBills(s: GameState) {
  const rent = RENT[s.background] ?? 10000;
  const living = 7000 + 3000 + 1500;
  addStat(s, "money", -(rent + living));
  const lines = [`Weekly bills: rent ${naira(rent)}, food, transport and data ${naira(living)}.`];
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
  addStat(s, "money", -30000);
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
