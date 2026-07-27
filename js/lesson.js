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
  const validProduction = lesson.productionQuestions === undefined || (Array.isArray(lesson.productionQuestions)
    && lesson.productionQuestions.every(item => hasTextFields(item, ['prompt', 'keyword', 'sampleAnswer'])
      && (item.hint === undefined || typeof item.hint === 'string')));
  const validPitfall = lesson.commonPitfall === undefined
    || (lesson.commonPitfall && typeof lesson.commonPitfall === 'object'
      && typeof lesson.commonPitfall.title === 'string' && typeof lesson.commonPitfall.body === 'string');
  if (!validKeywords || !validQuestions || !validProduction || !lesson.questions.every(item => typeof item.id === 'string')) {
    throw new Error('Lesson data contains invalid items');
  }
  return lesson;
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest.activeLesson !== 'string' || !Array.isArray(manifest.lessons)) {
    throw new Error('Lesson manifest has an invalid structure');
  }

  const validEntries = manifest.lessons.every(entry => entry && typeof entry === 'object'
    && typeof entry.id === 'string' && typeof entry.contentId === 'string'
    && typeof entry.title === 'string' && typeof entry.subtitle === 'string'
    && typeof entry.expression === 'string' && typeof entry.file === 'string'
    && Number.isInteger(entry.questionCount) && entry.questionCount >= 0
    && (entry.productionQuestionCount === undefined || (Number.isInteger(entry.productionQuestionCount) && entry.productionQuestionCount >= 0)));
  const uniqueIds = new Set(manifest.lessons.map(entry => entry.id));
  const uniqueContentIds = new Set(manifest.lessons.map(entry => entry.contentId));
  if (!validEntries || uniqueIds.size !== manifest.lessons.length || uniqueContentIds.size !== manifest.lessons.length) {
    throw new Error('Lesson manifest contains invalid entries');
  }

  return manifest;
}

export async function loadManifest(manifestUrl) {
  const response = await fetch(manifestUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Lesson manifest request failed (${response.status})`);
  const manifest = validateManifest(await response.json());
  if (!manifest.lessons.some(entry => entry.id === manifest.activeLesson) && !manifest.lessons.length) {
    throw new Error('Lesson manifest does not contain any lessons');
  }
  return manifest;
}

export async function loadManifestLesson(manifest, manifestUrl, lessonId) {
  const entry = manifest.lessons.find(item => item.id === lessonId);
  if (!entry) throw new Error(`Unknown lesson: ${lessonId}`);
  const lessonUrl = new URL(entry.file, new URL(manifestUrl, window.location.href));
  const lesson = await loadLesson(lessonUrl);
  if (lesson.id !== entry.contentId) throw new Error(`Lesson ID mismatch: ${entry.id}`);
  if (lesson.questions.length !== entry.questionCount) throw new Error(`Lesson question count mismatch: ${entry.id}`);
  return lesson;
}
