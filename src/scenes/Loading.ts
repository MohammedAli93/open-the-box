import { Scene } from "phaser";
import { LANG, setLanguage } from "@/config/lang";
import { FONT_FAMILY } from "@/config/text";
import { SKIN_FILES, DEFAULT_SKIN, skinPathFor } from "@/config/skin";
import { collectImagePaths, setGameData, type GameData } from "@/core/data";
import { State } from "@/core/state";
import { loadConfig } from "@/utils/config";
import { padArabic } from "@/utils/layout";
import { generateCandyTheme } from "@/libs/candy-theme";
import { loadClassroomTheme } from "@/libs/classroom-theme";
import { setThemeStyle } from "@/config/theme-style";

export class LoadingScene extends Scene {
  private barBg!: Phaser.GameObjects.Graphics;
  private bar!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private loadingBg = "#b8895a"; // wood; candy overrides to pink in applyTheme()

  constructor() {
    super("Loading");
  }

  init() {
    // Restore the player's saved sound preference.
    const config = loadConfig({ bgm: true, sfx: true });
    State.bgm = config.bgm;
    State.sfx = config.sfx;
  }

  preload() {
    // Client-editable data, loaded at runtime.
    this.load.json("gamedata", "data.json");

    // Background music.
    this.load.audio("bgm", "assets/audio/bgm/background-music.ogg");

    // Feedback icons (shared assets kept from the previous game).
    this.load.setPath("assets");
    this.load.image("correct-small", "correct-small.webp");
    this.load.image("incorrect-small", "incorrect-small.webp");
    this.load.image("correct-big", "correct-big.png");
    this.load.image("incorrect-big", "incorrect-big.png");
    this.load.spritesheet("raster", "sunset-raster.png", { frameWidth: 16, frameHeight: 16 });

    // Paper furniture for the answer screen (generated fallback).
    this.load.image("notepad", "ui/notepad.png");
    this.load.image("note-card", "ui/note-card.png");

    // Theme-specific art (th-*, answer-paper-*) is deferred to create(), once
    // data.json has told us which design to use — notebook (files) or candy
    // (generated in code). See applyTheme().

    // UI icons (from the previous game), used bottom-corner like the source.
    this.load.setPath("assets/ui");
    // White icons, to match the source (Wordwall) controls. All 24×24 viewBox,
    // loaded at a consistent scale so they render crisp and even-sized.
    this.load.svg("ui-menu", "menu-white.svg", { scale: 4 });
    this.load.svg("ui-fullscreen", "fullscreen-white.svg", { scale: 4 });
    this.load.svg("ui-fullscreen-exit", "fullscreen-exit-white.svg", { scale: 4 });
    this.load.svg("ui-audio", "audio-white.svg", { scale: 4 });
    this.load.svg("ui-audio-muted", "audio-muted-white.svg", { scale: 4 });
    this.load.setPath("assets");
    // Icons for the audio (BGM/SFX) menu, from the previous game.
    this.load.svg("audio-icon", "audio/audio.svg", { scale: 2 });
    this.load.svg("audio-icon-muted", "audio/audio-muted.svg", { scale: 2 });

    // Audio (optional — guarded at playback).
    this.load.audio("sfx-correct", "audio/sfx/chip-minor-1.ogg");
    this.load.audio("sfx-wrong", "audio/sfx/chip-fail-1.ogg");
    this.load.audio("sfx-open", "audio/sfx/reveal.ogg");
    this.load.audio("sfx-complete", "audio/sfx/game-successful.ogg");
    this.load.setPath();
  }

  create() {
    this.drawStatic();

    const data = this.cache.json.get("gamedata") as GameData;
    setGameData(data);
    // Switch UI language / direction as soon as data lands, before any later
    // scene (Grid, Title, ...) builds its text.
    setLanguage(data.lang);

    // Pick the visual design (candy generates its art here; notebook queues files).
    this.applyTheme(data);

    // Phase 2: skin assets (selected by data.json) + every referenced image.
    const skin = data.skin || DEFAULT_SKIN;
    for (const key of Object.keys(SKIN_FILES)) {
      this.load.image(key, skinPathFor(skin, SKIN_FILES[key]));
    }
    for (const path of collectImagePaths(data)) {
      this.load.image(path, path);
    }

    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => this.drawBar(p));
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start("Grid");
      });
      this.cameras.main.fadeOut(300);
    });
    this.load.start();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.drawStatic, this);
    // The ScaleManager is game-global, so this scene's RESIZE handler outlives
    // the scene unless we remove it — otherwise a later resize runs drawStatic
    // against a torn-down camera and throws.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.drawStatic, this);
    });
    this.cameras.main.fadeIn(300);
  }

  // Selects the visual design. A ?theme= URL param wins over data.json so the two
  // designs can be compared without editing the file. "candy" is generated in
  // code (no files); "notebook" (default) queues the original art onto the loader.
  private applyTheme(data: GameData) {
    const urlTheme = new URLSearchParams(window.location.search).get("theme");
    const theme = urlTheme || data.theme || "notebook";
    if (theme === "candy") {
      this.loadingBg = "#ffd7ea";
      this.cameras.main.setBackgroundColor(this.loadingBg);
      this.label.setColor("#8a3d69");
      generateCandyTheme(this);
    } else if (theme === "classroom") {
      this.loadingBg = "#2f3130";
      this.cameras.main.setBackgroundColor(this.loadingBg);
      this.label.setColor("#f4f1e9");
      setThemeStyle({ number: "#f4f1e9" }); // white chalk number on the dark slates
      loadClassroomTheme(this);
    } else {
      this.loadNotebookTheme();
    }
  }

  // Original paper "Open the Box" art, loaded from files.
  private loadNotebookTheme() {
    this.load.setPath("assets/theme");
    this.load.image("th-wood", "wood.webp");
    ["blue", "green", "red", "white"].forEach((c) => this.load.image(`th-pad-${c}`, `pad-${c}.webp`));
    this.load.image("th-rings", "rings.webp");
    ["blue", "red", "green", "grey"].forEach((c) => this.load.image(`th-cover-${c}`, `cover-${c}.png`));
    this.load.image("th-lock", "lock.webp");
    this.load.image("th-cross", "cross.png");
    this.load.spritesheet("th-crumble", "crumble.webp", { frameWidth: 200, frameHeight: 154 });
    ["deco-pencil", "deco-pencil2", "deco-pen", "deco-rubber", "deco-sheet"].forEach((d) =>
      this.load.image(`th-${d}`, `${d}.webp`)
    );
    this.load.image("th-deco-headphone", "deco-headphone.webp");

    // Answer-choice paper faces (randomised per card).
    this.load.setPath("new");
    this.load.image("answer-paper-a", "squaretilefacefront2.2omlhykjxvfoqykwnjknhaq2.png");
    this.load.image("answer-paper-b", "squaretilefacefront3.2u7ckjjvlm11jno7hutjcfw2.png");
    this.load.setPath();
  }

  private drawStatic() {
    const { width, height } = this.scale;
    if (!this.barBg) {
      this.barBg = this.add.graphics();
      this.bar = this.add.graphics();
      this.label = this.add
        .text(0, 0, LANG.LOADING, { fontFamily: FONT_FAMILY.BOLD, color: "#ffffff" })
        .setOrigin(0.5);
    }
    this.cameras.main.setBackgroundColor(this.loadingBg);
    this.label.setFontSize(Math.max(20, Math.round(height * 0.04)));
    padArabic(this.label);
    this.label.setPosition(width / 2, height / 2 - height * 0.08);
    this.drawBar(this.load.progress);
  }

  private drawBar(progress: number) {
    const { width, height } = this.scale;
    const barW = Math.min(width * 0.7, 700);
    const barH = Math.max(22, height * 0.035);
    const x = width / 2 - barW / 2;
    const y = height / 2;
    this.barBg.clear();
    this.barBg.fillStyle(0x000000, 0.25).fillRoundedRect(x, y, barW, barH, barH / 2);
    this.bar.clear();
    this.bar.fillStyle(0xffffff, 0.95).fillRoundedRect(x, y, Math.max(barH, barW * progress), barH, barH / 2);
  }
}
