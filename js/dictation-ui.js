export function prefersKeyboardDictation(userAgent = '', platform = '', maxTouchPoints = 0) {
  return /iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export function renderDictationControls(language, questionNumber, preferKeyboard) {
  const japanese = language === 'ja-JP';
  const label = japanese ? 'Japanese' : 'English';
  const controls = `<div class="dictation-controls"><button class="small-button" data-dictation="${language}" aria-pressed="false" aria-label="Dictate ${label} answer for question ${questionNumber}">🎙 Dictate ${label}</button><span class="dictation-status" role="status"></span></div>`;
  if (!preferKeyboard) return controls;
  return `<div class="keyboard-dictation">
    <p><strong>Dictate with your ${label} keyboard</strong></p>
    <p>Tap the answer field, switch to the ${label} keyboard using the globe key, then tap the keyboard’s microphone. You can edit the text afterward.</p>
    <button class="small-button" data-keyboard-dictation>Focus ${label} answer</button>
    <details class="browser-dictation-option"><summary>Try browser dictation instead</summary>
      <p>Browser dictation can be intermittent on iPhone and iPad. If it stalls, use the keyboard microphone above.</p>
      ${controls}
    </details>
  </div>`;
}
