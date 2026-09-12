import { loadManifest, loadManifestLesson } from './js/lesson.js';
import { createStateStore } from './js/state.js';
import { createReferenceFeedback } from './js/feedback.js';
import { lessonProgress } from './js/progress.js';
import { createDictation } from './js/dictation.js';
import {
  applyTheme, clearCompletion, renderCompletion, renderLesson, renderLessonLibrary,
  renderLessonNavigation, renderLessonFinish, renderSaveStatus, renderPitfall, renderStreak, showLoadError, showToast, updateProgress
} from './js/view.js';

const MANIFEST_URL = './data/lessons.json';
const store = createStateStore();
const dictation = createDictation();
store.onSave(renderSaveStatus);
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
  dictation.cancel();
  const state = store.get();
  document.querySelector('#lessonTitle').textContent = lesson.title;
  const lessonIndex = getCurrentManifestIndex();
  document.querySelector('#lessonSubtitle').textContent = `Lesson ${lessonIndex + 1}`;
  document.querySelector('#questionCount').textContent = `${lesson.questions.length} questions`;
  renderLesson(lesson, state);
  renderPitfall(lesson);
  renderLessonLibrary(manifest, currentEntry.id, store);
  renderLessonNavigation(manifest, currentEntry.id, lesson.id);
  renderStreak(store.getStreak());
  renderLessonFinish(lesson, state, manifest.lessons[lessonIndex + 1]);
}

function getCurrentManifestIndex() {
  const directMatch = manifest.lessons.findIndex(entry => entry.id === currentEntry.id);
  if (directMatch >= 0) return directMatch;
  const contentMatch = lesson?.id ? manifest.lessons.findIndex(entry => entry.contentId === lesson.id) : -1;
  return contentMatch;
}

function isCurrentLessonComplete() {
  if (!lesson) return false;
  return lessonProgress(lesson, store.get()).complete;
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
    <a class="secondary button-link" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT ↗</a>
  `;
  panel.classList.remove('hidden');
}

async function selectLesson(requestedId, { historyMode = 'push', focusTitle = true } = {}) {
  dictation.cancel();
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
  document.querySelector('#resetConfirmation').classList.add('hidden');
  document.querySelector('.reset-options').open = false;
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
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      fallback.remove();
    }
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
    const currentIndex = getCurrentManifestIndex();
    const safeIndex = currentIndex < 0 ? 0 : currentIndex;
    const offset = button.dataset.lessonDirection === 'previous' ? -1 : 1;
    const target = manifest.lessons[safeIndex + offset];
    if (target) await selectLesson(target.id);
  } else if (button.id === 'resetAnswers' && lesson) {
    document.querySelector('#resetConfirmation').classList.remove('hidden');
    document.querySelector('#cancelReset').focus();
  } else if (button.id === 'cancelReset') {
    document.querySelector('#resetConfirmation').classList.add('hidden');
    document.querySelector('#resetAnswers').focus();
  } else if (button.id === 'confirmReset' && lesson) {
    store.resetAnswers();
    document.querySelector('#resetConfirmation').classList.add('hidden');
    document.querySelector('.reset-options').open = false;
    render();
    clearCompletion();
    clearAIReviewPanel();
    showToast('Answers reset');
    document.querySelector('.reset-options summary').focus();
  } else if (button.id === 'aiReview' && lesson) {
    await deliverAIReview(buildAIReviewPayload(lesson, store.get()));
  } else if (button.dataset.firstUnanswered && lesson) {
    const section = lessonProgress(lesson, store.get()).sections.find(item => item.key === button.dataset.firstUnanswered);
    const first = section?.missing[0];
    if (first) {
      const input = [...document.querySelectorAll(`[${section.attribute}]`)].find(element => element.getAttribute(section.attribute) === first.id);
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } else if (button.id === 'checkAnswers' && lesson) {
    renderCompletion(createReferenceFeedback(lesson, store.get()), 'translation', isCurrentLessonComplete());
  } else if (button.id === 'checkProductionAnswers' && lesson) {
    renderCompletion(createReferenceFeedback(lesson, store.get()), 'production', isCurrentLessonComplete());
  } else if (button.id === 'checkRecognitionAnswers' && lesson) {
    renderCompletion(createReferenceFeedback(lesson, store.get()), 'recognition', isCurrentLessonComplete());
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
  const section = event.target.matches('[data-production-answer]') ? 'production' : event.target.matches('[data-recognition-answer]') ? 'recognition' : 'translation';
  if (event.target.matches('[data-production-answer]')) store.setProductionAnswer(event.target.dataset.productionAnswer, event.target.value);
  else if (event.target.matches('[data-recognition-answer]')) store.setRecognitionAnswer(event.target.dataset.recognitionAnswer, event.target.value);
  else store.setAnswer(event.target.dataset.answer, event.target.value);
  updateProgress(lesson, store.get());
  renderLessonLibrary(manifest, currentEntry.id, store);
  renderStreak(store.getStreak());
  renderLessonFinish(lesson, store.get(), manifest.lessons[getCurrentManifestIndex() + 1]);
  clearCompletion(section);
  clearAIReviewPanel();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.querySelector('#lessonLibrary').classList.contains('hidden')) {
    setLibraryOpen(false, true);
  }
});

window.addEventListener('popstate', () => {
  const requestedId = new URL(window.location.href).searchParams.get('lesson');
  // Anchor jumps also emit popstate. Keep the section and open feedback intact.
  if (requestedId === currentEntry?.id) return;
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
