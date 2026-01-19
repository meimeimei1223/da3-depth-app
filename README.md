# Depth Anything V3 Desktop App

Tauriで作成した深度推定デスクトップアプリです。

## スクリーンショット

（後でスクリーンショットを追加）

## ダウンロード

[Releases](https://github.com/meimeimei1223/da3-depth-app/releases) からexeをダウンロードしてください。

## セットアップ

### 1. モデルのダウンロード

アプリを動かすにはONNXモデルが必要です。

1. [onnx-community/depth-anything-v3-small](https://huggingface.co/onnx-community/depth-anything-v3-small) にアクセス
2. `onnx/model.onnx` と `onnx/model.onnx_data` をダウンロード
3. Pythonで単一ファイルに変換：
```python
import onnx
model = onnx.load("model.onnx")
onnx.save(model, "model_single.onnx", save_as_external_data=False)
```

4. `model_single.onnx` をアプリの `src/models/` フォルダに配置

### 2. アプリの実行

exeを起動して、画像を選択し「深度推定を実行」をクリック。

## 開発者向け

### 必要なもの

- Node.js 18+
- Rust

### ビルド
```bash
git clone https://github.com/meimeimei1223/da3-depth-app.git
cd da3-depth-app
npm install
npm run tauri dev
```

## クレジット

- [Depth Anything V3](https://github.com/ByteDance-Seed/Depth-Anything-3) by ByteDance (Apache 2.0)
- [onnx-community](https://huggingface.co/onnx-community/depth-anything-v3-small) (Apache 2.0)
- [Tauri](https://tauri.app/) (MIT)
- [ONNX Runtime](https://onnxruntime.ai/) (MIT)

## ライセンス

MIT License
