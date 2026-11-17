# Final four-item acceptance — 2026-11-18 JST

Starting production and working revision: `392e33d46b6b61461c8b17ab1acf78208df53752`.
The working tree was clean; no third-party changes were found. New independent backup: `backup/final-four-20261118-392e33d`. Earlier backups are retained.

The application already contains all four requested implementations. The added acceptance suite changes no application source. Any newly observed failure must be reproduced and repaired on the working branch before publication.

| Item | Existing implementation and reproduced history | Additional acceptance |
| --- | --- | --- |
| 1. Overview / inverse feedback | `chart.html` overview toggle remains visible; `index.html` retains ◐. The original hidden-on-ON overview and solid inverse fill were repaired in the previous work. Dark colors compensate the existing invert/hue-rotate filter. | Native touchscreen taps in both engines; all four map/theme combinations; screenshot RGB sampling confirms actual purple/orange emission; no inactive shadow, colored active fill, or animation. |
| 2. One expand/restore control | `index.html` switches the same header SVG/action; `chart.html` suppresses its embedded duplicate. Previously reproduced duplicate restore controls were repaired. | Five consecutive touchscreen expand/restore cycles in each theme at every tested width; exact outward/inward SVG, accessible state, position restoration and absence of internal duplicate. |
| 3. Parent header | `index.html` measures and retains its real header above the expanded iframe. Previous fullscreen iframe at (0,0) covered it; the old toolbar consumed 65–90px. | Title, version, language and controls hit-tested in normal/expanded/restored states, after real chart scrolling and viewport changes; no gap or iframe overlay. Normal-page scroll-to-bottom/top is checked and actual scroll distance recorded (zero when the complete page fits). |
| 4. Phone controls / overview | `index.html` constrains the editor and reports its bounds; `chart.html` keeps overview controls separate and adjusts overview placement. Previous editor exception and overlap were repaired. | WebKit 320/375/393 plus Chromium and 768/1280; parent and child hit tests rule out transparent interception, all editor control bounds/nonoverlap checked, native taps close/reopen overview, drag uses Playwright mouse/pointer input, X stays at upper right, launcher position does not change with visibility. |

`qa/final-four.cjs` writes `qa-production/final-four-results.json`, screenshot RGB samples, per-item results, engine/viewport/cycle counts, unhandled JavaScript errors and failures. The file is retained in the Actions artifact. The existing 100-condition recovery suite, direct editor gestures/persistence, single restore icon, input, fonts, language, cache-upgrade and offline checks are retained without relaxation. Production repeats acceptance and regressions only after public asset byte comparison.

Physical iPhone Safari is not available. Playwright touchscreen taps are browser-engine input; overview drag uses mouse/pointer input. The existing WebKit multi-touch tests exercise its touch handlers with synthetic events, unlike Chromium CDP native touch injection. No physical iPhone test is claimed.
