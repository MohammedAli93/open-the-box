import { State } from "@/core/state";

export class AudioManager {
  static playBGM(
    soundManager: Phaser.Scene["sound"],
    key: string,
    config?: Phaser.Types.Sound.SoundConfig | Phaser.Types.Sound.SoundMarker
  ) {
    if (!State.bgm) return;

    soundManager.play(key, config);
  }

  static playSFX(
    soundManager: Phaser.Scene["sound"],
    key: string,
    config?: Phaser.Types.Sound.SoundConfig | Phaser.Types.Sound.SoundMarker
  ) {
    console.log(State.sfx);
    if (!State.sfx) return;

    soundManager.play(key, config);
  }
}
