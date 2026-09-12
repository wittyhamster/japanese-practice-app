import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lessonProgress } from '../js/progress.js';
import { createStateStore } from '../js/state.js';
import { loadLesson } from '../js/lesson.js';
import { createReferenceFeedback } from '../js/feedback.js';

const manifest = JSON.parse(await readFile(new URL('../data/lessons.json', import.meta.url)));
const lessons = [];
globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(await readFile(url)) });
for (const entry of manifest.lessons) {
  const lesson = await loadLesson(new URL(`../data/${entry.file}`, import.meta.url));
  assert.equal(lesson.id, entry.contentId);
  assert.equal(lesson.questions.length, entry.questionCount);
  assert.equal((lesson.productionQuestions || []).length, entry.productionQuestionCount || 0);
  assert.equal((lesson.recognitionQuestions || []).length, entry.recognitionQuestionCount || 0);
  const ids = [...lesson.keywords, ...lesson.questions, ...(lesson.productionQuestions || []), ...(lesson.recognitionQuestions || [])].map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  lessons.push(lesson);
}

let saved = null;
let fail = false;
globalThis.localStorage = {
  getItem: () => saved,
  setItem: (_, value) => { if (fail) throw new Error('Storage blocked'); saved = value; },
  removeItem: () => { saved = null; }
};
const store = createStateStore();
const lesson = lessons.find(item => item.id === 'core-expression-sasuga');
store.selectLesson(lesson.id);
store.setAnswer('obsolete-question', 'Does not count');
assert.equal(lessonProgress(lesson, store.get()).answered, 0);
for (const question of lesson.questions) store.setAnswer(question.id, 'English answer');
for (const question of lesson.productionQuestions) store.setProductionAnswer(question.id, '日本語の答え');
for (const question of lesson.recognitionQuestions.slice(0, -1)) store.setRecognitionAnswer(question.id, '0');
let progress = lessonProgress(lesson, store.get());
assert.equal(progress.answered, 11);
assert.equal(progress.complete, false);
assert.equal(progress.sections[2].missing[0].id, lesson.recognitionQuestions.at(-1).id);
store.setRecognitionAnswer(lesson.recognitionQuestions.at(-1).id, '99');
assert.equal(lessonProgress(lesson, store.get()).complete, false);
store.setRecognitionAnswer(lesson.recognitionQuestions.at(-1).id, '0');
assert.equal(lessonProgress(lesson, store.get()).complete, true); // Correctness and reviewed words are not required.
store.toggleFavorite('word:sasuga');
store.toggleReviewed('sasuga');
const reloaded = createStateStore();
reloaded.selectLesson(lesson.id);
assert.equal(lessonProgress(lesson, reloaded.get()).complete, true);
reloaded.selectLesson(lessons[0].id);
assert.equal(lessonProgress(lessons[0], reloaded.get()).answered, 0);
reloaded.selectLesson(lesson.id);
reloaded.resetAnswers();
assert.equal(lessonProgress(lesson, reloaded.get()).answered, 0);
assert.deepEqual(reloaded.get().favorites, ['word:sasuga']);
assert.deepEqual(reloaded.get().reviewed, ['sasuga']);
let status;
reloaded.onSave(value => { status = value; });
fail = true;
reloaded.setProductionAnswer(lesson.productionQuestions[0].id, 'Keep this in memory');
assert.equal(status, 'error');
assert.equal(reloaded.get().productionAnswers[lesson.productionQuestions[0].id], 'Keep this in memory');
fail = false;
reloaded.setProductionAnswer(lesson.productionQuestions[0].id, 'Saved again');
assert.equal(status, 'saved');
for (const item of lessons) {
  const feedback = createReferenceFeedback(item, { answers: {}, productionAnswers: {}, recognitionAnswers: {} });
  for (const production of feedback.productionItems || []) assert.ok(production.referenceAnswers.length > 0);
}
console.log(`PASS: ${lessons.length} lessons, reference formats, progress boundaries, persistence, isolation, reset preservation, and save failure/recovery.`);
