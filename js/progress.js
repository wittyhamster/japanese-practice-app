// Count only answers belonging to the current lesson; older saved IDs are ignored.
export function lessonProgress(lesson, state) {
  const sections = [
    { key: 'translation', label: 'JP → EN', target: 'practice', questions: lesson.questions, answers: state.answers, attribute: 'data-answer' },
    { key: 'production', label: 'EN → JP', target: 'productionPractice', questions: lesson.productionQuestions || [], answers: state.productionAnswers, attribute: 'data-production-answer' },
    { key: 'recognition', label: 'Recognize', target: 'recognitionPractice', questions: lesson.recognitionQuestions || [], answers: state.recognitionAnswers, attribute: 'data-recognition-answer' }
  ].filter(section => section.questions.length).map(section => {
    const missing = section.questions.filter(question => {
      const value = section.answers?.[question.id];
      if (section.key === 'recognition') return value === undefined || value === '' || !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) >= question.options.length;
      return typeof value !== 'string' || !value.trim();
    });
    return { ...section, missing, answered: section.questions.length - missing.length };
  });
  const total = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const answered = sections.reduce((sum, section) => sum + section.answered, 0);
  return { sections, total, answered, complete: total > 0 && answered === total };
}
