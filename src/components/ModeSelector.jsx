import React, { useRef, useEffect } from 'react';
import { triggerHaptic } from '../utils/haptics';

const MODES = [
  { id: 'video', label: 'VIDEO' },
  { id: 'photo', label: 'FOTO' },
  { id: 'portrait', label: 'RETRATO' },
  { id: 'square', label: 'CUADRADO' }
];

export default function ModeSelector({ currentMode, setMode }) {
  const containerRef = useRef(null);

  const handleSelectMode = (modeId) => {
    if (modeId !== currentMode) {
      triggerHaptic('selection');
      setMode(modeId);
    }
  };

  return (
    <div className="ios-mode-selector-wrap" ref={containerRef}>
      <div className="ios-mode-track">
        {MODES.map((m) => {
          const isActive = currentMode === m.id;
          return (
            <button
              key={m.id}
              className={`ios-mode-item ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectMode(m.id)}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
