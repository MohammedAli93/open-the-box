# Open the Box — quiz game

A responsive Phaser 3 + TypeScript + Vite remake of the Wordwall "Open the Box"
template. A grid of coloured notebook boxes; click a box to flip it open and
answer its question. Correct/incorrect feedback, score, and a results screen.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # outputs to dist/
```

## Editing the questions — `public/data.json`

Everything the player sees is driven by `public/data.json`. The client can edit
it directly (no rebuild needed in dev; for production just replace the file in
`dist/`). Shape:

```jsonc
{
  "title": "...",
  "timerSeconds": 20,        // per-question countdown; 0 or omit to disable
  "theme": "candy",          // DESIGN VERSION: "notebook" (paper) or "candy" (sweet-shop). See below.
  "skin": "notebook",        // "notebook" or "wordwall" (folder in assets/skins)
  "questions": [
    {
      "type": "text" | "image" | "both",   // what the QUESTION shows
      "text": "نص السؤال" | null,
      "image": "assets/bear.png" | null,    // path under public/ (or a data: URI)
      "color": "#ffff00",                   // the box colour on the grid
      "choices": [
        { "type": "text",  "content": "إجابة" },
        { "type": "image", "content": "assets/questions/pic.png" }
      ],
      "correct": { "type": "text", "content": "إجابة" }  // must match one choice's content
    }
  ]
}
```

Notes:
- 2–4 choices are supported (laid out automatically).
- `correct` is matched to a choice by its `content` (text is trimmed/compared).
- Images are referenced by path relative to `public/` (e.g. put files in
  `public/assets/questions/`). Data URIs also work but bloat the file.
- One box is shown per question; its number and colour come from the entry.
- `timerSeconds`: when > 0 a countdown bar is shown; if it runs out the correct
  answer is revealed and the question is marked wrong. Set `0` to turn it off.
- `skin`: chooses the box/background art set (see below).

## Sound

Looping background music (`public/assets/audio/bgm/background-music.ogg`) plus
answer SFX. The sound button (top-left) toggles **both** music and effects, and
the choice is saved to `localStorage`. Music starts on the first tap (browser
autoplay policy).

## Design versions (`theme`)

There are **three complete visual designs**, switchable without any code change:

- **`"notebook"`** (default) — the original paper "Open the Box" look: wood desk,
  spiral-bound pads, pencils/headphone props. Loaded from image files.
- **`"candy"`** — a sweet-shop design: pastel sprinkled backdrop, glossy gumdrop
  boxes with number medallions, candy answer cards, and lollipop / donut props.
  Generated **entirely in code** (no art files) — see `src/libs/candy-theme.ts`.
- **`"classroom"`** — a realistic chalkboard design built from **real photo
  assets**: a real chalkboard backdrop, boxes as chalkboard **slates** in painted
  colour-coded wooden frames (composited from the real chalkboard + wood photos),
  white chalk numbers, and the real school props (pencils, eraser, headphones,
  paper). See `src/libs/classroom-theme.ts`. The only new asset is
  `public/assets/classroom/chalkboard.webp` (see `CREDITS.md`); everything else
  reuses the real assets already in the repo.

Pick one with the `"theme"` field in `data.json`. To **compare them live**
without editing the file, append a URL query — it overrides `data.json`:

```
http://localhost:3000/?theme=notebook
http://localhost:3000/?theme=candy
http://localhost:3000/?theme=classroom
```

All designs share identical gameplay, motion, timer, sound and data — only the
art changes, so questions authored once work in every version.

## Visual skins

Box/background art is asset-driven. Two skins live in `public/assets/skins/`:

- **`notebook`** (default, generated): light wood + spiral notebook.
- **`wordwall`** (generated alternate): darker oak + metal binding. Replace these
  files with the original Wordwall art (same filenames) to match it exactly —
  see `public/assets/skins/wordwall/README.txt`.

Each skin folder has `wood.png`, `box-card.png`*, `box-spiral.png`. Switch skins
with the `"skin"` field in `data.json` (default in `src/config/skin.ts`).

\* The box face is drawn as a coloured vector card (so per-question colours are
exact on any renderer); `box-spiral.png` + `wood.png` provide the notebook look.

## Structure

```
src/
  config/   skin, lang (Arabic strings), text (fonts), zorder, colors
  core/     data (types + loader), state
  libs/     responsive handler, audio manager
  utils/    responsive (DPR/fit), interactive (hit-test), arabic, color, layout (dynamic text fit)
  gameobjects/  box, choice-button
  scenes/   Loading, Grid, Question, Complete, UI
```

The previous quiz game was archived under **`old code/`** (excluded from the build).

Font: **El Messiri** (public, bundled in `public/fonts/`).
