# esaKITs IPA Keyboard 日本語版 — アイコン v9 検証仕様

## 対象
v7 の SVG（commit `110896497f7bede20878240a74cb88c2c2426381`）を出発点とする。v8 のチャット内生成物を無検証で再利用しない。既存アプリ本体は変更しない。

## 今回の修正
- オレンジの立体枠、紫の背景と和柄、斜めのキーボード、青い選択キーの意匠を継承。
- 子音表と母音四辺形の見出しに「抜粋」を明記。全IPAを収録しているかのような誤解を避ける。
- 「後部歯茎」の文字サイズを調整し、63px幅の見出しセルからはみ出さないようにする。
- 文字をDoulos SIL、Noto Sans JP等の実フォントからSVGのパスに変換し、画像生成AIが描いたIPA字形を使用しない。
- 1024/512/256pxのPNGは、アウトライン化したSVGから決定的に生成する。

## 位置・調音法の検証対象
子音（37記号）：
- 破裂音: p b / t d / c ɟ / k ɡ / ʔ
- 鼻音: m / ɱ / n / ɲ / ŋ
- 摩擦音: ɸ β / f v / θ ð / s z / ʃ ʒ / ç ʝ / x ɣ / h ɦ
- 接近音: ʋ / ɹ / j / ɰ
- 側面接近音: l / ʎ / ʟ

列は両唇、唇歯、歯、歯茎、後部歯茎、硬口蓋、軟口蓋、声門。子音表はあくまで抜粋であり、そり舌、口蓋垂、咽頭などの列は省略している。

母音（23記号）：i y / ɨ ʉ / ɯ u、e ø / ɘ ɵ / ɤ o、ɛ œ / ɜ ɞ / ʌ ɔ、a ɶ / ɑ ɒ、および中央母音 ə。各対の左が非円唇、右が円唇。半狭・半広・狭・広の位置をソース上の座標で照合する。

## 検証の限界
ソースの文字列と配置を公式IPA表に照合することと、実際のレンダリングを視覚検査することは別工程。生成スクリプトは、IPA配列、欠落字形、文字のアウトライン化、SVGの外部依存除去、PNGサイズ、主要配色を検査する。小サイズの可読性や美術的完成度は画像を開いて別途確認する必要がある。

## 公式参照
International Phonetic Association, official IPA chart:
https://www.internationalphoneticassociation.org/content/ipa-chart

## ビルド
`python -m pip install fonttools brotli cairosvg pillow lxml`
`python scripts/build_ipa_icon_v9.py`

ビルドが成功した場合に限り、`artwork/ipa-keyboard-icon-v9-outlined.svg`、`artwork/ipa-keyboard-icon-v9-{1024,512,256}.png`、`artwork/ipa-keyboard-icon-v9-validation.txt` が生成される。
