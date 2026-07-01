export class Loading extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "loading");

    this.anims.create({
      key: "loading",
      frames: this.anims.generateFrameNumbers("loading", {
        start: 0,
        end: 11,
      }),
      frameRate: 20,
      repeat: -1,
    });

    this.play("loading");
  }
}
