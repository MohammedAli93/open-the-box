// Visual skin for the boxes and background. Choose via data.json ("skin": "...")
// or fall back to DEFAULT_SKIN here.
//   "notebook" -> generated assets in public/assets/skins/notebook
//   "wordwall" -> alternate set in public/assets/skins/wordwall (replaceable with original art)
export const DEFAULT_SKIN = "notebook";

export const skinPathFor = (skin: string, file: string) => `assets/skins/${skin}/${file}`;

export const SKIN_KEYS = {
  wood: "skin-wood",
  card: "skin-card",
  spiral: "skin-spiral",
};

export const SKIN_FILES = {
  [SKIN_KEYS.wood]: "wood.png",
  [SKIN_KEYS.card]: "box-card.png",
  [SKIN_KEYS.spiral]: "box-spiral.png",
};
