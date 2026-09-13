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
    clearTimeout(session.endTimer);
    session.button.textContent = session.label;
    session.button.setAttribute('aria-label', session.accessibleLabel);
    session.button.setAttribute('aria-pressed', 'false');
    session.status.textContent = message;
    active = null;
  }

  function stopSession(session, discard = false, message) {
    if (active !== session) return;
    if (message) session.message = message;
    if (discard) session.discard = true;
    if (session.stopping) return;
    session.stopping = true;
    clearTimeout(session.timer);
    session.button.textContent = 'Finishing dictation…';
    session.button.setAttribute('aria-label', 'Finishing dictation');
    session.status.textContent = message || 'Finishing this recording…';
    // stop/abort are asynchronous: do not open another microphone session
    // until the browser reports disconnection through onend.
    session.endTimer = setTimeout(() => {
      if (active !== session) return;
      session.discard = true;
      try { session.recognition.abort(); } catch { /* Browser already disconnected. */ }
      finish(session, session.message || 'The speech service did not finish. Try again; if it still stalls, reload the page or use keyboard dictation. Your saved answers are kept.');
    }, 2500);
    try { discard ? session.recognition.abort() : session.recognition.stop(); } catch {
      finish(session, session.message || `Dictation stopped. ${fallback}`);
    }
  }

  function cancel() {
    if (active) stopSession(active, true, 'Dictation stopped. You can edit your answer.');
  }

  function start(button) {
    if (active?.button === button) {
      stopSession(active);
      return;
    }
    if (active) {
      cancel();
      if (active) {
        button.closest('.question-card').querySelector('.dictation-status').textContent = 'The previous recording is finishing. Tap this microphone again in a moment.';
        return;
      }
    }
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
      if (active === session && !session.stopping) status.textContent = `Listening in ${language === 'ja-JP' ? 'Japanese' : 'English'}… Speak one answer, then pause.`;
    };
    recognition.onspeechend = () => stopSession(session);
    recognition.onresult = event => {
      if (active !== session || session.discard || !input.isConnected) return;
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
      // Some mobile implementations deliver a final result without promptly
      // ending the session. Explicitly stop so the next tap starts fresh.
      if (session.heard) stopSession(session);
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
      if (active !== session || session.discard) return;
      stopSession(session, true, `${messages[event.error] || 'Dictation could not finish.'} ${fallback}`);
    };
    recognition.onend = () => finish(session, session.message || (session.heard ? 'Text added. Tap the microphone to dictate again, or edit your answer.' : `No text was added. Try again. ${fallback}`));
    session.timer = setTimeout(() => {
      if (active !== session) return;
      stopSession(session, true, 'No completed transcript arrived. Try again. If Listening still produces no text, reload the page or use your keyboard’s microphone. Your saved answers are kept.');
    }, 30000);
    try { recognition.start(); } catch {
      finish(session, `Dictation couldn’t start. ${fallback}`);
    }
  }

  root.addEventListener('click', event => {
    const keyboardButton = event.target.closest('[data-keyboard-dictation]');
    if (keyboardButton) {
      cancel();
      keyboardButton.closest('.question-card').querySelector('textarea').focus();
      return;
    }
    const button = event.target.closest('[data-dictation]');
    if (button) start(button);
  });
  root.addEventListener('toggle', event => {
    if (event.target.matches?.('.browser-dictation-option') && !event.target.open
      && active && event.target.contains(active.button)) cancel();
  }, true);
  root.addEventListener('input', event => {
    // Manual edits win over an in-flight transcript.
    if (event.isTrusted && active?.input === event.target) cancel();
  });
  root.addEventListener('visibilitychange', () => { if (root.hidden) cancel(); });
  window.addEventListener('pagehide', cancel);
  return { cancel };
}
