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

function validateManifest(manifest) {
  if (!manifest || typeof manifest.activeLesson !== 'string' || !Array.isArray(manifest.lessons)) {
    throw new Error('Lesson manifest has an invalid structure');
  }

  const validEntries = manifest.lessons.every(entry => entry && typeof entry === 'object'
    && typeof entry.id === 'string' && typeof entry.title === 'string'
    && typeof entry.subtitle === 'string' && typeof entry.file === 'string');
  const uniqueIds = new Set(manifest.lessons.map(entry => entry.id));
  if (!validEntries || uniqueIds.size !== manifest.lessons.length) {
    throw new Error('Lesson manifest contains invalid entries');
  }

  const activeEntry = manifest.lessons.find(entry => entry.id === manifest.activeLesson);
  if (!activeEntry) throw new Error('Active lesson is missing from the manifest');
  return activeEntry;
}

export async function loadActiveLesson(manifestUrl) {
  const response = await fetch(manifestUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Lesson manifest request failed (${response.status})`);

  const activeEntry = validateManifest(await response.json());
  const lessonUrl = new URL(activeEntry.file, new URL(manifestUrl, window.location.href));
  return loadLesson(lessonUrl);
}
