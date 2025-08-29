# Driftmap Editor

- コンポーネント: `driftmap-editor`（Web Components, Shadow DOM）
- 関連ファイル: `src/editor/index.js`, `src/editor/pins.js`

## アーキテクチャ

- Shadow DOM 内に2枚のキャンバスをレイヤー配置
  - `#sceneCanvas`: ピン/線の描画（`pointer-events: none`）
  - `#interactionCanvas`: ポインタイベントの取得（タップ/長押し/ピンチ）
- 状態: `pins`, `lines`, カメラ（`scale`, `offsetX`, `offsetY`）
- 座標ユーティリティ: `screenToWorld(sx, sy)`, `worldToScreen(wx, wy)`
- 描画: `redrawScene()` がスケールに応じて線・ピン・ラベルを描画
- レイアウト: キャンバスサイズは `window.innerWidth/innerHeight - 200` を基準に算出

## インタラクション

- 空白をタップ: ピンを追加（メモ入力をプロンプト）
- ピンをタップ: 線の入力ポップオーバー（角度°・長さ）を表示
- 線の描画: 選択ピンから線を引き、終端に自動でピンを追加
- ピンを長押し: メモ（名前）を編集
- 2本指ピンチ: 中心を基準にズーム（再センタリング）

## 次の一手（提案）

- `window.resize` リスナーを追加して `setCanvasSizeFromWindow()` と `redrawScene()` を呼ぶ
- パン操作の追加（例: 二本指パン、またはモード切替で単指パン）
- 保存/読み込みの実装（LocalStorage または JSON エクスポート/インポート）
- ポップオーバーUX改善（Enterで確定、入力検証、フォーカストラップ）
- Editor/Pedometer/Compass 間で z-index / `pointer-events` 方針を定義
- 任意: `// @ts-check` + JSDoc 型の導入、もしくは TypeScript 移行の検討
- 任意: 状態/描画が複雑化したら Lit の導入検討

## データ形（JSDoc）

- Pin: `{ x: number, y: number, memo: string }`
- Line: `{ from: {x:number,y:number}, to: {x:number,y:number} }`
