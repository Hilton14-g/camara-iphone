import React from 'react';
import { AppleIcons } from './AppleIcons';
import { PHOTOGRAPHIC_STYLES, IOS_FILTERS } from '../utils/imageProcessing';
import { triggerHaptic } from '../utils/haptics';

export default function QuickSettingsDrawer({
  isOpen,
  onClose,
  timerSec,
  setTimerSec,
  aspectRatio,
  setAspectRatio,
  currentStyle,
  setCurrentStyle,
  clarity,
  setClarity,
  exposure,
  setExposure,
  showGrid,
  setShowGrid,
  showLevel,
  setShowLevel,
  autoDownload,
  setAutoDownload,
  currentFilter,
  setCurrentFilter,
  smartHDR,
  setSmartHDR
}) {
  if (!isOpen) return null;

  return (
    <div className="ios-drawer-backdrop" onClick={onClose}>
      <div className="ios-drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="ios-drawer-grabber" />

        <div className="ios-drawer-header">
          <span className="ios-drawer-title">Ajustes de Cámara</span>
          <button className="ios-drawer-close" onClick={onClose}>
            <AppleIcons.Close size={18} />
          </button>
        </div>

        <div className="ios-drawer-scrollable">
          {/* 1. Temporizador */}
          <div className="ios-setting-group">
            <label className="ios-setting-label">
              <AppleIcons.Timer size={16} /> Temporizador
            </label>
            <div className="ios-segmented-control">
              {[0, 3, 10].map((t) => (
                <button
                  key={t}
                  className={`ios-segment-btn ${timerSec === t ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('selection');
                    setTimerSec(t);
                  }}
                >
                  {t === 0 ? 'No' : `${t}s`}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Formato / Aspect Ratio */}
          <div className="ios-setting-group">
            <label className="ios-setting-label">Formato</label>
            <div className="ios-segmented-control">
              {['4:3', '16:9', '1:1'].map((ar) => (
                <button
                  key={ar}
                  className={`ios-segment-btn ${aspectRatio === ar ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('selection');
                    setAspectRatio(ar);
                  }}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Estilos Fotográficos Apple */}
          <div className="ios-setting-group">
            <div className="ios-setting-header-row">
              <label className="ios-setting-label">
                <AppleIcons.PhotographicStyles size={16} /> Estilos Fotográficos
              </label>
              <span className="ios-setting-subval">{currentStyle.name}</span>
            </div>
            <div className="ios-styles-carousel">
              {PHOTOGRAPHIC_STYLES.map((style) => (
                <button
                  key={style.id}
                  className={`ios-style-card ${currentStyle.id === style.id ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('selection');
                    setCurrentStyle(style);
                  }}
                >
                  <div className={`ios-style-swatch swatch-${style.id}`} />
                  <span className="ios-style-card-name">{style.name}</span>
                </button>
              ))}
            </div>
            <p className="ios-setting-hint">{currentStyle.desc}</p>
          </div>

          {/* 4. Claridad y Nitidez (Apple Deep Fusion) */}
          <div className="ios-setting-group">
            <div className="ios-setting-header-row">
              <label className="ios-setting-label">Nitidez iPhone (Deep Fusion)</label>
              <span className="ios-setting-subval">
                {clarity <= 0.8 ? 'Suave' : clarity <= 1.3 ? 'Estándar' : 'Ultra Nítido'}
              </span>
            </div>
            <div className="ios-segmented-control">
              {[
                { val: 0.8, lbl: 'Suave' },
                { val: 1.3, lbl: 'Estándar' },
                { val: 1.8, lbl: 'Ultra Nítido' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  className={`ios-segment-btn ${clarity === opt.val ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('selection');
                    setClarity(opt.val);
                  }}
                >
                  {opt.lbl}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Compensación de Exposición */}
          <div className="ios-setting-group">
            <div className="ios-setting-header-row">
              <label className="ios-setting-label">
                <AppleIcons.Sun size={16} /> Exposición (EV)
              </label>
              <span className="ios-setting-subval">
                {exposure > 0 ? `+${exposure.toFixed(1)}` : exposure.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.2"
              value={exposure}
              onChange={(e) => setExposure(parseFloat(e.target.value))}
              className="ios-slider"
            />
          </div>

          {/* 6. Smart HDR Toggle */}
          <div className="ios-toggle-row">
            <div>
              <span className="ios-toggle-label">Apple Smart HDR</span>
              <p className="ios-toggle-desc">Mejora el rango dinámico en luces y sombras</p>
            </div>
            <label className="ios-switch">
              <input
                type="checkbox"
                checked={smartHDR}
                onChange={(e) => setSmartHDR(e.target.checked)}
              />
              <span className="ios-switch-slider" />
            </label>
          </div>

          {/* 7. Descarga Automática */}
          <div className="ios-toggle-row">
            <div>
              <span className="ios-toggle-label">Descarga Automática</span>
              <p className="ios-toggle-desc">Descarga cada foto directo a tu dispositivo</p>
            </div>
            <label className="ios-switch">
              <input
                type="checkbox"
                checked={autoDownload}
                onChange={(e) => setAutoDownload(e.target.checked)}
              />
              <span className="ios-switch-slider" />
            </label>
          </div>

          {/* 8. Cuadrícula */}
          <div className="ios-toggle-row">
            <div>
              <span className="ios-toggle-label">Cuadrícula 3x3</span>
              <p className="ios-toggle-desc">Regla de tercios para encuadre perfecto</p>
            </div>
            <label className="ios-switch">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              <span className="ios-switch-slider" />
            </label>
          </div>

          {/* 9. Nivel de Horizonte */}
          <div className="ios-toggle-row">
            <div>
              <span className="ios-toggle-label">Nivel de Horizonte</span>
              <p className="ios-toggle-desc">Línea guía niveladora estilo iOS 17</p>
            </div>
            <label className="ios-switch">
              <input
                type="checkbox"
                checked={showLevel}
                onChange={(e) => setShowLevel(e.target.checked)}
              />
              <span className="ios-switch-slider" />
            </label>
          </div>

          {/* 10. Filtros Apple */}
          <div className="ios-setting-group">
            <label className="ios-setting-label">Filtros Fotográficos</label>
            <div className="ios-filter-scroll">
              {IOS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={`ios-filter-chip ${currentFilter === f.id ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('selection');
                    setCurrentFilter(f.id);
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
