import Phaser from "phaser";
import RexUIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import { LoadingScene } from "@/scenes/Loading";
import { GridScene } from "@/scenes/Grid";
import { QuestionScene } from "@/scenes/Question";
import { RevealScene } from "@/scenes/Reveal";
import { CompleteScene } from "@/scenes/Complete";
import { MenuScene } from "@/scenes/Menu";
import { AudioScene } from "@/scenes/Audio";
import { UIScene } from "@/scenes/UI";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  width: 1024,
  height: 768,
  parent: "game-container",
  backgroundColor: "#b8895a",
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  scene: [LoadingScene, GridScene, QuestionScene, RevealScene, CompleteScene, MenuScene, AudioScene, UIScene],
  plugins: {
    scene: [{ key: "rexUI", plugin: RexUIPlugin, mapping: "rexUI" }],
  },
};

export type PhaserScene = Phaser.Scene & { rexUI: RexUIPlugin };

const game = new Phaser.Game(config);
// Exposed for debugging / automated verification.
(window as any).__game = game;
export default game;
