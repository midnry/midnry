import { useState } from "react";
import { socialAddFriend, socialBuyFollowers, socialBuyLikes, socialCreate, socialDeal, socialPost, socialReply } from "../systems/engine";
import { BRANDS, CONTENT, DEALS_AT, FOLLOWER_PACKS, canJoin, compact, engagement, knownPeople, niche, postsLeft, type ContentKind } from "../systems/social";
import { naira } from "../systems/rules";
import type { GameState } from "../systems/types";
import { btnGhost, btnPrimary } from "./theme";

type Tab = "home" | "comments" | "deals" | "people" | "boost";

/** A small line chart of follower counts. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / span) * 26 - 2}`).join(" ");
  const up = values[values.length - 1]! >= values[0]!;
  return (
    <svg viewBox="0 0 100 30" className="mt-2 h-10 w-full" preserveAspectRatio="none" aria-label="Followers over time">
      <polyline points={pts} fill="none" stroke={up ? "#34d399" : "#fb7185"} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Instaflex: your page, your posts, your comments, your deals. */
export function SocialApp({ state }: { state: GameState }) {
  const so = state.social;
  const [tab, setTab] = useState<Tab>("home");
  const [handle, setHandle] = useState(`${state.name.toLowerCase().replace(/\s+/g, "")}_abj`);
  const [collab, setCollab] = useState("");

  if (!so) {
    if (!canJoin(state)) return <p className="text-sm text-slate-400">Instaflex is for 13 and up. Your time will come.</p>;
    return (
      <div>
        <div className="rounded-2xl bg-gradient-to-br from-fuchsia-600 via-rose-500 to-amber-400 p-4 text-white">
          <p className="text-2xl font-black">Instaflex</p>
          <p className="mt-1 text-sm opacity-90">Post, grow, get famous. Or get dragged.</p>
        </div>
        <label className="mt-4 block text-sm text-slate-300" htmlFor="handle">
          Pick your handle
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-slate-400">@</span>
          <input id="handle" className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 outline-none focus:border-fuchsia-400" value={handle} maxLength={20} onChange={(e) => setHandle(e.target.value)} />
        </div>
        <button type="button" className={`${btnPrimary} mt-3 min-h-11 w-full`} onClick={() => socialCreate(handle)}>
          Create my page
        </button>
      </div>
    );
  }

  const left = postsLeft(state);
  const news = state.toast ? <p className="mb-3 rounded-xl bg-white/10 p-3 text-sm font-semibold">{state.toast}</p> : null;
  const n = niche(so);
  const eng = engagement(so);
  const unread = so.comments.length;
  const friendsHere = knownPeople(state).filter((p) => p.friend);
  return (
    <div>
      {news}
      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-700 via-rose-600 to-amber-500 p-4 text-white">
        <p className="text-sm font-bold opacity-90">@{so.handle}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-black tabular-nums">{compact(so.followers)}</p>
            <p className="text-[11px] opacity-80">Followers</p>
          </div>
          <div>
            <p className="text-xl font-black tabular-nums">{compact(so.likes)}</p>
            <p className="text-[11px] opacity-80">Likes</p>
          </div>
          <div>
            <p className="text-xl font-black tabular-nums">{so.posts.length}</p>
            <p className="text-[11px] opacity-80">Posts</p>
          </div>
        </div>
        <Sparkline values={so.history} />
        <p className="mt-1 text-[11px] opacity-85">
          {n ? `Known for: ${CONTENT[n].label}` : "Post a few times to find your niche"} · Engagement {(eng * 100).toFixed(1)}%
          {so.bought ? ` · ${compact(so.bought)} bought` : ""}
        </p>
      </div>

      <div className="mt-3 flex gap-1 overflow-x-auto text-sm" role="tablist">
        {(
          [
            ["home", "Post"],
            ["comments", `Comments${unread ? ` (${unread})` : ""}`],
            ["deals", `Deals${so.offers.length ? ` (${so.offers.length})` : ""}`],
            ["people", "Friends"],
            ["boost", "Boost"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-10 shrink-0 rounded-xl px-2.5 text-[13px] font-semibold ${tab === id ? "bg-white/15 text-white" : "text-slate-400 hover:bg-white/5"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "home" ? (
        <div className="mt-3">
          <p className="text-xs text-slate-400">{left > 0 ? `You can post ${left} more time${left > 1 ? "s" : ""} ${state.chapter ? "for now" : "today"}.` : state.chapter ? "You've posted enough for now." : "Come back tomorrow to post again."}</p>
          {friendsHere.length ? (
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
              Collab with
              <select className="h-9 rounded-lg border border-white/15 bg-black/30 px-2" value={collab} onChange={(e) => setCollab(e.target.value)}>
                <option value="">Nobody</option>
                {friendsHere.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(CONTENT) as ContentKind[]).map((k) => (
              <button key={k} type="button" disabled={left <= 0} onClick={() => socialPost(k, collab || undefined)} className={`${btnGhost} min-h-12 justify-start gap-2 px-3 text-left text-sm disabled:opacity-40`}>
                <span aria-hidden>{CONTENT[k].icon}</span>
                {CONTENT[k].label}
                {n === k ? <span className="ml-auto text-[10px] text-fuchsia-300">your niche</span> : null}
              </button>
            ))}
          </div>
          <p className="mt-4 mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Recent posts</p>
          <div className="grid gap-2">
            {[...so.posts].reverse().slice(0, 6).map((p) => (
              <div key={p.id} className="rounded-xl bg-white/5 p-3 text-sm">
                <p className="font-semibold">
                  {CONTENT[p.kind].icon} {p.caption} {p.viral ? <span className="text-amber-300">🔥 viral</span> : null}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  ❤️ {compact(p.likes)} · +{compact(p.gained)} followers{p.collab ? " · collab" : ""}
                </p>
              </div>
            ))}
            {!so.posts.length ? <p className="text-sm text-slate-400">No posts yet. Your first post is the hardest.</p> : null}
          </div>
        </div>
      ) : null}

      {tab === "comments" ? (
        <div className="mt-3 grid gap-2">
          {so.comments.map((c) => (
            <div key={c.id} className={`rounded-xl p-3 text-sm ${c.tone === "mean" ? "bg-rose-500/10" : c.tone === "spam" ? "bg-slate-500/10" : "bg-white/5"}`}>
              <p>
                <span className="font-bold">@{c.user}</span> {c.text}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.tone === "praise" ? <Act onClick={() => socialReply(c.id, "thank")}>Thank them ❤️</Act> : null}
                {c.tone === "question" ? <Act onClick={() => socialReply(c.id, "answer")}>Answer</Act> : null}
                {c.tone === "mean" ? (
                  <>
                    <Act onClick={() => socialReply(c.id, "clap")}>Clap back 🔥</Act>
                    <Act onClick={() => socialReply(c.id, "kind")}>Reply kindly</Act>
                  </>
                ) : null}
                {!c.npc ? <Act onClick={() => socialReply(c.id, "block")}>Block 🚫</Act> : null}
                <Act onClick={() => socialReply(c.id, "ignore")}>Ignore</Act>
              </div>
            </div>
          ))}
          {!so.comments.length ? <p className="text-sm text-slate-400">No new comments. Post something!</p> : null}
          {so.blocked.length ? <p className="mt-1 text-xs text-slate-500">Blocked: {so.blocked.map((b) => `@${b}`).join(", ")}</p> : null}
        </div>
      ) : null}

      {tab === "deals" ? (
        <div className="mt-3 grid gap-2">
          {so.followers < DEALS_AT ? <p className="text-sm text-slate-400">Brands start calling at {compact(DEALS_AT)} followers. You have {compact(so.followers)}.</p> : null}
          {so.offers.map((o) => {
            const b = BRANDS.find((x) => x.id === o.brand)!;
            const fits = n ? b.fits.includes(n) : false;
            return (
              <div key={o.id} className="rounded-xl bg-white/5 p-3 text-sm">
                <p className="font-semibold">
                  {b.icon} {b.name}
                </p>
                <p className="mt-0.5 text-slate-300">"{b.pitch}"</p>
                <p className="mt-1 text-xs text-slate-400">
                  Pays {naira(o.pay)} · {b.shady ? <span className="text-rose-300">your followers may not like this</span> : fits ? <span className="text-emerald-300">fits your audience</span> : <span className="text-amber-300">not really your audience</span>}
                </p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className={`${btnPrimary} min-h-10 flex-1`} onClick={() => socialDeal(o.id, true)}>
                    Take the deal
                  </button>
                  <button type="button" className={`${btnGhost} min-h-10 px-3`} onClick={() => socialDeal(o.id, false)}>
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
          {so.followers >= DEALS_AT && !so.offers.length ? <p className="text-sm text-slate-400">No offers right now. Keep posting.</p> : null}
          {so.earned ? <p className="text-xs text-slate-500">Earned from Instaflex so far: {naira(so.earned)}</p> : null}
        </div>
      ) : null}

      {tab === "people" ? (
        <div className="mt-3 grid gap-2">
          {knownPeople(state).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3 text-sm">
              <span className="flex size-9 items-center justify-center rounded-full bg-fuchsia-500/30 font-bold">{p.name.charAt(0)}</span>
              <span className="min-w-0 flex-1 font-semibold">{p.name}</span>
              {p.friend ? (
                <span className="text-xs text-emerald-300">Friends ✓</span>
              ) : (
                <button type="button" className={`${btnGhost} min-h-9 px-3`} onClick={() => socialAddFriend(p.id)}>
                  Add friend
                </button>
              )}
            </div>
          ))}
          {!knownPeople(state).length ? <p className="text-sm text-slate-400">People you get to know will show up here.</p> : null}
          <p className="text-xs text-slate-500">Friends can collab on posts, and they turn up in your comments.</p>
        </div>
      ) : null}

      {tab === "boost" ? (
        <div className="mt-3 grid gap-2">
          <p className="text-xs text-slate-400">Bought followers never like or comment, slowly get purged, and brands can spot them.</p>
          {FOLLOWER_PACKS.map((p) => (
            <button key={p.n} type="button" disabled={state.stats.money < p.price} onClick={() => socialBuyFollowers(p.n, p.price)} className={`${btnGhost} min-h-11 justify-between px-3 disabled:opacity-40`}>
              <span>+{compact(p.n)} followers</span>
              <span className="text-slate-300">{naira(p.price)}</span>
            </button>
          ))}
          <button type="button" disabled={state.stats.money < 2000 || !so.posts.length} onClick={socialBuyLikes} className={`${btnGhost} min-h-11 justify-between px-3 disabled:opacity-40`}>
            <span>+2,000 likes on your latest post</span>
            <span className="text-slate-300">{naira(2000)}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Act({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-9 rounded-lg bg-white/10 px-2.5 text-xs font-semibold hover:bg-white/15">
      {children}
    </button>
  );
}
