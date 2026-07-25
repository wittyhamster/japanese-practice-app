import { loadLesson } from './js/lesson.js';
import { createStateStore } from './js/state.js';
import { createReferenceFeedback } from './js/feedback.js';
import { applyTheme, clearCompletion, renderCompletion, renderLesson, showLoadError, showToast, updateProgress } from './js/view.js';

const store = createStateStore();
let lesson;

applyTheme(store.get().theme);

function render() {
  renderLesson(lesson, store.get());
}

function copyPayload() {
  const state = store.get();
  const answers = lesson.questions.map((item, index) => `${index + 1}. ${item.prompt}\nMy answer: ${state.answers[item.id] || '(blank)'}`).join('\n\n');
  return `Please review my Japanese translation practice:\n\n${answers}`;
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

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.id === 'themeToggle') {
    applyTheme(store.toggleTheme());
  } else if (button.id === 'resetAnswers' && lesson) {
    store.resetAnswers();
    render();
    clearCompletion();
    showToast('Answers reset');
  } else if (button.id === 'copyAnswers' && lesson) {
    copyAnswers();
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
  if (!lesson || !event.target.matches('[data-answer]')) return;
  store.setAnswer(event.target.dataset.answer, event.target.value);
  updateProgress(lesson, store.get());
  clearCompletion();
});

async function init() {
  try {
    lesson = await loadLesson('./data/lesson-02.json');
    store.selectLesson(lesson.id);
    document.querySelector('#lessonTitle').textContent = lesson.title;
    document.querySelector('#lessonSubtitle').textContent = lesson.subtitle;
    document.querySelector('#questionCount').textContent = `${lesson.questions.length} questions`;
    render();
  } catch (error) {
    showLoadError();
    console.error('Sensei could not load the lesson.', error);
  }
}

init();
