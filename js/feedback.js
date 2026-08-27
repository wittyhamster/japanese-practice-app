export function createReferenceFeedback(lesson, state) {
  const recognition = lesson.recognitionQuestions || [];
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
      userAnswer: (state.productionAnswers[question.id] || '').trim(),
      referenceAnswers: question.referenceAnswers || [{ answer: question.sampleAnswer, note: 'A natural way to express the idea.' }]
    })),
    recognitionItems: recognition.map((question, index) => {
      const selected = state.recognitionAnswers[question.id];
      const selectedIndex = selected !== undefined && selected !== null && selected !== '' && Number.isInteger(Number(selected))
        ? Number(selected)
        : null;
      return {
        id: question.id,
        number: index + 1,
        prompt: question.prompt,
        options: question.options,
        userAnswerIndex: selectedIndex,
        userAnswerText: selectedIndex === null ? '' : question.options[selectedIndex],
        correctIndex: question.answer,
        correctText: question.options[question.answer],
        isCorrect: selectedIndex === question.answer,
        explanation: question.explanation
      };
    })
  };
}
