/** Locker characters: complete, rigged sculpts (Mixamo, licensed for games)
 * on the operator's skeleton and motion. "operator" is the original soldier.
 * Characters change appearance only; every one has the same hitbox. In Last
 * Signal you play as yours and the bots wear the rest; Blackout Protocol keeps
 * its team uniforms. Models: /games/military/models/characters/<id>.glb */
export const CHARACTERS = Object.freeze([
  { id: "operator", name: "Operator", role: "Field operator", accent: "#c9b27c" },
  { id: "smoke", name: "Smoke", role: "Gas-masked breacher", accent: "#8fa3a8" },
  { id: "ironside", name: "Ironside", role: "Armoured vanguard", accent: "#d6c3a0" },
  { id: "wraith", name: "Wraith", role: "Hooded assassin", accent: "#b0463a" },
  { id: "raven", name: "Raven", role: "Cloaked scout", accent: "#7e8aa8" },
  { id: "ronin", name: "Ronin", role: "Wandering blade", accent: "#d0563c" },
  { id: "ember", name: "Ember", role: "Exosuit pilot", accent: "#e0452f" },
  { id: "phantom", name: "Phantom", role: "Stealth suit", accent: "#ffb547" },
  { id: "shade", name: "Shade", role: "Night operative", accent: "#6f78c8" },
  { id: "redline", name: "Redline", role: "Getaway driver", accent: "#ff3b30" },
  { id: "warlord", name: "Warlord", role: "Horned brute", accent: "#b88b5a" },
  { id: "scav", name: "Scav", role: "Wasteland survivor", accent: "#c58a4a" },
]);
export const characterOf = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
/** Bots in Last Signal: the other characters in a per-match shuffled order
 * (salt), one each before any repeats; never yours. */
export function botCharacter(salt, index, mine) {
  const hash = (text) => {
    let h = 2166136261;
    for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const pool = CHARACTERS.filter((c) => c.id !== mine).sort((a, b) => hash(salt + a.id) - hash(salt + b.id));
  return pool[Math.abs(index) % pool.length].id;
}
