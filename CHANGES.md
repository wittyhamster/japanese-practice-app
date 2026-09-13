# Sensei changes

This document tracks the production changes made to the Sensei application.

## Unreleased

- Added lessons 21–30 to the lesson library (`lesson-21.json` through `lesson-30.json`) using the existing lesson schema and review architecture:
  - 21: まず
  - 22: そして
  - 23: それで
  - 24: それから
  - 25: さらに
  - 26: しかし
  - 27: だから
  - 28: そのため
  - 29: ただし
  - 30: やはり
- Added all new lesson files to `data/lessons.json` with the required `questionCount` and `productionQuestionCount` metadata so no application code changes were required.
- No code-path changes were made in the app modules; this batch is curriculum expansion only and keeps existing lesson and review behavior unchanged.

- Fixed JSON field errors in new production prompts before validation (removed malformed separators in lesson 27/29 entries).

- Added `data/lesson-10.json` for the new **どうせ** lesson with translation and production practice, and updated `data/lessons.json` to make it the active lesson.
- Added Lesson 9 (`data/lesson-09.json`) for **結局** with Japanese → English practice, English → Japanese production prompts, helpful vocabulary, and multiple natural reference answers.
- Updated `data/lessons.json` to add Lesson 9 (`core-expression-kekkyoku`) and make it the active lesson.
- Kept the existing lesson architecture and feature behavior unchanged (progress, favorites, reviewed state, AI review, dark mode, mobile/desktop layout, and module-driven loading).

- Added a responsive, manifest-driven lesson library with accessible open/close behavior, current/completed status text, and immediate lesson switching.
- Added previous/next controls, bookmarkable lesson URLs, browser history support, safe invalid-ID fallbacks, and last-viewed lesson persistence.
- Added optional common-pitfall cards and lesson-specific notes for Lessons 2–4 while leaving Lesson 1 without an empty placeholder.
- Added manifest metadata for library labels and completion calculation without fetching every lesson file.
- Added a lesson manifest as the curriculum source of truth, so changing or adding the active lesson no longer requires editing application code.
- Added Lesson 3, “Understanding 別に,” as the active lesson while preserving Lessons 1 and 2 and their saved progress.
- Removed the remaining fixed question-count loading text and made lesson selection fully data-driven.
- Added Lesson 2, “Understanding 一応,” and made it the currently displayed lesson while retaining Lesson 1.
- Moved the visible lesson title and subtitle to JSON-driven rendering and removed wording that assumed every lesson contained four expressions.
- Namespaced answers, favorites, and reviewed state by lesson, including migration of existing Lesson 1 data.
- Added a deterministic “Check Answers” completion flow that shows each response beside the lesson’s reference answer and explanation.
- Added `js/feedback.js` as a feedback-model boundary that can support a future AI feedback provider without changing the completion UI.
- Improved the **Review with AI** flow to make the copy-and-paste handoff explicit when opening ChatGPT does not auto-fill.
- Disabled automatic popup opening in the AI review flow so the app always shows a reliable manual-paste handoff in popup-restricted environments.

## Modified files

### `app.js`

- Uses one shared selection flow for initial loading, the library, previous/next buttons, URL history, and safe fallback behavior.
- Loads the curriculum manifest rather than a lesson-specific file, so future lessons require no application-code changes.
- Reduced the entry point to application orchestration and event handling.
- Switched to reusable modules for lesson loading, state persistence, and rendering.
- Added a clipboard fallback so the existing copy action works when the modern Clipboard API is unavailable.
- Consolidated dynamic controls under delegated click and input handlers so re-rendered buttons continue to work reliably.
- Preserved the existing answer reset, favorite, review, hint, model-answer, theme, and progress behavior.
- Improved the AI-review handoff with explicit success/failure messaging and a visible prompt panel for manual paste.
- Removed automatic ChatGPT popup attempts from `Review with AI` to keep the workflow predictable in restricted environments.

### `index.html`

- Adds the accessible Lessons control, lesson-library panel, common-pitfall region, and previous/next navigation containers.
- Replaced the fixed four-question loading label with a neutral state until the active lesson supplies its question count.
- Changed `app.js` to an ES module so the separated JavaScript files work on GitHub Pages.
- Added an explicit loading state while `data/lesson-01.json` is being fetched.
- Added accessible state to the dark-mode button.
- Removed the reference to the nonexistent `manifest.json`, eliminating an unnecessary GitHub Pages request error.
- Added an in-page AI-review status panel so users can confirm the review prompt was copied and paste it into ChatGPT.

### `styles.css`

- Styles the lesson library, completion/current states, pitfall note, and previous/next controls across light, dark, desktop, and mobile layouts.
- Added visible keyboard focus styling for links, buttons, and text areas.
- Added disabled-control styling for the lesson-load failure state.
- Added nonvisual positioning for the clipboard fallback element.
- Ensured the loading/error card spans the lesson grid and remains clean on desktop and mobile.
- Added a scroll offset for the Home anchor so the sticky header does not cover the welcome heading on mobile.
- Added AI review action panel styling (status message, collapsible prompt preview, and mobile-safe formatting) so users can clearly paste into ChatGPT even when popup behavior differs.

## New modules

### `js/lesson.js`

- Validates the expanded manifest metadata and optional `commonPitfall` schema, and loads any selected manifest lesson.
- Loads and validates `data/lessons.json`, resolves its active lesson, and then validates and loads that lesson’s JSON file.
- Isolated lesson fetching from application startup.
- Checks the HTTP response before parsing.
- Validates the lesson structure and item IDs before rendering, producing a controlled error state for invalid data.

### `js/state.js`

- Persists the last-viewed manifest lesson and derives per-lesson completion from existing namespaced answers without changing saved lesson IDs.
- Isolated local-storage access and state mutations.
- Normalizes saved answers, favorites, reviewed words, and theme values.
- Recovers from malformed or unavailable local storage without stopping application startup.
- Persists all existing progress-related actions after each change.

### `js/view.js`

- Renders the dynamic lesson library, completion indicators, common-pitfall note, and calculated previous/next navigation.
- Isolated lesson, practice, review, progress, theme, toast, and error rendering.
- Escapes lesson and saved-answer content before inserting it into generated markup.
- Adds accessible pressed/expanded states and question labels to existing controls.
- Handles zero-item progress safely.

### `CHANGES.md`

- Documents the complete production-readiness scope and the reason for every modified or added file before publication.

## Curriculum data

### `data/lessons.json`

- Adds expression, content ID, and question-count metadata for all lessons so the library and completion states need no lesson-specific code.
- Defines every available lesson and the default active lesson, making the curriculum extensible without JavaScript edits.

### `data/lesson-03.json`

- Adds the lesson’s optional common-pitfall guidance without changing its questions or reference answers.
- Adds the complete “Understanding 別に” lesson content, including its expression, nuance, example, four practice questions, hints, and reference answers.

### `data/lesson-02.json`

- Adds the optional common-pitfall guidance for 一応 without changing existing exercises.

### `data/lesson-04.json`

- Adds the optional common-pitfall guidance for 全然 without changing existing exercises.

## Verification completed

- JavaScript syntax checks passed for the entry point and all modules.
- `data/lesson-01.json` parsed successfully.
- Git diff integrity checks passed.
- Lesson loading produced four keyword cards and four practice cards.
- Dark mode, favorites, review toggles, hints, model answers, copy, and reset were exercised in a browser.
- Progress, answers, favorites, reviewed words, and theme were verified after refresh.
- Browser console contained no errors.
- Mobile verification at 390 px showed no horizontal overflow and usable full-width practice controls.
- Fixed and retested a mobile Home-anchor issue that initially placed the welcome heading beneath the sticky header.
- Desktop verification at 1440 px showed a centered 980 px content area, two-column lesson grid, and no horizontal overflow.
- GitHub Pages-style loading was verified at `/japanese-practice-app/` with all JavaScript modules and lesson data resolving correctly.
# Sprint: Add むしろ lesson and production practice

- `data/lesson-05.json` — Added the Day 8 むしろ lesson, pitfall guidance, recognition questions, and production prompts.
- `data/lessons.json` — Added Lesson 5 metadata and made it active, including its production-question count.
- `index.html` — Added the optional English → Japanese production section.
- `app.js` — Added production-answer input handling and included both practice directions in copied prompts.
- `js/lesson.js` — Validated optional production-question data and manifest counts.
- `js/state.js` — Persisted production answers independently and included them in reset/completion behavior.
- `js/view.js` — Rendered production prompts/hints, progress, completion review, and lesson-library completion state.
- `js/feedback.js` — Added production reference-answer feedback items.
# Follow-up: Revise Lesson 5 production prompts

- `data/lesson-05.json` — Replaced mirrored English → Japanese prompts with new vocabulary, situations, and reference answers that test transfer of むしろ.

# Add Lesson 6 and flexible production references

- `data/lesson-06.json` — Added the Day 9 やっと lesson with pitfall guidance, recognition practice, and multiple natural production references.
- `data/lessons.json` — Added Lesson 6 and made it active.
- `js/lesson.js` — Validated both legacy `sampleAnswer` and new `referenceAnswers` production formats.
- `js/feedback.js` — Normalized production feedback to a list of reference answers with notes.
- `js/view.js` — Displays possible natural answers, levels, and explanations in production review.
- `index.html` — Renamed the home-page lesson link to “Start lesson” to reflect that it jumps to the current lesson rather than advancing the curriculum.
- `js/lesson.js` — Corrected production-reference validation so reference objects do not need unrelated IDs.

# Production Practice v2

- `index.html` — Added the Review with AI action.
- `app.js` — Builds and copies a structured AI review prompt containing user responses only.
- `js/lesson.js` — Validates optional helpful vocabulary entries.
- `js/view.js` — Renders collapsible vocabulary tables beneath production prompts.
- `styles.css` — Added compact responsive table styling for vocabulary hints.

# Streamline AI review and improve Production Practice

- `index.html` — Replaced the duplicate copy action with the primary Review with AI workflow.
- `app.js` — Separated AI-review request construction from clipboard/browser delivery and opens ChatGPT after copying the learner-only review prompt.
- `data/lesson-06.json` — Added optional helpful vocabulary to each production prompt.
- `js/view.js` — Keeps the existing multiple-answer review presentation and optional vocabulary rendering.

# Add Lesson 7: せっかく

- `data/lesson-07.json` — Added the Day 10 せっかく lesson with learning content, pitfall guidance, translation practice, vocabulary hints, and multiple production references.
- `data/lessons.json` — Added Lesson 7 to the curriculum manifest and made it the active lesson.

# Real day streak and API-backed AI review

- `js/state.js` — Added a real `streak` field (`count` + `lastActiveDate`) to app state, normalized on load. Added `recordActivity()`, which increments the streak once per calendar day when the learner does something that counts as practice, and resets it to 1 after a missed day. Added `getStreak()`. Wired `recordActivity()` into `setAnswer`, `setProductionAnswer`, and `toggleReviewed` — starring a favorite does not count as practice, on purpose.
- `js/ai.js` (new) — Calls the Anthropic Messages API directly from the browser using a learner-supplied API key (bring-your-own-key pattern), via the `anthropic-dangerous-direct-browser-access` CORS header. The key lives only in the browser's `localStorage`, never in the repo. Exposes `getApiKey`, `setApiKey`, `requestAIReview`.
- `app.js` — Removed the clipboard-copy-and-open-ChatGPT flow. `Review with AI` now calls `js/ai.js` directly and renders the model's feedback inline. Prompts for an API key on first use (or after a rejected key) via `promptForApiKey()`. Added `manageApiKey()` behind a new "🔑 API key" button to update or clear the stored key. Clears any AI review panel when switching lessons or resetting answers. Renders the streak on every full render and after each answer keystroke.
- `js/view.js` — Added `renderStreak()`. Added `renderAIReviewPending()`, `renderAIReviewResult()`, and `renderAIReviewError()` to show inline loading/result/error states, plus `clearAIReview()` to reset the panel. Reused the existing `.completion-results` styling, so no new CSS was needed.
- `index.html` — Added the `#aiReviewResults` panel and the `🔑 API key` button. Changed the streak's static fallback text from `1` to `0` to match a learner who hasn't practiced yet.

## Verification completed

- `node --check` passed for `app.js`, `js/state.js`, `js/view.js`, and `js/ai.js`.
- Streak logic was exercised with a mocked `localStorage` and a mocked `Date`: first activity on a day sets the streak to 1; further activity the same day does not double-count; activity the next calendar day increments it; a skipped day resets it to 1; starring a favorite alone does not move it; and the value persists correctly to a fresh store instance reading the same storage.
- The AI-review request/response cycle was exercised with a mocked `fetch`: confirmed the request URL, headers (`x-api-key`, `anthropic-version`, `anthropic-dangerous-direct-browser-access`), and body shape; confirmed a successful text response is extracted correctly; confirmed a rejected (401) key surfaces its status and message; confirmed an empty response is treated as an error rather than shown as blank feedback.

# Pause API-backed AI review to avoid usage charges

While refining the app further, paused the paid API-backed AI review to guarantee zero Anthropic API spend, without losing the work already done.

- `app.js` — Removed the `js/ai.js` import and the API-key prompt/manage/`runAIReview` flow. Restored `copyToClipboard()` and `deliverAIReview()`, so `Review with AI` once again copies the review prompt and opens ChatGPT in a new tab — free, no API key required. The day-streak fix from the previous change is untouched.
- `index.html` — Removed the `🔑 API key` button and the now-unused `#aiReviewResults` panel.
- `js/view.js` — Removed `renderAIReviewPending()`, `renderAIReviewError()`, `renderAIReviewResult()`, and `clearAIReview()`, since nothing calls them anymore.
- `js/ai.js` — Left in place, untouched, and unused. It is not imported by anything, so it cannot run or cause any charge. Re-enabling the API-backed review later only requires re-adding the import, the button, and the click-handler branch that were removed here — the request/response logic itself does not need to change.

## Verification completed

- `node --check` passed for `app.js` and `js/view.js`.
- Confirmed by search that neither `app.js`, `js/view.js`, nor `index.html` reference `aiReviewResults`, `manageApiKey`, `js/ai.js`, `runAIReview`, or any `renderAIReview*` function.

# Add Lesson 8: さすが

- `data/lesson-08.json` — Added the さすが lesson with learning content, pitfall guidance, practice, optional vocabulary hints, and multiple natural production references.
- `data/lessons.json` — Added Lesson 8 to the curriculum manifest and made it the active lesson.

# Production practice answer-review access

- `index.html` — Added a Check Answers control at the end of English → Japanese production practice.
- `app.js` — Routed both practice-section controls through the same complete lesson-review action.
- `js/view.js` — Keeps both controls' expanded/disabled states synchronized.

# Inline production reference answers

- `js/view.js` — Added per-question “Show possible answers” controls for English → Japanese practice, supporting both multiple `referenceAnswers` and legacy `sampleAnswer` data.

# Add recognition phase to Lesson 8 (Sprint: Next-Phase Practice)

- `data/lesson-08.json` — Added `recognitionQuestions` for short contextual interpretation checks in the first recognition-enabled lesson.
- `data/lessons.json` — Added `recognitionQuestionCount` for Lesson 8 so completion and library status include recognition progress.
- `js/state.js` — Added `recognitionAnswers` persistence and completion accounting for recognition questions.
- `js/feedback.js` — Added recognition review items with expected answer index, user answer text, and explanatory notes.
- `js/lesson.js` — Added schema validation for optional `recognitionQuestions` and optional `recognitionQuestionCount` in the manifest.
- `js/view.js` — Added a new optional recognition section with radio-choice questions, goal/progress tracking, completion review, and hidden-by-default behavior when absent.
- `app.js` — Routed recognition answer input and check-button flow into existing review and progress paths.
- `index.html` — Added the Recognition practice section and check action in the lesson page flow.
- `styles.css` — Added compact, mobile-friendly styling for recognition options and completion blocks.

# Usability pass — 2026-09-12

- `index.html` — Added dedicated feedback containers for production and recognition, phase shortcuts, a save-status message, and an end-of-lesson summary. Moved the AI handoff to the end, clarified Saved items, and added inline reset confirmation.
- `app.js` — Wired section-local review invalidation, next-lesson completion actions, jumps to unanswered questions, save status, and safe reset confirmation. Added an explicit ChatGPT link and protected clipboard fallback cleanup. Fixed anchor navigation incorrectly reloading the lesson through popstate. Standardized displayed lesson numbers without migrating lesson data.
- `js/progress.js` — Added a reusable progress calculation that counts current question IDs, identifies missing answers, validates recognition selections, and treats completion as participation.
- `js/view.js` — Added phase counts, optional reviewed-word labeling, contextual resume links, completion summaries, named next-lesson buttons, and saving messages. Separated review panels and renamed production help to Sentence hint and Vocabulary. Standardized library lesson numbering.
- `js/state.js` — Added save-status notifications, including failure and recovery, while preserving the existing storage format and in-memory answers.
- `styles.css` — Added responsive sticky phase shortcuts, summary/reset/save styles, full-width single-expression cards, larger small-button hit areas, vocabulary wrapping, reduced-motion support, and improved primary-button contrast.
- `data/lesson-08.json` — Repaired the mixed cooking/English recognition scenario and the ambiguous speech scenario; clarified English explanations. Kept question IDs and correct-option indexes stable so saved responses remain compatible.
- `tests/usability.mjs` — Added regression checks for all ten lesson files, reference formats, progress boundaries, stale IDs, answer persistence, lesson isolation, reset preservation, and storage failure/recovery.
- `QA_REPORT.md` — Recorded the manual and automated checks, their outcomes, and test limits.
- `qa/screenshots/desktop-lesson.png`, `qa/screenshots/mobile-review.png`, `qa/screenshots/mobile-completion.png` — Added local QA captures of the major updated screens using test answers only.

The previously committed boundary-navigation fix (`aefc08e`) was already present locally before this sprint; it is preserved and will publish with this update. No lessons were added or removed.

# English and Japanese dictation — 2026-09-12

## iPhone keyboard-first guidance

- `js/dictation-ui.js` — Reusable Apple-mobile detection and language-specific keyboard guidance, with browser dictation in a closed optional disclosure. Desktop/Android retain their existing microphone controls.
- `js/view.js` — Selects the appropriate dictation presentation and help text for the device.
- `js/dictation.js` — Focuses the matching answer field from the keyboard-help button and cancels browser dictation when its disclosure closes.
- `styles.css` — Styles keyboard instructions and the optional browser-dictation disclosure.
- `tests/dictation.mjs` — Adds iPhone, desktop-mode iPad, Mac, Windows, and Android detection/presentation assertions.
- `tests/dictation-preview.html` — Read-only fixture to inspect the Apple-mobile presentation without activating speech recognition.
- `qa/screenshots/iphone-keyboard-guidance.png` — Captures the guidance fixture at phone width.
- `QA_REPORT.md` — Records guidance and regression verification, without claiming physical-iPhone testing.

## Repeat-dictation follow-up

- `js/dictation.js` — Explicitly stops recognition after speech ends or a final transcript arrives. Keeps the session occupied until the browser disconnects, prevents overlapping starts, ignores discarded late results, and recovers controls when an end event never arrives. Provides recovery instructions when Listening produces no completed transcript.
- `tests/dictation.mjs` — Uses asynchronous stop/abort simulations instead of immediate end events, covers three consecutive Japanese attempts, prevents overlapping sessions, and tests missing-end-event recovery.
- `QA_REPORT.md` — Records the repeat-session test evidence and physical-iPhone limitation.

- `js/dictation.js` — Added reusable browser speech recognition with language routing, final-text append, deduplication, editable transcripts, stop/cancel controls, timeout, permission/network messages, and keyboard-dictation fallback. Cancels stale sessions on manual edits, lesson rerenders, navigation, and hidden pages.
- `app.js` — Initializes dictation and cancels recording before lesson changes or rerenders; dictated input uses existing persistence/progress handling.
- `js/view.js` — Adds English microphone controls to translation fields and Japanese controls to production fields, with accessible listening status.
- `index.html` — Explains dictation, microphone permission, and browser speech-service processing.
- `styles.css` — Adds responsive dictation controls and listening/help text.
- `tests/dictation.mjs` — Simulates recognition events to test English/Japanese routing, preserved text, interim/final handling, duplicate and stale events, manual-edit cancellation, errors, and unsupported browsers.
- `QA_REPORT.md` — Adds dictation checks and the explicit limitation that real speech accuracy and physical mobile microphones are not yet tested.
- `qa/screenshots/mobile-dictation.png` — Captures the Japanese microphone control at phone width using local test answers.
