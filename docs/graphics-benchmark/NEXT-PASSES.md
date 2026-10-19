# Remaining graphics passes

Review branch: `codex/graphics-benchmark`. One room or arena per commit/push,
stop for review each time. Do not merge to main or deploy from this branch.

## Blackout Protocol

1. Command / Operations — current review.
2. Communications / Radar.
3. Armory and Armory stores.
4. Barracks / Mess Hall.
5. Flight Deck / hangar.
6. East Service Corridor and the remaining passages.

Continue the established material/light standard, the fixed-view Balanced
draw-call budget (patrol at or below approximately 520), unchanged phone
resolution, optional-asset failure recovery, and original collision and
interaction positions. Every sign, screen and label must clear architecture
by at least 2cm. Include all 2.5m sign close-ups and matched laptop/phone
day/night views before pushing each room.

## Last Signal — after Blackout Protocol room reviews

These are separate `g.mode === "signal"` arenas, not Breakwater rooms. The
Blackout room decorators are intentionally guarded to `id === "breakwater"`;
they do not count as improvements to these arenas.

| Order | Arena | Visual direction |
| --- | --- | --- |
| 1 | `outpost` | Military yard: hardstanding, field stores, service infrastructure |
| 2 | `skyport` | Airfield: apron markings, terminal/service materials, aviation equipment |
| 3 | `estate` | Residential: believable house finishes, boundaries and garden surfaces |

For **each arena**, independently:

- Refine materials, purposeful wear and day/night lighting with the neutral
  grade. Reuse approved assets, avoid large downloads, and verify optional
  textures can fail without preventing play.
- Keep cover, supply crates and collectible Charge Cores recognisable.
  Preserve fighter colour dyes, identities and the existing gameplay rules.
- Keep the shipped phone joystick, gold RUN cue, SLIDE, FIRE and R visible
  and unobstructed. Do not change input handlers, HUD or touch-control layout.
- Capture matched before/after laptop and phone screenshots by day and night,
  plus iPad Balanced checks. Report draw calls/triangles with all eight
  fighters on screen and source-texture memory/download changes.
- Play a complete Last Signal round through its normal finish with no console
  errors. Record the arena, outcome and evidence; this is additional to the
  fixed-camera benchmark and cannot be replaced by a still screenshot.
- Run the required Outpost tests, TypeScript check, Render build and military
  bundle build. Commit the regenerated bundle and fresh cache key, push, then
  stop for review before the next arena.

These arena passes are queued work, **not implemented or validated by the
Command / Operations commit**.
