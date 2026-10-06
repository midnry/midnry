import type { Trait } from "./types";

// The people you bargain with. Traits shape how they react to each approach;
// skill is how hard they are to read and to bluff; wealth is how much they
// need your money; patience is how long they'll keep talking.

export type Counterparty = {
  id: string;
  name: string;
  role: string;
  /** A colour for the portrait circle. */
  color: string;
  traits: Trait[];
  /** 0–100: how sharp a negotiator they are. */
  skill: number;
  /** 0–100: how comfortable they are financially. */
  wealth: number;
  /** Base number of exchanges before they lose interest. */
  patience: number;
  /** What they say when you first sit down. */
  greeting: string;
  /** Hints a careful player can pick up about each trait. */
  tells?: Partial<Record<Trait, string>>;
};

export const PEOPLE: Counterparty[] = [
  {
    id: "emeka",
    name: "Mr. Emeka Obi",
    role: "Owner of a struggling mini-mart in Wuse",
    color: "#f59e0b",
    traits: ["desperate", "proud"],
    skill: 45,
    wealth: 25,
    patience: 5,
    greeting: "\"You want to buy my shop? Sit. This shop fed my family for eleven years, you know.\"",
    tells: {
      desperate: "There's a pile of unpaid supplier invoices on the counter. He keeps turning them face down.",
      proud: "He straightens his agbada when he talks about the shop's history. Respect matters to him.",
    },
  },
  {
    id: "rakiya",
    name: "Hajia Rakiya",
    role: "Runs a busy Mama Put canteen in Garki",
    color: "#22c55e",
    traits: ["friendly", "cautious"],
    skill: 35,
    wealth: 45,
    patience: 6,
    greeting: "\"Ah, welcome! Have you eaten? Sit, sit. Let's talk like family.\"",
    tells: {
      friendly: "She asks about your mother before anything else. Warmth will get you far here.",
      cautious: "She asks twice how you'll pay. She wants certainty, not promises.",
    },
  },
  {
    id: "adebayo",
    name: "Chief Adebayo",
    role: "Investor who buys and sells businesses",
    color: "#a855f7",
    traits: ["greedy", "risky", "practical"],
    skill: 75,
    wealth: 90,
    patience: 4,
    greeting: "\"Time is money, my friend. Tell me numbers, not stories.\"",
    tells: {
      greedy: "His eyes light up only when you mention profit.",
      risky: "He talks about the deals he made on a handshake, and the ones that made him rich.",
      practical: "He has a calculator open on his phone before you finish your sentence.",
    },
  },
  {
    id: "danjuma",
    name: "Alhaji Danjuma",
    role: "Owner, Berger Tokunbo Car Mart",
    color: "#60a5fa",
    traits: ["greedy", "stubborn"],
    skill: 70,
    wealth: 80,
    patience: 5,
    greeting: "\"Every car here is first body, grandmother-used, Toronto. Which one do you like?\"",
    tells: {
      greedy: "Every price he mentions is 'last price'. None of them are.",
      stubborn: "He repeats the same number three times like a prayer. He won't move easily.",
    },
  },
  {
    id: "bello",
    name: "Mrs. Bello",
    role: "Your landlady",
    color: "#f472b6",
    traits: ["proud", "stubborn", "cautious"],
    skill: 50,
    wealth: 60,
    patience: 4,
    greeting: "\"Tenant. You came to see me yourself. Hmm. What is it?\"",
    tells: {
      proud: "She reminds you she built this house with her own hands. Don't talk down to her.",
      stubborn: "She has said 'rent is rent' twice already.",
      cautious: "She mentions the last tenant who disappeared owing four months.",
    },
  },
  {
    id: "blessing",
    name: "Blessing Okon",
    role: "Experienced shop manager looking for a job",
    color: "#34d399",
    traits: ["practical", "cautious"],
    skill: 40,
    wealth: 20,
    patience: 5,
    greeting: "\"Good day. I have managed two supermarkets in Garki. I'm looking for something stable.\"",
    tells: {
      practical: "She brought a typed CV and references. Facts will convince her.",
      cautious: "She asks about job security before she asks about pay.",
    },
  },
  {
    id: "sani",
    name: "Alhaji Sani",
    role: "Wholesale supplier, Kubwa",
    color: "#fbbf24",
    traits: ["practical", "risky"],
    skill: 60,
    wealth: 75,
    patience: 5,
    greeting: "\"Bags of rice, cartons of noodles, crates of drinks. If you buy enough, we can talk.\"",
    tells: {
      practical: "He talks in cartons per week and margins. Volume is his language.",
      risky: "He mentions a customer he gave credit to who is now his biggest buyer.",
    },
  },
  {
    id: "felix",
    name: "Mr. Felix",
    role: "QuickKash loan officer",
    color: "#ef4444",
    traits: ["greedy", "stubborn"],
    skill: 65,
    wealth: 70,
    patience: 4,
    greeting: "\"My friend! You want a bigger loan? QuickKash always has money for serious people.\"",
    tells: {
      greedy: "He keeps steering the talk back to the interest rate.",
      stubborn: "'Company policy' comes up every second sentence.",
    },
  },
  {
    id: "uche",
    name: "Mrs. Uche",
    role: "Accountant, Garki General Hospital",
    color: "#38bdf8",
    traits: ["practical", "friendly"],
    skill: 45,
    wealth: 50,
    patience: 5,
    greeting: "\"You're here about your bill. Let me see your file… Okay. Talk to me.\"",
    tells: {
      practical: "She has your file, a calculator and a list of what the hospital has already written off.",
      friendly: "She smiles when you greet her properly. She's on your side if you're honest.",
    },
  },
  {
    id: "bose",
    name: "Iya Bose",
    role: "Wholesale fabric trader, Wuse Market",
    color: "#fb923c",
    traits: ["greedy", "friendly"],
    skill: 55,
    wealth: 55,
    patience: 6,
    greeting: "\"My customer! Fine fabric, Holland wax, first quality. How many bales?\"",
    tells: {
      greedy: "Her first price is always a joke. She laughs when you mention it.",
      friendly: "She remembers your name. Regular customers get better prices.",
    },
  },
];

export const person = (id: string) => PEOPLE.find((p) => p.id === id);

export const TRAIT_INFO: Record<Trait, { label: string; icon: string; tip: string }> = {
  greedy: { label: "Greedy", icon: "💰", tip: "Wants more money. Hard to bargain down, but likes profitable offers." },
  desperate: { label: "Desperate", icon: "😰", tip: "Will take less than it's worth. You can exploit it, but they'll remember." },
  proud: { label: "Proud", icon: "👑", tip: "Hates aggression and lowball offers. Respond to respect." },
  practical: { label: "Practical", icon: "🧮", tip: "Cares about objective value. Logic works." },
  friendly: { label: "Friendly", icon: "🤝", tip: "Gives better deals to people they like." },
  stubborn: { label: "Stubborn", icon: "🪨", tip: "Moves slowly. Needs several concessions." },
  risky: { label: "Risk-taker", icon: "🎲", tip: "Open to future rewards and unusual deals." },
  cautious: { label: "Cautious", icon: "🛡️", tip: "Wants guaranteed value now, not promises." },
};
