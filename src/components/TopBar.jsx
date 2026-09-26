import React from 'react';
import { AppleIcons } from './AppleIcons';

export default function TopBar({
  flashMode,
  setFlashMode,
  livePhotoActive,
  setLivePhotoActive,
  isLiveRecording,
  nightMode,
  setNightMode,
  drawerOpen,
  setDrawerOpen,
  currentStyle,
  onOpenStyles,
  mode
}) {
  const toggleFlash = (e) => {
    e.stopPropagation();
    if (flashMode === 'auto') setFlashMode('on');
    else if (flashMode === 'on') setFlashMode('off');
    else setFlashMode('auto');
  };

  const toggleLivePhoto = (e) => {
    e.stopPropagation();
    setLivePhotoActive(prev => !prev);
  };

  const toggleNight = (e) => {
    e.stopPropagation();
    setNightMode(prev => !prev);
  };

  return (
    <header className="ios-top-bar">
      {/* Live Photo Recording Banner (Shown during active Live Photo capture) */}
      {isLiveRecording && (
        <div className="ios-live-recording-badge">
          <span className="live-pulse-dot" />
          <span>EN VIVO</span>
        </div>
      )}

      {/* Main Top Bar Icons */}
      <div className="ios-top-bar-inner">
        {/* Flash Toggle */}
        <button
          className={`ios-icon-btn ${flashMode === 'on' ? 'active-yellow' : ''}`}
          onClick={toggleFlash}
          title={`Flash: ${flashMode.toUpperCase()}`}
          aria-label="Flash mode"
        >
          {flashMode === 'auto' && <AppleIcons.FlashAuto size={20} />}
          {flashMode === 'on' && <AppleIcons.FlashOn size={20} />}
          {flashMode === 'off' && <AppleIcons.FlashOff size={20} />}
        </button>

        {/* Night Mode */}
        <button
          className={`ios-icon-btn ${nightMode ? 'active-yellow' : ''}`}
          onClick={toggleNight}
          title="Modo Noche"
          aria-label="Modo noche"
        >
          <AppleIcons.Moon size={20} active={nightMode} />
          {nightMode && <span className="night-badge">2s</span>}
        </button>

        {/* Drawer Chevron Indicator */}
        <button
          className="ios-chevron-btn"
          onClick={() => setDrawerOpen(prev => !prev)}
          title="Ajustes rápidos"
          aria-label="Toggle drawer"
        >
          {drawerOpen ? <AppleIcons.ChevronDown size={22} /> : <AppleIcons.ChevronUp size={22} />}
        </button>

        {/* Photographic Styles Button */}
        <button
          className={`ios-icon-btn ${currentStyle.id !== 'standard' ? 'active-yellow' : ''}`}
          onClick={onOpenStyles}
          title={`Estilo: ${currentStyle.name}`}
          aria-label="Estilos fotográficos"
        >
          <AppleIcons.PhotographicStyles size={20} />
        </button>

        {/* Live Photo Toggle */}
        <button
          className={`ios-icon-btn live-photo-btn ${livePhotoActive ? 'active-yellow is-live' : 'is-off'}`}
          onClick={toggleLivePhoto}
          title={`Live Photo: ${livePhotoActive ? 'Activado' : 'Desactivado'}`}
          aria-label="Live photo"
        >
          <AppleIcons.LivePhoto active={livePhotoActive} size={22} />
        </button>
      </div>

      {/* Mode / Resolution Pill Badge */}
      <div className="ios-sub-bar">
        <span className="raw-badge">48MP PRO</span>
        {mode === 'portrait' && <span className="portrait-pill">LUZ NATURAL ƒ1.8</span>}
      </div>
    </header>
  );
}
