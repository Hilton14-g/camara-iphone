import { GIFEncoder, quantize, applyPalette } from 'gifenc';

/**
 * Captures animated frames from a video stream and encodes them into an animated GIF
 * @param {HTMLVideoElement} videoElement
 * @param {Object} options
 * @returns {Promise<Blob>}
 */
export async function createLivePhotoGif(videoElement, options = {}) {
  const {
    durationMs = 1600,
    fps = 10, // 10-12 fps gives great fluidity and small file size
    aspectRatio = '4:3',
    styleId = 'standard',
    width = 480 // crisp mobile-friendly resolution
  } = options;

  const totalFrames = Math.round((durationMs / 1000) * fps);
  const frameIntervalMs = Math.round(durationMs / totalFrames);

  // Compute height maintaining aspect ratio
  let targetAspect = 4 / 3;
  if (aspectRatio === '16:9') targetAspect = 16 / 9;
  if (aspectRatio === '1:1') targetAspect = 1;
  const height = Math.round(width / targetAspect);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const gif = GIFEncoder();
  const delay = Math.round(1000 / fps); // ms per frame

  // Crop calculation from video source
  const srcW = videoElement.videoWidth || 1280;
  const srcH = videoElement.videoHeight || 960;
  let cropW = srcW;
  let cropH = srcH;
  const curAspect = srcW / srcH;

  if (curAspect > targetAspect) {
    cropW = srcH * targetAspect;
  } else {
    cropH = srcW / targetAspect;
  }
  const cropX = (srcW - cropW) / 2;
  const cropY = (srcH - cropH) / 2;

  // Capture frames sequentially
  for (let i = 0; i < totalFrames; i++) {
    // Draw current frame cropped
    ctx.drawImage(videoElement, cropX, cropY, cropW, cropH, 0, 0, width, height);

    // Apply color tone enhancement for iPhone look
    const imgData = ctx.getImageData(0, 0, width, height);
    enhanceGifFrame(imgData.data, styleId);
    ctx.putImageData(imgData, 0, 0);

    const frameData = ctx.getImageData(0, 0, width, height).data;

    // Palette quantization
    const palette = quantize(frameData, 256, {
      format: 'rgba4444'
    });
    const index = applyPalette(frameData, palette);

    gif.writeFrame(index, width, height, {
      palette,
      delay,
      repeat: 0 // Infinite loop!
    });

    // Wait until next frame capture interval
    if (i < totalFrames - 1) {
      await new Promise(r => setTimeout(r, frameIntervalMs));
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes], { type: 'image/gif' });
}

/**
 * Enhances contrast, sharpness and vibrance on individual GIF frames
 */
function enhanceGifFrame(data, styleId) {
  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // S-curve contrast boost
    r = r < 128 ? Math.pow(r / 128, 1.1) * 128 : 255 - Math.pow((255 - r) / 128, 1.1) * 128;
    g = g < 128 ? Math.pow(g / 128, 1.1) * 128 : 255 - Math.pow((255 - g) / 128, 1.1) * 128;
    b = b < 128 ? Math.pow(b / 128, 1.1) * 128 : 255 - Math.pow((255 - b) / 128, 1.1) * 128;

    // Style warmth/cool adjustments
    if (styleId === 'warm') {
      r = Math.min(255, r * 1.06);
      b = Math.max(0, b * 0.94);
    } else if (styleId === 'cool') {
      b = Math.min(255, b * 1.06);
      r = Math.max(0, r * 0.94);
    } else if (styleId === 'vibrant') {
      const avg = (r + g + b) / 3;
      r = Math.min(255, Math.max(0, r + (r - avg) * 0.18));
      g = Math.min(255, Math.max(0, g + (g - avg) * 0.18));
      b = Math.min(255, Math.max(0, b + (b - avg) * 0.18));
    }

    data[i] = Math.min(255, Math.max(0, Math.round(r)));
    data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
    data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
  }
}
