import assert from 'node:assert/strict';
import { appendTranscript, createDictation } from '../js/dictation.js';
assert.equal(appendTranscript('Hello', 'world', 'en-US'), 'Hello world');
assert.equal(appendTranscript('今日は', '暑いです。', 'ja-JP'), '今日は暑いです。');
assert.equal(appendTranscript('Keep this', ' ', 'en-US'), 'Keep this');
globalThis.window = { addEventListener() {} };
let instances = [];
class Recognition {
  constructor() { instances.push(this); }
  start() { this.onstart(); }
  stop() { this.onend(); }
  abort() { this.aborted = true; this.onend(); }
}
function fixture(Constructor) {
  const handlers = {};
  const root = { addEventListener(name, fn) { handlers[name] = fn; } };
  const controller = createDictation({ root, Recognition: Constructor });
  function field(language, value = '') {
    const status = { textContent: '' };
    const input = { value, isConnected: true, events: 0, dispatchEvent() { this.events++; }, focus() {} };
    const button = { textContent: 'Dictate', dataset: { dictation: language }, getAttribute: () => 'Dictate answer', setAttribute() {}, closest: () => ({ querySelector: selector => selector === 'textarea' ? input : status }) };
    return { button, input, status, click: () => handlers.click({ target: { closest: () => button } }) };
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
assert.equal(recognizer.aborted, true);
recognizer.onresult({ resultIndex: 1, results: [final, final] });
assert.equal(english.input.events, 1, 'Late results must not change the old field');
recognizer = instances.at(-1);
assert.equal(recognizer.lang, 'ja-JP');
recognizer.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'さすがですね。' }], { isFinal: false })] });
assert.equal(japanese.input.value, '', 'Interim results are not saved');
recognizer.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'さすがですね。' }], { isFinal: true })] });
assert.equal(japanese.input.value, 'さすがですね。');
f.handlers.input({ isTrusted: true, target: japanese.input });
assert.equal(recognizer.aborted, true);
english.click();
instances.at(-1).onerror({ error: 'not-allowed' });
assert.match(english.status.textContent, /denied/);
english.click();
f.controller.cancel();
assert.equal(instances.at(-1).aborted, true);
const unavailable = fixture(null).field('en-US');
unavailable.click();
assert.match(unavailable.status.textContent, /keyboard/);
console.log('PASS: language routing, append preservation, deduplication, interim/final results, late-event cancellation, manual editing, permission errors, and unsupported fallback.');
