# IPA Keyboard v83.23

v83.21 removes the 700px minimum frame height so the footer follows the license at the chart's actual scale. v83.20 is saved as branch backup/production-v83.20-20261116.

v83.22 puts the app name, version, language picker and enlarged-view icon on one row; chart reference metadata moves to the source notes. v83.21 is saved as backup/production-v83.21-20261116.

v83.23 replaces the rectangular symbol preview with a smooth key-preview silhouette and native dark colours. Preview placement precedes glow animation and avoids measuring a newly displayed element. v83.22 is saved as backup/production-v83.22-20261116.

Stable public URL: https://esakits.github.io/ipa-keyboard/

Promoted from esaKITs/ipa-keyboard-test, commit d388af1d2d89b299a119e7219eec69ad88ef6ae4, folder keyboard-v83-20/.

The production copy uses ./fonts/ at the repository root, displays the version without the test caption, and updates the legacy cache-first service worker. App functions and translations are inherited from the tested version.

Before promotion, the complete previous production commit 1806012fc168040676af61c297d97dfbfac96f28 was saved as branch backup/production-before-v83.20-20261116. Historical preview folders remain in the production repository. Test releases remain in the test repository.

The release branch runs the full Chromium/WebKit suite at /ipa-keyboard/ before main changes. On main, GitHub Pages publishes the root and the production workflow checks the deployed files and browser input. The cache upgrade test starts with the legacy worker and a cached old page, then verifies the new page, offline input, and preservation of unrelated caches.

To update translations, edit translations.xlsx and regenerate translations.csv as described in README-translations.md. The two historical audit sheets are retained.
