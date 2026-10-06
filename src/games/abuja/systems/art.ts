// Placeholder art. Every look is a key here, drawn as simple shapes for now.
// To swap in real sprites later, load images with the same keys in
// scenes/WorldScene.ts preload() and stop generating the placeholder textures.

export const SKINS = ["#f1c7a5", "#d9a074", "#b9774a", "#8d5524", "#6b3e1d", "#4a2a14"];
export const OUTFITS = ["#1d4ed8", "#16a34a", "#dc2626", "#f59e0b", "#7c3aed", "#0f766e", "#e11d48", "#334155"];
export const HAIRS = [
  { id: "lowcut", label: "Low cut" },
  { id: "afro", label: "Afro" },
  { id: "braids", label: "Braids" },
  { id: "cornrows", label: "Cornrows" },
  { id: "bun", label: "Bun" },
  { id: "bald", label: "Bald" },
] as const;

export const HAIR_COLOR = "#1a1210";
