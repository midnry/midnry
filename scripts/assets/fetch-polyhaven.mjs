// Download CC0 Poly Haven models (glTF + textures) into assets-src/polyhaven.
// Usage: node scripts/assets/fetch-polyhaven.mjs <resolution> <id> [id...]
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
const [res = "1k", ...ids] = process.argv.slice(2);
for (const id of ids) {
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
  const entry = files.gltf?.[res]?.gltf;
  if (!entry) { console.log(id, "no", res, "glTF"); continue; }
  const root = join("assets-src/polyhaven", id, res);
  const save = async (url, path) => {
    const out = join(root, path);
    if (existsSync(out)) return 0;
    mkdirSync(dirname(out), { recursive: true });
    const data = Buffer.from(await (await fetch(url)).arrayBuffer());
    writeFileSync(out, data);
    return data.length;
  };
  let bytes = await save(entry.url, `${id}_${res}.gltf`);
  for (const [path, f] of Object.entries(entry.include || {})) bytes += await save(f.url, path);
  console.log(id, res, (bytes / 1e6).toFixed(1), "MB");
}
