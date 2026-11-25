# 第1弾：ナビゲーションマップの解釈訂正と下端の修正

検証対象：v83.34 / `3cac782b57e74934f3ccf36f0aa6b23407a2f2b4`。
本番main：`1646b6c148f5be0b0f420490b96515fc5839470f`。本番への変更・マージ・公開は行っていない。

## 訂正

前報告の1-2「全体図内部を1〜4倍にする」は依頼の誤解であり、採用しない。過去のActions成功は、その誤った仕様を検査した結果だった。今回の仕様確認を代替しない。

- 全体図の枠および全6領域を固定し、下部まで常に表示する。
- 薄紫色の表示範囲の□を小さくするとメインチャートを拡大、大きくすると縮小する。
- □の左上・右下のハンドルで連続変更でき、□のドラッグでチャートを移動する。
- 見出しの＋／−はメインチャートの倍率を変更し、□が逆比例して変化する。全体図内での2本指ピンチ・Ctrl＋ホイールも同じ対象を操作する。

## 下端が消える原因と変更

修正前の実ブラウザーでは、スクロール限界でも最後の記号がフローティング入力パネルに隠れ、親ページのヒットテストが入力欄 `out` を返した。

`chart.html` の拡大用ステージに、実測した入力パネル上端より最後の記号を上まで動かせる追加のスクロール余地を確保する。パネル移動・リサイズ時は親から届く矩形を使って更新する。チャート本文・形状・記号配置・マップの図形は変更しない。

通常ページ末尾は別途確認し、計測したデスクトップ状態では著作権表記が画面内に表示され、パネルにも隠れていなかった。通常ページへ推測による余白追加は行っていない。

## 変更ファイル（前候補a46から）

- `chart.html`：誤ったマップ自体のズームを撤去。□の拡縮と移動、下端のスクロール余地。
- `qa/phase1-display.cjs`：□とメインチャートの関係、全領域の表示、ハンドル操作、通常のパネル位置のまま最後の記号への実クリック、実測したパネル矩形とのスクロール余地の整合を検査。
- `qa/suprasegmental-grouping.cjs`：操作可能になった□が下の領域を覆うことを踏まえ、領域要素を直接クリックする旧検査を同じ位置のキャンバス操作へ更新。記号構造、Unicode、全言語、実入力、Undo/Redo、母音形状の検査は維持。

第1弾のパネル高さ追従・左余白の修正は保持。第2〜4弾、論文、GitHub公開情報には未着手。

## 検証証拠

Actions: https://github.com/esaKITs/ipa-keyboard/actions/runs/45651777015
Chromium・WebKit、320/375/393/768/1280px、全5言語・白黒、倍率1/2/4。第1弾専用検査は失敗0。ブラウザー実機検証ではなくCIエミュレーションであり、iPhone実機は未検証。
管理下Chromeでも、パネルを移動せず下端の↘を実クリックし入力を確認した。□と＋／−の連動、全体図の下部表示も確認した。
全7ジョブ（phase1 / panel / overview / zoom / geometry / feedback / recovery）が成功。実行全体の conclusion=success、対象SHA一致を確認した。

確認用URL：https://esakits-ipa-phase1-a46f518.esakit.chatgpt.site

確認用SiteソースSHA：`550066e9ed5dbbeed8a0bc89def9e8fd1bcb364a`。GitHub検証対象とSiteのコミット番号はリポジトリが異なるため別。配信確認はindex.html・chart.html・editor-gestures.js・translations.csv・sw.jsの5ファイルすべてHTTP 200、検証対象SHAのファイルとバイト単位で一致した。詳細は[evidenceのreceipt](evidence/map-correction-20261126/receipt.json)および[live-assets.json](evidence/map-correction-20261126/live-assets.json)を参照。私有Siteのサインイン画面のため、その公開先を使ったブラウザー操作は未実施。操作検証は同一バイトのローカル/CI配信で実施した。

[WebKit 393px 白背景](evidence/map-correction-20261126/phase1-after-webkit-393-light.png) / [黒背景](evidence/map-correction-20261126/phase1-after-webkit-393-dark.png)。いずれも訂正後のCI実画面で、最後の記号を入力後の状態。

## 復元

訂正前候補：`backup/before-map-window-correction-20261125` → `a46f518f6eb5af3fe34bdd1f1a6001d5ba849bee`。
第1弾開始前：`backup/before-phase1-20261125-1646b6c` → 本番SHA。
本番mainは変更していないため復元操作不要。確認用Siteを戻す場合は過去の保存版を選び、本番mainを巻き戻さない。

検証後バックアップ：`backup/after-phase1-map-verified-20261126` → `3cac782b57e74934f3ccf36f0aa6b23407a2f2b4`。
