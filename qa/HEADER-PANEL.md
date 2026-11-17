# Header overview slot and responsive panel controls

Starting verified production: `a389cb2c9f6cae3b00ef75a4795c8aa53bdb858b`. Preserved in `backup/before-header-overview-a389cb2`; earlier backups are untouched.

## Requested changes and causes

- The overview launcher had been absolutely positioned over the chart. The same real button is now mounted once into a fixed 34/36px slot between language selection and expand/restore, with its listener and state retained. The slot exists in initial HTML and remains when the button is hidden in normal view. The embedded chart toolbar no longer overlays the chart. Header insets are preserved between modes, eliminating the previous 7/10px header movement as well.
- To fit the reserved slot on narrow screens, the existing Language caption sits above its chooser. The title, version, chart fonts, symbols and translations remain intact. Portuguese retains its existing compact full-name display.
- A stored manual input height was always reapplied, even when too small for the new font. It is retained as a baseline while the panel grows to fit at least one complete glyph line within the available viewport. Manual resizing and saved preferences remain available.
- The old text-size slider selected eight phone or eleven desktop presets. It now follows the pointer with fine increments and applies the latest size once per animation frame, without a CSS animation that would lag behind the finger. During a range drag the track's position and width are held steady; automatic panel width growth resumes at release.
- The endpoint A / minus / plus labels were non-interactive spans. They are now buttons with larger hit areas and accessible names derived from the existing labels. A changes size by 1px; width endpoints change actual panel width by 10px; glow endpoints change intensity by 5%. Sliders remain available.

## Validation

`qa/baseline-panel.cjs` reproduces the old clipping and discrete ranges against the isolated a389cb2 snapshot. `qa/panel-controls.cjs` checks actual pointer drag, at least 16 distinct sizes, track drift under 1px, input-to-paint timings, saved small-height recovery, all endpoint taps, text/selection preservation and header fit in both engines at 320/375/393/768/1280px. Results are saved as `panel-controls-results.json` and screenshots in the Actions artifact.

The existing final-four suite now follows the same overview button in its parent header, verifies the reserved slot and exact button/slot geometry across visibility/mode switches, and retains color, five-cycle, language, theme, scroll/resize and overlay checks. Direct editor assertions require automatic height growth when a complete glyph line needs it, retaining all manual resize and persistence checks. Recovery, fonts, input, offline upgrade and public byte comparisons remain in the workflows. No test is removed or weakened.

Physical iPhone Safari is unavailable. Native browser taps and pointer/mouse drags are distinguished from the existing synthetic WebKit multi-touch handler tests.
