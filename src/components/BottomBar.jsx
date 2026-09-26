import React, { useState } from 'react';
import { AppleIcons } from './AppleIcons';
import { triggerHaptic } from '../utils/haptics';

export default function BottomBar({
  onCapture,
  onFlipCamera,
  lastCapture,
  onOpenGallery,
  isRecordingVideo,
  mode,
  isCapturing,
  livePhotoActive
}) {
  const [isPressed, setIsPressed] = useState(false);

  const handleShutterClick = () => {
    triggerHaptic('shutter');
    onCapture();
  };

  const handleFlip = () => {
    triggerHaptic('medium');
    onFlipCamera();
  };

  return (
    <footer className="ios-bottom-bar">
      {/* Left: Gallery Thumbnail */}
      <div className="bottom-bar-col left">
        <button
          className="ios-thumbnail-btn"
          onClick={onOpenGallery}
          aria-label="Abrir galería de fotos"
        >
          {lastCapture ? (
            <div className="thumbnail-preview-wrap">
              <img
                src={lastCapture.thumbnailUrl}
                alt="Última foto"
                className="thumbnail-img"
              />
              {lastCapture.type === 'live' && (
                <div className="thumbnail-live-badge">
                  <AppleIcons.LivePhoto size={10} active={true} />
                </div>
              )}
            </div>
          ) : (
            <div className="thumbnail-placeholder" />
          )}
        </button>
      </div>

      {/* Center: Iconic Apple Shutter Button */}
      <div className="bottom-bar-col center">
        <button
          className={`ios-shutter-outer ${isPressed ? 'pressed' : ''} ${mode === 'video' ? 'video-mode' : ''} ${isRecordingVideo ? 'recording' : ''} ${isCapturing ? 'capturing' : ''} ${livePhotoActive && mode !== 'video' ? 'live-mode' : ''}`}
          onClick={handleShutterClick}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          disabled={isCapturing}
          aria-label="Tomar foto o grabar"
        >
          <div className="ios-shutter-inner">
            {mode === 'video' && isRecordingVideo && <div className="video-recording-square" />}
          </div>
        </button>
      </div>

      {/* Right: Camera Flip (Selfie / Rear) */}
      <div className="bottom-bar-col right">
        <button
          className="ios-flip-btn"
          onClick={handleFlip}
          aria-label="Girar cámara"
          title="Cambiar entre cámara trasera y delantera"
        >
          <AppleIcons.FlipCamera size={26} />
        </button>
      </div>
    </footer>
  );
}
