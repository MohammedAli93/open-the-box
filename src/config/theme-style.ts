// Small per-theme style hooks that a few shared game objects read at build time.
// Set once by Loading.applyTheme() before any Box/scene is created. Kept tiny and
// theme-agnostic so gameobjects don't need to know which design is active.
export const themeStyle = {
  // Colour of the number printed on a closed box cover. Dark for the light
  // notebook/candy covers; light "chalk" for the dark classroom slates.
  number: "#2a2a2a",
};

export function setThemeStyle(patch: Partial<typeof themeStyle>) {
  Object.assign(themeStyle, patch);
}
