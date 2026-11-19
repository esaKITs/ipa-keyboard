# esaKITs IPA Keyboard SEO 実装・公開・検証報告

検証日：2026年11月19日（日本時間）

SEO本体の実装・公開・公開後検証は完了しました。外部管理権限、実機、初回未準備描画に関する制約は⑥へ区別して記載しています。

## ① バージョン・コミット

- 表示バージョン：v83.34を維持。
- 変更前：3922bb8b4b2b42307680b41f9e5d77e67e7571fc
- 現在の公開対象：b9b11fd0515cea68aec68ea1342757fead699b38
- 独立バックアップ：backup/before-seo-20261119-3922bb8（上記変更前SHAと一致）
- SEO作業ブランチ：work/seo-20261119
- 本報告書：reports/seo-20261119-b9b11fdに保存。本番mainの公開コミットは上記b9b11fdのままで、報告書の保存コミットとは区別する。

| ファイル | 変更内容 |
| --- | --- |
| index.html | headのtitle、description、OGP、Twitter Card、WebApplication JSON-LDのみ |
| sitemap.xml | 正式な本番URL1件だけを掲載するサイトマップを新規追加 |
| qa/production.cjs | titleの厳密な期待値2箇所を新しいtitleに更新。機能検査は維持 |
| qa/seo-static.py | body・既存CSS・実行可能JS・保護資産のバイト一致、変更範囲、メタデータ・JSON・サイトマップを検査 |
| qa/seo.cjs | 変更前後の画像・DOM・CSS・SVG座標比較と実際の入力・編集・コピーを検査 |
| qa/SEO.md | 手順・判断根拠・制約を記録 |
| .github/workflows/release-production.yml | SEO専用ブランチ・比較検査・成果物保存を追加。検査追加と依存パッケージ導入の遅延に対応してジョブ全体の予算を45分に設定 |

本番アプリへの変更は最初の2ファイルに限定した。body、既存の実行可能JavaScript、CSS、chart.html、翻訳、フォント、ライセンス、既存アイコン、画面上の文言・バージョンは変更していない。全追跡ファイルを独立Gitバックアップで保全し、既存バックアップ・esaKITsトップページ・他ツール・テスト版は変更していない。

body全体のSHA-256は変更前後とも以下で一致する。

`83b7488304e758219a9b7d0e6df2464ef57670ca91a731c19e381dbccbe333ee`

検証用ファイルの追加後も、アプリ本体には追加修正していない。開始時と本番反映直前にmainを確認し、期待する直前SHAを指定した更新で他者の変更を上書きしないようにした。バックアップへの強制リセットは行っていない。

## ② 公開URL

- 本番：https://esakits.github.io/ipa-keyboard/
- サイトマップ：https://esakits.github.io/ipa-keyboard/sitemap.xml

公開前の本番HTMLは変更前コミットとバイト一致した。正式URLへのHTTP 200、末尾スラッシュなしURLから正式URLへの301、canonicalの一致を確認した。canonicalは既存設定を維持している。

Pagesのビルドログでmain・公開元ルート「.」を確認した。管理用Pages APIは利用できず、公開設定の変更は行っていない。今回の公開後も、ActionsでHTML・サイトマップ・チャート・JS・翻訳・フォント等15ファイルが対象コミットとバイト一致することを確認済み。通常取得とGooglebotというUser-Agentでの取得でもHTMLのHTTP 200を確認したが、後者はGoogleの実際のURL検査や検索登録確認ではない。

## ③ GitHub Actions

| 検査 | 実行URL | 現在の結果 |
| --- | --- | --- |
| 公開前検証 | https://github.com/esaKITs/ipa-keyboard/actions/runs/44439246001 | 成功 |
| Pagesデプロイ | https://github.com/esaKITs/ipa-keyboard/actions/runs/44442599629 | 成功 |
| 公開URL検証 | https://github.com/esaKITs/ipa-keyboard/actions/runs/44442600344 | 成功。公開ファイル一致・既存操作・80条件のSEO画像比較すべて成功 |

公開前は80条件・各4状態の320組すべてで、比較準備後のRGBA画素差ゼロ、DOM・CSS・全母音SVG文字座標の一致を確認した。既存の全回帰検査、100シナリオの復旧動作、ヘッダー・全体図・拡大復帰、入力パネル、初回反応速度、旧オフラインキャッシュからの更新も成功した。オフライン更新は公開前の隔離環境でChromium・WebKit双方を検査している。

公開後も80条件・各4状態の320組すべてで、比較準備後のRGBA画素差ゼロ、DOM・CSS・全母音SVG文字座標の一致を確認した。Chromium・WebKit双方で変更前の版と公開版に実際の記号入力、Undo／Redo、カーソル移動と編集、ネイティブのコピー／貼り付けを行い、同じ結果になった。検査中の未処理JavaScriptエラーはなく、初回反応速度を含む元の操作検査もすべて成功した。

- [公開前の比較画像・結果](https://github.com/esaKITs/ipa-keyboard/actions/runs/44439246001)
- [公開後の全比較画像・結果JSON（Actions Artifact）](https://github.com/esaKITs/ipa-keyboard/actions/runs/44442600344/artifacts/14493132053)
- 公開後成果物：ipa-production-public-screenshots、84,044,085 bytes。SHA-256: bb4804a7d2b471f2229aa456b85a0a9e50827724b009c1622e3e0b94c8013689。保存期限は2027-02-17（GitHub側の期限）。

撮影したPNGは加工せず保存している。今回の厳密比較は④のフォント確定・再描画後の条件であり、未準備の初回描画の完全一致は主張していない。

## ④ 変更前後の比較

対象はChromium・WebKit、幅320／375／393／768／1280px、日本語・英語・ブラジルポルトガル語・ペルシア語、白黒両背景の80条件。通常表示、拡大表示、母音記号を押した間の光・ポップアップ、離した後の光の4状態を比較する。

画像比較では、両側とも既存の設定UIで標準のDoulos SILを確定し、通常・拡大の撮影前に画面幅を1px広げて元の幅に正確に戻す。ネイティブの画面幅変更による再描画を比較準備に含む。全画素と全SVG文字座標を厳密に比較し、内容マスク、画像加工、色差の許容値、CSS上書きは使っていない。カーソル点滅のみ、両側で同じスクリーンショットAPIのcaret設定を使って非表示にする。カーソル操作自体は別の機能検査で確認する。

実際の操作として、母音・子音・補助記号・超分節記号の入力、ポップアップ・発光、拡大と復帰、スクロール・移動、入力欄編集、カーソル移動、Undo／Redo、コピーとネイティブ貼り付け、多言語切替を検査した。コピー／貼り付けはクリップボードのモックを使わず、変更前の版と候補版の双方で行う。既存の全体図・ヘッダー・ボタン・入力パネルの操作検査も維持した。

### 比較条件をそろえた根拠と制約

初期の厳密な比較では、CIのChromiumで母音SVGの測定値の揺れと、輪郭3／4／10画素の1～2階調差を検出した。不合格を合格とは扱わず、アプリ本体を変更せずに対照試験を行った。

- 44427791312：変更前の同じコード2画面同士でもSVGのdy 11.177／13.054の差を再現。同じフォントを既存UIで確定した24組は一致した。
- 44431887463：既存の公開操作検査は成功したが、厳密画像比較は77／80条件で成功、3条件の輪郭差で不合格とした。
- 44435142702：GPU無効化だけでは輪郭差は解消しなかった。
- 44435760864：同じ現行HTML・同じ公開URL同士でも同じ輪郭差を再現した。SEO変更がなくても起きることを確認した。
- 44436408570：ブラウザープロセス分離だけでも解消しなかった。
- 44436154477：画面幅変更・復帰とフォント確定後は27組すべて画素差ゼロだった。
- 44436946839：フォント再確定を追加せず、画面幅変更・復帰だけを追加した18組もすべて画素差ゼロになった。再描画前は6組に差があった。

この実測から、比較準備に実際の画面幅変更・復帰を追加した。元の通常操作検査、ケース数、アプリの反応時間基準、画素差ゼロ、SVG座標の等値判定は維持している。GPUフラグは本番の検証へ持ち込んでいない。

したがって、初回の未準備描画があらゆるタイミングで完全一致したとは主張しない。CIの同一コード間の既存描画差であり、このSEO作業でアプリのSVG描画処理そのものを修理したわけではない。実機iPhoneで同じ事象が起きると断定もしない。

## ⑤ SEOの実施結果

| 項目 | 実施内容 |
| --- | --- |
| title | Free Online IPA Keyboard – Interactive IPA Chart \| esaKITs |
| description | Type and copy International Phonetic Alphabet (IPA) symbols with a free interactive chart. Mobile-friendly, multilingual, no registration required. |
| canonical | 既存の正式URLが正しいため維持 |
| robots | noindex・遮断するX-Robots-Tagは確認されず。ホスト直下robots.txtは404。プロジェクト内のrobots.txtはホストのクロール制御に使えないため作成せず、別リポジトリのルートにも変更しない |
| sitemap.xml | 本番の正式URL1件のみ。テスト・バックアップ・重複URLを含めず、任意のlastmodは省略 |
| OGP | title／description／URL／type／site name／画像を設定。既存180×180pxアプリアイコンをそのまま使用し、HTTP 200・image/png・バイト一致を確認 |
| Twitter Card | summaryとタイトル・説明・既存アイコンを設定。SNS側の実際のプレビュー反映は未確認 |
| 構造化データ | Schema.org WebApplication。無料・価格0・教育用・版・4言語など確認できた事実だけを記載し、JSON構文と項目を検査。評価・レビュー・利用者数等は記載しない |
| 多言語 | 初期lang=jaと同一URLの既存切替を維持。実在しない言語URLやhreflangは追加せず、inLanguageに4言語を記載 |
| 初期HTMLと実行後 | SEO情報は初期headに存在。h1は既存のIPA Keyboard、チャートは既存の同一オリジンiframeを維持。実際のGoogleレンダリング結果は未確認 |

ポルトガル語のteclado IPA online／teclado fonético online、ペルシア語のکیبورد IPA／صفحه‌کلید IPA等を調査対象としたが、検索需要の数量は未取得。同一URLの言語切替であり、各言語の全内容が独立に検索登録されるとは保証しない。別言語URLや画面上の説明追加は今回の範囲外として実装していない。

### 検索・計測の基準情報

| 項目 | 2026-11-19時点の状況 |
| --- | --- |
| 公開検索 | site指定・ブランド検索で対象URLを確実に確認できる結果を得られず。ただし未登録とは断定しない |
| Google直接検索 | 429で結果取得不可 |
| Bing公開検索 | 結果ページは200だが、取得HTMLから対象URLを確認できる結果は得られず。順位の数値は記録していない |
| Search Console登録状況 | 未確認。利用できるアカウント権限・管理データがない |
| Bing Webmaster登録状況 | 未確認。同様に管理データへアクセスできていない |
| サイトマップ送信・URL検査・登録リクエスト | 未実施。サイトマップのファイル公開とは区別する |
| クエリ・表示回数・クリック数・CTR・平均順位・期間・国・対象ページ別データ | 未取得。0等の推測値では補わない |

## ⑥ 未完了・未検証項目

1. Search Console／Bing Webmasterの登録確認、所有権確認、サイトマップ送信、URL検査、インデックス登録依頼は当該アカウントへのアクセスが必要。対象はこのプロジェクトのURLプレフィックスと上記サイトマップ。確認トークンが必要な場合は実際に発行されたものだけを使用する。
2. 構造化データの外部検証画面は人間確認へ転送され、完了していない。CAPTCHAの操作・回避は行っていない。JSON構文・事実確認の成功と外部UI未完了は別である。評価・レビューを捏造してリッチリザルト表示資格を主張していない。
3. 実機iPhone Safariは未検証。WebKitはブラウザーエンジンによる自動検証であり、既存のWebKitピンチ検査は合成TouchEvent、ChromiumはCDPタッチ注入。実機検証とは区別する。
4. 上記のCI Chromium初回描画の揺れは、アプリ本体の修正対象にはしていない。厳密画像比較は明記した同一フォント・再描画後の条件に限る。
5. 検索順位上昇・検索登録の成否は未確認。利用可能になった管理データを、公開後約28日（2026年12月17日頃）を目安に、対象ページ・国・期間をそろえて比較する。計測開始が遅れる場合は期間を調整する。将来の測定値は現時点の成果として記載していない。

復旧が必要な場合は、後続mainの変更を確認してSEO差分だけを安全に逆適用し、再検証する。他者の後続変更を巻き戻す強制リセットや、既存バックアップの削除は行わない。

## 参考

- https://developers.google.com/crawling/docs/robots-txt/create-robots-txt
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- https://developers.google.com/search/docs/appearance/structured-data/software-app
- https://schema.org/WebApplication
- https://ogp.me/
