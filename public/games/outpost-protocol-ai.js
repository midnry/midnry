/** Social reasoning uses only this bot's memories and the public radio log.
 * No opponent roles, planted-charge positions or other bots' plans enter here. */
export const EVIDENCE_WEIGHTS = Object.freeze({
  eliminate: 10,
  plant: 4,
  vent: 3,
  drag: 4,
  "flight-sabotage": 8,
  "cargo-sabotage": 6,
});
export function rememberObservation(player, evidence) {
  player.observations ||= [];
  player.caseEvidence ||= player.observations.filter((e) => EVIDENCE_WEIGHTS[e.kind]);
  player.observations.push(evidence);
  if (player.observations.length > 24) player.observations.shift();
  if (EVIDENCE_WEIGHTS[evidence.kind]) {
    player.caseEvidence.push({ ...evidence });
    // Keep decisive attacks even if many lesser incidents follow them.
    if (player.caseEvidence.length > 48) {
      const weakest = player.caseEvidence.reduce(
        (best, e, i, a) => (EVIDENCE_WEIGHTS[e.kind] < EVIDENCE_WEIGHTS[a[best].kind] ? i : best),
        0,
      );
      player.caseEvidence.splice(weakest, 1);
    }
  }
}
export function evidenceFor(player) {
  const unique = new Map();
  for (const e of [...(player.caseEvidence || []), ...(player.observations || [])])
    if (EVIDENCE_WEIGHTS[e.kind]) unique.set(`${e.kind}:${e.actorId}:${e.subjectId}:${e.at}`, e);
  return [...unique.values()];
}
const living = (e) => e?.hp > 0 && !e.departed;
const hash = (text) => [...text].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
const eligible = (ctx, id) =>
  id !== ctx.self.id && !ctx.allies.includes(id) && living(ctx.entities.find((e) => e.id === id));
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Names are public; duplicate names are ambiguous and never resolve to an ID. */
export function accusationTargets(text, entities) {
  const lower = String(text || "").toLowerCase(),
    targets = [];
  if (
    !/\b(kill|killed|killer|attack|attacked|suspect|suspicious|accuse|accusing|lying|lie|traitor|infiltrator|impostor|imposter|did it|where|alibi|explain|vote for)\b/.test(
      lower,
    )
  )
    return targets;
  for (const e of entities) {
    const name = e.name?.trim().toLowerCase();
    if (!name || entities.filter((p) => p.name?.trim().toLowerCase() === name).length !== 1)
      continue;
    const match = new RegExp(
      "(?:^|[^\\p{L}\\p{N}_])(" + escape(name) + ")(?=$|[^\\p{L}\\p{N}_])",
      "u",
    ).exec(lower);
    if (!match) continue;
    const end = match.index + match[0].length;
    const after = lower
      .slice(end)
      .split(/[.!?;]/)[0]
      .slice(0, 65);
    const before = lower.slice(0, end - name.length).slice(-35);
    // A victim's name or a reply's addressee is not automatically the accused.
    if (
      /\b(kill|killed|killer|attack|attacked|suspicious|lying|lie|traitor|infiltrator|impostor|imposter|did it|where|alibi|explain|explained)\b/.test(
        after,
      ) ||
      /\b(suspect|accuse|accusing|blame|vote for)\s*$/.test(before)
    )
      targets.push(e.id);
  }
  return targets;
}
const VOUCH = /\b(was with me|is clear|i vouch|vouch for|i trust)\b/i;
/** IDs whose unique name appears in a message, with no accusation needed. */
export function mentioned(text, entities) {
  const lower = String(text || "").toLowerCase();
  return entities
    .filter((e) => {
      const name = e.name?.trim().toLowerCase();
      if (!name || entities.filter((p) => p.name?.trim().toLowerCase() === name).length !== 1) return false;
      return new RegExp("(?:^|[^\\p{L}\\p{N}_])" + escape(name) + "(?=$|[^\\p{L}\\p{N}_])", "u").test(lower);
    })
    .map((e) => e.id);
}
export function suspectScores(ctx) {
  const scores = new Map(),
    add = (id, n) => {
      if (eligible(ctx, id)) scores.set(id, (scores.get(id) || 0) + n);
    };
  const direct = evidenceFor(ctx.player);
  for (const e of direct)
    // A witnessed kill lasts the round; routine work never erases it.
    if (e.kind === "eliminate" || ctx.time - e.at < 240) add(e.actorId, EVIDENCE_WEIGHTS[e.kind]);
  const helpful = new Set(
    (ctx.player.observations || [])
      .filter((e) => e.kind === "task" && ctx.time - e.at < 90)
      .map((e) => e.actorId),
  );
  for (const id of helpful) add(id, -0.7);
  const claims = new Map();
  for (const message of ctx.meeting?.messages || []) {
    if (
      message.sender === ctx.self.id ||
      !living(ctx.entities.find((e) => e.id === message.sender))
    )
      continue;
    const firstHand =
      /\bI saw\b/i.test(message.text) &&
      /\b(attack|attacked|kill|killed|disable|damage)\b/i.test(message.text);
    // "I saw X near the body" is a first-hand sighting, not an attack.
    const sighting = /\bI saw\b/i.test(message.text) && /\bnear the body\b/i.test(message.text);
    const weight = firstHand ? 2 : sighting ? 1.1 : 0.4;
    for (const id of accusationTargets(message.text, ctx.entities)) {
      const key = message.sender + ":" + id;
      claims.set(key, { id, weight: Math.max(weight, claims.get(key)?.weight || 0) });
    }
  }
  for (const claim of claims.values()) add(claim.id, claim.weight);
  // "X was with me / X is clear": a vouch lowers suspicion a little.
  for (const message of ctx.meeting?.messages || []) {
    if (message.sender === ctx.self.id || !VOUCH.test(message.text)) continue;
    for (const id of mentioned(message.text, ctx.entities))
      if (id !== message.sender) add(id, -1.2);
  }
  // Votes already cast are public; each one lends a little momentum.
  for (const [voter, target] of Object.entries(ctx.meeting?.votes || {}))
    if (voter !== ctx.self.id && target !== "skip") add(target, 0.5);
  // Who this bot itself last saw where. Someone spotted in the room where the
  // body lay is suspicious; someone with this bot elsewhere has an alibi.
  const body = ctx.reportedBody;
  if (body?.room)
    for (const c of ctx.player.contacts || []) {
      if (ctx.time - c.at > 45) continue;
      if (c.room === body.room) add(c.id, 1.5);
      else if (ctx.time - c.at < 12 && c.room === ctx.room) add(c.id, -0.8);
    }
  return scores;
}
/** How many infiltrators can still be hiding, from public information only:
 * the match's starting count minus the ones the assembly exposed. */
export function hiddenInfiltrators(ctx) {
  const exposed = Object.values(ctx.revealed || {}).filter((r) => r === "infiltrator").length;
  return Math.max(0, (ctx.infiltratorCount ?? 2) - exposed);
}
/** True when one more lost operator could hand the infiltrators the base. */
export function crewInDanger(ctx) {
  const alive = ctx.entities.filter(living).length,
    hidden = hiddenInfiltrators(ctx);
  return hidden > 0 && alive - hidden * 2 <= 1;
}
export function chooseSuspect(ctx) {
  // Firsthand fatal evidence wins over rumours, repeated accusations and alibis.
  const killer = evidenceFor(ctx.player).find(
    (e) => e.kind === "eliminate" && eligible(ctx, e.actorId),
  );
  if (killer) return killer.actorId;
  const ranked = [...suspectScores(ctx)].sort((a, b) => b[1] - a[1]);
  const votes = Object.entries(ctx.meeting?.votes || {}).filter(([voter]) => voter !== ctx.self.id);
  if (ctx.player.role === "infiltrator") {
    // Infiltrators pile onto the crew's favourite target to reach a majority.
    const tally = new Map();
    for (const [, target] of votes)
      if (target !== "skip" && eligible(ctx, target)) tally.set(target, (tally.get(target) || 0) + 1);
    const crowd = [...tally].sort((a, b) => b[1] - a[1])[0];
    if (crowd) return crowd[0];
    return ranked[0]?.[1] >= 1.5 ? ranked[0][0] : "skip";
  }
  const best = ranked[0];
  if (best?.[1] >= 2.4) return best[0];
  // When skipping could lose the match, the crew must act on its best lead.
  if (crewInDanger(ctx) && best?.[1] >= 1) return best[0];
  return "skip";
}
function witnessStatement(ctx, evidence) {
  const actor = ctx.entities.find((e) => e.id === evidence.actorId),
    victim = ctx.entities.find((e) => e.id === evidence.subjectId);
  if (!actor) return null;
  const action = {
    eliminate: "attack a patrol" + (victim ? ": " + victim.name : ""),
    plant: "work on a concealed socket",
    vent: "use a maintenance hatch",
    drag: "move a fallen patrol",
    "flight-sabotage": "disable the autopilot circuit",
    "cargo-sabotage": "damage the medical cargo",
  }[evidence.kind];
  return `I saw ${actor.name} ${action} in ${evidence.room}. ${Math.floor(Math.max(0, ctx.time - evidence.at))} seconds ago.`;
}
/** Someone this bot saw in the body's room shortly before the report. */
export function nearBody(ctx) {
  const room = ctx.reportedBody?.room;
  if (!room) return null;
  const seen = [...(ctx.player.contacts || [])]
    .reverse()
    .find((c) => c.room === room && ctx.time - c.at < 45 && eligible(ctx, c.id));
  const who = seen && ctx.entities.find((e) => e.id === seen.id);
  return who
    ? `I saw ${who.name} near the body, suspicious: in ${room} ${Math.max(1, Math.round(ctx.time - seen.at))} seconds before the report.`
    : null;
}
export function strongestEvidence(ctx) {
  return evidenceFor(ctx.player)
    .filter(
      (e) =>
        e.actorId !== ctx.self.id &&
        !ctx.allies.includes(e.actorId) &&
        (e.kind === "eliminate" || ctx.time - e.at < 240),
    )
    .sort((a, b) => EVIDENCE_WEIGHTS[b.kind] - EVIDENCE_WEIGHTS[a.kind] || b.at - a.at)[0];
}
/** At most three intentional messages: opening evidence/alibi, then replies.
 * Infiltrators can lie, but their claims have the same credibility as any voice. */
export function nextStatement(ctx) {
  const state = ctx.player.botDialogue;
  if (!state || state.sent >= 4) return null;
  const messages = ctx.meeting.messages || [],
    proof = strongestEvidence(ctx);
  const accusation = [...messages]
    .reverse()
    .find(
      (m) =>
        m.sender !== ctx.self.id &&
        !state.replied.includes(m.id) &&
        accusationTargets(m.text, ctx.entities).includes(ctx.self.id),
    );
  const cover = ctx.player.activities?.at(-1)?.room || ctx.room || "the supply route";
  const candidates = ctx.entities.filter((e) => eligible(ctx, e.id));
  const contacts = (ctx.player.contacts || []).filter(
    (c) => ctx.time - c.at < 90 && eligible(ctx, c.id),
  );
  const framed =
    ctx.entities.find((e) => e.id === contacts.at(-1)?.id) ||
    candidates[hash(ctx.self.id + ctx.meeting.id) % Math.max(1, candidates.length)];
  if (accusation && /where were you/i.test(accusation.text) && !/\b(suspect|attack|kill|lying|traitor)\b/i.test(accusation.text)) {
    // A plain question gets an alibi, not a denial. Infiltrators may lie.
    const buddy =
      ctx.player.role === "infiltrator"
        ? framed && hash(ctx.self.id + accusation.id) % 2 === 0 ? framed : null
        : ctx.entities.find((e) => e.id === contacts.at(-1)?.id);
    return {
      text: `I was in ${cover}${buddy ? `, ${buddy.name} was with me` : ""}.`,
      replyTo: accusation.id,
    };
  }
  if (accusation) {
    const speaker = ctx.entities.find((e) => e.id === accusation.sender)?.name || "Patrol";
    const denial = [
      "That accusation is wrong.",
      "That is not what happened.",
      "I did not attack anyone.",
    ][hash(ctx.self.id + accusation.id) % 3];
    const text =
      ctx.player.role === "infiltrator"
        ? `${denial} I was checking ${cover}. ${framed ? `Ask ${framed.name} where they were.` : "Who actually saw the attack?"}`
        : proof
          ? `${denial} ${witnessStatement(ctx, proof)}`
          : `${denial} I was in ${cover}. ${speaker}, tell us when and where you saw it; someone can confirm my route.`;
    return { text, replyTo: accusation.id };
  }
  if (!state.opened) {
    if (proof && ctx.player.role !== "infiltrator") return { text: witnessStatement(ctx, proof) };
    if (ctx.player.role === "infiltrator") {
      const style = hash(ctx.self.id + ctx.meeting.id) % 3;
      return {
        text:
          style === 0 && framed
            ? `${framed.name}, where were you when the patrol went down? Your route sounds suspicious.`
            : style === 1
              ? ctx.reportedBody
                ? `Wait, ${ctx.reportedBody.name} is down? Which room? I was checking ${cover}. Who found them?`
                : `What happened? I heard the radio call while checking ${cover}. Is a system down?`
              : `I was checking ${cover}. I did not see an attack. We need locations before voting.`,
      };
    }
    const sighting = nearBody(ctx);
    if (sighting) return { text: sighting };
    const where = ctx.reportedBody?.room;
    const openers = [
      `I was checking supplies in ${cover}. I did not witness an attack.`,
      "I have no clear witness evidence. Who saw the attack, and where?",
      `Nothing solid from me. I was in ${cover} the whole time.`,
      where ? `Who was near ${where}? I came from ${cover}.` : `Quiet on my side. I was in ${cover}.`,
      `I didn't see it happen. Let's hear where everyone was before we vote.`,
    ];
    // Each seat starts from a different line so a room never echoes itself.
    const seat = Math.max(0, ctx.entities.findIndex((e) => e.id === ctx.self.id));
    return { text: openers[(seat + hash(ctx.meeting.id)) % openers.length] };
  }
  const claim = [...messages]
    .reverse()
    .find(
      (m) =>
        m.sender !== ctx.self.id &&
        !state.replied.includes(m.id) &&
        accusationTargets(m.text, ctx.entities).length,
    );
  if (!claim) return null;
  if (proof && accusationTargets(claim.text, ctx.entities).includes(proof.actorId))
    return { text: witnessStatement(ctx, proof), replyTo: claim.id };
  const target = accusationTargets(claim.text, ctx.entities).find((id) => eligible(ctx, id));
  const mine = target && suspectScores(ctx).get(target);
  if (ctx.player.role !== "infiltrator" && mine >= 1) {
    const name = ctx.entities.find((e) => e.id === target)?.name;
    const sender = ctx.entities.find((e) => e.id === claim.sender)?.name || "them";
    return { text: `I agree with ${sender}. ${name} has been acting strange.`, replyTo: claim.id };
  }
  if (ctx.player.role === "infiltrator" && framed)
    return {
      text: `I am not convinced. ${framed.name} has not explained their route. Are we sure about this accusation?`,
      replyTo: claim.id,
    };
  return {
    text: "Was that an eyewitness account or a guess? I cannot confirm it from my patrol. Check the locations before voting.",
    replyTo: claim.id,
  };
}

/** One radio call during play. Operators report what they actually saw;
 * infiltrators sometimes invent sightings to frame someone. */
export function roamLine(ctx, random = Math.random) {
  const name = (id) => ctx.entities.find((e) => e.id === id)?.name;
  const here = ctx.room || "the corridor";
  if (ctx.sabotage === "power" && ctx.firstPowerCall) return pickOne(random, [`Power's down! Who's near the generators?`, `Lights are out in ${here}. Stay close to someone.`]);
  if (ctx.patientsCritical) return pickOne(random, ["The patients are fading. We need those supplies now!", "Someone get the medevac loaded, we're losing them."]);
  const scores = [...suspectScores(ctx)].sort((a, b) => b[1] - a[1]);
  const recent = (ctx.player.contacts || []).filter((c) => ctx.time - c.at < 30 && eligible(ctx, c.id) && c.room !== here);
  const roll = random();
  if (ctx.player.role === "infiltrator" && roll < 0.35) {
    const pool = ctx.entities.filter((e) => eligible(ctx, e.id));
    const victim = pool[Math.floor(random() * pool.length)];
    const room = ctx.rooms[Math.floor(random() * ctx.rooms.length)];
    if (victim && room) return `Saw ${victim.name} hanging around ${room}. Bit odd.`;
  }
  if (ctx.player.role !== "infiltrator" && scores[0]?.[1] >= 1.5 && roll < 0.45)
    return `Keep an eye on ${name(scores[0][0])}. Something's off.`;
  if (recent.length && roll < 0.65) {
    const c = recent[Math.floor(random() * recent.length)];
    return `${name(c.id)} just went through ${c.room}.`;
  }
  return pickOne(random, [`Working in ${here}.`, `Heading through ${here}.`, `${here} looks clear.`, `Checking supplies in ${here}.`]);
}
function pickOne(random, list) {
  return list[Math.floor(random() * list.length)];
}
