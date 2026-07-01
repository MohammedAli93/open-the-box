import { DPR } from "@/utils/responsive";

export function setInteractive(
  gameObject: Phaser.GameObjects.GameObject,
  input: Phaser.Input.InputPlugin,
  useHandCursor: boolean = true
) {
  const hitAreaCallback: Phaser.Types.Input.HitAreaCallback = (
    hitArea: Phaser.Geom.Rectangle,
    x,
    y,
    gameObject
  ) => {
    console.log("hitAreaCallback", hitArea, x, y, gameObject);
    hitArea.width = gameObject.displayWidth / DPR;
    hitArea.height = gameObject.displayHeight / DPR;
    // hitArea = gameObject.getBounds();
    const mouseX = input.activePointer.x;
    const mouseY = input.activePointer.y;
    // console.log({mouseX, mouseY}, this.input.mousePointer, gameObject.x, gameObject.y);
    // const rect = new Phaser.Geom.Rectangle(gameObject.x - hitArea.width / 2, gameObject.y - hitArea.height / 2, hitArea.width, hitArea.height);
    // return rect.contains(mouseX, mouseY);
    // return false;
    const widthDPR = Math.round(window.innerWidth * DPR);
    const heightDPR = Math.round(window.innerHeight * DPR);
    const realX = x + window.innerWidth / 2;
    const realY = y + window.innerHeight / 2;
    const targetX = gameObject.x / DPR;
    const targetY = gameObject.y / DPR;
    console.log({ realX, realY, targetX, targetY, mouseX, mouseY });
    // return hitArea.contains(realX - hitArea.width / 2, realY - hitArea.height / 2);
    if (
      mouseX > targetX - hitArea.width / 2 &&
      mouseX < targetX + hitArea.width / 2
    ) {
      if (
        mouseY > targetY - hitArea.height / 2 &&
        mouseY < targetY + hitArea.height / 2
      ) {
        return true;
      }
    }
    return false;
  };

  gameObject.setInteractive({
    useHandCursor,
    hitAreaCallback,
    hitArea: gameObject.getBounds(),
  });
}
