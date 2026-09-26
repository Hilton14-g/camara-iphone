import React, { useRef, useState, useEffect } from 'react';
import { AppleIcons } from './AppleIcons';
import { triggerHaptic } from '../utils/haptics';

export default function CameraView({
  videoRef,
  aspectRatio,
  mode,
  showGrid,
  showLevel,
  exposure,
  setExposure,
  zoom,
  flashBurst,
  countdown,
  onTapFocus
}) {
  const containerRef = useRef(null);
  const [focusBox, setFocusBox] = useState(null); // { x, y, active: bool }
  const [tiltAngle, setTiltAngle] = useState(0);
  const [isLevel, setIsLevel] = useState(true);
  const isDraggingSun = useRef(false);
  const startDragY = useRef(0);
  const startExposure = useRef(0);

  // Handle device orientation for the iOS 17 horizon spirit level
  useEffect(() => {
    const handleOrientation = (e) => {
      if (e.gamma !== null) {
        // gamma is roll in degrees (-90 to 90)
        const angle = Math.round(e.gamma);
        setTiltAngle(angle);
        setIsLevel(Math.abs(angle) <= 1.5 || Math.abs(Math.abs(angle) - 90) <= 1.5);
      }
    };

    if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ permission can be requested on touch
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Handle tap-to-focus on the camera viewfinder
  const handleViewfinderClick = (e) => {
    if (isDraggingSun.current) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    triggerHaptic('light');
    setFocusBox({ x, y, active: true });

    if (onTapFocus) {
      onTapFocus({ x: x / rect.width, y: y / rect.height });
    }

    // Auto dismiss focus box after 3 seconds of inactivity
    clearTimeout(window.focusBoxTimeout);
    window.focusBoxTimeout = setTimeout(() => {
      setFocusBox(prev => prev ? { ...prev, active: false } : null);
    }, 3200);
  };

  // Sun exposure dragging handler
  const handleSunMouseDown = (e) => {
    e.stopPropagation();
    isDraggingSun.current = true;
    startDragY.current = e.clientY || (e.touches && e.touches[0].clientY);
    startExposure.current = exposure;

    const handleMove = (ev) => {
      if (!isDraggingSun.current) return;
      const clientY = ev.clientY || (ev.touches && ev.touches[0].clientY);
      const deltaY = startDragY.current - clientY;
      // 100px drag = 1.0 EV change
      const newExp = Math.min(2, Math.max(-2, startExposure.current + deltaY / 100));
      setExposure(parseFloat(newExp.toFixed(1)));
    };

    const handleEnd = () => {
      isDraggingSun.current = false;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
  };

  // Determine aspect ratio class
  let aspectClass = 'aspect-4-3';
  if (aspectRatio === '16:9') aspectClass = 'aspect-16-9';
  if (aspectRatio === '1:1' || mode === 'square') aspectClass = 'aspect-1-1';

  return (
    <div className="ios-viewfinder-container">
      <div
        ref={containerRef}
        className={`ios-viewfinder-frame ${aspectClass}`}
        onClick={handleViewfinderClick}
      >
        {/* Live Camera Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`ios-camera-video ${mode === 'portrait' ? 'portrait-preview' : ''}`}
          style={{
            transform: `scale(${zoom})`,
            filter: `brightness(${1 + exposure * 0.15})`
          }}
        />

        {/* Screen Flash burst effect */}
        {flashBurst && <div className="ios-flash-overlay animate-flash" />}

        {/* 3x3 Rule of Thirds Grid */}
        {showGrid && (
          <div className="ios-grid-overlay">
            <div className="grid-line vertical line-1" />
            <div className="grid-line vertical line-2" />
            <div className="grid-line horizontal line-1" />
            <div className="grid-line horizontal line-2" />
          </div>
        )}

        {/* iOS 17 Horizon Spirit Level Indicator */}
        {showLevel && (
          <div className="ios-level-container">
            <div
              className={`ios-level-bar ${isLevel ? 'is-level' : ''}`}
              style={{ transform: `rotate(${-tiltAngle}deg)` }}
            >
              <div className="level-dash left" />
              <div className="level-dot" />
              <div className="level-dash right" />
            </div>
          </div>
        )}

        {/* Tap-to-Focus Yellow Box & Sun Exposure Slider */}
        {focusBox && focusBox.active && (
          <div
            className="ios-focus-box animate-focus-in"
            style={{ left: `${focusBox.x}px`, top: `${focusBox.y}px` }}
          >
            <div className="focus-square" />
            <div
              className="focus-sun-control"
              onMouseDown={handleSunMouseDown}
              onTouchStart={handleSunMouseDown}
              title="Ajustar exposición"
            >
              <div className="focus-sun-track" />
              <div
                className="focus-sun-thumb"
                style={{ transform: `translateY(${-exposure * 18}px)` }}
              >
                <AppleIcons.Sun size={15} color="#FFD60A" />
              </div>
            </div>
          </div>
        )}

        {/* Countdown Timer Display */}
        {countdown > 0 && (
          <div className="ios-countdown-overlay">
            <span className="countdown-number">{countdown}</span>
          </div>
        )}

        {/* Portrait Mode Stage Lighting Guide */}
        {mode === 'portrait' && (
          <div className="portrait-guide-cube">
            <span className="portrait-depth-txt">EFECTO DE PROFUNDIDAD</span>
          </div>
        )}
      </div>
    </div>
  );
}
