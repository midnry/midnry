import { NPCS } from "./data";
import { npcName } from "./rules";
import type { GameState } from "./types";

// Instaflex: being an influencer, from secondary school to adult life. Post
// content, watch followers and likes, answer praise and trolls, block people,
// add friends you meet, buy fake followers (and risk being found out), and once
// you're big enough, take brand deals. The wrong brand for your audience costs
// you followers; a shady one costs more.

export type ContentKind = "comedy" | "lifestyle" | "food" | "tech" | "gist" | "dance" | "educational" | "fashion";
export type Tone = "praise" | "mean" | "question" | "spam";

export const CONTENT: Record<ContentKind, { label: string; icon: string; captions: string[] }> = {
  comedy: { label: "Comedy skit", icon: "😂", captions: ["POV: NEPA takes light during your exam revision", "When Mama says 'we have food at home'", "Nigerian parents when you say you're tired"] },
  lifestyle: { label: "Lifestyle", icon: "✨", captions: ["A day in my life in Abuja", "Get ready with me: Sunday edition", "My room tour (be nice)"] },
  food: { label: "Food", icon: "🍲", captions: ["Rating every suya spot in Abuja", "Jollof under ₦2,000: is it possible?", "Cooking my Mama's egusi from memory"] },
  tech: { label: "Tech", icon: "💻", captions: ["5 free apps every student needs", "I built a website in one night", "Is this ₦50,000 phone worth it?"] },
  gist: { label: "Gist & hot takes", icon: "🗣️", captions: ["Unpopular opinion: Abuja traffic is a lifestyle", "Storytime: the day I got lost in Wuse Market", "Let's talk about it: owambe culture"] },
  dance: { label: "Dance", icon: "💃", captions: ["New dance challenge, tag your friends", "Learning the latest Afrobeats steps", "Dancing in the rain (don't tell Mama)"] },
  educational: { label: "Educational", icon: "📚", captions: ["How I passed maths: 3 tricks", "Explaining inflation with pure water", "Study with me: 2 hours, no phone"] },
  fashion: { label: "Fashion", icon: "👗", captions: ["Ankara outfits under ₦10,000", "Thrift haul from Wuse Market", "Styling one shirt five ways"] },
};

export type Brand = { id: string; name: string; icon: string; pitch: string; fits: ContentKind[]; rate: number; shady?: string; adult?: boolean };

/** Companies that come asking. `fits` is the audience they suit; shady ones pay more and cost more. */
export const BRANDS: Brand[] = [
  { id: "konnect", name: "Konnect Telecom", icon: "📶", pitch: "Promote our new student data bundle.", fits: ["comedy", "lifestyle", "food", "tech", "gist", "dance", "educational", "fashion"], rate: 1 },
  { id: "mamacass", name: "Mama Cass Kitchen", icon: "🍗", pitch: "Eat at our new Wuse branch on camera.", fits: ["food", "lifestyle", "comedy"], rate: 1.1 },
  { id: "ankara", name: "Ankara by Ronke", icon: "🧵", pitch: "Wear our new collection in three posts.", fits: ["fashion", "lifestyle", "dance"], rate: 1.2 },
  { id: "techhub", name: "Abuja Tech Hub Bootcamp", icon: "🧑‍💻", pitch: "Tell your followers about our coding bootcamp.", fits: ["tech", "educational"], rate: 1.3 },
  { id: "benue", name: "Benue Harvest Foods", icon: "🌽", pitch: "Cook with our tomato paste.", fits: ["food", "educational"], rate: 1 },
  { id: "nolly", name: "\"Lagos to Abuja\" (film)", icon: "🎬", pitch: "Hype our film premiere.", fits: ["comedy", "gist", "lifestyle", "dance"], rate: 1.2 },
  { id: "jollofinu", name: "JollofInu (meme coin)", icon: "🪙", pitch: "Tell your fans to buy JollofInu before it moons.", fits: [], rate: 3, shady: "crypto" },
  { id: "quickkash", name: "QuickKash loans", icon: "💸", pitch: "Push our instant loan app to your followers.", fits: [], rate: 2.4, shady: "loans" },
  { id: "bet9", name: "BetNaija9ja", icon: "🎰", pitch: "Promote our sports betting app.", fits: [], rate: 2.6, shady: "betting", adult: true },
  { id: "glow", name: "GlowWhite cream", icon: "🧴", pitch: "Show your 'glow up' with our skin-lightening cream.", fits: [], rate: 2.2, shady: "bleaching" },
  { id: "profit", name: "Prophet Profit's forex class", icon: "📈", pitch: "Tell your fans about my 400% signals.", fits: [], rate: 2.5, shady: "forex scam" },
];

export type Post = { id: string; kind: ContentKind; caption: string; likes: number; gained: number; at: string | number; brand?: string; collab?: string; viral?: boolean };
export type Comment = { id: string; post: string; user: string; text: string; tone: Tone; npc?: string };
export type Offer = { id: string; brand: string; pay: number };

export type Social = {
  handle: string;
  followers: number;
  /** Bought followers among them: bots that never engage, and slowly get purged. */
  bought: number;
  likes: number;
  posts: Post[];
  comments: Comment[];
  blocked: string[];
  /** Named people you've added as friends. */
  friends: string[];
  offers: Offer[];
  deals: string[];
  /** Follower counts over time, for the chart. */
  history: number[];
  postsAt: string | number;
  postsCount: number;
  /** Earned from brand deals so far. */
  earned: number;
};

export const MIN_AGE = 13;
export const DEALS_AT = 5000;
const POSTS_PER_TURN = 2;

const r = () => Math.random();
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
const turn = (s: GameState) => (s.chapter ? `${s.chapter}:${s.scene}` : s.day);
export const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${Math.round(n)}`);

export function social(s: GameState): Social | null {
  return s.social ?? null;
}

export function canJoin(s: GameState): boolean {
  return s.age >= MIN_AGE && s.stage !== "primary";
}

export function createAccount(s: GameState, handle: string): string {
  if (s.social) return "You already have an account.";
  if (!canJoin(s)) return "You're too young for Instaflex.";
  const clean = handle.replace(/[^a-z0-9_.]/gi, "").slice(0, 20) || `${s.name.toLowerCase()}_abj`;
  const start = s.flags.early_creator ? 300 : 40;
  s.social = { handle: clean, followers: start, bought: 0, likes: 0, posts: [], comments: [], blocked: [], friends: [], offers: [], deals: [], history: [start], postsAt: "", postsCount: 0, earned: 0 };
  return `@${clean} is live. ${start} people followed you already, mostly classmates and one aunty.`;
}

/** What your audience is into: the kind you post most. */
export function niche(so: Social): ContentKind | null {
  const count: Partial<Record<ContentKind, number>> = {};
  for (const p of so.posts.slice(-12)) count[p.kind] = (count[p.kind] ?? 0) + 1;
  const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return best ? (best[0] as ContentKind) : null;
}

/** Likes per real follower on recent posts: brands check this. */
export function engagement(so: Social): number {
  const recent = so.posts.slice(-5);
  if (!recent.length || so.followers <= 0) return 0;
  return recent.reduce((n, p) => n + p.likes, 0) / recent.length / so.followers;
}

export function postsLeft(s: GameState): number {
  const so = s.social;
  if (!so) return 0;
  return so.postsAt === turn(s) ? Math.max(0, POSTS_PER_TURN - so.postsCount) : POSTS_PER_TURN;
}

const HANDLES = ["abuja_babe", "naija_gist247", "wuse_boy", "chiamaka.o", "tundeednut_fan", "garki_girl", "lekki_vibes", "omo_naija", "hausa_prince", "igbo_queen", "kubwa_kid", "nyanya_ninja", "suya_lover", "jollof_judge", "afrobeats4life", "danfo_driver", "jambite2024", "corper_shun", "gwarinpa_gist", "maitama_money"];
const SAY: Record<Tone, string[]> = {
  praise: ["This is so funny 😂😂", "You're so talented!", "Abuja's finest 🔥", "I needed this today ❤️", "Content king/queen 👑", "Why are you not famous yet??"],
  mean: ["This is trash 🗑️", "Who asked?", "Your village people are watching this 😂", "Bought followers abi?", "Go and read your books", "Mid. Very mid."],
  question: ["Where did you buy that?", "How did you learn this?", "Part 2 please!", "Which school do you attend?", "Can you do a tutorial?"],
  spam: ["Follow for follow 🔁", "DM me for crypto investment 💰💰", "Check my page for cheap iPhones", "Earn ₦50k daily, click link in bio"],
};

function addComments(so: Social, s: GameState, post: Post) {
  const n = 2 + Math.floor(r() * 3);
  const spammy = so.bought > so.followers * 0.3 ? 0.3 : 0.12;
  for (let i = 0; i < n; i += 1) {
    const roll = r();
    const tone: Tone = roll < spammy ? "spam" : roll < spammy + 0.42 ? "praise" : roll < spammy + 0.7 ? "mean" : "question";
    // Sometimes it's someone you know.
    const friend = tone !== "spam" && so.friends.length && r() < 0.25 ? pick(so.friends) : null;
    const user = friend ? npcName(s, friend) : pick(HANDLES.filter((h) => !so.blocked.includes(h)));
    if (!user) continue;
    const text = friend ? (tone === "mean" ? "Lol you're not serious 😂 (love you)" : pick(SAY.praise)) : pick(SAY[tone]);
    so.comments.unshift({ id: `${post.id}-${i}`, post: post.id, user, text, tone: friend && tone === "mean" ? "praise" : tone, npc: friend ?? undefined });
  }
  so.comments.length = Math.min(so.comments.length, 24);
}

function track(so: Social) {
  so.history.push(so.followers);
  if (so.history.length > 40) so.history.splice(0, so.history.length - 40);
}

/** Post something. Returns a line for the toast. */
export function post(s: GameState, kind: ContentKind, collab?: string): { text: string; strike?: boolean } {
  const so = s.social;
  if (!so) return { text: "Make an account first." };
  if (postsLeft(s) <= 0) return { text: s.chapter ? "You've posted enough for now. Your phone needs a rest, and so do you." : "That's enough posting today. Come back tomorrow." };
  if (so.postsAt !== turn(s)) {
    so.postsAt = turn(s);
    so.postsCount = 0;
  }
  so.postsCount += 1;
  // Phones at school: a teacher might catch you.
  if (s.stage === "secondary" && r() < 0.12) return { text: "A teacher catches you filming in class. Phone confiscated till the end of term, and your name is in the black book.", strike: true };
  const real = Math.max(0, so.followers - so.bought);
  const skill = s.skills.content ?? 0;
  const fit = niche(so) === kind ? 1.25 : so.posts.length < 3 ? 1 : 0.85;
  const friend = collab && so.friends.includes(collab) ? collab : undefined;
  const boost = friend === "bolaji" ? 1.8 : friend ? 1.3 : 1;
  const viral = r() < 0.03 + skill / 1500;
  const quality = (0.5 + skill / 80 + r() * 0.8) * fit * boost * (viral ? 8 + r() * 12 : 1);
  const likes = Math.max(1, Math.round((real * 0.09 + 15) * quality));
  // New followers get harder to win as a page grows; a viral post brings a capped wave.
  const sat = 1 / (1 + so.followers / 150000);
  const wave = Math.round(likes * (0.12 + r() * 0.1) * sat);
  const gained = Math.max(0, viral ? Math.min(Math.round(likes * 0.2), 25000 + Math.round(real * 0.12)) : wave);
  const caption = pick(CONTENT[kind].captions);
  const p: Post = { id: `p${so.posts.length + 1}-${Date.now() % 100000}`, kind, caption, likes, gained, at: turn(s), collab: friend, viral };
  so.posts.push(p);
  if (so.posts.length > 30) so.posts.splice(0, so.posts.length - 30);
  so.followers += gained;
  so.likes += likes;
  s.skills.content = Math.min(100, skill + 1);
  addComments(so, s, p);
  maybeOffer(s, so);
  track(so);
  const who = friend ? ` with ${npcName(s, friend)}` : "";
  return { text: viral ? `🔥 Your ${CONTENT[kind].label.toLowerCase()} post${who} went VIRAL: ${compact(likes)} likes, +${compact(gained)} followers!` : `Posted${who}: ${compact(likes)} likes, +${compact(gained)} followers.` };
}

export const FOLLOWER_PACKS = [
  { n: 1000, price: 3000 },
  { n: 5000, price: 12000 },
  { n: 20000, price: 40000 },
];

export function buyFollowers(s: GameState, n: number, price: number): string {
  const so = s.social;
  if (!so) return "Make an account first.";
  if (s.stats.money < price) return "You can't afford that.";
  s.stats.money -= price;
  so.followers += n;
  so.bought += n;
  track(so);
  return `+${compact(n)} followers overnight. They all have no profile picture and names like "user83920174".`;
}

export function buyLikes(s: GameState): string {
  const so = s.social;
  const last = so?.posts[so.posts.length - 1];
  if (!so || !last) return "Post something first.";
  if (s.stats.money < 2000) return "You can't afford that.";
  s.stats.money -= 2000;
  last.likes += 2000;
  so.likes += 2000;
  return "+2,000 likes on your latest post. It looks popular. It isn't.";
}

/** Answer a comment. Returns a line for the toast. */
export function reply(s: GameState, id: string, how: "thank" | "clap" | "kind" | "answer" | "block" | "ignore"): string {
  const so = s.social;
  const c = so?.comments.find((x) => x.id === id);
  if (!so || !c) return "";
  so.comments = so.comments.filter((x) => x.id !== id);
  if (how === "block") {
    if (!so.blocked.includes(c.user)) so.blocked.push(c.user);
    return `Blocked @${c.user}. Peace.`;
  }
  if (how === "ignore") return "";
  if (how === "thank" || how === "answer") {
    const g = Math.round(3 + Math.min(40, so.followers * 0.002) * (how === "answer" ? 2 : 1));
    so.followers += g;
    if (c.npc) s.npcs[c.npc] = { ...(s.npcs[c.npc] ?? { rel: 0, met: true, lastSeen: s.day }), rel: Math.min(100, (s.npcs[c.npc]?.rel ?? 0) + 1) };
    return how === "answer" ? `Your followers love that you reply. +${g} followers.` : `@${c.user} feels seen. +${g} followers.`;
  }
  if (how === "kind") {
    s.stats.reputation = Math.min(100, s.stats.reputation + 1);
    so.followers += Math.round(2 + Math.min(60, so.followers * 0.003));
    return "\"Thanks for watching anyway ❤️\". The comments turn on the troll instead.";
  }
  // Clap back: a viral roast, a backlash, or nothing.
  const roll = r();
  if (roll < 0.35) {
    const g = Math.round(20 + Math.min(4000, so.followers * 0.05));
    so.followers += g;
    track(so);
    return `Your clapback goes viral: "Who asked? Your mum, last night." +${compact(g)} followers.`;
  }
  if (roll < 0.65) {
    const l = Math.round(so.followers * 0.03);
    so.followers = Math.max(0, so.followers - l);
    s.stats.reputation = Math.max(0, s.stats.reputation - 2);
    track(so);
    return `People think you went too far. -${compact(l)} followers.`;
  }
  return "Your reply gets a few laughs, then everyone moves on.";
}

/** Add someone you know as a friend on Instaflex. */
export function addFriend(s: GameState, id: string): string {
  const so = s.social;
  if (!so || so.friends.includes(id)) return "";
  so.friends.push(id);
  so.followers += 1;
  if (s.npcs[id]) s.npcs[id]!.rel = Math.min(100, s.npcs[id]!.rel + 2);
  return `You and ${npcName(s, id)} are friends on Instaflex now.`;
}

/** People you've met who could be friends on Instaflex. */
export function knownPeople(s: GameState): { id: string; name: string; friend: boolean }[] {
  const so = s.social;
  return NPCS.filter((n) => s.npcs[n.id]?.met).map((n) => ({ id: n.id, name: npcName(s, n.id), friend: Boolean(so?.friends.includes(n.id)) }));
}

function maybeOffer(s: GameState, so: Social) {
  if (so.followers < DEALS_AT || so.offers.length >= 3 || r() > 0.5) return;
  const pool = BRANDS.filter((b) => !so.offers.some((o) => o.brand === b.id) && !so.deals.includes(b.id));
  const b = pool.length ? pick(pool) : null;
  if (!b) return;
  // Pay scales with real reach, and with engagement.
  const reach = Math.max(0, so.followers - so.bought * 0.8);
  const pay = Math.round((reach * 4 * b.rate) / 500) * 500;
  if (pay < 1000) return;
  so.offers.push({ id: `${b.id}-${so.posts.length}`, brand: b.id, pay });
}

/** Take a brand deal: paid now, then your audience reacts. */
export function takeDeal(s: GameState, id: string): { text: string; strike?: boolean } {
  const so = s.social;
  const o = so?.offers.find((x) => x.id === id);
  const b = o ? BRANDS.find((x) => x.id === o.brand) : undefined;
  if (!so || !o || !b) return { text: "" };
  so.offers = so.offers.filter((x) => x.id !== id);
  // Brands check: lots of bought followers can get you caught.
  if (so.bought > so.followers * 0.35 && r() < 0.5) {
    const lost = so.bought;
    so.followers = Math.max(0, so.followers - lost);
    so.bought = 0;
    s.stats.reputation = Math.max(0, s.stats.reputation - 5);
    track(so);
    return { text: `${b.name} runs an audit: most of your followers are bots. Deal cancelled, and a blog posts the receipts. -${compact(lost)} followers.` };
  }
  s.stats.money += o.pay;
  so.earned += o.pay;
  so.deals.push(b.id);
  const n = niche(so);
  let text: string;
  let strike = false;
  if (b.shady) {
    const l = Math.round(so.followers * (0.08 + r() * 0.08));
    so.followers = Math.max(0, so.followers - l);
    s.stats.reputation = Math.max(0, s.stats.reputation - 4);
    text = `+₦${o.pay.toLocaleString()} from ${b.name}. Then the comments arrive: "You're promoting ${b.shady} to us??" -${compact(l)} followers.`;
    if (b.adult && s.age < 18) {
      strike = true;
      text += " The school hears you advertised betting.";
    }
    if (b.shady === "crypto") s.stats.heat = Math.min(100, s.stats.heat + 5);
  } else if (n && b.fits.includes(n)) {
    const g = Math.round(Math.min(20000, so.followers * (0.02 + r() * 0.03)));
    so.followers += g;
    s.stats.reputation = Math.min(100, s.stats.reputation + 1);
    text = `+₦${o.pay.toLocaleString()} from ${b.name}. Your followers love it: it fits your page. +${compact(g)} followers.`;
  } else {
    const l = Math.round(so.followers * (0.02 + r() * 0.03));
    so.followers = Math.max(0, so.followers - l);
    text = `+₦${o.pay.toLocaleString()} from ${b.name}. But it's not what your followers come for: "Sell-out." -${compact(l)} followers.`;
  }
  track(so);
  return { text, strike };
}

export function declineDeal(s: GameState, id: string) {
  const so = s.social;
  if (so) so.offers = so.offers.filter((x) => x.id !== id);
}

/** Nightly, in the city: bots get purged, idle pages slide, and big pages earn a little. Returns a line or "". */
export function nightlySocial(s: GameState): string {
  const so = s.social;
  if (!so) return "";
  const purged = Math.round(so.bought * 0.04);
  so.bought -= purged;
  so.followers = Math.max(0, so.followers - purged);
  const last = so.posts[so.posts.length - 1];
  const idle = !last || (typeof last.at === "number" && s.day - last.at > 4);
  if (idle) so.followers = Math.max(0, Math.round(so.followers * 0.99));
  // Big audiences drift away a little every day: you have to keep earning them.
  const real = so.followers - so.bought;
  if (real > 50000) so.followers -= Math.round(real * Math.min(0.01, real / 40_000_000));
  track(so);
  if (s.day % 7 === 0 && so.followers - so.bought >= 10000) {
    const fund = Math.round((so.followers - so.bought) * 0.3);
    s.stats.money += fund;
    so.earned += fund;
    return `Instaflex creator fund: +₦${fund.toLocaleString()}.`;
  }
  return "";
}
