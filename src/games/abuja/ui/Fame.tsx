import { useEffect, useState } from "react";
import { submitLife, topLives, type FameRow } from "../fame.functions";
import { ENDINGS } from "../systems/data";
import { naira, netWorth } from "../systems/rules";
import type { GameState } from "../systems/types";
import { GAME_FONT, btnGhost, btnPrimary, panel } from "./theme";

const GAME_URL = "https://www.midnry.com/games/abuja-hustle";

/** A stable key for one finished life, so sharing twice doesn't add it twice. */
const lifeKey = (s: GameState) => `${s.name}:${s.background}:${s.gender}:${s.day}:${Math.round(netWorth(s))}`;

function shareText(s: GameState) {
  const ending = ENDINGS[s.ending ?? "broke"];
  return `My Abuja Hustle life: ${s.name} ended "${ending.title}" at ${Math.floor(s.age)} with ${naira(netWorth(s))}. Can you do better? ${GAME_URL}`;
}

/** Draws the life-story card (1080×1350) and returns it as a PNG blob. */
async function drawCard(s: GameState): Promise<Blob | null> {
  const ending = ENDINGS[s.ending ?? "broke"];
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext("2d");
  if (!g) return null;
  const bg = g.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, ending.color);
  bg.addColorStop(0.55, "#0f172a");
  bg.addColorStop(1, "#020617");
  g.fillStyle = bg;
  g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = "rgba(255,255,255,0.06)";
  for (let i = 0; i < 14; i += 1) g.fillRect(60 + i * 70, 1050 - ((i * 137) % 260), 48, 300 + ((i * 137) % 260));
  g.fillStyle = "#e2e8f0";
  g.font = "600 34px system-ui, sans-serif";
  g.fillText("ABUJA HUSTLE · A LIFE STORY", 80, 120);
  g.fillStyle = "#fff";
  g.font = "800 110px system-ui, sans-serif";
  wrap(g, ending.title, 80, 270, 920, 115);
  g.font = "700 58px system-ui, sans-serif";
  g.fillText(s.name, 80, 470);
  g.font = "500 38px system-ui, sans-serif";
  g.fillStyle = "#cbd5e1";
  const gen = Number(s.flags.generation ?? 1);
  g.fillText(`${s.background === "lapo" ? "Lapo Baby" : "Average family"} · age ${Math.floor(s.age)}${gen > 1 ? ` · generation ${gen}` : ""}`, 80, 530);
  g.fillStyle = "#fff";
  g.font = "800 72px system-ui, sans-serif";
  g.fillText(naira(netWorth(s)), 80, 640);
  g.font = "500 30px system-ui, sans-serif";
  g.fillStyle = "#94a3b8";
  g.fillText("NET WORTH", 80, 685);
  g.font = "500 34px system-ui, sans-serif";
  g.fillStyle = "#e2e8f0";
  let y = 780;
  for (const item of s.log.slice(-5)) {
    y = wrap(g, `• ${item.text}`, 80, y, 920, 44) + 14;
    if (y > 1150) break;
  }
  g.fillStyle = "#38bdf8";
  g.font = "700 36px system-ui, sans-serif";
  g.fillText("Play free: midnry.com/games/abuja-hustle", 80, 1270);
  return new Promise((done) => c.toBlob(done, "image/png"));
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number): number {
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > max && line) {
      g.fillText(line, x, y);
      line = word;
      y += lh;
    } else line = test;
  }
  g.fillText(line, x, y);
  return y + lh;
}

/** On the end screen: share the card, send it on WhatsApp, and put the life in the Hall of Fame. */
export function ShareLife({ state, signedIn }: { state: GameState; signedIn: boolean }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const text = shareText(state);

  async function shareCard() {
    setBusy(true);
    try {
      const blob = await drawCard(state);
      if (!blob) return;
      const file = new File([blob], `abuja-hustle-${state.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text }).catch(() => {});
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setStatus("Your life card is saved. Post it anywhere.");
    } finally {
      setBusy(false);
    }
  }

  async function addToHall() {
    setBusy(true);
    try {
      const r = await submitLife({
        data: {
          key: lifeKey(state),
          name: state.name,
          ending: state.ending ?? "broke",
          netWorth: netWorth(state),
          age: state.age,
          generation: Number(state.flags.generation ?? 1),
          background: state.background,
        },
      });
      setStatus(r.ok ? `🏆 In the Hall of Fame at #${r.rank} for net worth.` : "You've shared a lot of lives today. Try again tomorrow.");
    } catch {
      setStatus("Couldn't reach the Hall of Fame. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-sky-400/30 bg-sky-400/5 p-4">
      <p className="font-display text-xl">Share this life</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button type="button" className={`${btnPrimary} min-h-11`} onClick={shareCard} disabled={busy}>
          🖼️ Life card
        </button>
        <a className={`${btnGhost} min-h-11`} href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
          💬 WhatsApp
        </a>
        {signedIn ? (
          <button type="button" className={`${btnGhost} min-h-11`} onClick={addToHall} disabled={busy}>
            🏆 Add to Hall of Fame
          </button>
        ) : (
          <a className={`${btnGhost} min-h-11`} href="/login?intent=sign-in&next=/games/abuja-hustle">
            Sign in for the Hall of Fame
          </a>
        )}
      </div>
      {status ? (
        <p className="mt-2 text-sm text-slate-300" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}

/** The Hall of Fame, from the title screen. */
export function HallOfFame({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<{ richest: FameRow[]; dynasties: FameRow[]; recent: FameRow[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<"richest" | "dynasties" | "recent">("richest");
  useEffect(() => {
    topLives()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);
  const rows = data?.[tab] ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div className={`${panel} max-h-[88dvh] w-full max-w-lg overflow-y-auto p-4 text-left text-slate-100`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Hall of Fame" style={{ fontFamily: GAME_FONT }}>
        <div className="flex items-center justify-between">
          <p className="text-xl font-extrabold">🏆 Hall of Fame</p>
          <button type="button" className="min-h-11 rounded-xl px-3" onClick={onClose} aria-label="Close Hall of Fame">
            ✕
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 text-sm" role="tablist">
          {(["richest", "dynasties", "recent"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={`min-h-10 rounded-lg ${tab === t ? "bg-sky-500/30 font-semibold" : ""}`} onClick={() => setTab(t)}>
              {t === "richest" ? "Richest" : t === "dynasties" ? "Dynasties" : "Latest"}
            </button>
          ))}
        </div>
        {failed ? <p className="mt-4 text-sm text-slate-400">Couldn't load the Hall of Fame right now.</p> : null}
        {!data && !failed ? <p className="mt-4 text-sm text-slate-400">Loading…</p> : null}
        {data && !rows.length ? <p className="mt-4 text-sm text-slate-400">{tab === "dynasties" ? "No family has gone past one generation yet. Have children, then live on as one of them." : "No lives shared yet. Finish a life and be the first."}</p> : null}
        <ol className="mt-3 grid gap-1.5">
          {rows.map((r, i) => {
            const ending = ENDINGS[r.ending as keyof typeof ENDINGS] ?? ENDINGS.broke;
            return (
              <li key={`${r.name}-${i}`} className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
                <span className="w-7 text-center font-bold text-slate-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="truncate text-xs text-slate-400">
                    <span style={{ color: ending.color }}>{ending.title}</span> · age {r.age}
                    {r.generation > 1 ? ` · gen ${r.generation}` : ""} · {r.background === "lapo" ? "Lapo Baby" : "Average family"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold">{naira(r.netWorth)}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
