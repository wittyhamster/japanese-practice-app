# Production-readiness changes

This update is limited to stabilizing the existing Sensei application. It does not add features or redesign the interface.

## Unreleased

- Added a deterministic “Check Answers” completion flow that shows each response beside the lesson’s reference answer and explanation.
- Added `js/feedback.js` as a feedback-model boundary that can support a future AI feedback provider without changing the completion UI.

## Modified files

### `app.js`

- Reduced the entry point to application orchestration and event handling.
- Switched to reusable modules for lesson loading, state persistence, and rendering.
- Added a clipboard fallback so the existing copy action works when the modern Clipboard API is unavailable.
- Consolidated dynamic controls under delegated click and input handlers so re-rendered buttons continue to work reliably.
- Preserved the existing answer reset, favorite, review, hint, model-answer, theme, and progress behavior.

### `index.html`

- Changed `app.js` to an ES module so the separated JavaScript files work on GitHub Pages.
- Added an explicit loading state while `data/lesson-01.json` is being fetched.
- Added accessible state to the dark-mode button.
- Removed the reference to the nonexistent `manifest.json`, eliminating an unnecessary GitHub Pages request error.

### `styles.css`

- Added visible keyboard focus styling for links, buttons, and text areas.
- Added disabled-control styling for the lesson-load failure state.
- Added nonvisual positioning for the clipboard fallback element.
- Ensured the loading/error card spans the lesson grid and remains clean on desktop and mobile.
- Added a scroll offset for the Home anchor so the sticky header does not cover the welcome heading on mobile.

## New modules

### `js/lesson.js`

- Isolated lesson fetching from application startup.
- Checks the HTTP response before parsing.
- Validates the lesson structure and item IDs before rendering, producing a controlled error state for invalid data.

### `js/state.js`

- Isolated local-storage access and state mutations.
- Normalizes saved answers, favorites, reviewed words, and theme values.
- Recovers from malformed or unavailable local storage without stopping application startup.
- Persists all existing progress-related actions after each change.

### `js/view.js`

- Isolated lesson, practice, review, progress, theme, toast, and error rendering.
- Escapes lesson and saved-answer content before inserting it into generated markup.
- Adds accessible pressed/expanded states and question labels to existing controls.
- Handles zero-item progress safely.

### `CHANGES.md`

- Documents the complete production-readiness scope and the reason for every modified or added file before publication.

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
