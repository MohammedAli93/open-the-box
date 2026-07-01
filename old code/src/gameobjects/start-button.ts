import { LANG } from "@/config/lang";
import { FONT_FAMILY } from "@/config/text";
import { ZOrder } from "@/config/zorder";
import { type PhaserScene } from "@/main";
import Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";

interface IStartButtonConfig {
  x?: number;
  y?: number;
  sizerConfig?: Sizer.IConfig;
  callback?: () => void;
}

export class StartButton extends Sizer {
  constructor(scene: PhaserScene, config?: IStartButtonConfig) {
    const { x = 0, y = 0, sizerConfig, callback } = config || {};
    super(scene, x, y, {
      orientation: "vertical",
      space: {
        left: 10,
        right: 10,
      },
      ...sizerConfig,
    });

    this.setDepth(ZOrder.TITLE_TEXT);

    const background = scene.rexUI.add.roundRectangle({
      color: 0x1081c7,
      radius: 10,
      strokeColor: 0xffffff,
    });

    this.addBackground(background);

    const icon = scene.add
      .image(0, 0, "title-play")
      .setDepth(ZOrder.TITLE_TEXT);
    this.add(icon, { align: "center" });

    const text = scene.add
      .text(0, 0, LANG.TITLE_PLAY_BUTTON.toLocaleUpperCase())
      .setFontFamily(FONT_FAMILY.TITLE_START_BUTTON)
      .setOrigin(0.5, 0.5)
      .setFontSize(35)
      .setDepth(ZOrder.TITLE_TEXT);
    this.add(text, { align: "center", padding: { top: -12 } });

    background.setInteractive({ useHandCursor: true });

    background.on(Phaser.Input.Events.POINTER_OVER, () => {
      background.postFX.addBloom(0xffffff, 1, 1, 2, 1.2);
    });

    background.on(Phaser.Input.Events.POINTER_OUT, () => {
      background.postFX.disable(true);
    });

    background.on(Phaser.Input.Events.POINTER_UP, () => {
      if (callback) callback();
    });

    this.layout();
  }
}
