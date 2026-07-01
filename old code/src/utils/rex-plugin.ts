import { PhaserScene } from "@/main";
import type Sizer from "phaser3-rex-plugins/templates/ui/sizer/Sizer";

export function getCenterContainer(
  scene: PhaserScene,
  gameObject: Phaser.GameObjects.GameObject,
  config?: {
    sizer?: Sizer.IConfig;
    add?: Sizer.IAddConfig;
  }
) {
  const { sizer = {}, add = {} } = config || {};
  return scene.rexUI.add
    .sizer(sizer)
    .addSpace(1)
    .add(gameObject, add)
    .addSpace(1);
}
