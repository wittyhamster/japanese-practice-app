export function appendTranscript(existing, transcript, language) {
  const text = transcript.trim();
  if (!text) return existing;
  const separator = existing && !/\s$/.test(existing) && language !== 'ja-JP' ? ' ' : '';
  return existing + separator + text;
}

export function createDictation({ root = document, Recognition = window.SpeechRecognition || window.webkitSpeechRecognition } = {}) {
  let active = null;
  const fallback = 'Use your keyboard’s microphone instead, or type your answer. Select English or Japanese on the keyboard first.';

  function finish(session, message) {
    if (active !== session) return;
    clearTimeout(session.timer);
    session.button.textContent = session.label;
    session.button.setAttribute('aria-label', session.accessibleLabel);
    session.button.setAttribute('aria-pressed', 'false');
    session.status.textContent = message;
    active = null;
  }

  function cancel() {
    if (!active) return;
    const session = active;
    finish(session, 'Dictation stopped. You can edit your answer.');
    try { session.recognition.abort(); } catch { /* Already ended. */ }
  }

  function start(button) {
    if (active?.button === button) {
      try { active.recognition.stop(); } catch { cancel(); }
      return;
    }
    cancel();
    const card = button.closest('.question-card');
    const input = card.querySelector('textarea');
    const status = card.querySelector('.dictation-status');
    if (!Recognition) {
      status.textContent = `Browser dictation isn’t available here. ${fallback}`;
      input.focus();
      return;
    }
    let recognition;
    try { recognition = new Recognition(); } catch {
      status.textContent = `Browser dictation couldn’t start. ${fallback}`;
      return;
    }
    const language = button.dataset.dictation;
    const session = { button, status, input, recognition, label: button.textContent, accessibleLabel: button.getAttribute('aria-label'), heard: false, received: new Set() };
    active = session;
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    button.textContent = '■ Stop dictation';
    button.setAttribute('aria-label', 'Stop dictation');
    button.setAttribute('aria-pressed', 'true');
    status.textContent = 'Starting microphone… Allow access if prompted.';
    recognition.onstart = () => {
      if (active === session) status.textContent = `Listening in ${language === 'ja-JP' ? 'Japanese' : 'English'}… Speak one answer, then pause.`;
    };
    recognition.onresult = event => {
      if (active !== session || !input.isConnected) return;
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (!result.isFinal) {
          status.textContent = `Hearing: ${result[0].transcript}`;
          continue;
        }
        if (session.received.has(index)) continue;
        session.received.add(index);
        input.value = appendTranscript(input.value, result[0].transcript, language);
        session.heard = true;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        status.textContent = 'Text added to your answer. You can edit it.';
      }
    };
    recognition.onerror = event => {
      const messages = {
        'not-allowed': 'Microphone access was denied. Allow microphone access in the browser’s site settings to retry.',
        'service-not-allowed': 'This browser’s speech service is unavailable.',
        'audio-capture': 'No working microphone was found.',
        network: 'The speech service could not connect. Check your internet connection.',
        'language-not-supported': 'The speech service does not support this language.',
        'no-speech': 'No speech was detected. Try again and speak after Listening appears.',
        aborted: 'Dictation stopped.'
      };
      finish(session, `${messages[event.error] || 'Dictation could not finish.'} ${fallback}`);
    };
    recognition.onend = () => finish(session, session.heard ? 'Text added. Review and edit your answer before checking it.' : `No text was added. Try again. ${fallback}`);
    session.timer = setTimeout(() => {
      if (active !== session) return;
      cancel();
      status.textContent = 'Dictation timed out. Tap the microphone to try again.';
    }, 30000);
    try { recognition.start(); } catch {
      finish(session, `Dictation couldn’t start. ${fallback}`);
    }
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-dictation]');
    if (button) start(button);
  });
  root.addEventListener('input', event => {
    // Manual edits win over an in-flight transcript.
    if (event.isTrusted && active?.input === event.target) cancel();
  });
  root.addEventListener('visibilitychange', () => { if (root.hidden) cancel(); });
  window.addEventListener('pagehide', cancel);
  return { cancel };
}
