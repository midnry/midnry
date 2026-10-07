# Adding painted character art to Abuja Hustle

All painted people live in `public/abuja/people/` as tight-cropped PNGs on a
transparent background, 220px tall. The game finds them by file name, and a
few lists in `src/games/abuja/systems/painted.ts` say which ones exist.

`scripts/art/cut_sheet.py` turns a generated sheet into those files. It
handles transparent sheets and the grey-and-white "fake transparency"
checkerboard image generators often paint in.

```
pip install numpy scipy pillow
python3 scripts/art/cut_sheet.py walk  <id> <sheet.png>
python3 scripts/art/cut_sheet.py views <sheet.png> <name> [<name> ...]
```

Set `ART_OUT=/some/dir` to write somewhere else for a trial run.

## The art style

Hand-painted, storybook-like 2D characters: soft painterly shading, clean
dark outlines, warm colours, realistic proportions (not chibi), full body,
straight-on orthographic views. Match the existing files exactly; look at a
few before generating anything, for example:

- `you-m-dark-3-front.png`, `you-f-light-2-side.png` (the player's outfits)
- `you-f-brown-1-walk-side-1.png` … `-4.png` (the one finished walk cycle)
- `you-k-f-light-child-front.png`, `you-k-m-light-teen-front.png` (childhood art)

## Player outfits

Ids are `you-<m|f>-<light|brown|dark>-<1..4>`. Each has
`<id>-front.png`, `<id>-side.png`, `<id>-back.png`. The four outfits:

| # | Man (m) | Woman (f) |
|---|---------|-----------|
| 1 | Navy hoodie, olive cargo trousers, white sneakers | Pink zip-up hoodie, white wide-leg trousers, white sneakers |
| 2 | White short-sleeved shirt, dark-blue jeans, brown loafers | Yellow fitted t-shirt, high-waisted blue jeans, white sneakers |
| 3 | Green and gold ankara senator wear, black shoes | Orange and blue ankara dress below the knee, matching head wrap, flat sandals |
| 4 | Grey blazer over a black t-shirt, black trousers, white sneakers | Cream blouse, black tailored trousers, burgundy blazer, black low heels |

## Walk cycles

Files: `<id>-walk-<front|side|back>-<1..4>.png` (12 per outfit).

1. Generate one sheet per outfit, using that outfit's front, side and back
   PNGs as the reference so it is the SAME person in the SAME clothes:
   - 3 rows × 4 columns, transparent background, no text, no floor, no shadows
   - row 1 FRONT walking towards the viewer, row 2 SIDE walking to the
     right, row 3 BACK walking away
   - columns: (1) right foot forward, heel down; (2) passing, left knee
     slightly lifted; (3) left foot forward, heel down; (4) passing, right
     knee slightly lifted; arms swing opposite to the legs
   - every pose the same height, feet on one baseline per row, clear empty
     space between poses (nothing touching)
2. `python3 scripts/art/cut_sheet.py walk <id> <sheet.png>`. It refuses a
   sheet that doesn't split into 3 rows of 4; regenerate with more space.
3. Add the id to `WALK_FRAMES` in `painted.ts`.

## Childhood (age 9 and 15)

Ids are `you-k-<m|f>-<tone>`, each with a `-child` (9) and a `-teen` (15)
set: `you-k-f-brown-child-front.png` and so on. Use the adult outfit art of
the same gender and tone as the face reference, so the child is clearly the
same person.

- Girl, 9: blue checked pinafore over a white blouse, white socks, black shoes, school bag, hair in plaits.
- Girl, 15: white blouse, green pleated skirt, white socks, black shoes, hair in braids.
- Boy, 9: white short-sleeved shirt, khaki shorts, black sandals, school bag, short hair.
- Boy, 15: white shirt, khaki trousers, black shoes, low-cut hair.

1. Generate one sheet per child: 2 rows (age 9, then age 15), each row
   FRONT, SIDE (facing right), BACK; transparent background; no text.
2. `python3 scripts/art/cut_sheet.py views <sheet.png> you-k-f-brown-child you-k-f-brown-teen`
3. Add `you-k-f-brown` to `KID_ART` in `painted.ts`.

## Checking your work

- Open the new PNGs and look at them: whole body, nothing cut off, no
  checkerboard left behind, no stray bits of a neighbouring pose, the same
  person in every frame.
- Walk frames: frames 1 and 3 must have opposite legs forward, and the
  person must face the same way in all four side frames.
- `npm run typecheck` and `npm run build` must pass.
