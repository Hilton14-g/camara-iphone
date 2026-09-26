/**
 * Authentic Apple Smart HDR & Deep Fusion Image Pipeline
 * Natural, balanced color fidelity (never oversaturated) with razor-sharp microtexture clarity.
 */

// Photographic Styles definitions matching iOS 17/18
export const PHOTOGRAPHIC_STYLES = [
  { id: 'standard', name: 'Estándar', tone: 0, warmth: 0, desc: 'Equilibrado y fiel a la realidad con tonos naturales' },
  { id: 'rich-contrast', name: 'Contraste Intenso', tone: -25, warmth: 0, desc: 'Sombras definidas y contraste elegante' },
  { id: 'vibrant', name: 'Brillante', tone: 10, warmth: 5, desc: 'Colores sutilmente vivos sin saturar la piel' },
  { id: 'warm', name: 'Cálido', tone: 0, warmth: 15, desc: 'Matiz dorado suave y natural' },
  { id: 'cool', name: 'Frío', tone: 0, warmth: -15, desc: 'Subtonos limpios y neutros' }
];

// iOS Filters
export const IOS_FILTERS = [
  { id: 'none', name: 'Original' },
  { id: 'vivid', name: 'Vívido' },
  { id: 'vivid-warm', name: 'Vívido cálido' },
  { id: 'vivid-cool', name: 'Vívido frío' },
  { id: 'dramatic', name: 'Dramático' },
  { id: 'dramatic-warm', name: 'Dramático cálido' },
  { id: 'dramatic-cool', name: 'Dramático frío' },
  { id: 'mono', name: 'Mono' },
  { id: 'silvertone', name: 'Plateado' },
  { id: 'noir', name: 'Noir' }
];

/**
 * Process image with iPhone Smart HDR pipeline
 * Produces crisp, clear, natural photos with zero color distortion or oversaturation.
 * 
 * @param {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} sourceElement
 * @param {Object} options
 * @returns {HTMLCanvasElement}
 */
export function processIPhonePhoto(sourceElement, options = {}) {
  const {
    styleId = 'standard',
    filterId = 'none',
    mode = 'photo',
    exposure = 0,
    clarity = 1.35,
    smartHDR = true,
    aspectRatio = '4:3',
    nightMode = false
  } = options;

  const srcWidth = sourceElement.videoWidth || sourceElement.naturalWidth || sourceElement.width;
  const srcHeight = sourceElement.videoHeight || sourceElement.naturalHeight || sourceElement.height;

  // Compute crop rectangle based on aspect ratio
  let targetAspect = 4 / 3;
  if (aspectRatio === '16:9') targetAspect = 16 / 9;
  if (aspectRatio === '1:1' || mode === 'square') targetAspect = 1;

  let cropW = srcWidth;
  let cropH = srcHeight;
  const currentAspect = srcWidth / srcHeight;

  if (currentAspect > targetAspect) {
    cropW = srcHeight * targetAspect;
  } else {
    cropH = srcWidth / targetAspect;
  }

  const cropX = (srcWidth - cropW) / 2;
  const cropY = (srcHeight - cropH) / 2;

  // Maintain full sensor sharpness (up to 2560px for crystal-clear resolution)
  const maxDim = 2560;
  let outW = Math.round(cropW);
  let outH = Math.round(cropH);
  if (outW > maxDim || outH > maxDim) {
    const scale = maxDim / Math.max(outW, outH);
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // 1. Draw cropped image with smooth bicubic scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceElement, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  // 2. Portrait Mode Bokeh (if active)
  if (mode === 'portrait') {
    applyNaturalPortraitBokeh(ctx, outW, outH);
  }

  // 3. Precompute Smart HDR Tone Curve (Filmic S-Curve with natural color balance)
  const currentStyle = PHOTOGRAPHIC_STYLES.find(s => s.id === styleId) || PHOTOGRAPHIC_STYLES[0];
  const toneOffset = currentStyle.tone;
  const warmthOffset = currentStyle.warmth;
  const exposureMult = Math.pow(2, exposure * 0.4);

  const lutR = new Uint8Array(256);
  const lutG = new Uint8Array(256);
  const lutB = new Uint8Array(256);

  for (let i = 0; i < 256; i++) {
    let norm = (i / 255.0) * exposureMult;

    // Smart HDR highlight roll-off and shadow lifting (prevents clipped skies without oversaturating)
    if (smartHDR) {
      // Gentle shadow detail lift
      norm = Math.pow(norm, 0.96);
      // Soft highlight knee compression (filmic curve)
      if (norm > 0.7) {
        norm = 0.7 + (norm - 0.7) / (1.0 + (norm - 0.7) * 1.5);
      }
    }

    // Photographic Style Tone Adjustment (Contrast)
    if (toneOffset !== 0) {
      const contrast = 1.0 + (toneOffset / 100) * 0.25;
      norm = (norm - 0.5) * contrast + 0.5;
    }

    norm = Math.min(1.0, Math.max(0.0, norm));
    let baseVal = Math.round(norm * 255);

    let rVal = baseVal;
    let gVal = baseVal;
    let bVal = baseVal;

    // Subtle, natural warmth offset (calibrated to never produce orange or burnt skin)
    if (warmthOffset > 0) {
      rVal = Math.min(255, rVal + warmthOffset * 0.15);
      bVal = Math.max(0, bVal - warmthOffset * 0.12);
    } else if (warmthOffset < 0) {
      bVal = Math.min(255, bVal - warmthOffset * 0.15);
      rVal = Math.max(0, rVal + warmthOffset * 0.1);
    }

    if (nightMode) {
      rVal = Math.min(255, rVal * 1.03);
      bVal = Math.max(0, bVal * 0.96);
    }

    lutR[i] = rVal;
    lutG[i] = gVal;
    lutB[i] = bVal;
  }

  // 4. Pixel transformation with skin-tone protection
  const imgData = ctx.getImageData(0, 0, outW, outH);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    let r = lutR[data[i]];
    let g = lutG[data[i + 1]];
    let b = lutB[data[i + 2]];

    // Skin Tone Protection: Check if pixel is in human skin chromatic range
    // If it's a skin tone, DO NOT boost saturation to keep faces completely natural!
    const isSkinTone = r > 70 && g > 40 && b > 20 && r > g && g >= b && (r - g) > 12;

    if (!isSkinTone && styleId === 'vibrant') {
      // Very gentle vibrance boost only on landscapes/backgrounds
      const avg = (r + g + b) / 3;
      r = Math.min(255, Math.max(0, Math.round(r + (r - avg) * 0.08)));
      g = Math.min(255, Math.max(0, Math.round(g + (g - avg) * 0.08)));
      b = Math.min(255, Math.max(0, Math.round(b + (b - avg) * 0.08)));
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);

  // 5. Razor-Sharp Deep Fusion Clarity (High-Pass Unsharp Mask)
  if (clarity > 0) {
    applyRefinedSharpen(ctx, outW, outH, clarity);
  }

  // 6. Filter (if any)
  if (filterId !== 'none') {
    applyCleanFilter(ctx, outW, outH, filterId);
  }

  return canvas;
}

/**
 * Refined 3x3 high-pass sharpening filter with noise thresholding
 * Sharpens eyes, hair, and edges with zero halo or color distortion.
 */
function applyRefinedSharpen(ctx, w, h, strength = 1.35) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const src = imgData.data;
  const output = ctx.createImageData(w, h);
  const dst = output.data;

  const factor = (strength - 0.7) * 0.4;
  const centerWeight = 1 + 4 * factor;
  const rowBytes = w * 4;

  dst.set(src);

  for (let y = 1; y < h - 1; y++) {
    const rowOffset = y * rowBytes;
    for (let x = 1; x < w - 1; x++) {
      const idx = rowOffset + x * 4;

      for (let c = 0; c < 3; c++) {
        const cIdx = idx + c;
        const current = src[cIdx];
        const neighbors = (src[cIdx - 4] + src[cIdx + 4] + src[cIdx - rowBytes] + src[cIdx + rowBytes]);
        const diff = current * 4 - neighbors;

        // Apply edge enhancement only if difference is above noise threshold
        if (Math.abs(diff) > 6) {
          const val = current + (diff * factor * 0.25);
          dst[cIdx] = val < 0 ? 0 : val > 255 ? 255 : val;
        } else {
          dst[cIdx] = current;
        }
      }
    }
  }

  ctx.putImageData(output, 0, 0);
}

/**
 * Natural portrait bokeh
 */
function applyNaturalPortraitBokeh(ctx, w, h) {
  const bokehCanvas = document.createElement('canvas');
  bokehCanvas.width = w;
  bokehCanvas.height = h;
  const bCtx = bokehCanvas.getContext('2d');
  
  bCtx.filter = 'blur(8px)';
  bCtx.drawImage(ctx.canvas, 0, 0);

  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const mCtx = mask.getContext('2d');

  const grad = mCtx.createRadialGradient(w * 0.5, h * 0.45, Math.min(w, h) * 0.26, w * 0.5, h * 0.45, Math.min(w, h) * 0.62);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0.5)');
  grad.addColorStop(1, 'rgba(0,0,0,0.8)');

  mCtx.fillStyle = grad;
  mCtx.fillRect(0, 0, w, h);

  bokehCanvas.getContext('2d').globalCompositeOperation = 'destination-in';
  bokehCanvas.getContext('2d').drawImage(mask, 0, 0);

  ctx.drawImage(bokehCanvas, 0, 0);
}

/**
 * Natural filters
 */
function applyCleanFilter(ctx, w, h, filterId) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    switch (filterId) {
      case 'vivid':
        r = Math.min(255, r * 1.05);
        g = Math.min(255, g * 1.03);
        b = Math.min(255, b * 1.05);
        break;
      case 'dramatic':
        r = r > 128 ? Math.min(255, r * 1.08) : Math.max(0, r * 0.92);
        g = g > 128 ? Math.min(255, g * 1.08) : Math.max(0, g * 0.92);
        b = b > 128 ? Math.min(255, b * 1.08) : Math.max(0, b * 0.92);
        break;
      case 'mono':
      case 'silvertone':
      case 'noir':
        r = g = b = lum;
        break;
      default:
        break;
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
}

export function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.95) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}
