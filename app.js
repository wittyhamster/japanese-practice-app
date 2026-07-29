import { loadManifest, loadManifestLesson } from './js/lesson.js';
import { createStateStore } from './js/state.js';
import { createReferenceFeedback } from './js/feedback.js';
import {
  applyTheme, clearCompletion, renderCompletion, renderLesson, renderLessonLibrary,
  renderLessonNavigation, renderPitfall, showLoadError, showToast, updateProgress
} from './js/view.js';

const MANIFEST_URL = './data/lessons.json';
const store = createStateStore();
let manifest;
let currentEntry;
let lesson;
let loadSequence = 0;

applyTheme(store.get().theme);

function entryFor(id) {
  return manifest?.lessons.find(entry => entry.id === id);
}

function fallbackEntry() {
  return entryFor(manifest.activeLesson) || manifest.lessons[0];
}

function updateUrl(lessonId, mode) {
  if (mode === 'none') return;
  const url = new URL(window.location.href);
  url.searchParams.set('lesson', lessonId);
  history[mode === 'replace' ? 'replaceState' : 'pushState']({ lesson: lessonId }, '', url);
}

function setLibraryOpen(open, restoreFocus = false) {
  const panel = document.querySelector('#lessonLibrary');
  const toggle = document.querySelector('#lessonLibraryToggle');
  panel.classList.toggle('hidden', !open);
  toggle.setAttribute('aria-expanded', String(open));
  if (open) {
    requestAnimationFrame(() => panel.querySelector('[data-lesson-id]')?.focus());
  } else if (restoreFocus) {
    toggle.focus();
  }
}

function render() {
  const state = store.get();
  document.querySelector('#lessonTitle').textContent = lesson.title;
  document.querySelector('#lessonSubtitle').textContent = lesson.subtitle;
  document.querySelector('#questionCount').textContent = `${lesson.questions.length} questions`;
  renderLesson(lesson, state);
  renderPitfall(lesson);
  renderLessonLibrary(manifest, currentEntry.id, store);
  renderLessonNavigation(manifest, currentEntry.id);
}

async function selectLesson(requestedId, { historyMode = 'push', focusTitle = true } = {}) {
  const requestedEntry = entryFor(requestedId);
  const candidates = [...new Set([requestedEntry, fallbackEntry(), ...manifest.lessons].filter(Boolean))];
  const requestId = ++loadSequence;
  let selectedEntry;
  let selectedLesson;

  for (const candidate of candidates) {
    try {
      selectedLesson = await loadManifestLesson(manifest, MANIFEST_URL, candidate.id);
      selectedEntry = candidate;
      break;
    } catch (error) {
      console.warn(`Sensei skipped unavailable lesson ${candidate.id}.`, error);
    }
  }

  if (requestId !== loadSequence) return;
  if (!selectedEntry || !selectedLesson) throw new Error('No valid lessons are available');

  currentEntry = selectedEntry;
  lesson = selectedLesson;
  store.selectLesson(lesson.id);
  store.setLastViewedLesson(currentEntry.id);
  updateUrl(currentEntry.id, historyMode);
  clearCompletion();
  setLibraryOpen(false);
  render();

  if (focusTitle) {
    const title = document.querySelector('#lessonTitle');
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
    document.querySelector('#lesson').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function copyPayload() {
  const state = store.get();
  const answers = lesson.questions.map((item, index) => `${index + 1}. ${item.prompt}\nMy answer: ${state.answers[item.id] || '(blank)'}`).join('\n\n');
  const production = (lesson.productionQuestions || []).map((item, index) => `${index + 1}. ${item.prompt}\nTarget expression: ${item.keyword}\nMy answer: ${state.productionAnswers[item.id] || '(blank)'}`).join('\n\n');
  return `Please review my Japanese translation practice.\n\nJapanese → English\n\n${answers}${production ? `\n\nEnglish → Japanese\n\n${production}` : ''}`;
}

function aiReviewPayload() {
  const state = store.get();
  const answers = lesson.questions.map((item, index) => `${index + 1}. ${item.prompt}\nMy answer: ${state.answers[item.id] || '(blank)'}`).join('\n\n');
  const production = (lesson.productionQuestions || []).map((item, index) => `${index + 1}. ${item.prompt}\nTarget expression: ${item.keyword}\nMy answer: ${state.productionAnswers[item.id] || '(blank)'}`).join('\n\n');
  return `Please review my Japanese translation practice.\n\nLesson:\n${lesson.title}\n\nTarget expression:\n${lesson.keywords.map(item => item.word).join('、')}\n\nJapanese → English\n\n${answers}${production ? `\n\nEnglish → Japanese\n\n${production}` : ''}\n\nPlease evaluate:\n\n• grammar\n• naturalness\n• vocabulary\n• recurring mistakes\n• overall score\n• encouragement\n• suggestions for improvement`;
}

async function copyAnswers() {
  const payload = copyPayload();
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(payload);
    showToast('Copied for ChatGPT');
  } catch {
    const fallback = document.createElement('textarea');
    fallback.value = payload;
    fallback.setAttribute('readonly', '');
    fallback.className = 'clipboard-fallback';
    document.body.appendChild(fallback);
    fallback.select();
    const copied = document.execCommand('copy');
    fallback.remove();
    showToast(copied ? 'Copied for ChatGPT' : 'Select your answers and copy manually');
  }
}

document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.id === 'themeToggle') {
    applyTheme(store.toggleTheme());
  } else if (button.id === 'lessonLibraryToggle') {
    setLibraryOpen(button.getAttribute('aria-expanded') !== 'true');
  } else if (button.id === 'lessonLibraryClose') {
    setLibraryOpen(false, true);
  } else if (button.dataset.lessonId) {
    await selectLesson(button.dataset.lessonId);
  } else if (button.dataset.lessonDirection) {
    const currentIndex = manifest.lessons.findIndex(entry => entry.id === currentEntry.id);
    const offset = button.dataset.lessonDirection === 'previous' ? -1 : 1;
    const target = manifest.lessons[currentIndex + offset];
    if (target) await selectLesson(target.id);
  } else if (button.id === 'resetAnswers' && lesson) {
    store.resetAnswers();
    render();
    clearCompletion();
    showToast('Answers reset');
  } else if (button.id === 'copyAnswers' && lesson) {
    copyAnswers();
  } else if (button.id === 'aiReview' && lesson) {
    try { await navigator.clipboard.writeText(aiReviewPayload()); showToast('AI review prompt copied'); }
    catch { showToast('Copy unavailable; use Copy answers instead'); }
  } else if (button.id === 'checkAnswers' && lesson) {
    renderCompletion(createReferenceFeedback(lesson, store.get()));
  } else if (button.dataset.favorite && lesson) {
    store.toggleFavorite(button.dataset.favorite);
    render();
  } else if (button.dataset.reviewed && lesson) {
    store.toggleReviewed(button.dataset.reviewed);
    render();
  } else if (button.dataset.toggle) {
    const target = document.getElementById(button.dataset.toggle);
    if (target) {
      const expanded = target.classList.toggle('hidden') === false;
      button.setAttribute('aria-expanded', String(expanded));
    }
  }
});

document.addEventListener('input', event => {
  if (!lesson || !event.target.matches('[data-answer], [data-production-answer]')) return;
  if (event.target.matches('[data-production-answer]')) store.setProductionAnswer(event.target.dataset.productionAnswer, event.target.value);
  else store.setAnswer(event.target.dataset.answer, event.target.value);
  updateProgress(lesson, store.get());
  renderLessonLibrary(manifest, currentEntry.id, store);
  clearCompletion();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.querySelector('#lessonLibrary').classList.contains('hidden')) {
    setLibraryOpen(false, true);
  }
});

window.addEventListener('popstate', () => {
  const requestedId = new URL(window.location.href).searchParams.get('lesson');
  selectLesson(entryFor(requestedId)?.id || fallbackEntry().id, { historyMode: requestedId && entryFor(requestedId) ? 'none' : 'replace' });
});

async function init() {
  try {
    manifest = await loadManifest(MANIFEST_URL);
    const urlLesson = new URL(window.location.href).searchParams.get('lesson');
    const initialEntry = entryFor(urlLesson) || entryFor(store.getLastViewedLesson()) || fallbackEntry();
    await selectLesson(initialEntry.id, { historyMode: 'replace', focusTitle: false });
  } catch (error) {
    showLoadError();
    console.error('Sensei could not load the curriculum.', error);
  }
}

init();
