import { useRef, useEffect, memo } from 'react';
import { useDroneStore } from '../../stores/droneStore';
import type { GPSFixType } from '../../types/drone';

const GPS_COLORS: Record<GPSFixType, string> = {
  NO_FIX: '#ff6b6b', FIX_2D: '#ffb300', FIX_3D: '#7ce38b',
  DGPS: '#28d7c4', RTK_FLOAT: '#28d7c4', RTK_FIXED: '#00ff88',
};

function Sparkline({ data, width = 120, height = 32 }: { data: number[]; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;

    ctx.strokeStyle = '#28d7c4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - 2 - ((v - min) / range) * (height - 4);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data, width, height]);

  return <canvas ref={ref} style={{ width, height }} />;
}

export const TelemetryPanel = memo(function TelemetryPanel() {
  const drone = useDroneStore((s) => s.selectedId ? s.drones.get(s.selectedId) : null);
  const history = useDroneStore((s) => s.selectedId ? s.history.get(s.selectedId) : null);

  if (!drone) {
    return <div className="tp-panel tp-empty">Select a drone to view telemetry</div>;
  }

  const { position, velocity, battery, mode, armed, gpsFixType, gpsSatellites, callsign } = drone;
  const batteryColor = battery > 50 ? '#7ce38b' : battery > 20 ? '#ffb300' : '#ff6b6b';

  return (
    <div className="tp-panel">
      <div className="tp-header">
        <h3>{callsign}</h3>
        <div className="tp-badges">
          <span className={`tp-badge ${armed ? 'armed' : 'safe'}`}>{armed ? 'ARMED' : 'DISARMED'}</span>
          <span className="tp-badge mode">{mode}</span>
        </div>
      </div>

      <div className="tp-row">
        <span className="tp-dot" style={{ background: GPS_COLORS[gpsFixType] }} />
        <span>{gpsFixType.replace('_', ' ')}</span>
        <span className="tp-muted">{gpsSatellites} sats</span>
      </div>

      <div className="tp-section">
        <div className="tp-row"><span className="tp-muted">Lat</span><span>{position.lat.toFixed(6)}°</span></div>
        <div className="tp-row"><span className="tp-muted">Lon</span><span>{position.lon.toFixed(6)}°</span></div>
        <div className="tp-row"><span className="tp-muted">Alt</span><span>{position.alt.toFixed(1)} m</span></div>
        <div className="tp-row"><span className="tp-muted">Hdg</span><span>{position.heading.toFixed(0)}°</span></div>
        <div className="tp-row"><span className="tp-muted">Spd</span><span>{velocity.speed.toFixed(1)} m/s</span></div>
      </div>

      <div className="tp-row">
        <span className="tp-muted">Battery</span>
        <div className="tp-battery">
          <div className="tp-battery-bar" style={{ width: `${battery}%`, background: batteryColor }} />
        </div>
        <span>{battery.toFixed(0)}%</span>
      </div>

      {history && history.altitude.length > 1 && (
        <div className="tp-section">
          <span className="tp-muted">Altitude (60s)</span>
          <Sparkline data={history.altitude} />
        </div>
      )}

      <style>{`
        .tp-panel { background: rgba(12,16,22,0.9); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; color: #e9e5d5; font: 13px 'JetBrains Mono', monospace; min-width: 220px; }
        .tp-empty { display: flex; align-items: center; justify-content: center; color: #9aa3ad; min-height: 200px; }
        .tp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .tp-header h3 { margin: 0; font-size: 14px; }
        .tp-badges { display: flex; gap: 6px; }
        .tp-badge { padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; }
        .tp-badge.armed { background: rgba(255,107,107,0.2); color: #ff6b6b; }
        .tp-badge.safe { background: rgba(124,227,139,0.2); color: #7ce38b; }
        .tp-badge.mode { border: 1px solid #9aa3ad; background: transparent; }
        .tp-section { margin: 10px 0; }
        .tp-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; gap: 8px; }
        .tp-muted { color: #9aa3ad; }
        .tp-dot { width: 8px; height: 8px; border-radius: 50%; }
        .tp-battery { flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
        .tp-battery-bar { height: 100%; border-radius: 4px; }
      `}</style>
    </div>
  );
});

export default TelemetryPanel;
