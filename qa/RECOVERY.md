# IPA Keyboard emergency recovery — 2026-11-18 JST

## Preserved source and reproduction

- Production at start: `eaf758dd670a9cd0fd4563bbd94411915b232a52`.
- Its source tree is identical to `1cbba6bf4d9732cc55cbf2243dcfcad684b636f4`.
- Independent backup: `backup/emergency-recovery-20261118-eaf758d`.
- Existing `backup/pre-restore-20261118-0158` resolves to `a56ce4413ed1c9a0b5993a6ec56158adf16867d6`; not modified.
- Historical comparison and screenshots: https://github.com/esaKITs/ipa-keyboard/actions/runs/44134519394 .
- Both Chromium and WebKit reproduce the editor exception only at `1cbba6b`, not its immediate predecessor `174f768362684665f236fb47f35ac3bff76876c5`. The introduced lookup uses nonexistent `output` instead of `out`. Geometry initialization aborts, leaving the phone editor at y=110 instead of y=714 and covering the overview.
- `3dc0780da685d6f5ea2352bf1de844eb88fe761a` passes its original production smoke tests in both engines (390 and 1280 widths) when rerun in the recovery workflow. It is a verified stable core, but does not satisfy all current header requirements: its fullscreen iframe at (0,0), z-index 2147483646 covers the parent header. Its toolbar takes 90px at 393px width. The later icon-only toolbar still takes 65px.
- The restoration therefore retains the existing source, repairs the exact editor lookup, and changes the viewer integration; blindly reverting to the older core would retain the reproduced header defect and remove required features.

## Changes and boundaries

- `index.html`: correct editor lookup; keep one measured, viewport-compensated header above the expanded iframe; restore the header button icon/action/accessible label; constrain the floating editor below controls; send editor bounds so the overview can avoid it; preserve subtle warm inverse-mode feedback.
- `editor-gestures.js`: record the current input font when the user manually resizes width. The automatic text-size growth is then relative to that font, instead of being added a second time after manual resizing.
- `chart.html`: remove the embedded empty toolbar band and duplicate restore control; keep the independent overview launcher visible with state-based feedback; avoid editor bounds when placing the draggable overview. The standalone chart retains its own restore control.
- `qa/recovery.cjs`: operation, hit testing and geometry assertions at 320, 375, 393, 768 and 1280 widths in both engines, all five existing locales and both themes. Includes zoom in/out, pan, overview drag/close/reopen, selection/history, symbol insertion, editor font growth, manual size and drag, errors and assets.
- `qa/editor-gestures.cjs`: retain edge/corner drag, native touch resize, manual height, profile persistence and Unicode checks; replace the obsolete fixed-width-on-font-pinch assertion with the exact font-linked width formula.
- `qa/viewer-icons.cjs`, `qa/production.cjs`: replace obsolete duplicated restore and removed plus/slider assumptions with the current single restore and chart wheel behavior; existing fonts, cache upgrade, offline, symbol count, language and input checks remain.
- Recovery workflow compares historical commits before candidate regression; production workflow repeats recovery checks on the public URL after byte comparison.
- Version remains v83.34. Chart markup, symbols, chart typography/geometry, translations, fonts and licenses are unchanged. Protected chart markup/script section SHA-256: `cda8f31ee6a8f39ac59ef443e5bf3a9097ffe0ebd73f1721131cdaa691b059f6`.

## Test interpretation

Chromium touch gestures use native CDP touch injection. WebKit has no Playwright native multi-touch injection interface, so its existing touch handlers are exercised with synthetic TouchEvents; mouse drag, button activation and keyboard actions use Playwright input. This is browser-engine verification, not physical iPhone Safari testing. Screenshots and logs are retained by the linked GitHub Actions artifacts. Passing Actions alone is not treated as historical proof of visual correctness.
