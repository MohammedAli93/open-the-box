import { State } from "@/core/state";

type SoundManager = Phaser.Scene["sound"];

// Centralised audio: looping BGM + one-shot SFX, both gated by State flags.
export class AudioManager {
  private static bgm?: Phaser.Sound.BaseSound;

  static playSFX(soundManager: SoundManager, key: string, config?: Phaser.Types.Sound.SoundConfig) {
    if (!State.sfx) return;
    if (!soundManager.game.cache.audio.has(key)) return;
    soundManager.play(key, config);
  }

  // Starts (or resumes) the looping background track. Safe to call repeatedly.
  static startBGM(soundManager: SoundManager, key: string) {
    if (!soundManager.game.cache.audio.has(key)) return;
    if (!this.bgm) {
      this.bgm = soundManager.add(key, { loop: true, volume: 0.35 });
    }
    if (State.bgm && !this.bgm.isPlaying) {
      // Phaser unlocks the audio context on the first user gesture; play() then starts.
      this.bgm.play();
    }
  }

  static applyMuteState() {
    if (!this.bgm) return;
    if (State.bgm) {
      if (!this.bgm.isPlaying) this.bgm.play();
    } else if (this.bgm.isPlaying) {
      this.bgm.pause();
    }
  }

  static stopBGM() {
    this.bgm?.stop();
    this.bgm = undefined;
  }
}
