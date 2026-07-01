interface ISesizeImageOptions {
  size: number;
  byWidth?: boolean;
  byHeight?: boolean;
  byMax?: boolean;
}

export function resizeImageBy(
  image: Phaser.GameObjects.Image,
  options: ISesizeImageOptions
) {
  const { size, byWidth, byHeight, byMax } = options;
  const { realWidth, realHeight } = image.frame;

  let realSize: number;
  if (byWidth) realSize = realWidth;
  else if (byHeight) realSize = realHeight;
  else if (byMax) realSize = Math.max(realWidth, realHeight);
  else return;

  const scale = size / realSize;
  image.setScale(scale);
  return scale;
}
