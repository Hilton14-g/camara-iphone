/**
 * Apple iPhone Smart HDR & Deep Fusion Image Pipeline
 * Provides unsharp masking, dynamic tone mapping, photographic styles,
 * portrait bokeh simulation, and high-clarity image processing.
 */

// Photographic Styles definitions matching iOS 17/18
export const PHOTOGRAPHIC_STYLES = [
  { id: 'standard', name: 'Estándar', tone: 0, warmth: 0, desc: 'Equilibrado y fiel a la realidad' },
  { id: 'rich-contrast', name: 'Contraste Intenso', tone: -35, warmth: 0, desc: 'Sombras más oscuras y colores ricos' },
  { id: 'vibrant', name: 'Brillante', tone: 20, warmth: 10, desc: 'Colores vivos y luminosos' },
  { id: 'warm', name: 'Cálido', tone: 0, warmth: 35, desc: 'Matices dorados tipo atardecer' },
  { id: 'cool', name: 'Frío', tone: 0, warmth: -35, desc: 'Subtonos azules y limpios' }
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
 * Process a captured image element or canvas with iPhone Smart HDR pipeline
 * @param {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} sourceElement
 * @param {Object} options
 * @returns {HTMLCanvasElement}
 */
export function processIPhonePhoto(sourceElement, options = {}) {
  const {
    styleId = 'standard',
    filterId = 'none',
    mode = 'photo', // 'photo', 'portrait', 'square'
    exposure = 0, // -2 to +2
    clarity = 1.25, // Unsharp mask strength (iPhone Deep Fusion crispness)
    smartHDR = true,
    aspectRatio = '4:3', // '4:3', '16:9', '1:1'
    nightMode = false
  } = options;

  // Determine source dimensions
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
    // Current is wider than target: crop sides
    cropW = srcHeight * targetAspect;
  } else {
    // Current is taller than target: crop top & bottom
    cropH = srcWidth / targetAspect;
  }

  const cropX = (srcWidth - cropW) / 2;
  const cropY = (srcHeight - cropH) / 2;

  // Create primary processing canvas
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cropW);
  canvas.height = Math.round(cropH);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // 1. Draw cropped image
  ctx.drawImage(sourceElement, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

  // 2. If Portrait mode: apply depth-of-field bokeh
  if (mode === 'portrait') {
    applyPortraitBokeh(ctx, canvas.width, canvas.height);
  }

  // 3. Extract raw pixel data for Deep Fusion & Smart HDR Pipeline
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const len = data.length;

  // Style parameters
  const currentStyle = PHOTOGRAPHIC_STYLES.find(s => s.id === styleId) || PHOTOGRAPHIC_STYLES[0];
  const toneOffset = currentStyle.tone; // -50 to +50
  const warmthOffset = currentStyle.warmth; // -50 to +50

  // Exposure multiplier
  const exposureMult = Math.pow(2, exposure * 0.45 + (nightMode ? 0.35 : 0));

  // Pre-calculate Smart HDR tone curves (S-Curve contrast & highlight recovery)
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let normalized = i / 255.0;

    // Apply exposure
    normalized = normalized * exposureMult;

    // Smart HDR highlight protection & shadow lift
    if (smartHDR) {
      // Gentle shadow lift
      normalized = Math.pow(normalized, 0.94);
      // Highlight compression to avoid clipping
      normalized = normalized / (1.0 + 0.28 * normalized);
      normalized = normalized * 1.28;
    }

    // Apply tone offset from Photographic Style (contrast adjustment)
    if (toneOffset !== 0) {
      const contrastFactor = 1.0 + (toneOffset / 100) * 0.4;
      normalized = (normalized - 0.5) * contrastFactor + 0.5;
    }

    lut[i] = Math.min(255, Math.max(0, Math.round(normalized * 255)));
  }

  // Pixel color adjustment loop
  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Smart HDR Tone curve
    r = lut[r];
    g = lut[g];
    b = lut[b];

    // Apply Warmth from Photographic Style
    if (warmthOffset !== 0) {
      if (warmthOffset > 0) {
        // Warm: boost red, slightly green, reduce blue
        r = Math.min(255, r + warmthOffset * 0.35);
        b = Math.max(0, b - warmthOffset * 0.28);
      } else {
        // Cool: boost blue, reduce red
        b = Math.min(255, b - warmthOffset * 0.32);
        r = Math.max(0, r + warmthOffset * 0.25);
      }
    }

    // Smart Vibrance (preserves skin tones while boosting unsaturated colors)
    const maxVal = Math.max(r, g, b);
    const minVal = Math.min(r, g, b);
    const sat = (maxVal - minVal) / (maxVal || 1);
    
    // Default vibrance boost for iPhone look
    const vibranceBoost = (styleId === 'vibrant' ? 0.32 : 0.16) * (1.0 - sat);
    const avg = (r + g + b) / 3;
    r = Math.min(255, Math.max(0, r + (r - avg) * vibranceBoost));
    g = Math.min(255, Math.max(0, g + (g - avg) * vibranceBoost));
    b = Math.min(255, Math.max(0, b + (b - avg) * vibranceBoost));

    // Night Mode warm color temperature correction
    if (nightMode) {
      r = Math.min(255, r * 1.05);
      b = Math.max(0, b * 0.92);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);

  // 4. Apply Unsharp Masking for iPhone Deep Fusion Sharpness
  if (clarity > 0) {
    applyUnsharpMask(ctx, canvas.width, canvas.height, clarity);
  }

  // 5. Apply Selected iOS Filter (if any)
  if (filterId !== 'none') {
    applyFilter(ctx, canvas.width, canvas.height, filterId);
  }

  return canvas;
}

/**
 * High-performance Unsharp Mask filter to create ultra-sharp iPhone clarity
 */
function applyUnsharpMask(ctx, width, height, amount = 1.2) {
  // Create an offscreen canvas with a subtle blur to compute high-pass difference
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = width;
  blurCanvas.height = height;
  const blurCtx = blurCanvas.getContext('2d');

  // Fast box blur approximation using CSS filter or multi-draw
  blurCtx.filter = 'blur(1.5px)';
  blurCtx.drawImage(ctx.canvas, 0, 0);

  const origData = ctx.getImageData(0, 0, width, height);
  const blurData = blurCtx.getImageData(0, 0, width, height);

  const o = origData.data;
  const b = blurData.data;
  const len = o.length;
  const threshold = 4; // Threshold to prevent amplifying sensor noise

  for (let i = 0; i < len; i += 4) {
    for (let c = 0; c < 3; c++) {
      const idx = i + c;
      const diff = o[idx] - b[idx];
      if (Math.abs(diff) > threshold) {
        // High-pass sharpening
        const sharpened = o[idx] + diff * amount;
        o[idx] = Math.min(255, Math.max(0, sharpened));
      }
    }
  }

  ctx.putImageData(origData, 0, 0);
}

/**
 * Simulates Apple Portrait Mode depth bokeh (f/1.4 - f/2.4 aperture blur)
 */
function applyPortraitBokeh(ctx, width, height) {
  // Create blurred layer
  const bokehCanvas = document.createElement('canvas');
  bokehCanvas.width = width;
  bokehCanvas.height = height;
  const bCtx = bokehCanvas.getContext('2d');
  
  bCtx.filter = 'blur(12px) brightness(1.02)';
  bCtx.drawImage(ctx.canvas, 0, 0);

  // Create radial mask (focused subject in center/upper-third, soft edges)
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const mCtx = maskCanvas.getContext('2d');

  const centerX = width * 0.5;
  const centerY = height * 0.45;
  const innerRadius = Math.min(width, height) * 0.28;
  const outerRadius = Math.min(width, height) * 0.65;

  const grad = mCtx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); // Focused sharp center
  grad.addColorStop(0.5, 'rgba(0,0,0,0.4)');
  grad.addColorStop(1, 'rgba(0,0,0,0.85)'); // Blurred background

  mCtx.fillStyle = grad;
  mCtx.fillRect(0, 0, width, height);

  // Composite blurred background over the image using the mask
  bokehCanvas.getContext('2d').globalCompositeOperation = 'destination-in';
  bokehCanvas.getContext('2d').drawImage(maskCanvas, 0, 0);

  ctx.drawImage(bokehCanvas, 0, 0);
}

/**
 * Apply iconic Apple iOS photo filters
 */
function applyFilter(ctx, width, height, filterId) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    switch (filterId) {
      case 'vivid':
        r = Math.min(255, r * 1.15);
        g = Math.min(255, g * 1.1);
        b = Math.min(255, b * 1.15);
        break;
      case 'vivid-warm':
        r = Math.min(255, r * 1.2);
        g = Math.min(255, g * 1.08);
        b = Math.max(0, b * 0.9);
        break;
      case 'vivid-cool':
        r = Math.max(0, r * 0.95);
        g = Math.min(255, g * 1.05);
        b = Math.min(255, b * 1.25);
        break;
      case 'dramatic':
        // High contrast S-curve
        r = r > 128 ? Math.min(255, r * 1.2) : Math.max(0, r * 0.8);
        g = g > 128 ? Math.min(255, g * 1.2) : Math.max(0, g * 0.8);
        b = b > 128 ? Math.min(255, b * 1.2) : Math.max(0, b * 0.8);
        break;
      case 'mono':
        r = g = b = lum;
        break;
      case 'silvertone':
        // Bright metallic monochrome
        r = g = b = Math.min(255, Math.pow(lum / 255, 0.85) * 255);
        break;
      case 'noir':
        // Deep black monochrome with high contrast
        const noirLum = lum > 110 ? Math.min(255, lum * 1.25) : Math.max(0, lum * 0.65);
        r = g = b = noirLum;
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

/**
 * Converts a Canvas to a downloadable Blob
 * @param {HTMLCanvasElement} canvas
 * @param {string} mimeType
 * @param {number} quality
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.95) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}
