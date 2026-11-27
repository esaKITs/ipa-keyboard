# 初期1.25倍・ピンチ復帰の本番反映（2026-11-27）

- 本番URL：https://esakits.github.io/ipa-keyboard/
- 表示版：v83.34。
- 反映前：`ad648a46b0b2bb41b210d6eb695223118dbedf53`。
- 本番コミット：`74164c983bc8e9c8701ebe3e381722ddd8593ab6`。
- 反映前バックアップ：`backup/before-zoom-release-20261127`。
- 検証済み候補：`acd51a09c03aed00ad4d8115265a86da8bad655e`。

依頼者が確認用サイトの動作を確認し、本番反映を依頼したため実施。

アプリの変更は `chart.html` のみで、候補版と完全一致。拡大ボタンによる開始時は、画面幅に収まる基準の1.25倍。チャートでピンチアウトした後は拡大モードに入り、同じヘッダーボタンで通常表示へ戻る。入力パネルの独立操作や配色等は変更していない。マップボタンから開く際の従来1倍も維持。

検証コード `qa/floating-overview.cjs` は、1.25倍でマップの縮小ボタンも有効になることに合わせ、Tab / Shift+Tabの検証を有効なボタンの実際の順序に対応させた。アプリのタブ順そのものは変更していない。他のアプリファイル・依存ライブラリ・フォント・SEO・ライセンス・GitHubメタデータは未変更。

## 検証

- [初期倍率・ピンチ・PC拡大・入力パネル独立操作：成功](https://github.com/esaKITs/ipa-keyboard/actions/runs/45983897517)
- [本番反映前のマップ／キーボード回帰：成功](https://github.com/esaKITs/ipa-keyboard/actions/runs/45985367958)
- [Pages build / deploy](https://github.com/esaKITs/ipa-keyboard/actions/runs/46006242016)
- [公開サイトの全体回帰](https://github.com/esaKITs/ipa-keyboard/actions/runs/46006241793)

[公開サイトの初期倍率・ピンチ復帰・PC拡大・入力パネル独立操作：3組すべて成功](https://github.com/esaKITs/ipa-keyboard/actions/runs/46006383682)。初期倍率・復帰の100条件を実際の公開URLで確認。配信22ファイルも本番コミットと一致。

全体回帰テスト：実行中（未完了）。

Chromium / WebKit、320 / 375 / 393 / 768 / 1280px、白黒、全5言語。スマートフォン幅はエミュレーションであり、iPhone / Android実機は未検証。

## 復元

`backup/before-zoom-release-20261127` の内容で新しい復元コミットを作成して反映する。mainの履歴は強制的に書き換えない。検証完了後の復元ポイントは `backup/after-zoom-release-verified-20261127`。
