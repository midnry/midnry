import { useEffect, useMemo, useState } from "react";
import { autoPerformance, grade, mainSkill, METHOD_LABEL, missingFood, missingKit, repairCost, type CookResult } from "../../systems/cooking/cook";
import { EQUIPMENT, equipment, stats, TIER_LABEL } from "../../systems/cooking/equipment";
import { CAT_LABEL, ingredient, INGREDIENTS } from "../../systems/cooking/ingredients";
import { capacity, effective, freshness, inSeason, price as foodPrice, SEED_PRICE, sells, SKILLS, SOURCES, used } from "../../systems/cooking/kitchen";
import { BOOKS, CLASSES, recipe, RECIPES } from "../../systems/cooking/recipes";
import type { Cat, EquipKind, EquipTier, Kitchen, Method, Performance, RecipeDef, Storage, Tier } from "../../systems/cooking/types";
import {
  buyBook,
  buyEquipment,
  buyFood,
  cookAt,
  cookMinutes,
  CROPS,
  eatLeftover,
  experimentAt,
  gardenAction,
  openKitchen,
  repairEquipment,
  saveRecipeVersion,
  scrubKitchen,
  sellEquipment,
  storeLot,
  takeClass,
  throwAway,
  toggleFavorite,
} from "../../systems/engine";
import { naira, SLOTS } from "../../systems/rules";
import type { GameState } from "../../systems/types";
import { btnGhost, btnPrimary, panel } from "../theme";
import { ChopGame, gameFor, HeatGame, PlateGame, SeasonPanel, TimingGame, WorkGame } from "./games";

export type KitchenTab = "cook" | "pantry" | "recipes" | "lab" | "kit" | "shop" | "garden" | "school";

/** Where the kitchen screen was opened from. */
export type KitchenOpen = { at: "home" | null; market: string | null; tab: KitchenTab };

type Taste = Performance["season"];

const TABS: { id: KitchenTab; label: string; icon: string }[] = [
  { id: "cook", label: "Cook", icon: "🍳" },
  { id: "pantry", label: "Pantry", icon: "🧺" },
  { id: "recipes", label: "Recipes", icon: "📖" },
  { id: "lab", label: "Experiment", icon: "🧪" },
  { id: "kit", label: "Kitchen", icon: "🔪" },
  { id: "shop", label: "Shop", icon: "🛒" },
  { id: "garden", label: "Garden", icon: "🌱" },
  { id: "school", label: "Classes", icon: "👩‍🍳" },
];

const LEVEL_TONE = {
  known: "bg-white/10 text-slate-300",
  learned: "bg-sky-500/15 text-sky-200",
  improved: "bg-blue-500/20 text-blue-200",
  mastered: "bg-emerald-500/20 text-emerald-300",
} as const;

const STORAGE_LABEL: Record<Storage, string> = { pantry: "Cupboard", fridge: "Fridge", freezer: "Freezer" };
const STORAGE_ICON: Record<Storage, string> = { pantry: "🗄️", fridge: "🧊", freezer: "❄️" };

const NPC_TEACHER: Record<string, string> = {
  Mama: "Mama might teach you this if you ask her at home.",
  okafor: "Mr. Okafor knows this one. Get close to him.",
  suya: "The suya man by the roadside guards this recipe.",
  hawker: "A Wuse Market hawker makes this every day.",
};

function sourceHint(r: RecipeDef): string {
  if (r.source === "book") return `In the "${r.from}" cookbook (Jabi Lake Mall).`;
  if (r.source === "npc") return NPC_TEACHER[r.from ?? ""] ?? "Someone in Abuja can teach you this.";
  if (r.source === "class") return "Taught at the Abuja Culinary Academy.";
  if (r.source === "experiment") return "Nobody teaches this. Discover it by experimenting.";
  if (r.source === "secret") return "A secret recipe. Win competitions and meet the right people.";
  return "";
}

function Bar({ value, tone = "bg-blue-500", label }: { value: number; tone?: string; label?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

const scoreTone = (v: number) => (v >= 78 ? "bg-emerald-400" : v >= 55 ? "bg-blue-400" : v >= 35 ? "bg-amber-400" : "bg-red-500");

/** The kitchen: cook, store, learn, experiment, equip, shop and grow. */
export function KitchenScreen({ state, open, onClose }: { state: GameState; open: KitchenOpen; onClose: () => void }) {
  const [tab, setTab] = useState<KitchenTab>(open.tab);
  useEffect(() => {
    if (!state.kitchen) openKitchen();
  }, [state.kitchen]);
  const k = state.kitchen;
  const tabs = TABS.filter((t) => (t.id === "school" ? open.market === "academy" : true));
  return (
    <div className="absolute inset-0 z-30 flex items-stretch justify-center bg-black/60 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Kitchen">
      <div className={`${panel} flex w-full max-w-3xl flex-col overflow-hidden rounded-none sm:rounded-2xl`}>
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 pt-3 pb-2">
          <div className="min-w-0">
            <p className="font-display text-xl">{open.at === "home" ? "Your kitchen" : open.market === "academy" ? "Abuja Culinary Academy" : open.market ? (SOURCES.find((x) => x.id === open.market)?.name ?? "Market") : "Kitchen"}</p>
            <p className="text-xs text-slate-400">
              {naira(state.stats.money)} · Day {state.day}, {SLOTS[Math.min(state.slot, 3)]} · ⚡ {Math.round(state.stats.energy)} · 🍲 {Math.round(state.life?.food ?? 100)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-xl px-3 text-sm text-slate-300 hover:bg-white/10" aria-label="Close the kitchen">
            ✕
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-2" aria-label="Kitchen sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ${tab === t.id ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/10"}`}
            >
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        {state.toast ? <p className="border-b border-white/10 bg-blue-500/10 px-4 py-2 text-sm text-blue-100">{state.toast}</p> : null}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!k ? (
            <p className="text-slate-400">Opening the kitchen…</p>
          ) : tab === "cook" ? (
            <CookTab state={state} k={k} at={open.at} onShop={() => setTab("shop")} />
          ) : tab === "pantry" ? (
            <PantryTab state={state} k={k} />
          ) : tab === "recipes" ? (
            <RecipesTab k={k} />
          ) : tab === "lab" ? (
            <LabTab state={state} k={k} at={open.at} />
          ) : tab === "kit" ? (
            <KitTab state={state} k={k} />
          ) : tab === "shop" ? (
            <ShopTab state={state} k={k} market={open.market} />
          ) : tab === "garden" ? (
            <GardenTab state={state} k={k} at={open.at} />
          ) : (
            <SchoolTab state={state} k={k} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cook ─────────────────────────────────────────────────────────────────────

function CookTab({ state, k, at, onShop }: { state: GameState; k: Kitchen; at: "home" | null; onShop: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ready" | "all" | "fav">("ready");
  const known = RECIPES.filter((r) => k.recipes[r.id]);
  const ready = (r: RecipeDef) => !missingKit(k.equipment, r).length && !missingFood(k.pantry, r).length;
  const list = known.filter((r) => (filter === "ready" ? ready(r) : filter === "fav" ? k.favorites.includes(r.id) : true));
  const r = picked ? recipe(picked) : undefined;
  if (r) return <CookFlow state={state} k={k} r={r} onBack={() => setPicked(null)} onShop={onShop} />;
  return (
    <div>
      {at !== "home" ? (
        <p className="mb-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          You can plan here, but you cook in your own kitchen. Head home and choose "Go to your kitchen".
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["ready", `Ready to cook (${known.filter(ready).length})`],
            ["all", `All I know (${known.length})`],
            ["fav", "⭐ Favourites"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)} className={`min-h-9 rounded-full px-3 text-xs font-semibold ${filter === id ? "bg-white text-slate-900" : "bg-white/10 text-slate-200"}`}>
            {label}
          </button>
        ))}
      </div>
      {!list.length ? (
        <p className="mt-4 text-sm text-slate-400">
          {filter === "ready" ? "Nothing you know can be cooked with what's in the cupboard. Go shopping, or check what's missing under All I know." : "Nothing here yet."}
        </p>
      ) : null}
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {list.map((x) => {
          const kn = k.recipes[x.id]!;
          const gapKit = missingKit(k.equipment, x);
          const gapFood = missingFood(k.pantry, x);
          return (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => setPicked(x.id)}
                className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-blue-400/60 hover:bg-white/10"
              >
                <span className="text-3xl" aria-hidden>
                  {x.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">{x.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${LEVEL_TONE[kn.level]}`}>{kn.level}</span>
                  </span>
                  <span className="block text-xs text-slate-400">
                    {x.cuisine} · {"★".repeat(x.difficulty)} · serves {x.serves} · ~{cookMinutes(k.equipment, x, k.skills.knife)} min
                  </span>
                  {gapKit.length ? <span className="block text-xs text-red-300">Needs kit: {gapKit.join(", ")}</span> : null}
                  {!gapKit.length && gapFood.length ? (
                    <span className="block text-xs text-amber-200">Missing: {gapFood.map((g) => ingredient(g.id)?.name ?? g.id).join(", ")}</span>
                  ) : null}
                  {kn.cooked ? <span className="block text-xs text-slate-500">Cooked {kn.cooked}× · best {kn.best}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {at === "home" ? null : <p className="mt-4 text-xs text-slate-500">Tip: the Shop tab works from anywhere through ChopNow Mart delivery.</p>}
    </div>
  );
}

type FlowStep = { kind: "game"; index: number } | { kind: "season" } | { kind: "plate" } | { kind: "result" };

function CookFlow({ state, k, r, onBack, onShop }: { state: GameState; k: Kitchen; r: RecipeDef; onBack: () => void; onShop: () => void }) {
  const [tier, setTier] = useState<Tier | "any">("any");
  const versions = k.customs.filter((c) => c.base === r.id);
  const [custom, setCustom] = useState<string>("");
  const [flow, setFlow] = useState<FlowStep | null>(null);
  const [perf, setPerf] = useState<Performance>({ prep: [], cook: [], season: r.target, plate: 60, quick: false });
  const [result, setResult] = useState<CookResult | null>(null);
  const [saveName, setSaveName] = useState("");
  const [signature, setSignature] = useState(false);
  const [saved, setSaved] = useState(false);
  const games = r.steps.filter((x): x is Extract<RecipeDef["steps"][number], { kind: "prep" | "cook" }> => x.kind === "prep" || x.kind === "cook");
  const hasSeason = r.steps.some((x) => x.kind === "season");
  const customDef = versions.find((c) => c.id === custom);
  const gapKit = missingKit(k.equipment, r);
  const gapFood = missingFood(k.pantry, r);
  const lateNight = state.slot >= SLOTS.length;
  const minutes = cookMinutes(k.equipment, r, k.skills.knife);
  const skill = k.skills[mainSkill(r)];

  const run = (p: Performance) => {
    const out = cookAt("home", r.id, p, { custom: custom || undefined, tier: tier === "any" ? undefined : tier });
    setPerf(p);
    setResult(out);
    setFlow({ kind: "result" });
  };
  const nextAfterGames = (p: Performance) => {
    if (hasSeason) setFlow({ kind: "season" });
    else if (r.steps.some((x) => x.kind === "plate")) setFlow({ kind: "plate" });
    else run({ ...p, season: r.target, plate: 55 + k.skills.presentation / 4 });
  };
  const scoreGame = (score: number) => {
    if (!flow || flow.kind !== "game") return;
    const step = games[flow.index]!;
    const p = { ...perf, prep: step.kind === "prep" ? [...perf.prep, score] : perf.prep, cook: step.kind === "cook" ? [...perf.cook, score] : perf.cook };
    setPerf(p);
    if (flow.index + 1 < games.length) setFlow({ kind: "game", index: flow.index + 1 });
    else nextAfterGames(p);
  };

  if (flow?.kind === "result" && result) {
    const d = result.dish;
    const kn = k.recipes[r.id];
    return (
      <div>
        {!result.ok ? (
          <>
            <p className="text-red-300">{result.text}</p>
            <button type="button" className={`${btnGhost} mt-4`} onClick={onBack}>
              Back to recipes
            </button>
          </>
        ) : d ? (
          <>
            <div className="flex items-center gap-3">
              <span className="text-5xl" aria-hidden>
                {d.icon}
              </span>
              <div>
                <p className="font-display text-2xl">{d.name}</p>
                <p className={`text-lg font-semibold ${d.scores.overall >= 62 ? "text-emerald-300" : d.scores.overall >= 45 ? "text-sky-200" : "text-amber-300"}`}>
                  {grade(d.scores.overall)} · {d.scores.overall}/100
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-2">
              {(["taste", "texture", "presentation", "freshness", "nutrition"] as const).map((key) => (
                <div key={key} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-sm">
                  <dt className="capitalize text-slate-300">{key}</dt>
                  <dd>
                    <Bar value={d.scores[key]} tone={scoreTone(d.scores[key])} label={key} />
                  </dd>
                  <dd className="text-right tabular-nums text-slate-400">{d.scores[key]}</dd>
                </div>
              ))}
            </dl>
            {result.notes?.length ? (
              <ul className="mt-3 space-y-1 text-sm text-amber-200">
                {result.notes.map((n, i) => (
                  <li key={i}>• {n}</li>
                ))}
              </ul>
            ) : null}
            {result.levelUp ? <p className="mt-3 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">🎉 Recipe level up: you've now {result.levelUp} {r.name}.</p> : null}
            {kn ? (
              <p className="mt-2 text-xs text-slate-400">
                Cooked {kn.cooked}× · best {kn.best} · {result.minutes} minutes in the kitchen
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" className={btnPrimary} onClick={() => eatLeftover(d.id)} disabled={!k.leftovers.some((x) => x.id === d.id)}>
                🍽️ Eat a portion ({k.leftovers.find((x) => x.id === d.id)?.portions ?? 0} left)
              </button>
              <button type="button" className={btnGhost} onClick={onBack}>
                Done (rest goes in storage)
              </button>
            </div>
            {!result.burnt && hasSeason && !saved ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold">Make it yours</p>
                <p className="text-xs text-slate-400">Save this seasoning as your own version. Your signature dish is what people will know you for.</p>
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={`My ${r.name.toLowerCase()}`}
                  maxLength={40}
                  className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm"
                  aria-label="Name your version"
                />
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-blue-500" checked={signature} onChange={(e) => setSignature(e.target.checked)} />
                  ✨ Make it my signature dish
                </label>
                <button
                  type="button"
                  className={`${btnGhost} mt-2 w-full`}
                  onClick={() => {
                    saveRecipeVersion(r.id, saveName, perf.season, signature);
                    setSaved(true);
                  }}
                >
                  Save my version
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  if (flow?.kind === "game") {
    const step = games[flow.index]!;
    const kind = gameFor(step);
    const label = step.label;
    const stepSkill = step.kind === "prep" ? k.skills.knife : skill;
    return (
      <div>
        <p className="text-xs font-semibold tracking-widest text-sky-400 uppercase">
          {r.icon} {r.name} · step {flow.index + 1} of {games.length}
        </p>
        <p className="mt-1 mb-3 font-display text-lg">{step.kind === "cook" ? `${METHOD_LABEL[step.method]}${step.temp ? ` · ${step.temp}°C` : ""}` : label}</p>
        <div key={flow.index}>
          {kind === "chop" ? (
            <ChopGame label={label} skill={stepSkill} onDone={scoreGame} />
          ) : kind === "work" ? (
            <WorkGame label={label} skill={stepSkill} onDone={scoreGame} />
          ) : kind === "timing" ? (
            <TimingGame label={label} skill={stepSkill} verb={step.kind === "cook" && ["bake", "roast", "toast"].includes(step.method) ? "Take it out" : "Now!"} onDone={scoreGame} />
          ) : (
            <HeatGame label={label} target={step.kind === "cook" ? step.temp || 100 : 100} skill={stepSkill} onDone={scoreGame} />
          )}
        </div>
      </div>
    );
  }
  if (flow?.kind === "season") {
    const start: Taste = customDef?.flavor ?? { spice: 2, salt: 2, sweet: 1, sour: 1 };
    return (
      <div>
        <p className="mb-3 font-display text-lg">
          {r.icon} {r.steps.find((x) => x.kind === "season")?.label ?? "Season to taste"}
        </p>
        <SeasonPanel
          start={start}
          target={customDef?.flavor ?? r.target}
          skill={k.skills.seasoning}
          onDone={(t) => {
            const p = { ...perf, season: t };
            setPerf(p);
            if (r.steps.some((x) => x.kind === "plate")) setFlow({ kind: "plate" });
            else run({ ...p, plate: 55 + k.skills.presentation / 4 });
          }}
        />
      </div>
    );
  }
  if (flow?.kind === "plate") {
    return (
      <div>
        <p className="mb-3 font-display text-lg">
          {r.icon} {r.steps.find((x) => x.kind === "plate")?.label ?? "Plate it up"}
        </p>
        <PlateGame course={r.course} skill={k.skills.presentation} onDone={(plate) => run({ ...perf, plate })} />
      </div>
    );
  }

  // Overview: what it needs, then quick or hands-on.
  const tiers: (Tier | "any")[] = ["any", "cheap", "standard", "premium", "homegrown"];
  const blocked = gapKit.length > 0 || gapFood.length > 0 || lateNight;
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-2 text-sm text-sky-300 hover:underline">
        ← All recipes
      </button>
      <div className="flex items-start gap-3">
        <span className="text-5xl" aria-hidden>
          {r.icon}
        </span>
        <div className="min-w-0">
          <p className="font-display text-2xl">{r.name}</p>
          <p className="text-sm text-slate-400">
            {r.cuisine} · {r.course} · difficulty {"★".repeat(r.difficulty)}
            {"☆".repeat(5 - r.difficulty)} · serves {r.serves} · ~{minutes} min
          </p>
          {r.blurb ? <p className="mt-1 text-sm text-slate-300">{r.blurb}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => toggleFavorite(r.id)}
          className="ml-auto min-h-11 shrink-0 rounded-xl px-3 text-xl hover:bg-white/10"
          aria-label={k.favorites.includes(r.id) ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={k.favorites.includes(r.id)}
        >
          {k.favorites.includes(r.id) ? "⭐" : "☆"}
        </button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section>
          <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Ingredients</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {r.needs.map((n) => {
              const def = ingredient(n.id);
              const gap = gapFood.find((g) => g.id === n.id);
              return (
                <li key={n.id} className={gap ? "text-amber-200" : "text-slate-200"}>
                  {def?.icon} {n.qty} × {def?.name ?? n.id} {gap ? `(have ${gap.have})` : "✓"}
                </li>
              );
            })}
            {r.extras?.length ? <li className="text-xs text-slate-500">Nice extras: {r.extras.map((e) => ingredient(e)?.name ?? e).join(", ")}</li> : null}
          </ul>
        </section>
        <section>
          <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Method</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-200">
            {r.steps.map((x, i) => (
              <li key={i}>
                {x.label}
                {x.kind === "cook" ? <span className="text-slate-500"> · {METHOD_LABEL[x.method].toLowerCase()}</span> : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
      {gapKit.length ? <p className="mt-3 text-sm text-red-300">You don't have kit for: {gapKit.join(", ")}. Buy it in the Shop.</p> : null}
      {gapFood.length ? (
        <button type="button" onClick={onShop} className="mt-2 text-sm text-amber-200 underline">
          Missing ingredients. Go shopping →
        </button>
      ) : null}
      {lateNight ? <p className="mt-2 text-sm text-amber-200">It's too late to start cooking. Sleep first.</p> : null}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-400">Use ingredients</span>
          <select value={tier} onChange={(e) => setTier(e.target.value as Tier | "any")} className="mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-[#0d1220] px-3">
            {tiers.map((t) => (
              <option key={t} value={t}>
                {t === "any" ? "Whatever's oldest first" : `${t[0]!.toUpperCase()}${t.slice(1)} first`}
              </option>
            ))}
          </select>
        </label>
        {versions.length ? (
          <label className="text-sm">
            <span className="text-slate-400">Version</span>
            <select value={custom} onChange={(e) => setCustom(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-[#0d1220] px-3">
              <option value="">The classic</option>
              {versions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.signature ? "✨ " : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" className={btnPrimary} disabled={blocked} onClick={() => (games.length ? setFlow({ kind: "game", index: 0 }) : nextAfterGames(perf))}>
          👩‍🍳 Cook it hands-on
        </button>
        <button type="button" className={btnGhost} disabled={blocked} onClick={() => run(autoPerformance(k, r, customDef?.flavor))}>
          ⚡ Quick cook (your skill does it)
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Hands-on cooking can beat your skill level. Quick cook plays it safe at your current skill ({Math.round(skill)}).</p>
    </div>
  );
}

// ── Pantry ───────────────────────────────────────────────────────────────────

function PantryTab({ state, k }: { state: GameState; k: Kitchen }) {
  const day = state.day;
  const storages: Storage[] = ["pantry", "fridge", "freezer"];
  const weekWaste = k.waste.filter((w) => w.day > day - 7);
  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Cooked food</h3>
        {!k.leftovers.length ? <p className="mt-2 text-sm text-slate-500">No leftovers. Cook something.</p> : null}
        <ul className="mt-2 grid grid-cols-1 gap-2">
          {k.leftovers.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="text-2xl" aria-hidden>
                {d.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {d.name} × {d.portions}
                </p>
                <p className="text-xs text-slate-400">
                  {grade(d.scores.overall)} ({d.scores.overall}) · {d.expires - day <= 0 ? "eat today" : `keeps ${d.expires - day} more day${d.expires - day > 1 ? "s" : ""}`}
                </p>
              </div>
              <button type="button" className={`${btnPrimary} min-h-9 px-3`} onClick={() => eatLeftover(d.id)}>
                Eat
              </button>
              <button type="button" className="min-h-9 rounded-xl px-2 text-xs text-slate-400 hover:bg-white/10" onClick={() => throwAway("dish", d.id)} aria-label={`Throw away ${d.name}`}>
                🗑️
              </button>
            </li>
          ))}
        </ul>
      </section>
      {storages.map((st) => {
        const cap = capacity(k.equipment, st);
        const lots = k.pantry.filter((l) => l.storage === st);
        if (!cap && !lots.length) return null;
        const u = used(k.pantry, st);
        return (
          <section key={st}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                {STORAGE_ICON[st]} {STORAGE_LABEL[st]}
              </h3>
              <span className={`text-xs tabular-nums ${u > cap ? "text-red-300" : "text-slate-400"}`}>
                {Math.round(u)}/{cap} space
              </span>
            </div>
            <div className="mt-1">
              <Bar value={cap ? (u / cap) * 100 : 100} tone={u > cap * 0.9 ? "bg-amber-400" : "bg-blue-500"} label={`${STORAGE_LABEL[st]} space`} />
            </div>
            {!lots.length ? <p className="mt-2 text-sm text-slate-500">Empty.</p> : null}
            <ul className="mt-2 grid grid-cols-1 gap-1.5">
              {lots.map((l) => {
                const def = ingredient(l.ing);
                const f = freshness(l, day);
                const left = l.expires - day;
                const moves = storages.filter((to) => to !== st && def?.keeps[to] && capacity(k.equipment, to) > 0);
                return (
                  <li key={l.id} className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-hidden>
                        {def?.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
                          {l.qty} × {def?.name ?? l.ing}{" "}
                          <span className={`text-xs ${l.tier === "premium" ? "text-emerald-300" : l.tier === "homegrown" ? "text-lime-300" : l.tier === "cheap" ? "text-slate-500" : "text-slate-400"}`}>{l.tier}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Quality {Math.round(effective(l, day))} · {left <= 0 ? "goes off tonight" : `${left} day${left > 1 ? "s" : ""} left`}
                          {def && def.store !== st ? ` · best kept in the ${STORAGE_LABEL[def.store].toLowerCase()}` : ""}
                        </p>
                      </div>
                      {moves.map((to) => (
                        <button key={to} type="button" onClick={() => storeLot(l.id, to)} className="min-h-9 rounded-lg px-2 text-sm hover:bg-white/10" aria-label={`Move to the ${STORAGE_LABEL[to].toLowerCase()}`} title={`Move to ${STORAGE_LABEL[to].toLowerCase()}`}>
                          → {STORAGE_ICON[to]}
                        </button>
                      ))}
                      <button type="button" onClick={() => throwAway("lot", l.id)} className="min-h-9 rounded-lg px-2 text-xs hover:bg-white/10" aria-label={`Throw away ${def?.name}`}>
                        🗑️
                      </button>
                    </div>
                    <div className="mt-1.5">
                      <Bar value={f * 100} tone={f > 0.6 ? "bg-emerald-400" : f > 0.3 ? "bg-amber-400" : "bg-red-500"} label="Freshness" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {!k.equipment.some((o) => equipment(o.def)?.storage === "fridge") ? (
        <p className="text-xs text-slate-500">No fridge: meat, fish and dairy spoil in a day or two. A fridge (Shop → Storage) keeps things far longer.</p>
      ) : null}
      <section>
        <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Waste this week</h3>
        {!weekWaste.length ? (
          <p className="mt-2 text-sm text-slate-500">Nothing wasted. Well done.</p>
        ) : (
          <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
            {weekWaste.slice(-8).map((w, i) => (
              <li key={i}>
                Day {w.day}: {w.what}
                {w.value ? ` (${naira(w.value)})` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── Recipes ──────────────────────────────────────────────────────────────────

function RecipesTab({ k }: { k: Kitchen }) {
  const [show, setShow] = useState<"known" | "locked">("known");
  const known = RECIPES.filter((r) => k.recipes[r.id]);
  const locked = RECIPES.filter((r) => !k.recipes[r.id]);
  const levels = { known: 0, learned: 0, improved: 0, mastered: 0 };
  for (const r of known) levels[k.recipes[r.id]!.level] += 1;
  return (
    <div>
      <p className="text-sm text-slate-300">
        {known.length} of {RECIPES.length} recipes · {levels.learned} learned · {levels.improved} improved · {levels.mastered} mastered
      </p>
      <p className="mt-1 text-xs text-slate-500">Cook a recipe 3 times to learn it, 8 times with good results to improve it, and 15 times with a great dish to master it. Each level makes it taste better.</p>
      <div className="mt-3 flex gap-1.5">
        {(["known", "locked"] as const).map((x) => (
          <button key={x} type="button" onClick={() => setShow(x)} className={`min-h-9 rounded-full px-3 text-xs font-semibold ${show === x ? "bg-white text-slate-900" : "bg-white/10 text-slate-200"}`}>
            {x === "known" ? `My recipes (${known.length})` : `To discover (${locked.length})`}
          </button>
        ))}
      </div>
      {show === "known" && k.customs.length ? (
        <section className="mt-4">
          <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase">My versions</h3>
          <ul className="mt-2 grid grid-cols-1 gap-1.5">
            {k.customs.map((c) => (
              <li key={c.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                {c.signature ? "✨ " : ""}
                <span className="font-semibold">{c.name}</span> <span className="text-xs text-slate-400">· based on {recipe(c.base)?.name}</span>
                <span className="block text-[11px] text-slate-500">
                  🌶️ {c.flavor.spice} · 🧂 {c.flavor.salt} · 🍯 {c.flavor.sweet} · 🍋 {c.flavor.sour}
                  {c.sold ? ` · sold ${c.sold}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(show === "known" ? known : locked).map((r) => {
          const kn = k.recipes[r.id];
          const secret = !kn && r.source === "secret";
          return (
            <li key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start gap-2">
                <span className="text-2xl" aria-hidden>
                  {secret ? "❔" : r.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {secret ? "Secret recipe" : r.name}
                    {kn ? <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${LEVEL_TONE[kn.level]}`}>{kn.level}</span> : null}
                  </p>
                  <p className="text-xs text-slate-400">
                    {secret ? "???" : `${r.cuisine} · ${r.course} · ${"★".repeat(r.difficulty)}`}
                    {!secret ? ` · sells ~${naira(r.value)}` : ""}
                  </p>
                  {kn ? (
                    <p className="text-xs text-slate-500">{kn.cooked ? `Cooked ${kn.cooked}× · average ${Math.round(kn.total / kn.cooked)} · best ${kn.best}` : "Never cooked"}</p>
                  ) : (
                    <p className="text-xs text-amber-200/80">{sourceHint(r)}</p>
                  )}
                </div>
                {kn ? (
                  <button type="button" onClick={() => toggleFavorite(r.id)} className="min-h-9 rounded-lg px-2 hover:bg-white/10" aria-label="Favourite" aria-pressed={k.favorites.includes(r.id)}>
                    {k.favorites.includes(r.id) ? "⭐" : "☆"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Experiment ───────────────────────────────────────────────────────────────

function LabTab({ state, k, at }: { state: GameState; k: Kitchen; at: "home" | null }) {
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<Method | null>(null);
  const [phase, setPhase] = useState<"pick" | "heat" | "season" | "plate" | "done">("pick");
  const [perf, setPerf] = useState<Performance>({ prep: [], cook: [], season: { spice: 3, salt: 3, sweet: 1, sour: 1 }, plate: 60, quick: false });
  const [result, setResult] = useState<CookResult | null>(null);
  const methods = useMemo(() => {
    const set = new Set<Method>(["raw"]);
    for (const o of k.equipment) if (!o.broken) for (const m of equipment(o.def)?.methods ?? []) set.add(m);
    return [...set];
  }, [k.equipment]);
  const chosen = Object.entries(picks).filter(([, q]) => q > 0);
  const mixed = Math.round(30 + k.skills.creation / 2);
  const reset = () => {
    setPicks({});
    setMethod(null);
    setPhase("pick");
    setResult(null);
  };
  const run = (p: Performance) => {
    const out = experimentAt(
      chosen.map(([lot, qty]) => ({ lot, qty })),
      method!,
      p,
    );
    setResult(out);
    setPhase("done");
  };
  if (at !== "home") return <p className="text-sm text-slate-400">Experiments happen in your own kitchen. Head home first.</p>;
  if (phase === "done" && result) {
    return (
      <div>
        <p className={result.ok ? "text-lg" : "text-red-300"}>{result.text}</p>
        {result.dish ? (
          <p className="mt-2 text-sm text-slate-400">
            {result.dish.icon} {result.dish.portions} portion{result.dish.portions > 1 ? "s" : ""} in storage · overall {result.dish.scores.overall}
          </p>
        ) : null}
        {result.discovered ? <p className="mt-3 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">📖 Added to your recipes: {recipe(result.discovered)?.name}.</p> : null}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {result.dish && k.leftovers.some((x) => x.id === result.dish!.id) ? (
            <button type="button" className={btnPrimary} onClick={() => eatLeftover(result.dish!.id)}>
              🍽️ Taste it
            </button>
          ) : null}
          <button type="button" className={btnGhost} onClick={reset}>
            Try something else
          </button>
        </div>
      </div>
    );
  }
  if (phase === "heat" && method) {
    const kind = gameFor({ kind: "cook", method });
    const done = (score: number) => {
      setPerf({ ...perf, cook: [score] });
      setPhase("season");
    };
    return (
      <div>
        <p className="mb-3 font-display text-lg">🧪 {METHOD_LABEL[method]}</p>
        {kind === "timing" ? (
          <TimingGame label="Watch it closely" skill={k.skills.cooking} verb="Now!" onDone={done} />
        ) : kind === "work" ? (
          <WorkGame label="Work it together" skill={k.skills.cooking} onDone={done} />
        ) : (
          <HeatGame label="Keep the heat steady" target={method === "deepfry" ? 175 : method === "fry" || method === "saute" ? 160 : 100} skill={k.skills.cooking} onDone={done} />
        )}
      </div>
    );
  }
  if (phase === "season") {
    return (
      <div>
        <p className="mb-3 font-display text-lg">🧪 Season it your way</p>
        <SeasonPanel
          start={perf.season}
          target={{ spice: 4, salt: 5, sweet: 2, sour: 2 }}
          skill={k.skills.seasoning}
          onDone={(t) => {
            setPerf({ ...perf, season: t });
            setPhase("plate");
          }}
        />
      </div>
    );
  }
  if (phase === "plate") {
    return (
      <div>
        <p className="mb-3 font-display text-lg">🧪 Serve it</p>
        <PlateGame course="main" skill={k.skills.presentation} onDone={(plate) => run({ ...perf, plate })} />
      </div>
    );
  }
  const lots = k.pantry.filter((l) => l.qty > 0);
  return (
    <div>
      <p className="text-sm text-slate-300">Put ingredients together and cook them your way. Get close to a real dish and you'll discover it, including dishes no one will teach you.</p>
      <p className="mt-1 text-xs text-slate-500">Recipe creation skill {Math.round(k.skills.creation)} · the better you get, the easier discoveries come. About {mixed}% of a good idea is instinct.</p>
      <h3 className="mt-4 text-xs font-semibold tracking-widest text-slate-400 uppercase">1. Ingredients ({chosen.length} picked)</h3>
      {!lots.length ? <p className="mt-2 text-sm text-slate-500">The cupboard is empty. Go shopping first.</p> : null}
      <ul className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {lots.map((l) => {
          const def = ingredient(l.ing);
          const q = picks[l.id] ?? 0;
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => setPicks({ ...picks, [l.id]: q >= Math.min(3, l.qty) ? 0 : q + 1 })}
                className={`flex min-h-12 w-full items-center gap-2 rounded-xl border px-2 text-left text-sm ${q ? "border-blue-400 bg-blue-400/15" : "border-white/10 bg-white/5"}`}
                aria-pressed={q > 0}
              >
                <span className="text-xl" aria-hidden>
                  {def?.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{def?.name}</span>
                <span className="text-xs tabular-nums text-slate-400">{q ? `${q}/${l.qty}` : l.qty}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <h3 className="mt-4 text-xs font-semibold tracking-widest text-slate-400 uppercase">2. How to cook it</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {methods.map((m) => (
          <button key={m} type="button" onClick={() => setMethod(m)} className={`min-h-9 rounded-full px-3 text-xs font-semibold ${method === m ? "bg-white text-slate-900" : "bg-white/10 text-slate-200"}`}>
            {METHOD_LABEL[m]}
          </button>
        ))}
      </div>
      <button type="button" className={`${btnPrimary} mt-4 w-full`} disabled={chosen.length < 2 || !method || state.slot >= SLOTS.length} onClick={() => setPhase(method === "raw" ? "season" : "heat")}>
        🧪 Start cooking
      </button>
      {state.slot >= SLOTS.length ? <p className="mt-2 text-xs text-amber-200">Too late tonight. Sleep first.</p> : null}
    </div>
  );
}

// ── Kitchen kit and skills ───────────────────────────────────────────────────

function KitTab({ state, k }: { state: GameState; k: Kitchen }) {
  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Cleanliness</h3>
          <span className="text-xs text-slate-400">{Math.round(k.clean)}%</span>
        </div>
        <div className="mt-1">
          <Bar value={k.clean} tone={k.clean >= 60 ? "bg-emerald-400" : k.clean >= 30 ? "bg-amber-400" : "bg-red-500"} label="Kitchen cleanliness" />
        </div>
        <p className="mt-1 text-xs text-slate-500">A dirty kitchen makes food worse and can make you sick.</p>
        <button type="button" className={`${btnGhost} mt-2`} onClick={scrubKitchen} disabled={k.clean >= 98 || state.slot >= SLOTS.length}>
          🧽 Clean the kitchen {k.equipment.some((o) => o.def === "dishwasher" && !o.broken) ? "(dishwasher: quick)" : "(1 time slot)"}
        </button>
      </section>
      <section>
        <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Your skills</h3>
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(SKILLS) as (keyof typeof SKILLS)[]).map((id) => (
            <li key={id} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-2 text-sm">
              <span className="text-slate-300">{SKILLS[id]}</span>
              <Bar value={k.skills[id]} tone="bg-blue-400" label={SKILLS[id]} />
              <span className="text-right tabular-nums text-slate-400">{Math.round(k.skills[id])}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Equipment ({k.equipment.length})</h3>
        <ul className="mt-2 grid grid-cols-1 gap-1.5">
          {k.equipment.map((o) => {
            const def = equipment(o.def);
            const st = stats(o.def, o.tier);
            const value = Math.round((st?.price ?? 0) * (o.broken ? 0.1 : 0.35 * (o.condition / 100)));
            return (
              <li key={o.uid} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
                <span className="text-xl" aria-hidden>
                  {def?.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {def?.name} <span className="text-xs text-slate-400">· {TIER_LABEL[o.tier]}</span>
                    {o.broken ? <span className="ml-1 text-xs font-semibold text-red-300">BROKEN</span> : null}
                  </p>
                  <div className="mt-1 grid max-w-48 grid-cols-[3.5rem_1fr] items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                    <span>Condition</span>
                    <Bar value={o.condition} tone={o.condition > 50 ? "bg-emerald-400" : "bg-amber-400"} label="Condition" />
                  </div>
                </div>
                {o.broken || o.condition < 70 ? (
                  <button type="button" className="min-h-9 rounded-lg bg-white/10 px-2 text-xs hover:bg-white/15" onClick={() => repairEquipment(o.uid)}>
                    {o.broken ? "Repair" : "Service"} {naira(repairCost(o))}
                  </button>
                ) : null}
                <button type="button" className="min-h-9 rounded-lg px-2 text-xs text-slate-400 hover:bg-white/10" onClick={() => sellEquipment(o.uid)}>
                  Sell {naira(value)}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

// ── Shop ─────────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<EquipKind, string> = { heat: "Cooking", prep: "Prep", storage: "Storage", drink: "Drinks", bake: "Baking", service: "Serving", fixture: "Fixtures", clean: "Cleaning" };

function ShopTab({ state, k, market }: { state: GameState; k: Kitchen; market: string | null }) {
  const [section, setSection] = useState<"food" | "kit" | "books">("food");
  const here = SOURCES.find((x) => x.id === market);
  const sources = [here, SOURCES.find((x) => x.id === "chopnow")].filter((x): x is (typeof SOURCES)[number] => Boolean(x));
  const [sourceId, setSourceId] = useState(sources[0]!.id);
  const src = SOURCES.find((x) => x.id === sourceId)!;
  const [tier, setTier] = useState<Tier>(src.tiers[0]!);
  const [cat, setCat] = useState<Cat | "all">("all");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [kind, setKind] = useState<EquipKind>("heat");
  const books = market === "shoprite";
  const news = k.market.filter((e) => e.until >= state.day);
  useEffect(() => {
    if (!src.tiers.includes(tier)) setTier(src.tiers[0]!);
  }, [src, tier]);
  const items = INGREDIENTS.filter((i) => sells(src, i) && (cat === "all" || i.cat === cat));
  const cats = [...new Set(INGREDIENTS.map((i) => i.cat))];
  return (
    <div>
      <div className="flex gap-1.5">
        {(
          [
            ["food", "🥬 Ingredients"],
            ["kit", "🍳 Equipment"],
            ...(books ? ([["books", "📚 Cookbooks"]] as const) : []),
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSection(id)} className={`min-h-9 rounded-full px-3 text-xs font-semibold ${section === id ? "bg-white text-slate-900" : "bg-white/10 text-slate-200"}`}>
            {label}
          </button>
        ))}
      </div>
      {section === "food" ? (
        <div className="mt-3">
          {news.length ? (
            <ul className="mb-3 space-y-1">
              {news.map((e) => (
                <li key={e.id} className="rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100">
                  📰 {e.text}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {sources.map((x) => (
              <button key={x.id} type="button" onClick={() => setSourceId(x.id)} className={`rounded-xl border px-3 py-2 text-left text-sm ${sourceId === x.id ? "border-blue-400 bg-blue-400/15" : "border-white/10 bg-white/5"}`}>
                <span className="block font-semibold">{x.name}</span>
                <span className="block text-[11px] text-slate-400">{x.fee ? `Delivery ${naira(x.fee)} per order` : x.blurb}</span>
              </button>
            ))}
          </div>
          {!here ? <p className="mt-2 text-xs text-slate-500">Markets (Wuse, Kubwa) are cheaper, and Shoprite at Jabi Lake Mall has premium goods. Visit them in person.</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {src.tiers.map((t) => (
              <button key={t} type="button" onClick={() => setTier(t)} className={`min-h-9 rounded-full px-3 text-xs font-semibold capitalize ${tier === t ? "bg-blue-600 text-white" : "bg-white/10 text-slate-200"}`}>
                {t}
              </button>
            ))}
            <select value={cat} onChange={(e) => setCat(e.target.value as Cat | "all")} className="ml-auto min-h-9 rounded-xl border border-white/15 bg-[#0d1220] px-2 text-xs" aria-label="Category">
              <option value="all">All food</option>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {CAT_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Cupboard {Math.round(used(k.pantry, "pantry"))}/{capacity(k.equipment, "pantry")}
            {capacity(k.equipment, "fridge") ? ` · Fridge ${Math.round(used(k.pantry, "fridge"))}/${capacity(k.equipment, "fridge")}` : " · no fridge"}
            {capacity(k.equipment, "freezer") ? ` · Freezer ${Math.round(used(k.pantry, "freezer"))}/${capacity(k.equipment, "freezer")}` : ""}
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-1.5">
            {items.map((i) => {
              const p = foodPrice(state, i.id, tier, src);
              const n = qty[i.id] ?? 1;
              const season = inSeason(i, state.day);
              const have = k.pantry.filter((l) => l.ing === i.id).reduce((a, l) => a + l.qty, 0);
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5">
                  <span className="text-xl" aria-hidden>
                    {i.icon}
                  </span>
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm">
                      {i.name}
                      {season === true ? <span className="ml-1 text-[10px] text-emerald-300">in season</span> : season === false ? <span className="ml-1 text-[10px] text-amber-300">out of season</span> : null}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {naira(p)} each · keeps {i.keeps[i.store]}d in {STORAGE_LABEL[i.store].toLowerCase()}
                      {have ? ` · have ${have}` : ""}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <button type="button" className="size-9 rounded-lg hover:bg-white/10" onClick={() => setQty({ ...qty, [i.id]: Math.max(1, n - 1) })} aria-label={`Fewer ${i.name}`}>
                      −
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums">{n}</span>
                    <button type="button" className="size-9 rounded-lg hover:bg-white/10" onClick={() => setQty({ ...qty, [i.id]: Math.min(20, n + 1) })} aria-label={`More ${i.name}`}>
                      +
                    </button>
                    <button type="button" className={`${btnPrimary} min-h-9 min-w-20 px-2 text-xs`} disabled={state.stats.money < p * n} onClick={() => buyFood(src.id, i.id, tier, n)}>
                      {naira(p * n)}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : section === "kit" ? (
        <div className="mt-3">
          <p className="text-xs text-slate-500">Delivered and installed at home (₦1,500, or ₦5,000 for big items). Better kit cooks faster, breaks less and makes better food.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(KIND_LABEL) as EquipKind[]).map((x) => (
              <button key={x} type="button" onClick={() => setKind(x)} className={`min-h-9 rounded-full px-3 text-xs font-semibold ${kind === x ? "bg-white text-slate-900" : "bg-white/10 text-slate-200"}`}>
                {KIND_LABEL[x]}
              </button>
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-2">
            {EQUIPMENT.filter((e) => e.kind === kind && e.scope !== "pro").map((e) => {
              const owned = k.equipment.filter((o) => o.def === e.id);
              return (
                <li key={e.id} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl" aria-hidden>
                      {e.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {e.name} {owned.length ? <span className="text-xs font-normal text-emerald-300">· you have {owned.map((o) => TIER_LABEL[o.tier].toLowerCase()).join(", ")}</span> : null}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {e.blurb ?? ""}
                        {e.methods?.length ? ` ${e.methods.map((m) => METHOD_LABEL[m].toLowerCase()).join(", ")}.` : ""}
                        {e.storage ? ` Adds ${e.storage} space.` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {(["basic", "pro", "luxury"] as EquipTier[]).map((t) => {
                      const st = e.tiers[t];
                      if (!st) return <span key={t} />;
                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={state.stats.money < st.price}
                          onClick={() => buyEquipment(e.id, t)}
                          className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-left text-xs hover:border-blue-400/60 disabled:opacity-40"
                        >
                          <span className="block font-semibold">{TIER_LABEL[t]}</span>
                          <span className="block text-emerald-300">{naira(st.price)}</span>
                          <span className="block text-[10px] text-slate-500">
                            Q{st.quality} · speed {st.speed}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-2">
          {BOOKS.map((b) => {
            const owned = k.books?.includes(b.id);
            const count = RECIPES.filter((r) => r.source === "book" && r.from === b.id).length;
            return (
              <li key={b.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="text-3xl" aria-hidden>
                  📕
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{b.id}</p>
                  <p className="text-xs text-slate-400">
                    {b.blurb} {count} recipes.
                  </p>
                </div>
                <button type="button" className={`${btnPrimary} min-h-9 px-3 text-xs`} disabled={owned || state.stats.money < b.price} onClick={() => buyBook(b.id)}>
                  {owned ? "Owned" : naira(b.price)}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Garden ───────────────────────────────────────────────────────────────────

function GardenTab({ state, k, at }: { state: GameState; k: Kitchen; at: "home" | null }) {
  const [crop, setCrop] = useState(CROPS[0]?.id ?? "");
  if (at !== "home") return <p className="text-sm text-slate-400">Your garden is at home. Tend it when you're there.</p>;
  return (
    <div>
      <p className="text-sm text-slate-300">Grow your own. Home-grown produce is fresher and better than most of what the market sells, and it's nearly free.</p>
      <p className="mt-1 text-xs text-slate-500">Seeds {naira(SEED_PRICE)} a plot. Water every day (rain counts). Unwatered plants barely grow.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={crop} onChange={(e) => setCrop(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/15 bg-[#0d1220] px-3 text-sm sm:w-auto" aria-label="Crop to plant">
          {CROPS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name} ({c.grow!.days} days, {c.grow!.yield} portions)
            </option>
          ))}
        </select>
        <button type="button" className={btnGhost} onClick={() => gardenAction({ kind: "water" })} disabled={!k.garden.some((p) => p.crop && p.watered < state.day)}>
          💧 Water everything
        </button>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {k.garden.map((p, i) => {
          const def = p.crop ? ingredient(p.crop) : undefined;
          const days = def?.grow?.days ?? 1;
          const ready = def && p.growth >= days;
          return (
            <li key={i} className="rounded-xl border border-white/10 bg-gradient-to-b from-lime-900/20 to-amber-950/30 p-3">
              <p className="text-xs text-slate-400">Plot {i + 1}</p>
              {def ? (
                <>
                  <p className="mt-1 text-lg">
                    {ready ? def.icon : "🌱"} {def.name}
                  </p>
                  <div className="mt-1">
                    <Bar value={(p.growth / days) * 100} tone="bg-lime-400" label="Growth" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{ready ? "Ready!" : `${Math.ceil(days - p.growth)} days to go · ${p.watered >= state.day ? "watered today" : "thirsty"}`}</p>
                  <button type="button" className={`${btnPrimary} mt-2 min-h-9 w-full text-xs`} disabled={!ready} onClick={() => gardenAction({ kind: "harvest", plot: i })}>
                    Harvest
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-slate-500">Empty soil</p>
                  <button type="button" className={`${btnGhost} mt-2 min-h-9 w-full text-xs`} disabled={state.stats.money < SEED_PRICE} onClick={() => gardenAction({ kind: "plant", plot: i, crop })}>
                    Plant {ingredient(crop)?.name.toLowerCase()}
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Classes ──────────────────────────────────────────────────────────────────

function SchoolTab({ state, k }: { state: GameState; k: Kitchen }) {
  return (
    <div>
      <p className="text-sm text-slate-300">Chef-instructors teach professional technique: half a day in a real kitchen, new recipes, and a jump in your skills.</p>
      <ul className="mt-3 grid grid-cols-1 gap-2">
        {CLASSES.map((c) => {
          const fresh = c.recipes.filter((r) => !k.recipes[r]);
          return (
            <li key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="font-semibold">{c.title}</p>
              <p className="text-xs text-slate-400">Teaches {c.recipes.map((r) => recipe(r)?.name).join(", ")}</p>
              <p className="text-xs text-slate-500">{fresh.length ? `${fresh.length} new to you` : "You know all of these; you'd still sharpen your skills."}</p>
              <button type="button" className={`${btnPrimary} mt-2 min-h-9 text-xs`} disabled={state.stats.money < c.price || state.slot + 2 > SLOTS.length} onClick={() => takeClass(c.id)}>
                Enrol · {naira(c.price)} · half a day
              </button>
            </li>
          );
        })}
      </ul>
      {state.slot + 2 > SLOTS.length ? <p className="mt-2 text-xs text-amber-200">Classes start in the morning or afternoon.</p> : null}
    </div>
  );
}
