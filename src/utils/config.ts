interface GameConfig {
  bgm: boolean;
  sfx: boolean;
}

const GAME_NAME = "open-the-box";

export function loadConfig(defaultConfig: GameConfig): GameConfig {
  const config = localStorage.getItem(`${GAME_NAME}-config`);
  if (config == undefined) {
    saveConfig(defaultConfig);
    return defaultConfig;
  }
  try {
    return { ...defaultConfig, ...JSON.parse(config) };
  } catch {
    return defaultConfig;
  }
}

export function saveConfig(config: GameConfig) {
  localStorage.setItem(`${GAME_NAME}-config`, JSON.stringify(config));
}

export function updateConfig(config: Partial<GameConfig>) {
  const localConfig = localStorage.getItem(`${GAME_NAME}-config`);
  const current = localConfig ? JSON.parse(localConfig) : { bgm: true, sfx: true };
  saveConfig({ ...current, ...config });
}
