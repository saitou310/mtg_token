# MTG トークンメーカー

Magic: The Gathering のトークンカードを自作して、コンビニプリントや写真プリントで**実寸（63×88mm）**印刷できる Web アプリです。サーバーは不要で、画像や入力内容はすべてブラウザの中（IndexedDB）だけに保存されます。

## できること

- トークン名・タイプ行・P/T・能力・フレーバー・イラストレーター名の入力（日本語／英語）
- 色の組み合わせによる枠：自動（本物準拠：2色はゴールド枠＋2色の縁取り）／ハイブリッド（枠を左右グラデーション）／カスタム（部位ごとに色指定）、アーティファクト枠・土地枠、フルアート
- `{T}` `{2}` `{G}` などのマナ記号、キーワード能力ボタン、和文の禁則処理、文字量に応じたテキスト欄の伸縮と自動縮小
- イラストのドラッグ＆ドロップ／貼り付け、プレビュー上でのドラッグ移動・ホイール／ピンチ拡縮
- マイトークン（保存・複製・バックアップ JSON の書き出し／読み込み）
- 印刷：A4 PDF（3×3）、L判 JPEG（1枚）、2L判 JPEG（2枚）、カード単体 PNG。塗り足し・トンボ・倍率補正・テストシート付き

## 開発

```sh
npm install
npm run dev        # http://localhost:5173/mtg_token/
npm test           # ユニットテスト（Vitest）
npm run build      # 型チェック + 本番ビルド（dist/）
```

開発サーバーで `/mtg_token/debug.html` を開くと、いろいろな設定のカードを並べて描画を確認できます（本番ビルドには含まれません）。`?dpi=400&only=0,3` のように指定できます。

## 公開（GitHub Pages）

`main` に push すると `.github/workflows/deploy.yml` がテスト・ビルドして GitHub Pages にデプロイします。初回だけ、GitHub のリポジトリ設定 **Settings → Pages → Source** を「GitHub Actions」にしてください。

## 構成

| パス | 内容 |
|---|---|
| `src/model/` | トークンのデータ型、色と枠の組み合わせ、プリセット |
| `src/render/` | Canvas によるカード描画（座標の単位は 0.1mm、カード = 630×880） |
| `src/render/text/` | 能力テキストの解析（記号・注釈文）と行分割（禁則処理・自動縮小） |
| `src/print/` | 印刷レイアウト（mm 単位）、PDF・JPEG 書き出し |
| `src/storage/` | IndexedDB への保存、画像の取り込み、バックアップ |
| `src/ui/` | 画面（作成・マイトークン・印刷・使い方） |

## おことわり

非公式のファンメイドツールです。Wizards of the Coast とは関係がなく、承認も受けていません。Magic: The Gathering およびマナシンボルは Wizards of the Coast LLC の商標です。カード枠は画像素材を使わず Canvas で描画しており、WotC の枠画像やフォントは含みません。マナシンボルの描画には [Mana](https://mana.andrewgioia.com/)（Andrew Gioia）を使用しています。
