
export const DPR = window.devicePixelRatio || 1;

export function fitScreen(scale: Phaser.Scale.ScaleManager) {
  // return [scale.width, scale.height];
  const widthDPR = Math.round(window.innerWidth * DPR);
  const heightDPR = Math.round(window.innerHeight * DPR);
  // this.scene.scale.setParentSize(window.innerWidth, window.innerHeight);
  scale.parent.width = Math.round(window.innerWidth);
  scale.parent.height = Math.round(window.innerHeight);
 
  scale.canvas.width = widthDPR;
  scale.canvas.height = heightDPR;
  scale.canvas.style.width = Math.round(window.innerWidth) + 'px';
  scale.canvas.style.height = Math.round(window.innerHeight) + 'px';
  return [widthDPR, heightDPR];
}