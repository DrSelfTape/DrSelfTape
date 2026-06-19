import { useEffect, useSyncExternalStore, useState } from 'react';

const STORAGE_KEY = 'dst_aurora_game';

const DEFAULT_STATE = {
  level: 1,
  xp: 0,
  toNext: 100,
  takes: 0,
  streak: 0,
  league: 'Workshop',
  rank: 128,
  questCompletions: {},
  claimedRewards: [],
};

const LEAGUES = ['Workshop', 'Callback', 'Spotlight', 'Premiere', 'Legend'];

const isBrowser = () => typeof window !== 'undefined';

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

const normalizeState = (value) => ({
  ...DEFAULT_STATE,
  ...(value && typeof value === 'object' ? value : {}),
  questCompletions:
    value?.questCompletions && typeof value.questCompletions === 'object'
      ? value.questCompletions
      : {},
  claimedRewards: Array.isArray(value?.claimedRewards) ? value.claimedRewards : [],
});

const readStoredState = () => {
  if (!isBrowser()) return DEFAULT_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : DEFAULT_STATE);
  } catch {
    return DEFAULT_STATE;
  }
};

const listeners = new Set();
let state = readStoredState();

const getLeagueForLevel = (level) => LEAGUES[Math.min(LEAGUES.length - 1, Math.floor((level - 1) / 4))];

const persist = () => {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Local progression should never crash the app if storage is unavailable.
  }
};

const emit = () => {
  persist();
  listeners.forEach((fn) => fn());
};

const update = (recipe) => {
  const next = normalizeState(recipe(state));
  state = {
    ...next,
    league: getLeagueForLevel(next.level),
    rank: Math.max(1, Math.round(next.rank || DEFAULT_STATE.rank)),
  };
  emit();
  return state;
};

export const gameStore = {
  getSnapshot() {
    return state;
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  addXp(amount = 0) {
    const xpToAdd = Math.max(0, Math.round(Number(amount) || 0));
    if (!xpToAdd) return state;

    return update((current) => {
      let level = current.level;
      let xp = current.xp + xpToAdd;
      let toNext = current.toNext;

      while (xp >= toNext) {
        xp -= toNext;
        level += 1;
        toNext += 40;
      }

      return {
        ...current,
        level,
        xp,
        toNext,
        takes: current.takes + Math.round(xpToAdd / 5),
        rank: Math.max(1, current.rank - Math.max(1, Math.round(xpToAdd / 25))),
      };
    });
  },

  spend(n = 0) {
    const cost = Math.max(0, Math.round(Number(n) || 0));
    if (!cost || state.takes < cost) return false;

    update((current) => ({
      ...current,
      takes: current.takes - cost,
    }));

    return true;
  },

  // Returns true only when this quest was NEWLY completed today (false if it
  // was already done). Callers must gate XP awards on this so a stale-closure
  // double-tap can't farm duplicate XP.
  completeQuest(id) {
    if (!id) return false;
    const today = dayKey();
    if (state.questCompletions[today]?.[id]) return false;

    update((current) => {
      const todayMap = current.questCompletions[today] || {};
      return {
        ...current,
        streak: Math.max(1, current.streak),
        questCompletions: {
          ...current.questCompletions,
          [today]: { ...todayMap, [id]: true },
        },
      };
    });
    return true;
  },

  // Returns true only when this reward was NEWLY claimed (false if already
  // claimed). Gate XP/Takes awards on this to avoid double-claims.
  claimReward(day) {
    if (day === undefined || day === null) return false;
    const rewardId = String(day);
    if (state.claimedRewards.includes(rewardId)) return false;

    update((current) => ({
      ...current,
      claimedRewards: [...current.claimedRewards, rewardId],
    }));
    return true;
  },
};

export function useGameStore() {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot, gameStore.getSnapshot);
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (!isBrowser() || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!isBrowser() || typeof window.matchMedia !== 'function') return undefined;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(media.matches);
    onChange();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }

    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  return reduced;
}
