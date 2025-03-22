import { ImageSourcePropType } from 'react-native';

// Game assets
export const GameAssets = {
  fruits: {
    apple: require('../assets/images/game/apple.png'),
    grape: require('../assets/images/game/grape.png'),
    orange: require('../assets/images/game/orange.png'),
    berry: require('../assets/images/game/berry.png')
  },
  special: {
    bomb: require('../assets/images/game/bomb.png'),
    rainbow: require('../assets/images/game/rainbow.png')
  },
  effects: {
    explosion: require('../assets/images/game/explosion.png'),
    sparkle: require('../assets/images/game/sparkle.png')
  }
} as const;

// Interface assets
export const InterfaceAssets = {
  buttons: {
    play: require('../assets/images/interface/play.png'),
    pause: require('../assets/images/interface/pause.png'),
    restart: require('../assets/images/interface/restart.png')
  },
  backgrounds: {
    main: require('../assets/images/interface/main-bg.png'),
    game: require('../assets/images/interface/game-bg.png')
  },
  icons: {
    trophy: require('../assets/images/interface/trophy.png'),
    settings: require('../assets/images/interface/settings.png'),
    home: require('../assets/images/interface/home.png')
  }
} as const;

// Type definitions for assets
export type GameAssetKeys = keyof typeof GameAssets;
export type InterfaceAssetKeys = keyof typeof InterfaceAssets;

// Helper function to get asset by key
export function getGameAsset(key: GameAssetKeys): ImageSourcePropType {
  return GameAssets[key];
}

export function getInterfaceAsset(key: InterfaceAssetKeys): ImageSourcePropType {
  return InterfaceAssets[key];
}