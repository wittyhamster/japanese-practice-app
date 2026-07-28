# Sensei changes

This document tracks the production changes made to the Sensei application.

## Unreleased

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

## Modified files

### `app.js`

- Uses one shared selection flow for initial loading, the library, previous/next buttons, URL history, and safe fallback behavior.
- Loads the curriculum manifest rather than a lesson-specific file, so future lessons require no application-code changes.
- Reduced the entry point to application orchestration and event handling.
- Switched to reusable modules for lesson loading, state persistence, and rendering.
- Added a clipboard fallback so the existing copy action works when the modern Clipboard API is unavailable.
- Consolidated dynamic controls under delegated click and input handlers so re-rendered buttons continue to work reliably.
- Preserved the existing answer reset, favorite, review, hint, model-answer, theme, and progress behavior.

### `index.html`

- Adds the accessible Lessons control, lesson-library panel, common-pitfall region, and previous/next navigation containers.
- Replaced the fixed four-question loading label with a neutral state until the active lesson supplies its question count.
- Changed `app.js` to an ES module so the separated JavaScript files work on GitHub Pages.
- Added an explicit loading state while `data/lesson-01.json` is being fetched.
- Added accessible state to the dark-mode button.
- Removed the reference to the nonexistent `manifest.json`, eliminating an unnecessary GitHub Pages request error.

### `styles.css`

- Styles the lesson library, completion/current states, pitfall note, and previous/next controls across light, dark, desktop, and mobile layouts.
- Added visible keyboard focus styling for links, buttons, and text areas.
- Added disabled-control styling for the lesson-load failure state.
- Added nonvisual positioning for the clipboard fallback element.
- Ensured the loading/error card spans the lesson grid and remains clean on desktop and mobile.
- Added a scroll offset for the Home anchor so the sticky header does not cover the welcome heading on mobile.

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
