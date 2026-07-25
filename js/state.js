const STORAGE_KEY = 'sensei-v1-state';
const LESSON_ONE_ID = 'core-expressions-01';

function normalizeLesson(raw = {}) {
  const answers = raw.answers && typeof raw.answers === 'object' && !Array.isArray(raw.answers)
    ? Object.fromEntries(Object.entries(raw.answers).filter(([, value]) => typeof value === 'string'))
    : {};

  return {
    answers,
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter(item => typeof item === 'string') : [],
    reviewed: Array.isArray(raw.reviewed) ? raw.reviewed.filter(item => typeof item === 'string') : []
  };
}

function normalize(raw = {}) {
  const lessons = raw.lessons && typeof raw.lessons === 'object' && !Array.isArray(raw.lessons)
    ? Object.fromEntries(Object.entries(raw.lessons).map(([id, lessonState]) => [id, normalizeLesson(lessonState)]))
    : { [LESSON_ONE_ID]: normalizeLesson(raw) };

  return { theme: raw.theme === 'dark' ? 'dark' : 'light', lessons };
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
  let currentLessonId = null;

  function currentLesson() {
    if (!currentLessonId) return normalizeLesson();
    state.lessons[currentLessonId] ||= normalizeLesson();
    return state.lessons[currentLessonId];
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  return {
    selectLesson(id) {
      currentLessonId = id;
      currentLesson();
    },
    get: () => ({ theme: state.theme, ...currentLesson() }),
    setAnswer(id, value) { currentLesson().answers[id] = value; save(); },
    resetAnswers() { currentLesson().answers = {}; save(); },
    toggleFavorite(id) {
      const lessonState = currentLesson();
      lessonState.favorites = lessonState.favorites.includes(id)
        ? lessonState.favorites.filter(item => item !== id)
        : [...lessonState.favorites, id];
      save();
    },
    toggleReviewed(id) {
      const lessonState = currentLesson();
      lessonState.reviewed = lessonState.reviewed.includes(id)
        ? lessonState.reviewed.filter(item => item !== id)
        : [...lessonState.reviewed, id];
      save();
    },
    toggleTheme() {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      save();
      return state.theme;
    }
  };
}
