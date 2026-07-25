const STORAGE_KEY = 'sensei-v1-state';

function normalize(raw = {}) {
  const answers = raw.answers && typeof raw.answers === 'object' && !Array.isArray(raw.answers)
    ? Object.fromEntries(Object.entries(raw.answers).filter(([, value]) => typeof value === 'string'))
    : {};

  return {
    answers,
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter(item => typeof item === 'string') : [],
    reviewed: Array.isArray(raw.reviewed) ? raw.reviewed.filter(item => typeof item === 'string') : [],
    theme: raw.theme === 'dark' ? 'dark' : 'light'
  };
}

function read() {
  try {
    return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
    return normalize();
  }
}

export function createStateStore() {
  let state = read();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  return {
    get: () => state,
    setAnswer(id, value) { state.answers[id] = value; save(); },
    resetAnswers() { state.answers = {}; save(); },
    toggleFavorite(id) {
      state.favorites = state.favorites.includes(id)
        ? state.favorites.filter(item => item !== id)
        : [...state.favorites, id];
      save();
    },
    toggleReviewed(id) {
      state.reviewed = state.reviewed.includes(id)
        ? state.reviewed.filter(item => item !== id)
        : [...state.reviewed, id];
      save();
    },
    toggleTheme() {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      save();
      return state.theme;
    }
  };
}
