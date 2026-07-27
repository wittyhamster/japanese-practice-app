export function createReferenceFeedback(lesson, state) {
  return {
    source: 'reference',
    items: lesson.questions.map((question, index) => ({
      id: question.id,
      number: index + 1,
      prompt: question.prompt,
      userAnswer: (state.answers[question.id] || '').trim(),
      referenceAnswer: question.answer,
      explanation: question.hint
    })),
    productionItems: (lesson.productionQuestions || []).map((question, index) => ({
      id: question.id, number: index + 1, prompt: question.prompt, keyword: question.keyword,
      userAnswer: (state.productionAnswers[question.id] || '').trim(), referenceAnswer: question.sampleAnswer
    }))
  };
}
