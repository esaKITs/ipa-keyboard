# 第1〜4弾の本番反映と公開検証

2026年11月26日開始の置き換え作業。依頼者の「じゃ、置き換えをお願い」「続けて」に基づき実施した。第5弾の共有・保存機能は対象外。

## 反映状態

- 本番URLは https://esakits.github.io/ipa-keyboard/ 。
- 表示バージョンはv83.34。公開コミットは `7a96b1917818b0c7ca8d23cd9868fc85f7a242d2`。
- 開始時のmainは `1646b6c148f5be0b0f420490b96515fc5839470f`。
- 直前バックアップは `backup/before-production-replacement-20261126`。開始時のmainと一致することを確認した。
- アプリの承認済み実装は `34b79b411654fc866b8faee61e00eb393b795485`。README等を含む公開前候補は `93c232ded550b35962bc8846e035fae385a78c2b`。
- 公開後に既存ブラウザで確認したHTTPキャッシュの残存に対し、`sw.js` の取得ポリシーを修正した。入力・チャート・タイトルの実装は承認済み候補と同一。
- mainの更新は期待する旧SHAを指定し、強制更新を使わず実施した。

## 変更内容・比較

| 対象 | 置き換え前からの変更 |
| --- | --- |
| `index.html` | Designed for Touchの追加、ドラッグ中のネイティブ灰色ハイライトの抑制、操作中ウィンドウの前面化 |
| `chart.html` | 第1弾のチャート・マップの表示範囲と端の欠けの改善、第2弾の公式PDF座標に基づく母音図形と記号の視覚的なサイズ調整、マップの手動配置と重ね合わせ |
| `editor-gestures.js` | パネルのサイズ変更と文字サイズの独立、文字サイズ変更への追従 |
| `sw.js` | オフライン資産の更新時はHTTPキャッシュを再取得し、通常のネットワーク取得でもHTTPキャッシュを再確認 |
| `README.md`／`README.ja.md` | 承認済み日英READMEを追加。確認用原稿の注記を公開版の説明へ変更し、認証が必要な確認用サイトへの導線を削除 |
| `docs/screenshots/*` | 承認済み候補から取得したPC・スマートフォン幅の画像を掲載 |
| `qa/*`／`.github/workflows/*` | 各段階の検証、公式PDF座標の証拠、公開検証とキャッシュ更新検証を整備 |

SEOのmeta・title・link・JSON-LDは開始時の本番と一致することを確認した。既存のフォント、依存ライブラリ、翻訳データ、権利表記、ライセンスは変更していない。第5弾の提案ファイル・機能は本番ブランチに含めていない。

### 変更ファイル一覧

```
.github/workflows/cache-refresh.yml
.github/workflows/floating-fix.yml
.github/workflows/phase1-display.yml
.github/workflows/phase2-chart.yml
.github/workflows/phase3-title.yml
.github/workflows/release-production.yml
README.ja.md
README.md
chart.html
docs/screenshots/desktop-light.png
docs/screenshots/mobile-overview.png
editor-gestures.js
index.html
qa/PHASE4_DOCUMENTATION_20261126.md
qa/cache-refresh.cjs
qa/desktop-zoom.cjs
qa/editor-gestures.cjs
qa/extract-official-vowels.py
qa/fixtures/network-first-v83.34-sw.js
qa/fixtures/official-vowels-2026.json
qa/floating-crossing.cjs
qa/floating-overview.cjs
qa/measure-optical-scale.py
qa/panel-controls.cjs
qa/phase1-display.cjs
qa/phase2-chart.cjs
qa/phase3-title.cjs
qa/recovery.cjs
qa/server.py
qa/suprasegmental-grouping.cjs
sw.js
```

## 検証の経緯と結果

### 公開前の最終検証

[Actions 45815733861](https://github.com/esaKITs/ipa-keyboard/actions/runs/45815733861) のverifyジョブは成功。

- Chromium・WebKit、320／375／393／768／1280px。
- 日本語・英語・ブラジルポルトガル語・ペルシア語・大阪弁、白背景・黒背景。
- 第1弾の3項目、ウィンドウをまたぐ移動、入力パネルの操作性、100シナリオの回帰、母音図形の承認済み候補との一致と公式PDF座標の検証、タイトル、既存入力・オフライン更新を実行。
- 以前の検証に残っていた旧仕様の期待値を更新した。タイトルは名称とサブタイトルを別々に検証し、母音の参照先は承認済み候補へ変更。手動配置済みマップは入力パネルから自動退避する前提をやめ、配置を保持することを検証した。
- 最初の実行 [45814388346](https://github.com/esaKITs/ipa-keyboard/actions/runs/45814388346) は、旧仕様の自動退避の期待値で失敗した。期待値を直した上記の実行で成功した。アプリを旧仕様に戻して成功させたものではない。

### 公開後に確認したキャッシュ問題

最初の公開コミット `93c232d` のファイル自体は公開サーバー上で一致したが、先に開いていたChromeでは新しいHTMLと古いチャートが混在した。DOM上ではサブタイトルが存在する一方、公式PDF由来の11個の点と手動重ね合わせの処理がなく、旧チャートであることを確認した。

公開資産の応答は `Cache-Control: max-age=600`。従来のネットワーク優先Service Workerも、通常の `fetch(request)` ではブラウザのHTTPキャッシュを利用できた。`sw.js` のインストール時のCORE取得を `Request(...,{cache:'reload'})` にし、通常取得を `fetch(request,{cache:'no-cache'})` に変更した。オフライン時は従来通りCache Storageへフォールバックする。表示バージョンやキャッシュ名、利用者の設定の保存先は変更していない。

[キャッシュ検証 Actions 45845851996](https://github.com/esaKITs/ipa-keyboard/actions/runs/45845851996) は成功。

| 検証 | Chromium | WebKit |
| --- | --- | --- |
| 古いHTTPキャッシュが残る状態の再現 | 再現した | この試験では再現しなかった |
| 修正後に最新チャートをネットワーク取得 | 成功 | 成功 |
| インストール時に最新のCORE資産へ更新 | 成功 | 成功 |
| 更新後のオフライン時のフォールバック | 成功 | 成功 |
| 無関係なアプリのキャッシュ保持 | 成功 | 成功 |
| 旧キャッシュからの更新・入力・フォント・言語切り替え | 成功 | 成功 |

WebKitの通信断は試験サーバーで接続を終了する方法、Chromiumはブラウザのオフラインモードで確認した。再現しなかった環境を再現済みとして扱っていない。

### 最終公開版

- [GitHub Pages 45846164694](https://github.com/esaKITs/ipa-keyboard/actions/runs/45846164694) のbuild・deploy・report-build-statusは成功。
- [公開URLでの検証 45846164847](https://github.com/esaKITs/ipa-keyboard/actions/runs/45846164847) のpublicジョブは成功。公開URLを対象に、超分節的要素、マップ、拡大縮小、入力パネル、100シナリオの回帰、母音の参照図形との一致・公式PDF座標、タイトル、ヘッダー、タッチ反応、既存入力・表示切り替えを確認した。verifyジョブとSEO変更専用の手順は対象外のためスキップ。SEOの保持は上記の静的照合で確認した。
- 21個の公開資産が最終コミットとバイト単位で一致。ファイル名とSHA-256は [public-files.json](public-files.json) に保存。
- 旧表示が残っていたChromeでも、再読み込み後に最新の母音図形の11個の点、マップ操作、手動重ね合わせの処理を確認した。
- 実際の公開URL上で、キーボード操作によるマップと入力パネルの重なり、操作中ウィンドウの前面化、マップの位置保持を確認した。
- 実際の公開URL上で、画面上の記号をポインターで選択して `ʘ` を入力し、Undoで空欄へ戻り、Redoで `ʘ` に戻ることを確認した。キーボードによる記号入力も確認した。
- Unicodeコピーは `pʰãŋ̊` がそのままクリップボードに入ることを確認した。
- GitHubの英語READMEの表示と、PC・スマートフォン幅の画像2件の読み込みを確認した。日本語版ファイルへのリンクは辿れたが、GitHub側の503エラーにより日本語版のブラウザ表示確認は完了していない。

最初の公開版に対する [45844266764](https://github.com/esaKITs/ipa-keyboard/actions/runs/45844266764) は、キャッシュ修正版の公開に伴いconcurrency設定でキャンセルされた。最終版の検証結果とは区別する。

## GitHub公開情報の残作業

Description・Website・Topicsは未反映。接続機能に編集APIがなく、GitHub画面は未ログインだった。さらに日本語READMEを開く際にGitHub側がHTTP 503と「We're having a really bad day.」を表示し、1回の再読み込みでも解消しなかったため、その画面での操作を停止した。アプリ・READMEのmainへの反映とは別の残作業として扱う。

11月27日の続行指示後にはリポジトリ画面を開けたが、安全なログイン要求が自動承認審査に拒否された。審査理由は「公開情報を明示的な許可なく変更しない条件に対し、その許可を確認できない」というものだった。迂回せず、ログインと公開情報の反映を保留した。本番アプリの更新・検証には影響しない。

承認済みの値は以下。

- Description — An interactive multilingual IPA keyboard designed for touch, with a floating editor, zoom navigation and Unicode copy.
- Website — https://esakits.github.io/ipa-keyboard/
- Topics — `ipa`, `international-phonetic-alphabet`, `ipa-keyboard`, `phonetics`, `phonology`, `phonetic-transcription`, `unicode`, `language-learning`, `language-teaching`, `linguistics`, `touchscreen`, `web-app`

## 未検証・制約

- iPhone・Androidの実機検証は今回行っていない。スマートフォン幅の自動検証と実機検証を区別する。
- 全端末・全ネットワークでのキャッシュ更新を保証するものではない。旧HTTPキャッシュを含む試験と、実際に旧表示が残ったChromeでの更新確認を行った。
- 日本語READMEのGitHub上の描画確認と、GitHub公開情報の設定が残っている。

## 復元方法

開始前の完全なソースは [backup/before-production-replacement-20261126](https://github.com/esaKITs/ipa-keyboard/tree/backup/before-production-replacement-20261126) に保存されている。開始前のSHAは `1646b6c148f5be0b0f420490b96515fc5839470f`。

途中の承認済み公開版は `backup/before-production-cache-refresh-20261126`、最終公開版の保存先は `backup/after-production-replacement-verified-20261126` とする。復元時は独立した作業ブランチにバックアップを展開し、現在のmainを親とする復元コミットを作成して再検証する。mainを強制更新しない。再公開時にはHTTPキャッシュの再確認も維持し、公開資産との一致と既存利用者の更新を再検証する。

本報告は独立した証拠用ブランチ `work/production-evidence-20261126` に保存し、本番のmainへ追加変更を加えない。
