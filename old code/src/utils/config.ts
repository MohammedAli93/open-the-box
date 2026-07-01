interface GameConfig {
  bgm: boolean;
  sfx: boolean;
}

const GAME_NAME = "quiz-game";

export function loadConfig(defaultConfig: GameConfig): GameConfig {
  const config = localStorage.getItem(`${GAME_NAME}-config`);
  if (config == undefined) {
    saveConfig(defaultConfig);
    return defaultConfig;
  }
  return JSON.parse(config);
}

export function saveConfig(config: GameConfig) {
  localStorage.setItem(`${GAME_NAME}-config`, JSON.stringify(config));
}

export function updateConfig(config: Partial<GameConfig>) {
  const localConfig = localStorage.getItem(`${GAME_NAME}-config`);
  if (localConfig == undefined) return;
  const currentConfig = JSON.parse(localConfig);
  saveConfig({ ...currentConfig, ...config });
}
