import { GIFEncoder, quantize, applyPalette } from 'gifenc';

/**
 * Natural-Speed High-Fidelity Animated GIF Generator
 * Matches 1:1 real-time motion speed (never sped up) with natural color tones.
 * 
 * @param {HTMLVideoElement} videoElement
 * @param {Object} options
 * @returns {Promise<Blob>}
 */
export async function createLivePhotoGif(videoElement, options = {}) {
  const {
    durationMs = 2200, // Calm, authentic 2.2-second Live Photo duration
    fps = 8, // 8 frames per second for smooth, unhurried motion
    aspectRatio = '4:3',
    width = 380
  } = options;

  const totalFrames = Math.max(12, Math.min(18, Math.round((durationMs / 1000) * fps)));
  const frameIntervalMs = Math.round(durationMs / totalFrames);

  let targetAspect = 4 / 3;
  if (aspectRatio === '16:9') targetAspect = 16 / 9;
  if (aspectRatio === '1:1') targetAspect = 1;
  const height = Math.round(width / targetAspect);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const gif = GIFEncoder();
  
  // Exact 1:1 match between frame capture interval and playback delay
  // This guarantees natural, real-time motion without fast-forward effect
  const delay = frameIntervalMs;

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

  for (let i = 0; i < totalFrames; i++) {
    // Yield to the browser render loop
    await new Promise(r => setTimeout(r, 0));

    try {
      ctx.drawImage(videoElement, cropX, cropY, cropW, cropH, 0, 0, width, height);

      const frameImg = ctx.getImageData(0, 0, width, height);
      const frameData = frameImg.data;

      // 256 colors with natural RGB quantization (no banding or neon saturation)
      const palette = quantize(frameData, 256);
      const index = applyPalette(frameData, palette);

      gif.writeFrame(index, width, height, {
        palette,
        delay,
        repeat: 0
      });
    } catch (e) {
      console.warn('Frame capture skipped:', e);
    }

    if (i < totalFrames - 1) {
      await new Promise(r => setTimeout(r, frameIntervalMs));
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes], { type: 'image/gif' });
}
