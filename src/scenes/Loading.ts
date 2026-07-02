import { Scene } from "phaser";
import { LANG } from "@/config/lang";
import { FONT_FAMILY } from "@/config/text";
import { SKIN_FILES, DEFAULT_SKIN, skinPathFor } from "@/config/skin";
import { collectImagePaths, setGameData, type GameData } from "@/core/data";
import { State } from "@/core/state";
import { loadConfig } from "@/utils/config";
import { padArabic } from "@/utils/layout";

export class LoadingScene extends Scene {
  private barBg!: Phaser.GameObjects.Graphics;
  private bar!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;

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

    // Real "Open the Box" theme assets.
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

    // UI icons (from the previous game), used bottom-corner like the source.
    this.load.setPath("assets/ui");
    // White icons, to match the source (Wordwall) controls.
    this.load.svg("ui-menu", "menu-white.svg", { scale: 3 });
    this.load.svg("ui-fullscreen", "fullscreen-white.svg", { scale: 60 });
    this.load.svg("ui-fullscreen-exit", "fullscreen-exit-white.svg", { scale: 60 });
    this.load.svg("ui-audio", "audio-white.svg", { scale: 1.4 });
    this.load.svg("ui-audio-muted", "audio-muted-white.svg", { scale: 60 });
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
    this.cameras.main.fadeIn(300);
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
    this.cameras.main.setBackgroundColor("#b8895a");
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
