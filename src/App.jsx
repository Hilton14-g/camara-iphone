import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import TopBar from './components/TopBar';
import CameraView from './components/CameraView';
import ZoomControl from './components/ZoomControl';
import ModeSelector from './components/ModeSelector';
import BottomBar from './components/BottomBar';
import QuickSettingsDrawer from './components/QuickSettingsDrawer';
import GalleryModal from './components/GalleryModal';
import { playShutterSound, playLivePhotoSound, playTimerBeep } from './utils/sound';
import { triggerHaptic } from './utils/haptics';
import { processIPhonePhoto, canvasToBlob, PHOTOGRAPHIC_STYLES } from './utils/imageProcessing';
import { saveCapture, getAllCaptures, downloadBlob } from './utils/db';
import { LivePhotoRecorder } from './utils/livePhotoRecorder';
import { createSimulatedCameraStream } from './utils/mockCamera';
import { createLivePhotoGif } from './utils/gifGenerator';

export default function App() {
  // Camera & Stream State
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const liveRecorderRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'
  const [cameraError, setCameraError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isSimulated, setIsSimulated] = useState(false);

  // Settings & Mode State
  const [mode, setMode] = useState('photo'); // 'video', 'photo', 'portrait', 'square'
  const [flashMode, setFlashMode] = useState('auto'); // 'auto', 'on', 'off'
  const [flashBurst, setFlashBurst] = useState(false);
  const [livePhotoActive, setLivePhotoActive] = useState(true); // Apple Live Photo on by default!
  const [isLiveRecording, setIsLiveRecording] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [exposure, setExposure] = useState(0); // -2.0 to +2.0
  const [aspectRatio, setAspectRatio] = useState('4:3'); // '4:3', '16:9', '1:1'
  const [timerSec, setTimerSec] = useState(0); // 0, 3, 10
  const [countdown, setCountdown] = useState(0);
  const [currentStyle, setCurrentStyle] = useState(PHOTOGRAPHIC_STYLES[0]);
  const [currentFilter, setCurrentFilter] = useState('none');
  const [clarity, setClarity] = useState(1.3); // Deep Fusion crispness
  const [smartHDR, setSmartHDR] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showLevel, setShowLevel] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);

  // UI Drawer & Gallery State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captures, setCaptures] = useState([]);
  const [lastCapture, setLastCapture] = useState(null);

  // 1. Initialize Camera Stream
  const startCamera = async (facing = facingMode) => {
    try {
      setCameraError(null);
      setIsSimulated(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      // Constraints for high-res iPhone quality video feed
      const constraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 3840, min: 1280 },
          height: { ideal: 2160, min: 720 },
          frameRate: { ideal: 60, min: 30 }
        },
        audio: true // Required for Live Photo audio capture
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (audioErr) {
        // Fallback without audio if mic is unavailable or blocked
        console.warn('Microphone unavailable, starting camera without audio', audioErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: constraints.video,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(console.warn);
        };
      }

      // Init Live Photo recorder engine
      if (!liveRecorderRef.current) {
        liveRecorderRef.current = new LivePhotoRecorder(stream);
      } else {
        liveRecorderRef.current.updateStream(stream);
      }

      setHasPermission(true);
    } catch (err) {
      console.warn('Camera initialization error, using simulated stream option:', err);
      setHasPermission(false);
      setCameraError(err.message || 'No se pudo acceder a la cámara');
    }
  };

  const startSimulatedCamera = () => {
    setIsSimulated(true);
    setHasPermission(true);
    const mockStream = createSimulatedCameraStream();
    streamRef.current = mockStream;
    if (videoRef.current) {
      videoRef.current.srcObject = mockStream;
      videoRef.current.play().catch(console.warn);
    }
    if (!liveRecorderRef.current) {
      liveRecorderRef.current = new LivePhotoRecorder(mockStream);
    } else {
      liveRecorderRef.current.updateStream(mockStream);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    loadCaptures();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode]);

  // Load captures from IndexedDB
  const loadCaptures = async () => {
    try {
      const items = await getAllCaptures();
      setCaptures(items);
      if (items.length > 0) {
        const last = items[0];
        setLastCapture({
          ...last,
          thumbnailUrl: URL.createObjectURL(last.thumbnailBlob || last.imageBlob)
        });
      } else {
        setLastCapture(null);
      }
    } catch (err) {
      console.warn('Error loading captures:', err);
    }
  };

  // Flip Camera between Front / Back
  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Trigger Capture Sequence (handles timer countdown, live photo, HDR processing, saving)
  const handleCapture = async () => {
    if (isCapturing) return;

    // Check timer
    if (timerSec > 0 && countdown === 0) {
      let current = timerSec;
      setCountdown(current);
      playTimerBeep(false);

      const interval = setInterval(() => {
        current -= 1;
        if (current > 0) {
          setCountdown(current);
          playTimerBeep(false);
        } else {
          clearInterval(interval);
          setCountdown(0);
          playTimerBeep(true);
          executeShutter();
        }
      }, 1000);
      return;
    }

    executeShutter();
  };

  // Execute the actual image & live photo capture
  const executeShutter = async () => {
    setIsCapturing(true);

    // 1. Shutter sound & Screen Flash
    if (flashMode === 'on' || (flashMode === 'auto' && nightMode)) {
      setFlashBurst(true);
      setTimeout(() => setFlashBurst(false), 220);
    }
    playShutterSound();
    triggerHaptic('shutter');

    // 2. Prepare Live Photo recording if active
    const isLive = livePhotoActive && mode !== 'video';
    let liveClipPromise = null;
    let liveGifPromise = null;

    if (isLive && videoRef.current) {
      setIsLiveRecording(true);
      playLivePhotoSound();
      if (liveRecorderRef.current && streamRef.current) {
        liveClipPromise = liveRecorderRef.current.captureLiveClip(1600).catch(err => {
          console.warn('Live clip capture failed:', err);
          return null;
        });
      }
      liveGifPromise = createLivePhotoGif(videoRef.current, {
        durationMs: 1600,
        fps: 10,
        aspectRatio,
        styleId: currentStyle.id,
        width: 480
      }).catch(err => {
        console.warn('Live GIF generation failed:', err);
        return null;
      });
    }

    try {
      const videoEl = videoRef.current;
      if (!videoEl) throw new Error('Video element not available');

      // 3. Process the high-resolution frame with Apple Smart HDR & Deep Fusion pipeline
      const processedCanvas = processIPhonePhoto(videoEl, {
        styleId: currentStyle.id,
        filterId: currentFilter,
        mode,
        exposure,
        clarity,
        smartHDR,
        aspectRatio,
        nightMode
      });

      // 4. Convert to high-resolution JPEG Blob
      const imageBlob = await canvasToBlob(processedCanvas, 'image/jpeg', 0.96);

      // Create miniature thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 160;
      thumbCanvas.height = Math.round(160 * (processedCanvas.height / processedCanvas.width));
      const tCtx = thumbCanvas.getContext('2d');
      tCtx.drawImage(processedCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const thumbBlob = await canvasToBlob(thumbCanvas, 'image/jpeg', 0.85);

      // 5. Wait for Live Photo clip and animated GIF if recording
      let videoBlob = null;
      let gifBlob = null;
      if (liveClipPromise) {
        videoBlob = await liveClipPromise;
      }
      if (liveGifPromise) {
        gifBlob = await liveGifPromise;
      }
      setIsLiveRecording(false);

      // 6. Save Capture to IndexedDB
      const captureId = 'IMG_' + Date.now();
      const captureData = {
        id: captureId,
        timestamp: Date.now(),
        type: isLive ? 'live' : mode === 'portrait' ? 'portrait' : 'photo',
        imageBlob,
        thumbnailBlob: thumbBlob,
        videoBlob,
        gifBlob,
        duration: videoBlob ? 1.6 : 0,
        metadata: {
          aspectRatio,
          style: currentStyle.name,
          filter: currentFilter,
          exposure,
          smartHDR,
          clarity,
          width: processedCanvas.width,
          height: processedCanvas.height,
          lens: '24mm ƒ/1.78'
        }
      };

      await saveCapture(captureData);
      await loadCaptures();

      // 7. Auto-download if user enabled it
      if (autoDownload) {
        if (isLive && gifBlob) {
          // Download animated GIF so it is animated everywhere automatically!
          downloadBlob(gifBlob, `${captureId}_LivePhoto_Animada.gif`);
        } else {
          downloadBlob(imageBlob, `${captureId}_iPhone_SmartHDR.jpg`);
        }
      }

      // Subtle celebration sparkle
      confetti({
        particleCount: 20,
        spread: 40,
        origin: { y: 0.85 },
        colors: ['#FFD60A', '#FFFFFF']
      });

    } catch (err) {
      console.error('Error during capture:', err);
      setIsLiveRecording(false);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="ios-camera-app">
      {/* Dynamic Notch / Island Bezel */}
      <div className="ios-notch">
        <div className="dynamic-sensor camera" />
        <div className="dynamic-sensor speaker" />
      </div>

      {/* Top Controls Bar */}
      <TopBar
        flashMode={flashMode}
        setFlashMode={setFlashMode}
        livePhotoActive={livePhotoActive}
        setLivePhotoActive={setLivePhotoActive}
        isLiveRecording={isLiveRecording}
        nightMode={nightMode}
        setNightMode={setNightMode}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        currentStyle={currentStyle}
        onOpenStyles={() => setDrawerOpen(true)}
        mode={mode}
      />

      {/* Main Viewfinder Center */}
      <main className="ios-main-viewport">
        {hasPermission === false && (
          <div className="ios-permission-banner">
            <div className="permission-card">
              <h3>Permiso de Cámara Requerido</h3>
              <p>Para tomar fotos con calidad iPhone y fotos en vivo, permite el acceso a tu cámara o prueba el simulador interactivo.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <button className="ios-permission-btn" onClick={() => startCamera(facingMode)}>
                  Permitir Cámara Real
                </button>
                <button
                  className="ios-permission-btn"
                  style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', boxShadow: 'none' }}
                  onClick={startSimulatedCamera}
                >
                  Probar con Cámara Simulada 📱
                </button>
              </div>
            </div>
          </div>
        )}

        <CameraView
          videoRef={videoRef}
          aspectRatio={aspectRatio}
          mode={mode}
          showGrid={showGrid}
          showLevel={showLevel}
          exposure={exposure}
          setExposure={setExposure}
          zoom={zoom}
          flashBurst={flashBurst}
          countdown={countdown}
          onTapFocus={() => {}}
        />

        {/* Zoom Controls (.5, 1x, 2x, 3x) */}
        <ZoomControl
          currentZoom={zoom}
          setZoom={setZoom}
          availableZooms={[0.5, 1, 2, 3]}
        />
      </main>

      {/* Mode Carousel (VIDEO, FOTO, RETRATO, CUADRADO) */}
      <ModeSelector currentMode={mode} setMode={setMode} />

      {/* Bottom Bar: Gallery Thumbnail, Shutter Button, Flip Camera */}
      <BottomBar
        onCapture={handleCapture}
        onFlipCamera={handleFlipCamera}
        lastCapture={lastCapture}
        onOpenGallery={() => setGalleryOpen(true)}
        isRecordingVideo={isLiveRecording}
        mode={mode}
        isCapturing={isCapturing}
        livePhotoActive={livePhotoActive}
      />

      {/* Quick Settings Drawer */}
      <QuickSettingsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        timerSec={timerSec}
        setTimerSec={setTimerSec}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        currentStyle={currentStyle}
        setCurrentStyle={setCurrentStyle}
        clarity={clarity}
        setClarity={setClarity}
        exposure={exposure}
        setExposure={setExposure}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showLevel={showLevel}
        setShowLevel={setShowLevel}
        autoDownload={autoDownload}
        setAutoDownload={setAutoDownload}
        currentFilter={currentFilter}
        setCurrentFilter={setCurrentFilter}
        smartHDR={smartHDR}
        setSmartHDR={setSmartHDR}
      />

      {/* iOS Photos Gallery Modal */}
      <GalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        captures={captures}
        onRefresh={loadCaptures}
      />
    </div>
  );
}
