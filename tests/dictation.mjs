import assert from 'node:assert/strict';
import { appendTranscript, createDictation } from '../js/dictation.js';
import { prefersKeyboardDictation, renderDictationControls } from '../js/dictation-ui.js';
assert.equal(prefersKeyboardDictation('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5), true);
assert.equal(prefersKeyboardDictation('Mozilla/5.0 (Macintosh)', 'MacIntel', 5), true);
assert.equal(prefersKeyboardDictation('Mozilla/5.0 (Macintosh)', 'MacIntel', 0), false);
assert.equal(prefersKeyboardDictation('Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0), false);
assert.equal(prefersKeyboardDictation('Mozilla/5.0 (Linux; Android)', 'Linux', 5), false);
assert.match(renderDictationControls('ja-JP', 1, true), /Focus Japanese answer/);
assert.match(renderDictationControls('en-US', 1, true), /English keyboard/);
assert.match(renderDictationControls('ja-JP', 1, true), /<details class="browser-dictation-option">/);
assert.doesNotMatch(renderDictationControls('en-US', 1, false), /<details|keyboard-dictation/);
assert.equal(appendTranscript('Hello', 'world', 'en-US'), 'Hello world');
assert.equal(appendTranscript('今日は', '暑いです。', 'ja-JP'), '今日は暑いです。');
assert.equal(appendTranscript('Keep this', ' ', 'en-US'), 'Keep this');
globalThis.window = { addEventListener() {} };
let instances = [];
class Recognition {
  constructor() { instances.push(this); }
  start() { this.onstart(); }
  stop() { this.stopped = true; }
  abort() { this.aborted = true; }
}
function fixture(Constructor) {
  const handlers = {};
  const root = { addEventListener(name, fn) { handlers[name] = fn; } };
  const controller = createDictation({ root, Recognition: Constructor });
  function field(language, value = '') {
    const status = { textContent: '' };
    const input = { value, isConnected: true, events: 0, dispatchEvent() { this.events++; }, focus() {} };
    const button = { textContent: 'Dictate', dataset: { dictation: language }, getAttribute: () => 'Dictate answer', setAttribute() {}, closest: () => ({ querySelector: selector => selector === 'textarea' ? input : status }) };
    return { button, input, status, click: () => handlers.click({ target: { closest: selector => selector === '[data-dictation]' ? button : null } }) };
  }
  return { field, controller, handlers };
}
const f = fixture(Recognition);
const english = f.field('en-US', 'My answer');
english.click();
let recognizer = instances.at(-1);
assert.equal(recognizer.lang, 'en-US');
const final = Object.assign([{ transcript: 'is spoken.' }], { isFinal: true });
recognizer.onresult({ resultIndex: 0, results: [final] });
recognizer.onresult({ resultIndex: 0, results: [final] });
assert.equal(english.input.value, 'My answer is spoken.');
assert.equal(english.input.events, 1);
const japanese = f.field('ja-JP');
japanese.click();
assert.equal(recognizer.stopped, true);
assert.equal(instances.length, 1, 'Do not overlap sessions while the first service is disconnecting');
recognizer.onresult({ resultIndex: 1, results: [final, final] });
assert.equal(english.input.events, 1, 'Late results must not change the old field');
recognizer.onend();
japanese.click();
recognizer = instances.at(-1);
assert.equal(recognizer.lang, 'ja-JP');
recognizer.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'さすがですね。' }], { isFinal: false })] });
assert.equal(japanese.input.value, '', 'Interim results are not saved');
recognizer.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'さすがですね。' }], { isFinal: true })] });
assert.equal(japanese.input.value, 'さすがですね。');
assert.equal(recognizer.stopped, true, 'Final transcript explicitly stops microphone');
f.handlers.input({ isTrusted: true, target: japanese.input });
recognizer.onend();
english.click();
instances.at(-1).onerror({ error: 'not-allowed' });
assert.match(english.status.textContent, /denied/);
instances.at(-1).onend();
english.click();
f.controller.cancel();
assert.equal(instances.at(-1).aborted, true);
instances.at(-1).onend();
// Repeat attempts in the same field; the browser resets result indexes to zero.
for (let attempt = 0; attempt < 3; attempt++) {
  japanese.click();
  const repeat = instances.at(-1);
  repeat.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'もう一度。' }], { isFinal: true })] });
  assert.equal(repeat.stopped, true);
  repeat.onend();
}
assert.equal(japanese.input.value, 'さすがですね。もう一度。もう一度。もう一度。');
english.click();
const endedSpeech = instances.at(-1);
endedSpeech.onspeechend();
assert.equal(endedSpeech.stopped, true);
endedSpeech.onend();
english.click();
const hung = instances.at(-1);
f.controller.cancel();
await new Promise(resolve => setTimeout(resolve, 2700));
japanese.click();
assert.notEqual(instances.at(-1), hung, 'Missing end event must not permanently lock controls');
f.controller.cancel();
instances.at(-1).onend();
const unavailable = fixture(null).field('en-US');
unavailable.click();
assert.match(unavailable.status.textContent, /keyboard/);
console.log('PASS: language routing, append preservation, final-result stop, asynchronous teardown, repeated attempts, late-event cancellation, permission errors, missing-end recovery, and unsupported fallback.');
