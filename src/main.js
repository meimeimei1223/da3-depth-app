// CDNから読み込んだ ort を使用

const imageInput = document.getElementById('imageInput');
const processBtn = document.getElementById('processBtn');
const statusText = document.getElementById('status');
const inputImage = document.getElementById('inputImage');
const depthCanvas = document.getElementById('depthCanvas');

let session = null;
let currentImageData = null;
let originalWidth = 0;   // 元の幅を保存
let originalHeight = 0;  // 元の高さを保存

// モデルを読み込み
async function loadModel() {
  if (session) return session;
  
  statusText.textContent = '⏳ モデル読み込み中...';
  
  try {
    session = await ort.InferenceSession.create(
      '/models/model_single.onnx',
      { executionProviders: ['wasm'] }
    );
    statusText.textContent = '✅ モデル準備完了！画像を選択してください';
    return session;
  } catch (error) {
    statusText.textContent = '❌ モデル読み込みエラー: ' + error.message;
    console.error(error);
    throw error;
  }
}

// 画像選択時
imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const url = URL.createObjectURL(file);
  inputImage.src = url;
  inputImage.classList.add('show');
  
  currentImageData = await loadImageData(file);
  
  processBtn.disabled = false;
  statusText.textContent = `✅ 画像を読み込みました (${originalWidth}x${originalHeight})。「深度推定を実行」をクリック`;
});

// 画像データを読み込み
async function loadImageData(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 元のサイズを保存
      originalWidth = img.width;
      originalHeight = img.height;
      
      // 推論用に518x518にリサイズ
      const canvas = document.createElement('canvas');
      canvas.width = 518;
      canvas.height = 518;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 518, 518);
      resolve(ctx.getImageData(0, 0, 518, 518));
    };
    img.src = URL.createObjectURL(file);
  });
}

// 深度推定を実行
processBtn.addEventListener('click', async () => {
  if (!currentImageData) return;
  
  processBtn.disabled = true;
  statusText.textContent = '⏳ 深度推定中...';
  
  try {
    await loadModel();
    
    // 前処理
    const input = preprocessImage(currentImageData);
    
    // 推論（V3は5次元: [1, 1, 3, H, W]）
    const startTime = performance.now();
    const tensor = new ort.Tensor('float32', input, [1, 1, 3, 518, 518]);
    const results = await session.run({ pixel_values: tensor });
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    
    // 深度マップを描画（元のサイズにリサイズ）
    const depthData = results.predicted_depth.data;
    renderDepth(depthData, 518, 518, originalWidth, originalHeight);
    
    statusText.textContent = `✅ 完了！ (${elapsed}秒) 出力: ${originalWidth}x${originalHeight}`;
    
  } catch (error) {
    statusText.textContent = '❌ エラー: ' + error.message;
    console.error(error);
  } finally {
    processBtn.disabled = false;
  }
});

// 前処理（V3用: 5次元）
function preprocessImage(imageData) {
  const input = new Float32Array(1 * 1 * 3 * 518 * 518);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  
  for (let y = 0; y < 518; y++) {
    for (let x = 0; x < 518; x++) {
      const idx = (y * 518 + x) * 4;
      const r = imageData.data[idx] / 255;
      const g = imageData.data[idx + 1] / 255;
      const b = imageData.data[idx + 2] / 255;
      
      // [1, 1, C, H, W] 形式（V3は5次元）
      input[0 * 518 * 518 + y * 518 + x] = (r - mean[0]) / std[0];
      input[1 * 518 * 518 + y * 518 + x] = (g - mean[1]) / std[1];
      input[2 * 518 * 518 + y * 518 + x] = (b - mean[2]) / std[2];
    }
  }
  
  return input;
}

// 深度マップを描画（元のサイズにリサイズ）
function renderDepth(depthData, srcWidth, srcHeight, dstWidth, dstHeight) {
  const ctx = depthCanvas.getContext('2d');
  
  // まず518x518で描画
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = srcWidth;
  tempCanvas.height = srcHeight;
  const tempCtx = tempCanvas.getContext('2d');
  
  // 正規化
  let min = Infinity, max = -Infinity;
  for (const v of depthData) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  
  const imgData = tempCtx.createImageData(srcWidth, srcHeight);
  
  for (let i = 0; i < depthData.length; i++) {
    const normalized = (depthData[i] - min) / (max - min);
    const idx = i * 4;
    
    // Infernoカラーマップ風
    const t = normalized;
    imgData.data[idx] = Math.floor(255 * Math.min(1, 1.5 * t));
    imgData.data[idx + 1] = Math.floor(255 * Math.sin(Math.PI * t));
    imgData.data[idx + 2] = Math.floor(255 * (1 - t));
    imgData.data[idx + 3] = 255;
  }
  
  tempCtx.putImageData(imgData, 0, 0);
  
  // 元のサイズにリサイズして描画
  depthCanvas.width = dstWidth;
  depthCanvas.height = dstHeight;
  depthCanvas.classList.add('show');
  
  // 高品質リサイズ
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tempCanvas, 0, 0, dstWidth, dstHeight);
}

// 起動時にモデルを事前読み込み
loadModel();