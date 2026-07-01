import { DPR } from "@/utils/responsive";

// Installs a DPR-aware hit-area so pointer hit-testing works under the manual
// canvas/DPR scaling done in fitScreen(). Uses the object's WORLD transform, so
// it is correct for nested containers and scaled objects alike. Assumes the
// object is centered on its origin and has had setSize(w, h) called.
export function setInteractive(
  gameObject: Phaser.GameObjects.GameObject,
  input: Phaser.Input.InputPlugin,
  useHandCursor: boolean = true
) {
  const hitAreaCallback: Phaser.Types.Input.HitAreaCallback = (_hitArea, x, y, go: any) => {
    const m = go.getWorldTransformMatrix();
    const cx = m.tx / DPR;
    const cy = m.ty / DPR;
    const w = Math.abs(go.width * m.scaleX) / DPR;
    const h = Math.abs(go.height * m.scaleY) / DPR;
    const mouseX = input.activePointer.x;
    const mouseY = input.activePointer.y;
    void x;
    void y;
    return (
      mouseX >= cx - w / 2 &&
      mouseX <= cx + w / 2 &&
      mouseY >= cy - h / 2 &&
      mouseY <= cy + h / 2
    );
  };

  gameObject.setInteractive({
    useHandCursor,
    hitAreaCallback,
    hitArea: new Phaser.Geom.Rectangle(0, 0, 1, 1),
  });
}
