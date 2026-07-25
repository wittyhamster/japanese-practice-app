function isLessonItem(item) {
  return item && typeof item === 'object' && typeof item.id === 'string';
}

export async function loadLesson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Lesson request failed (${response.status})`);

  const lesson = await response.json();
  if (!lesson || !Array.isArray(lesson.keywords) || !Array.isArray(lesson.questions)) {
    throw new Error('Lesson data has an invalid structure');
  }
  if (!lesson.keywords.every(isLessonItem) || !lesson.questions.every(isLessonItem)) {
    throw new Error('Lesson data contains invalid items');
  }
  return lesson;
}
