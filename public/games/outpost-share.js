/** Shareable result card for Blackout Protocol: a picture of how your round
 * went, with a link that brings friends to the game. Everything here is
 * already on the results screen. */

export const GAME_URL = "https://www.midnry.com/games/outpost-zero";

/** A one-line brag in plain words, from the player's side of the round. */
export function headline({ won, role, correctVotes = 0, kills = 0, award = null }) {
  if (role === "infiltrator") {
    if (won) return kills ? `I fooled everyone as the infiltrator and took down ${kills}.` : "I fooled everyone as the infiltrator.";
    return "They caught me as the infiltrator. Next time.";
  }
  if (won && correctVotes) return `I caught the infiltrator${correctVotes > 1 ? ` with ${correctVotes} votes` : ""}!`;
  if (won) return award ? `We saved the rescue, and I was ${award}.` : "We saved the rescue.";
  return "The infiltrators got us this time. Can you do better?";
}

/** Everything the card needs, from the player's own results view. */
export function shareSummary(view, selfId) {
  const protocol = view?.protocol || {};
  const self = view?.entities?.find((e) => e.id === selfId) || {};
  const role = protocol.self?.role === "infiltrator" ? "infiltrator" : "operator";
  const won = view?.winner === (role === "infiltrator" ? 1 : 0);
  const award = (protocol.awards || []).find((a) => a.playerId === selfId) || null;
  const c = protocol.self?.contributions || {};
  const rescued = protocol.mission?.patients?.filter((p) => p.rescued).length || 0;
  const stats =
    role === "infiltrator"
      ? [["Eliminations", self.kills || 0], ["Sabotages", c.sabotage || 0], ["Charges", c.charges || 0]]
      : [["Infiltrator votes", protocol.self?.correctVotes || 0], ["Supplies loaded", c.supplies || 0], ["Patients rescued", rescued]];
  const line = headline({
    won,
    role,
    correctVotes: protocol.self?.correctVotes || 0,
    kills: self.kills || 0,
    award: award ? `the ${award.title.toLowerCase()}` : null,
  });
  return {
    won,
    role,
    name: self.name || "Operator",
    color: self.color || "#9fb4a8",
    mark: self.mark || "●",
    award,
    stats,
    headline: line,
    url: GAME_URL,
    text: `${line} Play Blackout Protocol free on Midnry: ${GAME_URL}`,
  };
}

function wrap(g, text, x, y, max, lh) {
  let line = "";
  for (const word of String(text).split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > max && line) {
      g.fillText(line, x, y);
      line = word;
      y += lh;
    } else line = next;
  }
  g.fillText(line, x, y);
  return y + lh;
}

/** Draw the 1080×1350 card and return it as a PNG blob. */
export function drawCard(s) {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext("2d");
  if (!g) return Promise.resolve(null);
  const bg = g.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, s.won ? "#1f5a3a" : "#5a2424");
  bg.addColorStop(0.55, "#121a20");
  bg.addColorStop(1, "#070b0e");
  g.fillStyle = bg;
  g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = "#cfe0d6";
  g.font = "600 34px system-ui, sans-serif";
  g.fillText("OUTPOST ZERO · BLACKOUT PROTOCOL", 80, 120);
  g.fillStyle = s.won ? "#8fe3a8" : "#ff9c8f";
  g.font = "800 120px system-ui, sans-serif";
  g.fillText(s.won ? "VICTORY" : "DEFEAT", 80, 270);
  g.fillStyle = "#ffffff";
  g.font = "700 50px system-ui, sans-serif";
  let y = wrap(g, s.headline, 80, 360, 920, 62);
  // The player's own colour and shape, as on their name tag.
  y += 30;
  g.fillStyle = s.color;
  g.font = "700 64px system-ui, sans-serif";
  g.fillText(s.mark, 80, y + 20);
  g.fillStyle = "#ffffff";
  g.font = "700 58px system-ui, sans-serif";
  g.fillText(s.name, 160, y + 20);
  g.fillStyle = "#b8c7bf";
  g.font = "500 36px system-ui, sans-serif";
  g.fillText(s.role === "infiltrator" ? "Infiltrator" : "Rescue operator", 160, y + 70);
  y += 170;
  s.stats.forEach(([label, value], i) => {
    const x = 80 + i * 320;
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.fillRect(x, y, 290, 170);
    g.fillStyle = "#ffffff";
    g.font = "800 72px system-ui, sans-serif";
    g.fillText(String(value), x + 24, y + 90);
    g.fillStyle = "#b8c7bf";
    g.font = "500 28px system-ui, sans-serif";
    g.fillText(label, x + 24, y + 140);
  });
  y += 240;
  if (s.award) {
    g.fillStyle = "#ffd36a";
    g.font = "700 44px system-ui, sans-serif";
    g.fillText(s.award.title, 80, y);
    g.fillStyle = "#d9e3dd";
    g.font = "500 32px system-ui, sans-serif";
    g.fillText(s.award.detail, 80, y + 50);
  }
  g.fillStyle = "#7fd3ff";
  g.font = "700 38px system-ui, sans-serif";
  g.fillText("Play free: midnry.com/games/outpost-zero", 80, 1270);
  return new Promise((done) => c.toBlob(done, "image/png"));
}

/** Share the card (phone share sheet), or save it and copy the link. */
export async function shareResult(s) {
  const blob = await drawCard(s);
  const file = blob && new File([blob], "blackout-protocol-result.png", { type: "image/png" });
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: s.text });
      return "Shared.";
    }
    if (navigator.share) {
      await navigator.share({ text: s.text, url: s.url });
      return "Shared.";
    }
  } catch (error) {
    if (error?.name === "AbortError") return "";
  }
  if (blob) {
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 2000);
  }
  try {
    await navigator.clipboard.writeText(s.text);
    return "Card saved and invite link copied. Paste it anywhere.";
  } catch {
    return "Card saved. Post it with the link midnry.com/games/outpost-zero.";
  }
}

/** A WhatsApp message with the brag and the link. */
export const whatsappUrl = (s) => `https://wa.me/?text=${encodeURIComponent(s.text)}`;
