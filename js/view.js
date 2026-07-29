const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

const isFavorite = (state, id) => state.favorites.includes(id);

export function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark', isDark);
  const button = $('#themeToggle');
  button.setAttribute('aria-pressed', String(isDark));
  button.setAttribute('aria-label', isDark ? 'Use light theme' : 'Use dark theme');
}

export function renderLesson(lesson, state) {
  $('#keywordList').innerHTML = lesson.keywords.map(item => {
    const favoriteId = `word:${item.id}`;
    const favorite = isFavorite(state, favoriteId);
    const reviewed = state.reviewed.includes(item.id);
    return `<article class="keyword-card">
      <div class="keyword-top"><div><p class="keyword">${escapeHtml(item.word)}</p><p class="reading">${escapeHtml(item.reading)}</p></div>
      <button class="star-button ${favorite ? 'active' : ''}" data-favorite="${escapeHtml(favoriteId)}" aria-label="Save ${escapeHtml(item.word)}" aria-pressed="${favorite}">★</button></div>
      <p class="meaning">${escapeHtml(item.meaning)}</p><p class="nuance">${escapeHtml(item.nuance)}</p>
      <div class="example"><strong>${escapeHtml(item.example)}</strong><span>${escapeHtml(item.exampleTranslation)}</span></div>
      <button class="small-button reviewed-button" data-reviewed="${escapeHtml(item.id)}" aria-pressed="${reviewed}">${reviewed ? 'Reviewed ✓' : 'Mark reviewed'}</button>
    </article>`;
  }).join('');

  $('#questionList').innerHTML = lesson.questions.map((item, index) => {
    const favoriteId = `question:${item.id}`;
    const favorite = isFavorite(state, favoriteId);
    return `<article class="question-card">
      <div class="question-header"><span class="question-number">Question ${index + 1}</span>
      <button class="star-button ${favorite ? 'active' : ''}" data-favorite="${escapeHtml(favoriteId)}" aria-label="Save question ${index + 1}" aria-pressed="${favorite}">★</button></div>
      <p class="prompt">${escapeHtml(item.prompt)}</p>
      <textarea data-answer="${escapeHtml(item.id)}" aria-label="Answer for question ${index + 1}" placeholder="Type your natural English translation...">${escapeHtml(state.answers[item.id] || '')}</textarea>
      <div class="question-actions"><button class="small-button" data-toggle="hint-${escapeHtml(item.id)}" aria-expanded="false">Hint</button>
      <button class="small-button" data-toggle="answer-${escapeHtml(item.id)}" aria-expanded="false">Show answer</button></div>
      <div id="hint-${escapeHtml(item.id)}" class="reveal hidden"><strong>Hint:</strong> ${escapeHtml(item.hint)}</div>
      <div id="answer-${escapeHtml(item.id)}" class="reveal hidden"><strong>Model answer:</strong> ${escapeHtml(item.answer)}</div>
    </article>`;
  }).join('');

  const production = lesson.productionQuestions || [];
  const productionSection = $('#productionPractice');
  productionSection.classList.toggle('hidden', !production.length);
  $('#productionList').innerHTML = production.map((item, index) => `<article class="question-card production-card">
    <div class="question-header"><span class="question-number">Question ${index + 1}</span></div>
    <p class="production-label">English</p><p class="prompt">${escapeHtml(item.prompt)}</p>
    <p class="production-target">Target expression: <strong>${escapeHtml(item.keyword)}</strong></p>
    <textarea data-production-answer="${escapeHtml(item.id)}" aria-label="Japanese answer for production question ${index + 1}" placeholder="Write your Japanese answer...">${escapeHtml(state.productionAnswers[item.id] || '')}</textarea>
    ${item.hint ? `<div class="question-actions"><button class="small-button" data-toggle="production-hint-${escapeHtml(item.id)}" aria-expanded="false">Hint</button></div><div id="production-hint-${escapeHtml(item.id)}" class="reveal hidden"><strong>Hint:</strong> ${escapeHtml(item.hint)}</div>` : ''}
    ${item.helpfulVocabulary?.length ? `<div class="question-actions"><button class="small-button" data-toggle="production-vocab-${escapeHtml(item.id)}" aria-expanded="false">Need a hint?</button></div><div id="production-vocab-${escapeHtml(item.id)}" class="reveal hidden"><strong>Helpful vocabulary</strong><table class="vocabulary-table"><thead><tr><th>Japanese</th><th>Reading</th><th>Meaning</th></tr></thead><tbody>${item.helpfulVocabulary.map(word => `<tr><td>${escapeHtml(word.jp)}</td><td>${escapeHtml(word.reading)}</td><td>${escapeHtml(word.en)}</td></tr>`).join('')}</tbody></table></div>` : ''}
  </article>`).join('');

  renderReview(lesson, state);
  updateProgress(lesson, state);
}

export function renderPitfall(lesson) {
  const pitfall = $('#commonPitfall');
  if (!lesson.commonPitfall?.title || !lesson.commonPitfall?.body) {
    pitfall.innerHTML = '';
    pitfall.classList.add('hidden');
    return;
  }

  const paragraphs = lesson.commonPitfall.body.split(/\n\s*\n/)
    .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('');
  pitfall.innerHTML = `<p class="eyebrow">Watch out</p><h3>${escapeHtml(lesson.commonPitfall.title)}</h3>${paragraphs}`;
  pitfall.classList.remove('hidden');
}

export function renderLessonLibrary(manifest, currentLessonId, store) {
  $('#lessonLibraryList').innerHTML = manifest.lessons.map(entry => {
    const current = entry.id === currentLessonId;
    const complete = store.isLessonComplete(entry.contentId, entry.questionCount, entry.productionQuestionCount || 0);
    const status = current ? `● Current${complete ? ' · Completed' : ''}` : complete ? '✓ Completed' : '○ Not completed';
    return `<button class="lesson-entry ${current ? 'current' : ''}" data-lesson-id="${escapeHtml(entry.id)}" ${current ? 'aria-current="page"' : ''}>
      <span class="lesson-entry-meta"><span>${escapeHtml(entry.subtitle)}</span><strong>${escapeHtml(entry.expression)}</strong></span>
      <span class="lesson-entry-title">${escapeHtml(entry.title)}</span>
      <span class="lesson-entry-status">${status}</span>
    </button>`;
  }).join('');
}

export function renderLessonNavigation(manifest, currentLessonId) {
  const index = manifest.lessons.findIndex(entry => entry.id === currentLessonId);
  const total = manifest.lessons.length;
  $('#lessonNavigation').innerHTML = `<button class="secondary" data-lesson-direction="previous" ${index <= 0 ? 'disabled' : ''}>← Previous</button>
    <span>Lesson ${index + 1} of ${total}</span>
    <button class="secondary" data-lesson-direction="next" ${index < 0 || index >= total - 1 ? 'disabled' : ''}>Next →</button>`;
}

function renderReview(lesson, state) {
  const items = [];
  lesson.keywords.forEach(item => {
    const id = `word:${item.id}`;
    if (isFavorite(state, id)) items.push(`<article class="keyword-card compact-card"><div class="keyword-top"><div><p class="keyword">${escapeHtml(item.word)}</p><p class="meaning">${escapeHtml(item.meaning)}</p></div><button class="star-button active" data-favorite="${escapeHtml(id)}" aria-label="Remove ${escapeHtml(item.word)} from saved items" aria-pressed="true">★</button></div><p class="nuance">${escapeHtml(item.nuance)}</p></article>`);
  });
  lesson.questions.forEach((item, index) => {
    const id = `question:${item.id}`;
    if (isFavorite(state, id)) items.push(`<article class="question-card compact-card"><div class="question-header"><span class="question-number">Saved practice</span><button class="star-button active" data-favorite="${escapeHtml(id)}" aria-label="Remove question ${index + 1} from saved items" aria-pressed="true">★</button></div><p class="prompt">${escapeHtml(item.prompt)}</p><p class="nuance">${escapeHtml(item.answer)}</p></article>`);
  });
  $('#reviewList').innerHTML = items.length ? items.join('') : '<div class="empty-card">Nothing saved yet. Tap a star on any word or question.</div>';
  $('#favoriteCount').textContent = `${items.length} saved`;
  $('#favoriteStat').textContent = items.length;
}

export function updateProgress(lesson, state) {
  const reviewed = state.reviewed.filter(id => lesson.keywords.some(item => item.id === id)).length;
  const answered = lesson.questions.filter(item => (state.answers[item.id] || '').trim()).length;
  const production = lesson.productionQuestions || [];
  const productionAnswered = production.filter(item => (state.productionAnswers[item.id] || '').trim()).length;
  const total = lesson.keywords.length + lesson.questions.length + production.length;
  const percent = total ? Math.round(((reviewed + answered + productionAnswered) / total) * 100) : 0;
  const expressionLabel = lesson.keywords.length === 1 ? 'expression' : 'expressions';
  $('#progressText').textContent = `${percent}%`;
  $('#progressBar').style.width = `${percent}%`;
  $('#learnedStat').textContent = reviewed;
  $('#goalList').innerHTML = `<div class="goal-item"><span>${reviewed === lesson.keywords.length ? '✓' : '○'}</span> Review ${lesson.keywords.length} ${expressionLabel}</div><div class="goal-item"><span>${answered === lesson.questions.length ? '✓' : '○'}</span> Answer ${lesson.questions.length} questions</div>${production.length ? `<div class="goal-item"><span>${productionAnswered === production.length ? '✓' : '○'}</span> Produce ${production.length} Japanese answers</div>` : ''}`;
}

export function renderCompletion(feedback) {
  const results = $('#completionResults');
  const marker = ['①', '②', '③', '④', '⑤'];
  const productionReview = feedback.productionItems?.length ? `<div class="completion-list production-feedback"><h4>English → Japanese</h4>${feedback.productionItems.map(item => `<article class="feedback-card"><div class="feedback-number">Question ${item.number}</div><p class="feedback-prompt">${escapeHtml(item.prompt)}</p><div class="feedback-field"><span>Your answer</span><p class="${item.userAnswer ? '' : 'unanswered'}">${escapeHtml(item.userAnswer || 'No answer entered.')}</p></div><div class="feedback-field reference-field"><span>Possible natural answers</span>${item.referenceAnswers.map((reference, index) => `<div class="reference-answer"><p><strong>${marker[index] || `${index + 1}.`}</strong> ${escapeHtml(reference.answer)}</p>${reference.level ? `<p class="reference-level">${escapeHtml(reference.level)}</p>` : ''}<p class="reference-note">Why this works: ${escapeHtml(reference.note)}</p></div>`).join('')}</div><div class="feedback-field"><span>Target expression</span><p>${escapeHtml(item.keyword)}</p></div></article>`).join('')}</div>` : '';
  results.innerHTML = `<div class="completion-heading"><p class="eyebrow">Practice complete</p><h3>Review your answers</h3><p>Compare your translation with the reference. Natural wording can vary, so focus on meaning and nuance.</p></div>
    <div class="completion-list">${feedback.items.map(item => `<article class="feedback-card">
      <div class="feedback-number">Question ${item.number}</div>
      <p class="feedback-prompt">${escapeHtml(item.prompt)}</p>
      <div class="feedback-field"><span>Your answer</span><p class="${item.userAnswer ? '' : 'unanswered'}">${escapeHtml(item.userAnswer || 'No answer entered.')}</p></div>
      <div class="feedback-field reference-field"><span>Reference answer</span><p>${escapeHtml(item.referenceAnswer)}</p></div>
      <div class="feedback-field"><span>Explanation</span><p>${escapeHtml(item.explanation)}</p></div>
    </article>`).join('')}</div>${productionReview}`;
  results.classList.remove('hidden');
  $('#checkAnswers').setAttribute('aria-expanded', 'true');
  results.focus({ preventScroll: true });
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function clearCompletion() {
  const results = $('#completionResults');
  results.classList.add('hidden');
  results.innerHTML = '';
  $('#checkAnswers').setAttribute('aria-expanded', 'false');
}

export function showLoadError() {
  $('#keywordList').innerHTML = '<div class="empty-card">The lesson could not load. Check your connection, then refresh the page.</div>';
  $('#aiReview').disabled = true;
  $('#resetAnswers').disabled = true;
  $('#checkAnswers').disabled = true;
}

export function showToast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(window.__senseiToast);
  window.__senseiToast = setTimeout(() => element.classList.remove('show'), 1800);
}
