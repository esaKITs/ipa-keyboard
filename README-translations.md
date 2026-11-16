# 翻訳の更新

正本は `translations.xlsx` の「翻訳マスター」シートです。アプリの入力パネルとチャートは、このExcelから生成した同じ `translations.csv` を参照します。HTMLには翻訳辞書を重複して持ちません。

1. 「翻訳マスター」の `en`、`fa`、`pt_BR`、`ja_osaka`（D:G列）を編集します。A:C列の `id`、`scope`、`ja` は固定キーです。`ja` はHTMLの日本語原文と照合する検索キーなので、訳文の編集で変更しません。日本語原文そのものを変更する場合は、HTMLと一覧を一緒に更新します。未訳の空欄は日本語に戻ります。
2. 次のコマンドでCSVを生成し、ExcelとCSVを一緒に保存します。

```sh
python3 tools/export-translations.py translations.xlsx translations.csv
```

3. 検証・公開では `--check` によってExcelとCSVの一致を確認します。差がある状態では公開しません。

「照合結果」はv83.16と旧一覧の比較記録です。意味の正誤を未判定のペルシア語6件は現行訳を保持しています。「旧資料」には元の445行を空欄も含めて残しています。照合記録は将来の訳文編集に追従する動的表ではありません。

基準ソース: [v83.16](https://github.com/esaKITs/ipa-keyboard-test/tree/b7e4548409bd4dc46addedbed642240aa6ae0e29/keyboard-v83-16/)。旧一覧の原本は `reference/ipa_4language_source_only_mapping.csv` です。
