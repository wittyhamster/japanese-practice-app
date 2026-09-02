import { loadManifest, loadManifestLesson } from './js/lesson.js';
import { createStateStore } from './js/state.js';
import { createReferenceFeedback } from './js/feedback.js';
import {
  applyTheme, clearCompletion, renderCompletion, renderLesson, renderLessonLibrary,
  renderLessonNavigation, renderPitfall, renderStreak, showLoadError, showToast, updateProgress
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
  renderStreak(store.getStreak());
}

function escapeForRender(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function clearAIReviewPanel() {
  const panel = document.querySelector('#aiReviewPanel');
  if (!panel) return;
  panel.classList.add('hidden');
  panel.innerHTML = '';
}

function renderAIReviewPanel({ statusMessage, actionHint, payload }) {
  const panel = document.querySelector('#aiReviewPanel');
  if (!panel) return;
  panel.innerHTML = `
    <p class="eyebrow">AI review</p>
    <p>${escapeForRender(statusMessage)}</p>
    <details>
      <summary>Show review prompt</summary>
      <pre>${escapeForRender(payload)}</pre>
    </details>
    <p>${escapeForRender(actionHint)}</p>
  `;
  panel.classList.remove('hidden');
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
  clearAIReviewPanel();
  setLibraryOpen(false);
  render();

  if (focusTitle) {
    const title = document.querySelector('#lessonTitle');
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
    document.querySelector('#lesson').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function buildAIReviewPayload(currentLesson, state) {
  const answers = currentLesson.questions.map((item, index) => `${index + 1}. ${item.prompt}\nMy answer: ${state.answers[item.id] || '(blank)'}`).join('\n\n');
  const production = (currentLesson.productionQuestions || []).map((item, index) => `${index + 1}. ${item.prompt}\nTarget expression: ${item.keyword}\nMy answer: ${state.productionAnswers[item.id] || '(blank)'}`).join('\n\n');
  const recognition = (currentLesson.recognitionQuestions || []).map((item, index) => {
    const selected = state.recognitionAnswers[item.id];
    const selectedText = selected !== undefined && selected !== null && selected !== '' && Number.isInteger(Number(selected))
      ? item.options[Number(selected)]
      : '(blank)';
    return `${index + 1}. ${item.prompt}\nMy selected option: ${selectedText || '(blank)'}`;
  }).join('\n\n');
  return `Please review my Japanese translation practice.\n\nLesson:\n${currentLesson.title}\n\nTarget expression:\n${currentLesson.keywords.map(item => item.word).join('、')}\n\nJapanese → English\n\n${answers}${production ? `\n\nEnglish → Japanese\n\n${production}` : ''}${recognition.length ? `\n\nRecognition\n\n${recognition}` : ''}\n\nPlease evaluate:\n\n• grammar\n• naturalness\n• vocabulary\n• recurring mistakes\n• overall score\n• encouragement\n• suggestions for improvement`;
}

async function copyToClipboard(payload) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(payload);
    return true;
  } catch {
    const fallback = document.createElement('textarea');
    fallback.value = payload;
    fallback.setAttribute('readonly', '');
    fallback.className = 'clipboard-fallback';
    document.body.appendChild(fallback);
    fallback.select();
    const copied = document.execCommand('copy');
    fallback.remove();
    return copied;
  }
}

async function deliverAIReview(payload) {
  const copied = await copyToClipboard(payload);
  if (!copied) {
    showToast('Could not copy the review prompt. Please try again.');
    renderAIReviewPanel({
      statusMessage: 'Clipboard copy failed.',
      actionHint: 'Please copy this prompt manually and paste it into ChatGPT.',
      payload
    });
    return;
  }

  const actionHint = 'Your prompt is ready to paste. Open ChatGPT and paste it.';
  showToast('Review prompt copied. Open ChatGPT and paste it.');
  renderAIReviewPanel({
    statusMessage: 'Review prompt copied.',
    actionHint,
    payload
  });
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
    clearAIReviewPanel();
    showToast('Answers reset');
  } else if (button.id === 'aiReview' && lesson) {
    deliverAIReview(buildAIReviewPayload(lesson, store.get()));
  } else if (button.id === 'checkAnswers' && lesson) {
    renderCompletion(createReferenceFeedback(lesson, store.get()), 'translation');
  } else if (button.id === 'checkProductionAnswers' && lesson) {
    renderCompletion(createReferenceFeedback(lesson, store.get()), 'production');
  } else if (button.id === 'checkRecognitionAnswers' && lesson) {
    renderCompletion(createReferenceFeedback(lesson, store.get()), 'recognition');
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
  if (!lesson || !event.target.matches('[data-answer], [data-production-answer], [data-recognition-answer]')) return;
  if (event.target.matches('[data-production-answer]')) store.setProductionAnswer(event.target.dataset.productionAnswer, event.target.value);
  else if (event.target.matches('[data-recognition-answer]')) store.setRecognitionAnswer(event.target.dataset.recognitionAnswer, event.target.value);
  else store.setAnswer(event.target.dataset.answer, event.target.value);
  updateProgress(lesson, store.get());
  renderLessonLibrary(manifest, currentEntry.id, store);
  renderStreak(store.getStreak());
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
