const STORAGE_KEY = 'sensei-v1-state';
const LESSON_ONE_ID = 'core-expressions-01';

function normalizeLesson(raw = {}) {
  const answers = raw.answers && typeof raw.answers === 'object' && !Array.isArray(raw.answers)
    ? Object.fromEntries(Object.entries(raw.answers).filter(([, value]) => typeof value === 'string'))
    : {};
  const productionAnswers = raw.productionAnswers && typeof raw.productionAnswers === 'object' && !Array.isArray(raw.productionAnswers)
    ? Object.fromEntries(Object.entries(raw.productionAnswers).filter(([, value]) => typeof value === 'string'))
    : {};

  return {
    answers, productionAnswers,
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter(item => typeof item === 'string') : [],
    reviewed: Array.isArray(raw.reviewed) ? raw.reviewed.filter(item => typeof item === 'string') : []
  };
}

function normalizeStreak(raw = {}) {
  return {
    count: Number.isInteger(raw.count) && raw.count >= 0 ? raw.count : 0,
    lastActiveDate: typeof raw.lastActiveDate === 'string' ? raw.lastActiveDate : null
  };
}

function normalize(raw = {}) {
  const lessons = raw.lessons && typeof raw.lessons === 'object' && !Array.isArray(raw.lessons)
    ? Object.fromEntries(Object.entries(raw.lessons).map(([id, lessonState]) => [id, normalizeLesson(lessonState)]))
    : { [LESSON_ONE_ID]: normalizeLesson(raw) };

  return {
    theme: raw.theme === 'dark' ? 'dark' : 'light',
    lastViewedLesson: typeof raw.lastViewedLesson === 'string' ? raw.lastViewedLesson : null,
    streak: normalizeStreak(raw.streak),
    lessons
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

// Local calendar date as "YYYY-MM-DD", so the streak follows the learner's
// own day/night rather than UTC (which would flip at odd local hours).
function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetween(fromKey, toKey) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(`${toKey}T00:00:00`) - new Date(`${fromKey}T00:00:00`)) / oneDay);
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
    getLastViewedLesson: () => state.lastViewedLesson,
    setLastViewedLesson(id) { state.lastViewedLesson = id; save(); },
    isLessonComplete(id, questionCount, productionQuestionCount = 0) {
      const lessonState = state.lessons[id] || normalizeLesson();
      return questionCount > 0 && Object.values(lessonState.answers).filter(value => value.trim()).length >= questionCount
        && Object.values(lessonState.productionAnswers).filter(value => value.trim()).length >= productionQuestionCount;
    },
    setAnswer(id, value) { currentLesson().answers[id] = value; this.recordActivity(); save(); },
    setProductionAnswer(id, value) { currentLesson().productionAnswers[id] = value; this.recordActivity(); save(); },
    resetAnswers() { currentLesson().answers = {}; currentLesson().productionAnswers = {}; save(); },
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
      this.recordActivity();
      save();
    },
    toggleTheme() {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      save();
      return state.theme;
    },
    // Call this whenever the learner does something that counts as "practice"
    // (answering a question, marking a word reviewed). Opening the app or
    // just starring something does not count, on purpose.
    recordActivity() {
      const today = todayKey();
      if (state.streak.lastActiveDate === today) return;
      const diff = state.streak.lastActiveDate ? daysBetween(state.streak.lastActiveDate, today) : null;
      state.streak = { count: diff === 1 ? state.streak.count + 1 : 1, lastActiveDate: today };
      save();
    },
    getStreak: () => state.streak.count
  };
}
