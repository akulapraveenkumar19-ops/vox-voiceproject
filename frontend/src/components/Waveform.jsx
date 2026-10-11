import React from 'react';

const Waveform = ({ count = 16, active = false, height = 24, color = 'var(--accent-blue)' }) => {
  const bars = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="waveform-bars-container" style={{ height: `${height}px` }}>
      {bars.map((i) => {
        // Pseudo-random height variations for dynamic wave feel
        const minH = 4;
        const maxH = height;
        const delay = (i * 0.08) % 1.2;
        return (
          <div
            key={i}
            className={`waveform-bar ${active ? 'active' : ''}`}
            style={{
              height: active ? `${Math.floor(minH + Math.sin(i * 0.5) * (maxH - minH))}px` : '4px',
              backgroundColor: color,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
};

export default Waveform;
