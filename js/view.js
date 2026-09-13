import { lessonProgress } from './progress.js';
import { prefersKeyboardDictation, renderDictationControls } from './dictation-ui.js';

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

const isFavorite = (state, id) => state.favorites.includes(id);
const hasText = value => value !== undefined && value !== null && String(value).trim() !== '';

export function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark', isDark);
  const button = $('#themeToggle');
  button.setAttribute('aria-pressed', String(isDark));
  button.setAttribute('aria-label', isDark ? 'Use light theme' : 'Use dark theme');
}

export function renderStreak(count) {
  $('#streakCount').textContent = count;
}

export function renderLesson(lesson, state) {
  const keyboardDictation = prefersKeyboardDictation(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
  $('.dictation-help').textContent = keyboardDictation
    ? 'On iPhone or iPad, we recommend your keyboard’s microphone. Choose English for Japanese → English and Japanese for English → Japanese. If the microphone is missing, enable Dictation in Settings → General → Keyboard. Browser dictation is available under each optional disclosure and may send audio to its speech service.'
    : 'Prefer speaking? Use a microphone button or your keyboard’s dictation. Browser dictation may send audio to its speech service and needs microphone permission. Text is added to your answer for you to edit.';
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
      ${renderDictationControls('en-US', index + 1, keyboardDictation)}
      <div class="question-actions"><button class="small-button" data-toggle="hint-${escapeHtml(item.id)}" aria-expanded="false">Hint</button>
      <button class="small-button" data-toggle="answer-${escapeHtml(item.id)}" aria-expanded="false">Show answer</button></div>
      <div id="hint-${escapeHtml(item.id)}" class="reveal hidden"><strong>Hint:</strong> ${escapeHtml(item.hint)}</div>
      <div id="answer-${escapeHtml(item.id)}" class="reveal hidden"><strong>Model answer:</strong> ${escapeHtml(item.answer)}</div>
    </article>`;
  }).join('');

  const production = lesson.productionQuestions || [];
  const productionSection = $('#productionPractice');
  productionSection.classList.toggle('hidden', !production.length);
  $('#productionList').innerHTML = production.map((item, index) => {
    const references = item.referenceAnswers || (item.sampleAnswer ? [{ answer: item.sampleAnswer, note: 'A natural way to express the idea.' }] : []);
    const markers = ['①', '②', '③', '④', '⑤'];
    return `<article class="question-card production-card">
    <div class="question-header"><span class="question-number">Question ${index + 1}</span></div>
    <p class="production-label">English</p><p class="prompt">${escapeHtml(item.prompt)}</p>
    <p class="production-target">Target expression: <strong>${escapeHtml(item.keyword)}</strong></p>
    <textarea data-production-answer="${escapeHtml(item.id)}" aria-label="Japanese answer for production question ${index + 1}" placeholder="Write your Japanese answer...">${escapeHtml(state.productionAnswers[item.id] || '')}</textarea>
    ${renderDictationControls('ja-JP', index + 1, keyboardDictation)}
    ${item.hint ? `<div class="question-actions"><button class="small-button" data-toggle="production-hint-${escapeHtml(item.id)}" aria-expanded="false">Sentence hint</button></div><div id="production-hint-${escapeHtml(item.id)}" class="reveal hidden"><strong>Sentence hint:</strong> ${escapeHtml(item.hint)}</div>` : ''}
    ${item.helpfulVocabulary?.length ? `<div class="question-actions"><button class="small-button" data-toggle="production-vocab-${escapeHtml(item.id)}" aria-expanded="false">Vocabulary</button></div><div id="production-vocab-${escapeHtml(item.id)}" class="reveal hidden"><strong>Helpful vocabulary</strong><table class="vocabulary-table"><thead><tr><th>Japanese</th><th>Reading</th><th>Meaning</th></tr></thead><tbody>${item.helpfulVocabulary.map(word => `<tr><td>${escapeHtml(word.jp)}</td><td>${escapeHtml(word.reading)}</td><td>${escapeHtml(word.en)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${references.length ? `<div class="question-actions"><button class="small-button" data-toggle="production-answers-${escapeHtml(item.id)}" aria-expanded="false">Show possible answers</button></div><div id="production-answers-${escapeHtml(item.id)}" class="reveal hidden"><strong>Possible natural answers</strong>${references.map((reference, answerIndex) => `<div class="reference-answer"><p><strong>${markers[answerIndex] || `${answerIndex + 1}.`}</strong> ${escapeHtml(reference.answer)}</p>${reference.level ? `<p class="reference-level">${escapeHtml(reference.level)}</p>` : ''}<p class="reference-note">Why this works: ${escapeHtml(reference.note)}</p></div>`).join('')}</div>` : ''}
  </article>`;
  }).join('');

  const recognition = lesson.recognitionQuestions || [];
  const recognitionSection = $('#recognitionPractice');
  if (recognitionSection) {
    recognitionSection.classList.toggle('hidden', !recognition.length);
    $('#recognitionList').innerHTML = recognition.map((item, index) => {
      const selected = state.recognitionAnswers[item.id];
      return `<article class="question-card recognition-card">
        <div class="question-header"><span class="question-number">Question ${index + 1}</span></div>
        <p class="prompt">${escapeHtml(item.prompt)}</p>
        <div class="recognition-options">${item.options.map((option, optionIndex) => {
          const id = `recognition-${escapeHtml(item.id)}-${optionIndex}`;
          const checked = String(selected ?? '') === String(optionIndex);
          return `<label class="recognition-option">
            <input type="radio" name="recognition-${escapeHtml(item.id)}" value="${optionIndex}" id="${id}" data-recognition-answer="${escapeHtml(item.id)}" ${checked ? 'checked' : ''} />
            <span>${escapeHtml(option)}</span>
          </label>`;
        }).join('')}</div>
        ${item.hint ? `<div class="question-actions"><button class="small-button" data-toggle="recognition-hint-${escapeHtml(item.id)}" aria-expanded="false">Hint</button></div><div id="recognition-hint-${escapeHtml(item.id)}" class="reveal hidden"><strong>Hint:</strong> ${escapeHtml(item.hint)}</div>` : ''}
      </article>`;
    }).join('');
  }

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
  $('#lessonLibraryList').innerHTML = manifest.lessons.map((entry, index) => {
    const current = entry.id === currentLessonId;
    const complete = store.isLessonComplete(entry.contentId, entry.questionCount, entry.productionQuestionCount || 0, entry.recognitionQuestionCount || 0);
    const displaySubtitle = `Lesson ${index + 1}`;
    const status = current ? `● Current${complete ? ' · Completed' : ''}` : complete ? '✓ Completed' : '○ Not completed';
    return `<button class="lesson-entry ${current ? 'current' : ''}" data-lesson-id="${escapeHtml(entry.id)}" ${current ? 'aria-current="page"' : ''}>
      <span class="lesson-entry-meta"><span>${escapeHtml(displaySubtitle)}</span><strong>${escapeHtml(entry.expression)}</strong></span>
      <span class="lesson-entry-title">${escapeHtml(entry.title)}</span>
      <span class="lesson-entry-status">${status}</span>
    </button>`;
  }).join('');
}

export function renderLessonNavigation(manifest, currentLessonId, currentContentId) {
  const directMatch = manifest.lessons.findIndex(entry => entry.id === currentLessonId);
  const contentMatch = currentContentId ? manifest.lessons.findIndex(entry => entry.contentId === currentContentId) : -1;
  const index = directMatch >= 0 ? directMatch : contentMatch;
  const total = manifest.lessons.length;
  const safeIndex = index < 0 ? 0 : index;
  const hasPrevious = safeIndex > 0;
  const hasNext = safeIndex < total - 1;
  const previous = hasPrevious
    ? `<button class="secondary nav-button" data-lesson-direction="previous">← Previous lesson</button>`
    : '<span class="lesson-nav-ghost" aria-hidden="true"></span>';
  const next = hasNext
    ? `<button class="secondary nav-button" data-lesson-direction="next">Next lesson →</button>`
    : '<span class="lesson-nav-ghost" aria-hidden="true"></span>';

  $('#lessonNavigation').innerHTML = `${previous}
    <span>Lesson ${safeIndex + 1} of ${total}</span>
    ${next}`;
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
  const progress = lessonProgress(lesson, state);
  const percent = progress.total ? Math.round(progress.answered / progress.total * 100) : 0;
  $('#progressText').textContent = `${percent}%`;
  $('#progressBar').style.width = `${percent}%`;
  const reviewed = state.reviewed.filter(id => lesson.keywords.some(item => item.id === id)).length;
  $('#learnedStat').textContent = reviewed;
  $('#goalList').innerHTML = progress.sections.map(section => `<a class="goal-item" href="#${section.target}">${section.missing.length ? '○' : '✓'} ${section.label}: ${section.answered}/${section.questions.length} answered</a>`).join('')
    + `<div class="goal-item">${reviewed}/${lesson.keywords.length} words reviewed · optional</div>`
    + `<div class="goal-item ${progress.complete ? 'goal-item-complete' : ''}">${progress.complete ? '✓ Lesson complete' : `${progress.total - progress.answered} answers remaining`}</div>`;
  $('#phaseNavigation').innerHTML = '<a href="#lesson">Learn</a>' + progress.sections.map(section => `<a href="#${section.target}">${section.label} <span>${section.answered}/${section.questions.length}${section.missing.length ? '' : ' ✓'}</span></a>`).join('');
  const resume = $('#resumeLesson');
  resume.textContent = progress.complete ? 'See lesson summary →' : progress.answered ? 'Continue practice →' : 'Start lesson →';
  resume.href = progress.complete ? '#lessonFinish' : progress.answered ? `#${progress.sections.find(section => section.missing.length).target}` : '#lesson';
  document.querySelectorAll('.completion-status').forEach(status => {
    status.textContent = progress.complete ? 'Lesson complete' : 'Lesson in progress';
    status.className = `completion-status completion-status-${progress.complete ? 'complete' : 'incomplete'}`;
  });
}

export function renderLessonFinish(lesson, state, nextEntry) {
  const progress = lessonProgress(lesson, state);
  const remaining = progress.sections.filter(section => section.missing.length);
  $('#lessonCompletion').innerHTML = `<h2>${progress.complete ? '✓ Lesson complete' : 'Keep going'}</h2>
    <p>${progress.answered}/${progress.total} answered. Completion tracks participation, not correctness.</p>
    ${remaining.length ? `<div class="remaining-answers">${remaining.map(section => `<button class="secondary" data-first-unanswered="${section.key}">${section.label}: ${section.missing.length} left →</button>`).join('')}</div>` : ''}
    ${progress.complete ? (nextEntry ? `<button class="primary" data-lesson-id="${escapeHtml(nextEntry.id)}">Next lesson: ${escapeHtml(nextEntry.expression)} →</button>` : '<p>You’ve reached the last lesson. Revisit any lesson from the library.</p>') : ''}`;
}

export function renderSaveStatus(status) {
  const element = $('#saveStatus');
  element.textContent = status === 'error' ? 'Could not save on this device. Keep this tab open and copy your answers using Review with AI before leaving.' : status === 'saved' ? 'Saved on this device' : 'Answers are saved on this device.';
  element.classList.toggle('save-error', status === 'error');
}

export function renderCompletion(feedback, section = 'all', lessonComplete = false) {
  const results = $(section === 'production' ? '#productionResults' : section === 'recognition' ? '#recognitionResults' : '#completionResults');
  const marker = ['①', '②', '③', '④', '⑤'];

  const showTranslation = section === 'all' || section === 'translation';
  const showProduction = section === 'all' || section === 'production';
  const showRecognition = section === 'all' || section === 'recognition';

  const translationReview = showTranslation && feedback.items.length
    ? `<div class="completion-list"><h4>Japanese → English</h4>${feedback.items.map(item => `<article class="feedback-card"><div class="feedback-number">Question ${item.number}</div><p class="feedback-prompt">${escapeHtml(item.prompt)}</p><div class="feedback-field"><span>Your answer</span><p class="${item.userAnswer ? '' : 'unanswered'}">${escapeHtml(item.userAnswer || 'No answer entered.')}</p></div><div class="feedback-field reference-field"><span>Reference answer</span><p>${escapeHtml(item.referenceAnswer)}</p></div><div class="feedback-field"><span>Explanation</span><p>${escapeHtml(item.explanation)}</p></div></article>`).join('')}</div>`
    : '';

  const productionReview = showProduction && feedback.productionItems?.length
    ? `<div class="completion-list production-feedback"><h4>English → Japanese</h4>${feedback.productionItems.map(item => `<article class="feedback-card"><div class="feedback-number">Question ${item.number}</div><p class="feedback-prompt">${escapeHtml(item.prompt)}</p><div class="feedback-field"><span>Your answer</span><p class="${item.userAnswer ? '' : 'unanswered'}">${escapeHtml(item.userAnswer || 'No answer entered.')}</p></div><div class="feedback-field reference-field"><span>Possible natural answers</span>${item.referenceAnswers.map((reference, index) => `<div class="reference-answer"><p><strong>${marker[index] || `${index + 1}.`}</strong> ${escapeHtml(reference.answer)}</p>${reference.level ? `<p class="reference-level">${escapeHtml(reference.level)}</p>` : ''}<p class="reference-note">Why this works: ${escapeHtml(reference.note)}</p></div>`).join('')}</div><div class="feedback-field"><span>Target expression</span><p>${escapeHtml(item.keyword)}</p></div></article>`).join('')}</div>`
    : '';

  const recognitionReview = showRecognition && feedback.recognitionItems?.length
    ? `<div class="completion-list recognition-feedback">${feedback.recognitionItems.map(item => {
      const userAnswerText = item.userAnswerText || 'No answer selected.';
      const resultLabel = item.isCorrect ? '✓ Correct' : '✗ Review';
      return `<article class="feedback-card recognition-card"><div class="feedback-number">${resultLabel}</div><p class="feedback-prompt">${escapeHtml(item.prompt)}</p><div class="feedback-field"><span>Your answer</span><p class="${userAnswerText ? '' : 'unanswered'}">${escapeHtml(userAnswerText)}</p></div><div class="feedback-field"><span>Expected answer</span><p>${escapeHtml(item.correctText)}</p></div><div class="feedback-field"><span>Why</span><p>${escapeHtml(item.explanation)}</p></div></article>`;
    }).join('')}</div>`
    : '';

  const noResults = !(translationReview || productionReview || recognitionReview);
  const noResultsMessage = noResults ? '<p class="empty-card">Nothing to review for this section yet.</p>' : '';
  const completionStatus = lessonComplete
    ? '<p class="completion-status completion-status-complete">Lesson complete</p>'
    : '<p class="completion-status completion-status-incomplete">Lesson in progress</p>';

  const heading = section === 'all'
    ? 'Review your answers'
    : section === 'production'
      ? 'Review production answers'
      : section === 'recognition'
        ? 'Review recognition answers'
        : 'Review translation answers';

  const eyebrow = section === 'all' ? 'Practice complete' : 'Practice review';

  results.innerHTML = `<div class="completion-heading"><p class="eyebrow">${eyebrow}</p><h3>${heading}</h3><p>Compare your answers with reference and confirm whether meaning is preserved.</p>${completionStatus}</div>${translationReview}${productionReview}${recognitionReview}${noResultsMessage}`;
  results.classList.remove('hidden');
  $(section === 'production' ? '#checkProductionAnswers' : section === 'recognition' ? '#checkRecognitionAnswers' : '#checkAnswers').setAttribute('aria-expanded', 'true');
  results.focus({ preventScroll: true });
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function clearCompletion(section) {
  const panels = { translation: ['#completionResults', '#checkAnswers'], production: ['#productionResults', '#checkProductionAnswers'], recognition: ['#recognitionResults', '#checkRecognitionAnswers'] };
  Object.entries(panels).forEach(([key, [panel, button]]) => {
    if (section && key !== section) return;
    $(panel).classList.add('hidden');
    $(panel).innerHTML = '';
    $(button).setAttribute('aria-expanded', 'false');
  });
}

export function renderAIReviewPending() {
  const panel = $('#aiReviewResults');
  panel.classList.remove('hidden');
  panel.innerHTML = '<div class="empty-card">Asking Claude for feedback on your answers…</div>';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function renderAIReviewError(message) {
  const panel = $('#aiReviewResults');
  panel.classList.remove('hidden');
  panel.innerHTML = `<div class="empty-card">${escapeHtml(message)}</div>`;
}

export function renderAIReviewResult(text) {
  const panel = $('#aiReviewResults');
  panel.classList.remove('hidden');
  const paragraphs = text.split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
  panel.innerHTML = `<div class="completion-heading"><p class="eyebrow">AI review</p><h3>Feedback on your answers</h3></div>${paragraphs}`;
  panel.focus({ preventScroll: true });
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function clearAIReview() {
  const panel = $('#aiReviewResults');
  panel.classList.add('hidden');
  panel.innerHTML = '';
}

export function showLoadError() {
  $('#keywordList').innerHTML = '<div class="empty-card">The lesson could not load. Check your connection, then refresh the page.</div>';
  $('#aiReview').disabled = true;
  $('#resetAnswers').disabled = true;
  $('#checkAnswers').disabled = true;
  $('#checkProductionAnswers').disabled = true;
  $('#checkRecognitionAnswers').disabled = true;
  const aiReviewPanel = $('#aiReviewPanel');
  if (aiReviewPanel) {
    aiReviewPanel.classList.add('hidden');
    aiReviewPanel.innerHTML = '';
  }
}

export function showToast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(window.__senseiToast);
  window.__senseiToast = setTimeout(() => element.classList.remove('show'), 1800);
}
