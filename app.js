const STORAGE_KEY = 'sensei-v1-state';

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
state.answers ||= {};
state.favorites ||= [];
state.reviewed ||= [];
state.theme ||= 'light';

let lesson = null;

const $ = (selector) => document.querySelector(selector);
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.__senseiToast);
  window.__senseiToast = setTimeout(() => el.classList.remove('show'), 1800);
}

function isFavorite(id) {
  return state.favorites.includes(id);
}

function toggleFavorite(id) {
  state.favorites = isFavorite(id)
    ? state.favorites.filter(item => item !== id)
    : [...state.favorites, id];
  save();
  renderAll();
}

function markReviewed(id) {
  if (!state.reviewed.includes(id)) state.reviewed.push(id);
  save();
  updateProgress();
}

function renderKeywords() {
  $('#keywordList').innerHTML = lesson.keywords.map(item => `
    <article class="keyword-card">
      <div class="keyword-top">
        <div>
          <p class="keyword">${item.word}</p>
          <p class="reading">${item.reading}</p>
        </div>
        <button class="star-button ${isFavorite('word:' + item.id) ? 'active' : ''}" data-favorite="word:${item.id}" aria-label="Save ${item.word}">★</button>
      </div>
      <p class="meaning">${item.meaning}</p>
      <p class="nuance">${item.nuance}</p>
      <div class="example"><strong>${item.example}</strong><span>${item.exampleTranslation}</span></div>
      <button class="small-button reviewed-button" data-reviewed="${item.id}">${state.reviewed.includes(item.id) ? 'Reviewed ✓' : 'Mark reviewed'}</button>
    </article>
  `).join('');
}

function renderQuestions() {
  $('#questionList').innerHTML = lesson.questions.map((item, index) => `
    <article class="question-card">
      <div class="question-header">
        <span class="question-number">Question ${index + 1}</span>
        <button class="star-button ${isFavorite('question:' + item.id) ? 'active' : ''}" data-favorite="question:${item.id}" aria-label="Save question">★</button>
      </div>
      <p class="prompt">${item.prompt}</p>
      <textarea data-answer="${item.id}" placeholder="Type your natural English translation...">${state.answers[item.id] || ''}</textarea>
      <div class="question-actions">
        <button class="small-button" data-hint="${item.id}">Hint</button>
        <button class="small-button" data-reveal="${item.id}">Show answer</button>
      </div>
      <div id="hint-${item.id}" class="reveal hidden"><strong>Hint:</strong> ${item.hint}</div>
      <div id="answer-${item.id}" class="reveal hidden"><strong>Model answer:</strong> ${item.answer}</div>
    </article>
  `).join('');
}

function renderReview() {
  const items = [];
  lesson.keywords.forEach(item => {
    if (isFavorite('word:' + item.id)) items.push(`
      <article class="keyword-card compact-card">
        <div class="keyword-top"><div><p class="keyword">${item.word}</p><p class="meaning">${item.meaning}</p></div><button class="star-button active" data-favorite="word:${item.id}">★</button></div>
        <p class="nuance">${item.nuance}</p>
      </article>`);
  });
  lesson.questions.forEach(item => {
    if (isFavorite('question:' + item.id)) items.push(`
      <article class="question-card compact-card">
        <div class="question-header"><span class="question-number">Saved practice</span><button class="star-button active" data-favorite="question:${item.id}">★</button></div>
        <p class="prompt">${item.prompt}</p><p class="nuance">${item.answer}</p>
      </article>`);
  });
  $('#reviewList').innerHTML = items.length ? items.join('') : '<div class="empty-card">Nothing saved yet. Tap a star on any word or question.</div>';
  $('#favoriteCount').textContent = `${items.length} saved`;
  $('#favoriteStat').textContent = items.length;
}

function updateProgress() {
  const reviewed = state.reviewed.filter(id => lesson.keywords.some(item => item.id === id)).length;
  const answered = lesson.questions.filter(item => (state.answers[item.id] || '').trim()).length;
  const total = lesson.keywords.length + lesson.questions.length;
  const complete = reviewed + answered;
  const percent = Math.round((complete / total) * 100);
  $('#progressText').textContent = `${percent}%`;
  $('#progressBar').style.width = `${percent}%`;
  $('#learnedStat').textContent = reviewed;
  $('#goalList').innerHTML = `
    <div class="goal-item"><span>${reviewed === lesson.keywords.length ? '✓' : '○'}</span> Review ${lesson.keywords.length} keywords</div>
    <div class="goal-item"><span>${answered === lesson.questions.length ? '✓' : '○'}</span> Answer ${lesson.questions.length} questions</div>`;
}

function renderAll() {
  renderKeywords();
  renderQuestions();
  renderReview();
  updateProgress();
  bindDynamicEvents();
}

function bindDynamicEvents() {
  document.querySelectorAll('[data-favorite]').forEach(button => {
    button.onclick = () => toggleFavorite(button.dataset.favorite);
  });
  document.querySelectorAll('[data-reviewed]').forEach(button => {
    button.onclick = () => {
      markReviewed(button.dataset.reviewed);
      renderAll();
    };
  });
  document.querySelectorAll('[data-answer]').forEach(area => {
    area.oninput = () => {
      state.answers[area.dataset.answer] = area.value;
      save();
      updateProgress();
    };
  });
  document.querySelectorAll('[data-hint]').forEach(button => {
    button.onclick = () => $('#hint-' + button.dataset.hint).classList.toggle('hidden');
  });
  document.querySelectorAll('[data-reveal]').forEach(button => {
    button.onclick = () => $('#answer-' + button.dataset.reveal).classList.toggle('hidden');
  });
}

$('#themeToggle').onclick = () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('dark', state.theme === 'dark');
  save();
};

document.body.classList.toggle('dark', state.theme === 'dark');

$('#resetAnswers').onclick = () => {
  state.answers = {};
  save();
  renderAll();
  toast('Answers reset');
};

$('#copyAnswers').onclick = async () => {
  const text = lesson.questions.map((item, index) => `${index + 1}. ${item.prompt}\nMy answer: ${state.answers[item.id] || '(blank)'}`).join('\n\n');
  try {
    await navigator.clipboard.writeText(`Please review my Japanese translation practice:\n\n${text}`);
    toast('Copied for ChatGPT');
  } catch {
    toast('Could not access clipboard');
  }
};

async function init() {
  try {
    const response = await fetch('./data/lesson-01.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Lesson failed to load');
    lesson = await response.json();
    $('#questionCount').textContent = `${lesson.questions.length} questions`;
    renderAll();
  } catch (error) {
    $('#keywordList').innerHTML = '<div class="empty-card">The lesson could not load. Refresh the page in a moment.</div>';
    console.error(error);
  }
}

init();