# 第4弾 README・リポジトリ情報の確認用原稿

2026年11月26日（日本時間）。公開・反映前の確認用です。

## 作業対象と復元ポイント

- アプリの表示バージョンはv83.34。
- 開始時のアプリのコミットは `34b79b411654fc866b8faee61e00eb393b795485`。
- 作業ブランチは `work/phase4-docs-20261126`。
- 開始前の復元先は `backup/before-phase4-resume-20261126`。上記アプリコミットと一致。
- 本番mainの記録値は `1646b6c148f5be0b0f420490b96515fc5839470f`。
- 原稿の保存コミットは、このファイルを含む第4弾ドキュメントコミット。検証後の復元先を `backup/after-phase4-docs-verified-20261126` とする。

## 実施した作業と修正前後

開始時点ではルートの `README.md` と `README.ja.md` は存在しなかった。英語版をメインに、日本語版と相互リンクを設けた。機能概要、Designed for Touchの説明、操作方法、言語、検証環境、画像、公式サイト、開発者、既存ライセンスを両版に記載した。

直近のウィンドウ移動修正を反映し、マップの表示範囲の四角とウィンドウ自体の移動を区別して説明した。入力パネルのサイズと文字サイズの関係、コピー時のUnicode保持と表示設定の扱いも説明した。候補版の機能を公式サイトで公開済みと読まれないよう、両版の上部に候補版・公開版の区別を明記した。

| 変更ファイル | 内容 |
| --- | --- |
| `README.md` | 英語版READMEの新規作成 |
| `README.ja.md` | 日本語版READMEの新規作成 |
| `docs/screenshots/desktop-light.png` | 検証済み候補版のPC画像 |
| `docs/screenshots/mobile-overview.png` | 検証済み候補版のスマートフォン幅の画像 |
| `qa/PHASE4_DOCUMENTATION_20261126.md` | 本報告と公開情報の変更案 |

アプリ、フォント、依存ライブラリ、既存ライセンス、SEO設定、公開設定は変更していない。

## GitHub公開情報の変更案

以下は提案のみ。現在値はGitHub REST APIの読み取りで確認した。

| 項目 | 現在値 | 提案値 |
| --- | --- | --- |
| Description | 未設定 | An interactive multilingual IPA keyboard designed for touch, with a floating editor, zoom navigation and Unicode copy. |
| Website | 未設定 | https://esakits.github.io/ipa-keyboard/ |
| Topics | 未設定 | 下記12件 |

提案Topics

`ipa`, `international-phonetic-alphabet`, `ipa-keyboard`, `phonetics`, `phonology`, `phonetic-transcription`, `unicode`, `language-learning`, `language-teaching`, `linguistics`, `touchscreen`, `web-app`

DescriptionはIPA入力、多言語、タッチ操作、入力パネル、ナビゲーション、Unicodeコピーを簡潔に紹介する。Topicsは音声学・音韻論・言語教育と、実際のツールの用途・操作に対応させた。

## 検証方法と結果

- 両言語版の構成・機能・操作・対応言語・検証範囲・権利表記を対照し、内容の一致を確認した。
- 両版で参照する外部URL集合が一致することをスクリプトで確認した。
- 各版のローカル参照6件がすべて存在することを確認した。相互リンク、画像2件、MITライセンス、CREDITSを含む。
- 外部URL7件中、公式サイト、Actions、既存検証報告、対象コミット、Weston Ruter氏のリポジトリ、CCライセンスの6件はHTTP 200を確認した。
- 確認用サイトは未認証リクエストでHTTP 401。認証が必要な確認用サイトとして両版に明記した。今回の作業では認証後の再検証は行っていない。
- 画像は実際の検証画像をそのまま複製し、元ファイルとSHA-256が一致することを確認した。
- 画像を開いて内容を確認した。PCは1280×844、スマートフォン幅は393×844。全体図を入力パネルの前面に移動した状態を明示した。
- 機能説明は候補版のコード、CREDITS、直近の自動検証結果に照合した。検索や未実装の共有・ファイル出力機能は掲載していない。
- 文書と画像のみの変更のため、アプリのブラウザ回帰テストは再実行していない。記載したブラウザ検証は下記の既存実行を参照する。

### 画像と既存ブラウザ検証の出典

[GitHub Actions 45803750494](https://github.com/esaKITs/ipa-keyboard/actions/runs/45803750494)、成果物 `floating-fix-windows-evidence`（ID `15108763088`）。対象アプリは `34b79b411654fc866b8faee61e00eb393b795485`。

| 掲載画像 | 成果物中の元ファイル | SHA-256 |
| --- | --- | --- |
| PC | `staged-chromium-1280-direct-editor.png` | `e74dc37e64c75dff8dbd734bbd9e41b1e4ebecad89bc000dae08d77f76de7908` |
| スマートフォン幅 | `floating-fix/crossing-webkit-393-light.png` | `827ca4a0501c0034deeef4006611cf75aa6133ff3b199730932f03984c7bf7f4` |

Chromium・WebKit、320／375／393／768／1280px、白黒背景、対応言語、入力パネル・チャート・マップの関連機能については、[既存の検証報告](https://github.com/esaKITs/ipa-keyboard/blob/work/floating-evidence-20261126/qa/evidence/floating-fix-20261126/REPORT.md)を参照。スマートフォン相当の表示はエミュレーションであり、記録された自動検証には実機を含まない。

## 未検証・制約と反映時の扱い

- 今回の原稿について、GitHubの全端末・全ブラウザでのMarkdown描画確認は行っていない。
- iPhone実機・Android実機の網羅的な動作確認は行っていない。READMEでは対応保証として扱っていない。
- コピー先の文書アプリすべてで、字形・結合文字の配置を検証したものではない。
- 候補版を公開する際は、README冒頭の候補版注記と確認用サイトへのリンクを公開状態に合わせて更新する必要がある。
- 公開情報のDescription・Website・Topicsは、依頼者の明示的な許可を得てから反映する。
- mainへの反映、マージ、本番公開は行っていない。

## 復元方法と確認先

開始前の状態は `backup/before-phase4-resume-20261126`、原稿完成時の状態は `backup/after-phase4-docs-verified-20261126` を参照する。どちらも独立した作業ブランチへチェックアウトできる。アプリのコードを変えていないため、原稿を採用しなければ開始前の状態をそのまま使用できる。

確認用READMEは `work/phase4-docs-20261126` の [英語版](../README.md)・[日本語版](../README.ja.md)。アプリの確認先は既存の[確認用サイト](https://esakits-ipa-phase3-20261126.esakit.chatgpt.site/)を継続使用する。第4弾の文書作業による再配信は行っていない。
