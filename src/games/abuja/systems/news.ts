import { ASSETS } from "./market";
import { BUSINESSES } from "./business";
import { life as lifeOf } from "./life";
import { MONTHS, SEASON_NAMES, weatherOf } from "./weather";
import { eventsNow } from "./cityEvents";
import type { GameState } from "./types";

// Abuja Daily: the city's news, written from what is actually happening in
// the game. The weather and tomorrow's forecast, the markets, police
// crackdowns when heat is high, your businesses and your reputation, and
// the stories you are part of. Most of it follows from the state; things
// that happen once (an arrest, a story beat) are filed with `report`.

export type NewsTag = "Weather" | "Markets" | "City" | "Crime" | "Business" | "People" | "Politics";
export type Story = { id: string; tag: NewsTag; headline: string; body: string; icon: string; day: number; you?: boolean };

const MAX_FILED = 30;

/** File a story that happened once. Content can do this with the `news` effect. */
export function report(s: GameState, story: { tag: NewsTag; headline: string; body: string; icon?: string; you?: boolean }): void {
  s.news ??= [];
  if (s.news.some((n) => n.headline === story.headline)) return;
  s.news.unshift({ ...story, icon: story.icon ?? "📰", day: s.day, id: `${s.day}-${s.news.length}-${story.headline.length}` });
  s.news.length = Math.min(s.news.length, MAX_FILED);
}

function roll(day: number, salt: number): number {
  let h = (day * 2654435761 + salt * 97) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

function weatherStories(s: GameState): Story[] {
  const now = weatherOf(s.day, s.slot);
  const next = [1, 2].map((slot) => weatherOf(s.day + 1, slot));
  const wetTomorrow = next.find((w) => w.wet);
  const out: Story[] = [];
  const month = MONTHS[now.month]!;
  let headline: string;
  let body: string;
  if (now.season === "harmattan") {
    headline = now.sky === "haze" ? "Harmattan haze blankets the FCT" : "A clear break in the harmattan";
    body = `${month} mornings are cold and dusty. Doctors advise water, lip balm and keeping catarrh at bay. Flights into Nnamdi Azikiwe may be delayed by poor visibility.`;
  } else if (wetTomorrow) {
    headline = wetTomorrow.sky === "storm" ? "Thunderstorms expected tomorrow" : "Rain expected tomorrow afternoon";
    body = `${SEASON_NAMES[now.season]} continues. Expect taxi and okada fares to climb when it pours, and give gutters in Lugbe and Kubwa a wide berth.`;
  } else if (now.season === "rainy") {
    headline = "Dry spell tomorrow, but the rains aren't done";
    body = `A break in the ${month} rains. Farmers in Bwari and Kuje will be watching the sky.`;
  } else {
    headline = "Hot and dry across Abuja";
    body = `${month} heat. Sachet water sellers report brisk business at every junction.`;
  }
  out.push({ id: "wx", tag: "Weather", icon: wetTomorrow?.icon ?? now.icon, headline, body, day: s.day });
  return out;
}

function marketStories(s: GameState): Story[] {
  const m = s.market;
  if (!m) return [];
  const moves = ASSETS.map((a) => {
    const candles = m.candles[a.id] ?? [];
    const prev = candles[candles.length - 1]?.c ?? a.price;
    const now = m.prices[a.id] ?? prev;
    return { a, now, change: ((now - prev) / prev) * 100 };
  });
  const out: Story[] = [];
  const naira = moves.find((x) => x.a.id === "USDNGN");
  if (naira && Math.abs(naira.change) >= 0.3) {
    const weaker = naira.change > 0;
    out.push({
      id: "mk-ngn",
      tag: "Markets",
      icon: weaker ? "📉" : "📈",
      day: s.day,
      headline: weaker ? `Naira slips to ₦${Math.round(naira.now).toLocaleString()} to the dollar` : `Naira firms up at ₦${Math.round(naira.now).toLocaleString()}/$`,
      body: weaker ? "Importers brace for higher prices. Bureau de change operators in Wuse Zone 4 say demand for dollars is up." : "Traders cautiously welcome the gain. Whether it lasts is another matter.",
    });
  }
  const big = moves.filter((x) => x.a.id !== "USDNGN" && Math.abs(x.change) >= 3).sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  if (big) {
    const up = big.change > 0;
    const crypto = big.a.kind === "crypto";
    out.push({
      id: `mk-${big.a.id}`,
      tag: "Markets",
      icon: up ? "🚀" : "🔻",
      day: s.day,
      headline: `${big.a.name.replace(/ \(.*\)/, "")} ${up ? "jumps" : "tumbles"} ${pct(big.change)}`,
      body: crypto
        ? up
          ? "Telegram groups are celebrating. Analysts remind everyone that what goes up can come down faster."
          : "Group chats have gone very quiet. 'It's a dip,' says one investor. 'Buy the dip,' says another, quietly selling."
        : up
          ? "Strong results and a good week on the Exchange."
          : "Investors take profit after a shaky week on the Exchange.",
    });
  }
  return out;
}

function crimeStories(s: GameState): Story[] {
  const out: Story[] = [];
  if (s.stats.heat >= 40)
    out.push({ id: "cr-heat", tag: "Crime", icon: "🚔", day: s.day, headline: "Police step up stop-and-search across Abuja", body: "Checkpoints have appeared overnight. Officers say they are acting on 'credible intelligence' about suspicious money moving in the city." });
  if (s.flags.fraud)
    out.push({ id: "cr-efcc", tag: "Crime", icon: "🕵️", day: s.day, headline: "EFCC warns young people about 'quick money' schemes", body: "The anti-graft agency says it is tracing accounts linked to online fraud. 'We will find you,' a spokesperson said." });
  return out;
}

function peopleStories(s: GameState): Story[] {
  const out: Story[] = [];
  const life = lifeOf(s);
  const rep = s.stats.reputation;
  const insulted = Object.entries(s.flags).find(([k, v]) => k.startsWith("insulted_") && v === s.day - 1);
  if (s.stage === "adult" && rep >= 60 && !insulted)
    out.push({ id: "pp-rising", tag: "People", icon: "⭐", day: s.day, you: true, headline: `Rising star: ${s.name} is the name on Abuja's lips`, body: "From the hustle to the boardroom, people are talking. Who's next to knock on that door?" });
  if (insulted)
    out.push({ id: "pp-viral", tag: "People", icon: "📱", day: s.day, you: true, headline: "Video of public shouting match goes viral", body: `A clip of a young person trading insults in public has hit 200k views. Commenters say they recognise ${s.name}. 'Home training is free,' says one.` });
  const so = s.social;
  if (so && so.followers >= 50000)
    out.push({ id: "pp-influencer", tag: "People", icon: "📸", day: s.day, you: true, headline: `Instaflex star @${so.handle} passes ${Math.floor(so.followers / 10000) * 10}K followers`, body: `${s.name}'s page is one of Abuja's fastest-growing. Brands are queueing up${so.bought > so.followers * 0.3 ? ", though some say the numbers look a little too good" : ""}.` });
  for (const b of life.businesses) {
    const def = BUSINESSES.find((d) => d.id === b.id);
    if (!def) continue;
    if (s.day - b.since === 1 || s.day - b.since === 0)
      out.push({ id: `bz-${b.id}`, tag: "Business", icon: def.icon, day: s.day, you: true, headline: `New ${def.name} opens its doors`, body: `${s.name}'s ${def.name.toLowerCase()} is open for business. Early customers say the welcome is warm.` });
    else if (b.level >= 2 && (s.day - b.since) % 7 === 0)
      out.push({ id: `bz-${b.id}-grow`, tag: "Business", icon: def.icon, day: s.day, you: true, headline: `${def.name}: one to watch`, body: `Business is growing for ${s.name}'s ${def.name.toLowerCase()}. 'Consistency,' says the owner.` });
  }
  return out;
}

// Everyday city news, so the paper always has something on: two a day.
const CITY: { tag: NewsTag; icon: string; headline: string; body: string }[] = [
  { tag: "City", icon: "🚧", headline: "Road works narrow Kubwa Expressway again", body: "Commuters are advised to leave early. Danfo drivers are advised nothing; they will find a way." },
  { tag: "City", icon: "💡", headline: "Power cuts hit Gwarinpa for a third night", body: "The distribution company blames 'load shedding'. Generator sellers in Wuse Market report record sales." },
  { tag: "Politics", icon: "🏛️", headline: "Senate debates new allowance for 'constituency briefings'", body: "Lawmakers say the money is for consulting the people. The people say they have not been consulted." },
  { tag: "City", icon: "🛺", headline: "Task force impounds 60 okadas in the city centre", body: "The ban on okadas and kekes in central Abuja stays. Riders say there is no other work." },
  { tag: "Business", icon: "🧅", headline: "Onion prices double at Wuse Market", body: "Traders blame transport costs from the north. Shoppers blame the traders." },
  { tag: "City", icon: "🚌", headline: "New buses on the Nyanya route, says FCTA", body: "Commuters will believe it when they see it." },
  { tag: "People", icon: "🎓", headline: "Corps members in Abuja ask for higher allowance", body: "'₦33,000 does not reach Jabi,' one corper said, standing in Jabi." },
  { tag: "Politics", icon: "🗳️", headline: "Primaries season: posters go up overnight", body: "Every pole from Area 1 to Kubwa has a smiling aspirant on it. 'VOTE WISELY,' say the billboards, wisely." },
  { tag: "Business", icon: "📱", headline: "Konnect Telecom data prices up again", body: "Subscribers threaten to switch. To whom, nobody is sure." },
  { tag: "City", icon: "🏗️", headline: "Another estate rises in Guzape", body: "Luxury duplexes with 'smart' gates go for ₦450 million. The road to them is still untarred." },
  { tag: "Crime", icon: "📵", headline: "Phone snatchers on okadas: police warn pedestrians", body: "Keep your phone in your pocket near Area 10 and Berger junction, police say." },
  { tag: "People", icon: "🍢", headline: "Mallam Sani: 30 years of suya in Jabi", body: "'The secret is the yaji,' he says, and refuses to say more." },
  { tag: "City", icon: "🌳", headline: "Millennium Park packed for the weekend", body: "Families, couples and one man with a speaker the size of a fridge." },
  { tag: "Business", icon: "🏦", headline: "Banks promise fewer 'network issues' this quarter", body: "Customers queue outside a branch in Garki to hear the news. The network is down." },
  { tag: "Politics", icon: "📜", headline: "Minister commissions borehole, again", body: "The same borehole in Karu has now been commissioned three times. It still does not pump water." },
  { tag: "City", icon: "🚦", headline: "Traffic lights at Berger working, motorists confused", body: "Many drivers stopped at green out of habit. FRSC says it is 'monitoring the situation'." },
];

function cityStories(s: GameState): Story[] {
  const a = Math.floor(roll(s.day, 1) * CITY.length);
  let b = Math.floor(roll(s.day, 2) * CITY.length);
  if (b === a) b = (a + 1) % CITY.length;
  return [a, b].map((i) => ({ ...CITY[i]!, id: `city-${i}`, day: s.day }));
}

/** Today's paper: things that are about you first, then the rest. */
/** What the whole city is going through: fuel queues, elections, festivals, today's viral story. */
function cityEventStories(s: GameState): Story[] {
  return eventsNow(s).map((e) => ({
    id: `ce-${e.id}`,
    tag: (e.id === "election" ? "Politics" : e.id === "viral" ? "Markets" : "City") as NewsTag,
    icon: e.icon,
    day: s.day,
    headline: e.headline,
    body: e.body,
  }));
}

export function todaysNews(s: GameState): Story[] {
  const filed: Story[] = (s.news ?? []).filter((n) => s.day - n.day <= 3);
  const live = [...cityEventStories(s), ...peopleStories(s), ...crimeStories(s), ...weatherStories(s), ...marketStories(s), ...cityStories(s)];
  const all = [...filed, ...live];
  return [...all.filter((n) => n.you), ...all.filter((n) => !n.you)];
}

/** Older stories that were filed, for the archive. */
export function olderNews(s: GameState): Story[] {
  return (s.news ?? []).filter((n) => s.day - n.day > 3);
}
