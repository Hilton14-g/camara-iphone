import React, { useState, useEffect, useRef } from 'react';
import { AppleIcons } from './AppleIcons';
import { downloadBlob, deleteCapture, updateCapture } from '../utils/db';
import { triggerHaptic } from '../utils/haptics';
import { createLivePhotoGif } from '../utils/gifGenerator';

export default function GalleryModal({ isOpen, onClose, captures, onRefresh }) {
  const [selectedCapture, setSelectedCapture] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'live', 'portrait'
  const [isPlayingLive, setIsPlayingLive] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [liveMenuOpen, setLiveMenuOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [imageUrls, setImageUrls] = useState({});
  const [videoUrls, setVideoUrls] = useState({});
  const [gifUrls, setGifUrls] = useState({});
  const videoPlayerRef = useRef(null);

  // Convert Blobs to ObjectURLs
  useEffect(() => {
    const newImgUrls = {};
    const newVidUrls = {};
    const newGifUrls = {};

    captures.forEach((c) => {
      if (c.imageBlob) {
        newImgUrls[c.id] = URL.createObjectURL(c.imageBlob);
      }
      if (c.videoBlob) {
        newVidUrls[c.id] = URL.createObjectURL(c.videoBlob);
      }
      if (c.gifBlob) {
        newGifUrls[c.id] = URL.createObjectURL(c.gifBlob);
      }
    });

    setImageUrls(newImgUrls);
    setVideoUrls(newVidUrls);
    setGifUrls(newGifUrls);

    return () => {
      Object.values(newImgUrls).forEach(URL.revokeObjectURL);
      Object.values(newVidUrls).forEach(URL.revokeObjectURL);
      Object.values(newGifUrls).forEach(URL.revokeObjectURL);
    };
  }, [captures]);

  if (!isOpen) return null;

  // Filtered list
  const filtered = captures.filter((c) => {
    if (filterType === 'live') return c.type === 'live';
    if (filterType === 'portrait') return c.type === 'portrait';
    return true;
  });

  // Handle Live Photo press and hold with mobile safety
  const handleLivePressStart = (e) => {
    if (e && e.cancelable && e.type.startsWith('touch')) {
      e.preventDefault();
    }

    if (selectedCapture && selectedCapture.type === 'live') {
      triggerHaptic('live');
      setIsPlayingLive(true);
      if (videoPlayerRef.current) {
        videoPlayerRef.current.currentTime = 0;
        videoPlayerRef.current.muted = true;
        const p = videoPlayerRef.current.play();
        if (p && p.then) {
          p.then(() => setIsVideoPlaying(true)).catch(() => setIsVideoPlaying(false));
        }
      }
    }
  };

  const handleLivePressEnd = () => {
    if (isPlayingLive) {
      setIsPlayingLive(false);
      setIsVideoPlaying(false);
      if (videoPlayerRef.current) {
        videoPlayerRef.current.pause();
        videoPlayerRef.current.currentTime = 0;
      }
    }
  };

  const togglePlayLive = (e) => {
    if (e) e.stopPropagation();
    if (isPlayingLive) {
      handleLivePressEnd();
    } else {
      handleLivePressStart();
    }
  };

  // Switch Live Photo Effect
  const handleSetLiveEffect = async (effect) => {
    if (!selectedCapture) return;
    setLiveMenuOpen(false);
    triggerHaptic('selection');
    await updateCapture(selectedCapture.id, { liveEffect: effect });
    setSelectedCapture(prev => ({ ...prev, liveEffect: effect }));
    onRefresh();
  };

  // Delete current photo
  const handleDeleteCurrent = async () => {
    if (!selectedCapture) return;
    if (window.confirm('¿Deseas eliminar esta foto de tu galería?')) {
      triggerHaptic('heavy');
      await deleteCapture(selectedCapture.id);
      setSelectedCapture(null);
      onRefresh();
    }
  };

  // Share photo
  const handleShare = async () => {
    if (!selectedCapture) return;
    triggerHaptic('light');

    if (navigator.share && selectedCapture.imageBlob) {
      try {
        const file = new File(
          [selectedCapture.imageBlob],
          `${selectedCapture.id}.jpg`,
          { type: 'image/jpeg' }
        );
        await navigator.share({
          title: 'Foto tomada con iPhone Camera Web',
          text: 'Mira esta foto con calidad iPhone Smart HDR',
          files: [file]
        });
      } catch (err) {
        console.warn('Share cancelled or not supported:', err);
      }
    } else {
      alert('La opción de compartir no está disponible en este navegador. Puedes usar Descargar.');
    }
  };

  // Downloads
  const downloadAnimatedGif = async () => {
    if (!selectedCapture) return;
    triggerHaptic('light');

    if (selectedCapture.gifBlob && selectedCapture.gifBlob.size > 0) {
      downloadBlob(selectedCapture.gifBlob, `${selectedCapture.id}_LivePhoto_Animada.gif`);
      setDownloadMenuOpen(false);
      return;
    }

    if (selectedCapture.videoBlob) {
      downloadLiveVideo();
      return;
    }

    downloadPhoto();
  };

  const downloadPhoto = () => {
    if (!selectedCapture || !selectedCapture.imageBlob) return;
    downloadBlob(selectedCapture.imageBlob, `${selectedCapture.id}_iPhone_SmartHDR.jpg`);
    setDownloadMenuOpen(false);
  };

  const downloadLiveVideo = () => {
    if (!selectedCapture) return;
    const blobToDownload = selectedCapture.videoBlob || selectedCapture.gifBlob;
    if (!blobToDownload || blobToDownload.size === 0) {
      alert('Esta foto no cuenta con video adjunto.');
      return;
    }
    const isMp4 = blobToDownload.type.includes('mp4');
    const isGif = blobToDownload.type.includes('gif');
    const ext = isMp4 ? 'mp4' : isGif ? 'gif' : 'webm';
    downloadBlob(blobToDownload, `${selectedCapture.id}_LiveMotion.${ext}`);
    setDownloadMenuOpen(false);
  };

  const downloadAll = () => {
    downloadAnimatedGif();
    setTimeout(downloadPhoto, 350);
    setTimeout(downloadLiveVideo, 700);
    setDownloadMenuOpen(false);
  };

  // Navigate next / prev in fullscreen
  const currentIndex = selectedCapture ? filtered.findIndex(c => c.id === selectedCapture.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < filtered.length - 1;

  const goPrev = () => {
    if (hasPrev) {
      triggerHaptic('selection');
      setSelectedCapture(filtered[currentIndex - 1]);
      setIsPlayingLive(false);
      setShowInfo(false);
    }
  };

  const goNext = () => {
    if (hasNext) {
      triggerHaptic('selection');
      setSelectedCapture(filtered[currentIndex + 1]);
      setIsPlayingLive(false);
      setShowInfo(false);
    }
  };

  return (
    <div className="ios-gallery-overlay">
      {/* 1. Header */}
      <header className="ios-gallery-header">
        <div className="gallery-header-left">
          {selectedCapture ? (
            <button
              className="ios-gallery-back-btn"
              onClick={() => {
                setSelectedCapture(null);
                setIsPlayingLive(false);
                setShowInfo(false);
              }}
            >
              <AppleIcons.ChevronDown size={22} className="rotate-90" />
              <span>Fotos</span>
            </button>
          ) : (
            <span className="ios-gallery-title">Fotos</span>
          )}
        </div>

        <div className="gallery-header-right">
          <button className="ios-gallery-close" onClick={onClose}>
            <AppleIcons.Close size={20} />
          </button>
        </div>
      </header>

      {/* 2. Grid View when no photo is selected */}
      {!selectedCapture ? (
        <div className="ios-gallery-body">
          {/* Filter Pills */}
          <div className="gallery-filter-tabs">
            {[
              { id: 'all', label: 'Todas las fotos' },
              { id: 'live', label: 'En Vivo (Live)' },
              { id: 'portrait', label: 'Retratos' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`gallery-tab-chip ${filterType === tab.id ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('selection');
                  setFilterType(tab.id);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="ios-gallery-empty">
              <div className="empty-photo-icon">📷</div>
              <h3>No hay fotos todavía</h3>
              <p>Toca el botón obturador para capturar fotos super nítidas o fotos en vivo.</p>
            </div>
          ) : (
            <div className="ios-gallery-grid">
              {filtered.map(item => (
                <div
                  key={item.id}
                  className="gallery-grid-item"
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedCapture(item);
                  }}
                >
                  <img
                    src={imageUrls[item.id]}
                    alt="Capture"
                    className="gallery-grid-img"
                    loading="lazy"
                  />
                  {item.type === 'live' && (
                    <span className="grid-item-badge live-badge">
                      <AppleIcons.LivePhoto size={12} active={true} /> LIVE
                    </span>
                  )}
                  {item.type === 'portrait' && (
                    <span className="grid-item-badge portrait-badge">RETRATO</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="gallery-footer-count">
            {filtered.length} {filtered.length === 1 ? 'Foto' : 'Fotos'}
          </div>
        </div>
      ) : (
        /* 3. Fullscreen Photo Viewer */
        <div className="ios-fullscreen-viewer">
          {/* Top Info / Live Badge */}
          <div className="fullscreen-top-bar">
            {selectedCapture.type === 'live' ? (
              <div className="live-badge-menu-wrap">
                <button
                  className="ios-live-interactive-badge"
                  onClick={() => setLiveMenuOpen(prev => !prev)}
                >
                  <AppleIcons.LivePhoto size={16} active={true} />
                  <span>
                    {selectedCapture.liveEffect === 'loop'
                      ? 'Bucle'
                      : selectedCapture.liveEffect === 'bounce'
                      ? 'Rebote'
                      : 'LIVE'}
                  </span>
                  <AppleIcons.ChevronDown size={14} />
                </button>

                {liveMenuOpen && (
                  <div className="live-effects-dropdown">
                    <button
                      className={`effect-option ${selectedCapture.liveEffect === 'live' ? 'selected' : ''}`}
                      onClick={() => handleSetLiveEffect('live')}
                    >
                      En vivo
                    </button>
                    <button
                      className={`effect-option ${selectedCapture.liveEffect === 'loop' ? 'selected' : ''}`}
                      onClick={() => handleSetLiveEffect('loop')}
                    >
                      Bucle
                    </button>
                    <button
                      className={`effect-option ${selectedCapture.liveEffect === 'bounce' ? 'selected' : ''}`}
                      onClick={() => handleSetLiveEffect('bounce')}
                    >
                      Rebote
                    </button>
                  </div>
                )}
              </div>
            ) : selectedCapture.type === 'portrait' ? (
              <span className="fullscreen-mode-badge">RETRATO ƒ1.8</span>
            ) : (
              <span className="fullscreen-mode-badge">SMART HDR</span>
            )}

            <button
              className={`ios-info-btn ${showInfo ? 'active' : ''}`}
              onClick={() => setShowInfo(prev => !prev)}
              title="Detalles de la foto"
            >
              <AppleIcons.Info size={20} />
            </button>
          </div>

          {/* Media Container with Live Photo touch-and-hold and mobile safety */}
          <div
            className="fullscreen-media-container"
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={handleLivePressStart}
            onMouseUp={handleLivePressEnd}
            onTouchStart={handleLivePressStart}
            onTouchEnd={handleLivePressEnd}
            onTouchCancel={handleLivePressEnd}
          >
            {/* Base Image: ALWAYS VISIBLE! Never turns black under any circumstances */}
            <img
              src={
                isPlayingLive && gifUrls[selectedCapture.id]
                  ? gifUrls[selectedCapture.id]
                  : imageUrls[selectedCapture.id]
              }
              alt="Capture"
              className="fullscreen-img"
              onContextMenu={(e) => e.preventDefault()}
            />

            {/* Live Photo Video Clip Player (Fades in over still photo only when actively rendering frames) */}
            {selectedCapture.type === 'live' && videoUrls[selectedCapture.id] && (
              <video
                ref={videoPlayerRef}
                src={videoUrls[selectedCapture.id]}
                className={`fullscreen-live-video ${isVideoPlaying && isPlayingLive ? 'active-play' : 'inactive-play'}`}
                loop={selectedCapture.liveEffect === 'loop' || selectedCapture.liveEffect === 'bounce'}
                playsInline
                webkit-playsinline="true"
                muted
                preload="auto"
                onPlaying={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onEnded={() => {
                  setIsVideoPlaying(false);
                  setIsPlayingLive(false);
                }}
                onError={() => setIsVideoPlaying(false)}
              />
            )}

            {/* Live Photo interactive prompt: Tap or hold */}
            {selectedCapture.type === 'live' && (
              <button
                type="button"
                className={`live-touch-hint ${isPlayingLive ? 'playing' : ''}`}
                onClick={togglePlayLive}
              >
                <span>{isPlayingLive ? '⏸ Tocando en vivo' : '▶ Toca para ver en vivo'}</span>
              </button>
            )}
          </div>

          {/* Navigation Arrows for desktop/click */}
          {hasPrev && (
            <button className="nav-arrow left" onClick={goPrev} aria-label="Foto anterior">
              ‹
            </button>
          )}
          {hasNext && (
            <button className="nav-arrow right" onClick={goNext} aria-label="Siguiente foto">
              ›
            </button>
          )}

          {/* EXIF / Info Sheet Drawer */}
          {showInfo && (
            <div className="ios-info-sheet animate-slide-up">
              <div className="info-sheet-header">
                <h4>Información de la Captura</h4>
                <button onClick={() => setShowInfo(false)}>✕</button>
              </div>
              <div className="info-sheet-body">
                <div className="info-row">
                  <span className="info-label">Fecha y hora</span>
                  <span className="info-value">
                    {new Date(selectedCapture.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Cámara</span>
                  <span className="info-value">Cámara Principal iPhone (24 mm)</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Apertura</span>
                  <span className="info-value">ƒ/1.78 • Smart HDR 5</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Estilo</span>
                  <span className="info-value">
                    {selectedCapture.metadata?.style || 'Estándar'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tipo</span>
                  <span className="info-value">
                    {selectedCapture.type === 'live'
                      ? 'Live Photo con Audio'
                      : selectedCapture.type === 'portrait'
                      ? 'Retrato con Profundidad'
                      : 'Foto Alta Resolución'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Actions Bar */}
          <footer className="fullscreen-bottom-bar">
            {/* Share */}
            <button className="viewer-action-btn" onClick={handleShare} title="Compartir">
              <AppleIcons.Share size={22} />
              <span>Compartir</span>
            </button>

            {/* Download Button & Dropdown */}
            <div className="download-btn-wrap">
              <button
                className="viewer-action-btn highlight"
                onClick={() => {
                  if (selectedCapture.type === 'live') {
                    setDownloadMenuOpen(prev => !prev);
                  } else {
                    downloadPhoto();
                  }
                }}
                title="Descargar"
              >
                <AppleIcons.Download size={22} />
                <span>Descargar</span>
              </button>

              {downloadMenuOpen && selectedCapture.type === 'live' && (
                <div className="download-dropdown-menu">
                  <button onClick={downloadAnimatedGif} className="accent download-option-btn" disabled={isGeneratingGif}>
                    <div className="download-btn-title">🎞️ Foto Animada (.GIF)</div>
                    <div className="download-btn-sub">¡Se mueve sola en tu galería y WhatsApp!</div>
                  </button>
                  <button onClick={downloadLiveVideo} className="download-option-btn">
                    <div className="download-btn-title">🎥 Video en Vivo (.MP4)</div>
                    <div className="download-btn-sub">Video con sonido para redes y reels</div>
                  </button>
                  <button onClick={downloadPhoto} className="download-option-btn">
                    <div className="download-btn-title">📸 Foto Nítida (.JPG)</div>
                    <div className="download-btn-sub">Foto fija en máxima calidad Smart HDR</div>
                  </button>
                  <button onClick={downloadAll} className="download-option-btn all-pack-btn">
                    <div className="download-btn-title">📦 Descargar Todo el Paquete</div>
                  </button>
                </div>
              )}
            </div>

            {/* Delete */}
            <button className="viewer-action-btn danger" onClick={handleDeleteCurrent} title="Eliminar">
              <AppleIcons.Trash size={22} />
              <span>Eliminar</span>
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
