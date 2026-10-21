// The home screen is a lobby: games are picked in a sheet (opened by the mode
// card's Change), and Play is on the mode card. Without the 3D lobby (safe
// mode) the classic menu shows the picker and Play inline; both work here.
export async function pickGame(p, mode, options = {}) {
  const sheet = () => p.evaluate(() => document.querySelector(".mf-modal")?.classList.contains("mf-picking"));
  const card = `.mf-gamepick [data-mode=${mode}]`;
  if (!(await p.isVisible(card)) && (await p.isVisible(".mf-modechange"))) await p.click(".mf-modechange", options);
  await p.click(card, options);
  await p.waitForTimeout(300);
  if (await sheet()) await p.click(".mf-pickerclose", options);
}
export async function play(p, options = {}) {
  if (await p.evaluate(() => document.querySelector(".mf-modal")?.classList.contains("mf-picking"))) await p.click(".mf-pickerclose", options);
  await p.click(".mf-start:visible, .mf-modeplay:visible", options);
}
