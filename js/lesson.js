function isLessonItem(item) {
  return item && typeof item === 'object' && typeof item.id === 'string';
}

function hasTextFields(item, fields) {
  return isLessonItem(item) && fields.every(field => typeof item[field] === 'string');
}

export async function loadLesson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Lesson request failed (${response.status})`);

  const lesson = await response.json();
  if (!lesson || typeof lesson.id !== 'string' || typeof lesson.title !== 'string' || typeof lesson.subtitle !== 'string'
    || !Array.isArray(lesson.keywords) || !Array.isArray(lesson.questions)) {
    throw new Error('Lesson data has an invalid structure');
  }
  const validKeywords = lesson.keywords.every(item => hasTextFields(item, ['word', 'reading', 'meaning', 'nuance', 'example', 'exampleTranslation']));
  const validQuestions = lesson.questions.every(item => hasTextFields(item, ['prompt', 'hint', 'answer']));
  if (!validKeywords || !validQuestions) {
    throw new Error('Lesson data contains invalid items');
  }
  return lesson;
}
