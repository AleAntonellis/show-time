import type { BadgeLevelKey } from '@/services/badges';

export type BadgePatchState = 'locked' | 'next' | 'unlocked';

const LEVEL_VISUALS: Record<
  BadgeLevelKey,
  { metal: string; dark: string; glow: string }
> = {
  bronze: {
    metal: '#C37A4A',
    dark: '#704127',
    glow: 'rgba(195,122,74,0.34)',
  },
  silver: {
    metal: '#D6DBE5',
    dark: '#788196',
    glow: 'rgba(214,219,229,0.28)',
  },
  gold: {
    metal: '#FFD35A',
    dark: '#9B6F15',
    glow: 'rgba(255,211,90,0.34)',
  },
  platinum: {
    metal: '#A8E9FF',
    dark: '#4E88A3',
    glow: 'rgba(168,233,255,0.34)',
  },
};

export function getBadgeLevelVisual(
  levelKey: BadgeLevelKey,
  state: BadgePatchState,
) {
  const visual = LEVEL_VISUALS[levelKey];
  return {
    ...visual,
    metal: state === 'locked' ? '#555A6C' : visual.metal,
    dark: state === 'locked' ? '#303445' : visual.dark,
  };
}
