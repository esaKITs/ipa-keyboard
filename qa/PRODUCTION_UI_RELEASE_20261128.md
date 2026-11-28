# v83.34 UI改良の本番反映

## 許可・復元点

2026-11-28（日本時間）、依頼者の「じゃ、、本番に実装して」に基づく反映。
反映前main：391cd42bca752c4772e0e9c77345a25881210401。
反映前バックアップ：backup/before-production-ui-release-20261128。
確認済み版：7d7a1a862b55f8284fe5990db40f6f8ce2d3e5ec。
公開用ブランチ：release/ui-20261128。
公開用コミット：9e2e0593330aad6c1338866d332ce32527d2ebb6。
表示バージョン：v83.34（維持）。

## 承認済み変更

- 入力パネルの位置リセットボタンを外し、白黒反転を右端へ。パネル名はアイコンのみ。
- 設定リセットを組合せ警告の行の右端へ。入力文字・Undo/Redoを保持。
- 設定・案内・確認画面を白背景では紫系、黒背景ではオレンジ系に統一。
- フォント選択名を各書体・同じ12pxで表示し、選択中にチェックと背景色。
- Designed for Touchとタイトルの文字幅をそろえ、v83.34をサブタイトル右へ。操作ボタン群は右端へ。
- 角括弧アイコンの中央揃え。6ボタンをLucide SVGへ統一しライセンスを保存。
- 自動ラベルは日本語・大阪方言で拡大。上・下指定の薄い破線を濃さ100%の独立した8個の点へ。
- 拡大時も説明・ライセンスとesaKITsロゴを表示。パネルが中央にある時の過剰な末尾余白を解消。

アプリの変更ファイル：index.html、chart.html、translations.csv、translations.xlsx、third_party/lucide/。
確認済み版と公開用コミットのこれらのファイルが完全一致することを公開前CIで検査する。
検証コードは削除済みの位置リセットボタンを参照しないよう整備済み。
公開後の既存14スイートを4グループへ分けて並列実行するCI設定を追加。検査項目は減らさない。公開前確認専用ワークフローも追加。

## 検証

公開前：https://github.com/esaKITs/ipa-keyboard/actions/runs/46094409858
設定初期化、案内画面、配色、フォント、タイトル配置、3モードの表示と切替をChromium/WebKitで検査。承認済みアプリファイルとの一致と翻訳マスター一致も確認。
公開後：14スイートを4グループで実行し、すべて成功。詳細は下記。

既存制約：WebKit 375/393pxではペルシア語の自動ラベルが4pxはみ出す。変更前後同じ。実機は未検証。WebKitのコピー検証はwriteText引数を確認したものでOSクリップボードの実機検証ではない。

公開URL：https://esakits.github.io/ipa-keyboard/
復元：公開用コミットがmainの先頭なら git revert -m 1 9e2e0593330aad6c1338866d332ce32527d2ebb6 で反映前mainの内容を戻す。以降の別変更がある場合は差分を確認してから実施する。公開後は配信ファイルと動作を再検証する。
GitHubのDescription/Website/Topicsは変更しない。

## 公開経過

公開前run 46094409858：2ジョブ成功。mainを9e2e0593330aad6c1338866d332ce32527d2ebb6へ反映。
Pages run 46094736294：ビルド・配信の全3ジョブ成功。
公開サイトから21ファイルを取得し、すべて公開用コミットと完全一致した。public-files.jsonにハッシュを保存。
最初の公開後run 46094736530で、qa/recovery.cjsのreachable呼び出し1箇所に高さ844の引数がなく、画面内のボタンを範囲外と誤判定した。検証コードだけを修正し、mainにca3a38cff4000f503d7ff0624806d6e167ebd606を保存。アプリファイルは9e2e0593330aad6c1338866d332ce32527d2ebb6と完全一致のまま。
再実行run 46095020498は4グループすべて成功。ブランチ専用verifyジョブは条件によりスキップ（成功数には含めない）。

現在のmainから戻す場合は、最新mainを親にして391cd42bca752c4772e0e9c77345a25881210401と同じツリーの復元コミットを作る（force pushしない）。隔離した作業ブランチで git restore --source=391cd42bca752c4772e0e9c77345a25881210401 --staged --worktree -- . を実行し、コミットする方法で完全に戻せる。

## 公開後の最終検証（完了）

現在のmain：`ca3a38cff4000f503d7ff0624806d6e167ebd606`。
検証完了後の復元先：`backup/after-production-ui-verified-20261128`。

- [最新Pages配信run 46095020025](https://github.com/esaKITs/ipa-keyboard/actions/runs/46095020025)：成功。
- [公開URL総合テストrun 46095020498](https://github.com/esaKITs/ipa-keyboard/actions/runs/46095020498)：完了・success。
- public (editor)：成功。panel-controls / recovery / editor-gestures / viewer-icons / production。
- public (charts)：成功。vowel-equivalence / phase2-chart / phase3-title / header-alignment。
- public (navigation)：成功。suprasegmental-grouping / floating-overview / desktop-zoom。
- public (feedback)：成功。tap-feedback / final-four。

Chromium・WebKitで320 / 375 / 393 / 768 / 1280pxを中心にPC・スマートフォンの画面幅をエミュレートして検証した。スイートにより390pxや844pxも検証。各スイートで対象の言語・白黒表示・入力・拡大縮小・移動・保存状態などを検査した。WebKitのピンチは合成TouchEventによるハンドラー検証で、実機操作とは異なる。
追加のクラウドChrome操作で、本番の設定を開き「フォントについて」の公式ダウンロードリンク2件を確認し、閉じた後も設定が開いたままであることを確認した。既存の文字や設定値は変更していない。

### 比較と証拠

| 項目 | 変更前 | 変更後 |
|---|---|---|
| 上・下指定の円 | 透明度65%の破線 | 透明度100%の独立した8点 |
| 自動（日本語・大阪方言） | スマートフォン9px / PC10px | 11px / 12px |
| 入力パネル見出し | アイコンと名称、位置リセット | アイコンのみ、白黒反転は右端 |
| タイトル右の版番号 | 1行目 | Designed for Touchの右 |
| 中央パネル時の末尾余白 | 不要なスクロール余白 | 下端を覆う時のみ必要量を確保 |

- [公開ファイル21件のハッシュ](production-ui-release-evidence/public-files.json)
- [公開後テスト結果](production-ui-release-evidence/results.json)
- [WebKit 393px 入力パネル](production-ui-release-evidence/public-panel-controls-webkit-393.png)
- [WebKit 393px 拡大・白](production-ui-release-evidence/public-webkit-393-light-expanded.png)
- [WebKit 393px 拡大・黒](production-ui-release-evidence/public-webkit-393-dark-expanded.png)
- [Chromium 1280px](production-ui-release-evidence/public-chromium-1280.png)

CIの全スクリーンショットは上記runの4つのArtifactsにも保存されている（90日保存）。この報告に添付した代表画像はGit管理で保持する。

実装と公開後検証は完了。iPhone・Android実機での確認は未実施。ペルシア語自動ラベルの既存4pxはみ出しは本変更の対象外として残る。
GitHubのDescription、Website、Topics、既存SEO設定、フォントファイル、IPA記号・母音図形の座標は変更していない。
