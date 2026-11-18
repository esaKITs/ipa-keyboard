# Header control alignment and stronger overview state

Starting main: `67f3a5d080b87a562456cd83cf47f49dc81c097c`. Independently preserved in `backup/before-header-alignment-20261119-67f3a5d`. Work branch: `work/header-alignment-20261119`.

The selected-language control was displaced by the mobile caption's 9px top padding; its caption-plus-control wrapper was centered beside the other buttons. Native language controls were 34px high, overview slots became 34px on phones, while expand/restore remained 36px at 375/393px. The overview SVG also had separate size/padding declarations. The fix gives the actual controls a common 36px row and places the Language caption independently above it, with enough header padding to keep the caption visible even when expanded. Both icon boxes are 36px, their SVGs 20px with 7px padding and the existing 1.8 stroke, and corners 7px. The reserved overview slot remains in normal view; no state-dependent layout changes are introduced.

Overview ON uses the same purple/orange hues with a near-edge glow plus the outer halo. OFF has no glow and keeps its place. No fill, blink or animation is added. The inverse button's glow is unchanged. Only header CSS in index.html changes in the application; charts, editor logic, translations, fonts and version remain unchanged.

`qa/header-alignment.cjs` checks both browsers at 320/375/393/768/1280px, four languages, both themes and normal/expanded/restored states. It measures shared control top/bottom/center, 36px boxes, centered 20px icons, caption bounds, Portuguese full-label fit and hit targets. It checks zero geometry movement between modes. A rendered screenshot comparison with the actual previous glow and no-glow controls requires the new halo magnitude to exceed the old one by 1.5 times plus 1 RGB unit, and independently checks its hue, OFF state and fixed launcher position. Existing regression tests and thresholds are retained. The original cold slider performance test still runs first, before any new header tests.

Physical iPhone Safari is not available. Browser screenshots and numerical geometry checks do not claim physical-device coverage.
