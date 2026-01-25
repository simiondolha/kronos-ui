import { useMemo, useState, useEffect } from "react";
import { useEntityStore } from "../../stores/entityStore";
import { KRONOS_CONFIG } from "../../lib/kronos-config";
import { getGlobalViewer } from "../tactical";
import { Cartographic, Math as CesiumMath } from "cesium";

// Radar configuration
const RADAR_SIZE = 220;
const RADAR_RANGE_KM = KRONOS_CONFIG.RADAR.DEFAULT_RANGE_KM;

interface RadarBlip {
  id: string;
  x: number;
  y: number;
  type: "friendly" | "hostile" | "missile";
  label: string;
  destroyed?: boolean;
}

export function TacticalRadar() {
  const entities = useEntityStore((s) => s.entities);
  const tracks = useEntityStore((s) => s.tracks);
  const missiles = useEntityStore((s) => s.missiles);

  // Dynamic Center based on Viewer
  const [center, setCenter] = useState({ lat: 44.5, lon: 28.5 });

  useEffect(() => {
    const viewer = getGlobalViewer();
    if (!viewer) return;

    const updateCenter = () => {
      const cameraPos = viewer.camera.position;
      const cartographic = Cartographic.fromCartesian(cameraPos);
      setCenter({
        lat: CesiumMath.toDegrees(cartographic.latitude),
        lon: CesiumMath.toDegrees(cartographic.longitude)
      });
    };

    const removeListener = viewer.camera.changed.addEventListener(updateCenter);
    return () => removeListener();
  }, []);

  const latLonToRadar = (lat: number, lon: number): { x: number; y: number } => {
    const kmPerDegLat = 111;
    const kmPerDegLon = 111 * Math.cos((center.lat * Math.PI) / 180);
    const dLat = lat - center.lat;
    const dLon = lon - center.lon;
    const kmNorth = dLat * kmPerDegLat;
    const kmEast = dLon * kmPerDegLon;
    const scale = RADAR_SIZE / 2 / RADAR_RANGE_KM;
    const x = RADAR_SIZE / 2 + kmEast * scale;
    const y = RADAR_SIZE / 2 - kmNorth * scale;
    return { x, y };
  };

  const blips = useMemo((): RadarBlip[] => {
    const result: RadarBlip[] = [];
    entities.forEach((entity) => {
      const pos = latLonToRadar(entity.position.lat, entity.position.lon);
      result.push({ id: entity.entity_id, x: pos.x, y: pos.y, type: "friendly", label: entity.callsign });
    });
    tracks.forEach((track) => {
      if (track.destroyed) return;
      const pos = latLonToRadar(track.position.lat, track.position.lon);
      result.push({ id: track.track_id, x: pos.x, y: pos.y, type: "hostile", label: track.callsign, destroyed: track.destroyed });
    });
    missiles.forEach((missile) => {
      if (!missile.active) return;
      const pos = latLonToRadar(missile.position.lat, missile.position.lon);
      result.push({ id: missile.missile_id, x: pos.x, y: pos.y, type: "missile", label: "" });
    });
    return result;
  }, [entities, tracks, missiles, center]);

  const hostileCount = Array.from(tracks.values()).filter((t) => !t.destroyed).length;

  const threatLevel = useMemo(() => {
    if (hostileCount === 0) return { level: "NONE", color: "#3a5a6a" };
    let minDistance = Infinity;
    tracks.forEach((track) => {
      if (track.destroyed) return;
      entities.forEach((entity) => {
        const dLat = track.position.lat - entity.position.lat;
        const dLon = track.position.lon - entity.position.lon;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon) * 111;
        if (dist < minDistance) minDistance = dist;
      });
    });
    if (hostileCount >= 4 || minDistance < 50) return { level: "CRITICAL", color: KRONOS_CONFIG.UI.HOSTILE_COLOR };
    if (hostileCount >= 2 || minDistance < 100) return { level: "HIGH", color: "#FF6B6B" };
    if (hostileCount >= 1 || minDistance < 200) return { level: "MEDIUM", color: "#FFAB00" };
    return { level: "LOW", color: KRONOS_CONFIG.UI.FRIENDLY_COLOR };
  }, [hostileCount, tracks, entities]);

  return (
    <div className="tactical-radar glass-hud">
      <div className="tactical-radar__header">
        <span className="tactical-radar__title">SCANNER // 2D</span>
        <span className="tactical-radar__range">{RADAR_RANGE_KM}KM</span>
      </div>

      <svg
        className="tactical-radar__display phosphor-glow"
        viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
        width={RADAR_SIZE}
        height={RADAR_SIZE}
      >
        <defs>
          <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0, 188, 212, 0.05)" />
            <stop offset="100%" stopColor="rgba(0, 188, 212, 0)" />
          </radialGradient>
        </defs>

        {/* Background Glow */}
        <circle cx={RADAR_SIZE / 2} cy={RADAR_SIZE / 2} r={RADAR_SIZE / 2 - 2} fill="url(#radar-glow)" />
        
        {/* Border Ring */}
        <circle
          cx={RADAR_SIZE / 2}
          cy={RADAR_SIZE / 2}
          r={RADAR_SIZE / 2 - 2}
          fill="none"
          stroke="rgba(0, 188, 212, 0.2)"
          strokeWidth="1.5"
        />

        {/* Range rings */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <circle
            key={ratio}
            cx={RADAR_SIZE / 2}
            cy={RADAR_SIZE / 2}
            r={(RADAR_SIZE / 2 - 2) * ratio}
            fill="none"
            stroke="rgba(0, 188, 212, 0.1)"
            strokeWidth="0.5"
            strokeDasharray="2 4"
          />
        ))}

        {/* Cross hairs */}
        <line x1={RADAR_SIZE / 2} y1={5} x2={RADAR_SIZE / 2} y2={RADAR_SIZE - 5} stroke="rgba(0, 188, 212, 0.1)" strokeWidth="0.5" />
        <line x1={5} y1={RADAR_SIZE / 2} x2={RADAR_SIZE - 5} y2={RADAR_SIZE / 2} stroke="rgba(0, 188, 212, 0.1)" strokeWidth="0.5" />

        {/* Blips */}
        {blips.map((blip) => (
          <g key={blip.id} className="blip-group">
            {blip.type === "friendly" && (
              <g stroke={KRONOS_CONFIG.UI.FRIENDLY_COLOR}>
                <rect x={blip.x - 4} y={blip.y - 4} width={8} height={8} fill="none" strokeWidth="1" />
                <circle cx={blip.x} cy={blip.y} r={1.5} fill={KRONOS_CONFIG.UI.FRIENDLY_COLOR} />
              </g>
            )}
            {blip.type === "hostile" && !blip.destroyed && (
              <g stroke={KRONOS_CONFIG.UI.HOSTILE_COLOR}>
                <polygon points={`${blip.x},${blip.y - 5} ${blip.x + 5},${blip.y} ${blip.x},${blip.y + 5} ${blip.x - 5},${blip.y}`} fill="none" strokeWidth="1" />
                <circle cx={blip.x} cy={blip.y} r={1.5} fill={KRONOS_CONFIG.UI.HOSTILE_COLOR} />
              </g>
            )}
            {blip.type === "missile" && (
              <polygon points={`${blip.x},${blip.y - 3} ${blip.x + 2},${blip.y + 2} ${blip.x - 2},${blip.y + 2}`} fill="#FFAB00" />
            )}
          </g>
        ))}

        {/* Sweep line */}
        <line
          x1={RADAR_SIZE / 2}
          y1={RADAR_SIZE / 2}
          x2={RADAR_SIZE / 2}
          y2={5}
          stroke="rgba(0, 188, 212, 0.6)"
          strokeWidth="2"
          className="radar-sweep"
        />
      </svg>

      <div className="tactical-radar__threat-level glass-panel" style={{ borderColor: `${threatLevel.color}33` }}>
        <span className="tactical-radar__threat-label">STATUS //</span>
        <span className="tactical-radar__threat-value" style={{ color: threatLevel.color }}>
          {threatLevel.level}
        </span>
      </div>

      <style>{`
        .tactical-radar {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
        }

        .tactical-radar__header {
          display: flex;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 12px;
        }

        .tactical-radar__title {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
        }

        .tactical-radar__range {
          font-size: 10px;
          font-family: var(--font-family-mono);
          color: var(--color-accent);
        }

        .tactical-radar__threat-level {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 8px 12px;
          margin-top: 12px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
        }

        .tactical-radar__threat-label {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .tactical-radar__threat-value {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .radar-sweep {
          transform-origin: ${RADAR_SIZE / 2}px ${RADAR_SIZE / 2}px;
          animation: radar-sweep ${KRONOS_CONFIG.RADAR.SWEEP_DURATION_MS}ms linear infinite;
        }

        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .blip-group {
          animation: phosphor-fade 4s ease-out infinite;
        }

        @keyframes phosphor-fade {
          0%, 10% { opacity: 1; filter: brightness(2) drop-shadow(0 0 4px currentColor); }
          100% { opacity: 0.6; filter: brightness(1) drop-shadow(0 0 2px currentColor); }
        }
      `}</style>
    </div>

  );
}
