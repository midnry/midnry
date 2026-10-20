// Locker card art: screenshots/qa/char-<id>.png (capture-outpost-characters.mjs)
// → public/games/menu/characters/<id>.webp, 240x320. Run where sharp is installed:
//   node <tools>/pack-character-cards.mjs   (cwd = repo root)
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";
mkdirSync("public/games/menu/characters", { recursive: true });
for (const file of readdirSync("screenshots/qa").filter((f) => /^char-[a-z]+\.png$/.test(f))) {
  const id = file.slice(5, -4);
  await sharp(`screenshots/qa/${file}`).resize(240, 320).webp({ quality: 80 }).toFile(`public/games/menu/characters/${id}.webp`);
}
