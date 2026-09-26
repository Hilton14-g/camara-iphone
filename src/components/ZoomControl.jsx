import React from 'react';
import { triggerHaptic } from '../utils/haptics';

export default function ZoomControl({ currentZoom, setZoom, availableZooms = [0.5, 1, 2, 3] }) {
  const handleZoomClick = (z) => {
    triggerHaptic('selection');
    setZoom(z);
  };

  return (
    <div className="ios-zoom-container">
      <div className="ios-zoom-pills">
        {availableZooms.map((z) => {
          const isActive = currentZoom === z;
          const label = z === 0.5 ? '.5' : `${z}`;
          return (
            <button
              key={z}
              className={`ios-zoom-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleZoomClick(z)}
              aria-label={`Zoom ${z}x`}
            >
              <span>{label}</span>
              {z !== 0.5 && <span className="zoom-unit">x</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
