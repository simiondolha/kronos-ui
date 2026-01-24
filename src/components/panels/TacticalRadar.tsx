import { useMemo } from "react";
import { useEntityStore } from "../../stores/entityStore";

// Radar configuration
const RADAR_SIZE = 200;
const RADAR_RANGE_KM = 400; // Range in km (increased for Black Sea coast coverage)
const CENTER_LAT = 44.5; // Center of radar (Black Sea coast - Constanta area)
const CENTER_LON = 28.5; // Moved east to cover coastal operations

interface RadarBlip {
  id: string;
  x: number;
  y: number;
  type: "friendly" | "hostile" | "missile";
  label: string;
  destroyed?: boolean;
}

/**
 * TacticalRadar - 2D radar display showing entities, tracks, and missiles.
 *
 * Centered on mission area with range rings.
 */
export function TacticalRadar() {
  const entities = useEntityStore((s) => s.entities);
  const tracks = useEntityStore((s) => s.tracks);
  const missiles = useEntityStore((s) => s.missiles);

  // Convert lat/lon to radar X/Y coordinates
  const latLonToRadar = (lat: number, lon: number): { x: number; y: number } => {
    // Convert degrees to km (rough approximation)
    const kmPerDegLat = 111;
    const kmPerDegLon = 111 * Math.cos((CENTER_LAT * Math.PI) / 180);

    const dLat = lat - CENTER_LAT;
    const dLon = lon - CENTER_LON;

    const kmNorth = dLat * kmPerDegLat;
    const kmEast = dLon * kmPerDegLon;

    // Scale to radar coordinates (-1 to 1)
    const scale = RADAR_SIZE / 2 / RADAR_RANGE_KM;
    const x = RADAR_SIZE / 2 + kmEast * scale;
    const y = RADAR_SIZE / 2 - kmNorth * scale; // Y inverted (north is up)

    return { x, y };
  };

  // Generate blips
  const blips = useMemo((): RadarBlip[] => {
    const result: RadarBlip[] = [];

    // Friendly entities
    entities.forEach((entity) => {
      const pos = latLonToRadar(entity.position.lat, entity.position.lon);
      result.push({
        id: entity.entity_id,
        x: pos.x,
        y: pos.y,
        type: "friendly",
        label: entity.callsign,
      });
    });

    // Hostile tracks
    tracks.forEach((track) => {
      if (track.destroyed) return;
      const pos = latLonToRadar(track.position.lat, track.position.lon);
      result.push({
        id: track.track_id,
        x: pos.x,
        y: pos.y,
        type: "hostile",
        label: track.callsign,
        destroyed: track.destroyed,
      });
    });

    // Missiles
    missiles.forEach((missile) => {
      if (!missile.active) return;
      const pos = latLonToRadar(missile.position.lat, missile.position.lon);
      result.push({
        id: missile.missile_id,
        x: pos.x,
        y: pos.y,
        type: "missile",
        label: "",
      });
    });

    return result;
  }, [entities, tracks, missiles]);

  // Count stats
  const friendlyCount = Array.from(entities.values()).length;
  const hostileCount = Array.from(tracks.values()).filter((t) => !t.destroyed).length;

  // Calculate threat level based on hostile count and proximity (memoized to prevent infinite loops)
  const threatLevel = useMemo(() => {
    if (hostileCount === 0) {
      return { level: "NONE", color: "#3a5a6a" };
    }

    // Calculate minimum distance to any hostile
    let minDistance = Infinity;
    tracks.forEach((track) => {
      if (track.destroyed) return;
      entities.forEach((entity) => {
        const dLat = track.position.lat - entity.position.lat;
        const dLon = track.position.lon - entity.position.lon;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon) * 111; // km
        if (dist < minDistance) minDistance = dist;
      });
    });

    // Determine threat level
    if (hostileCount >= 4 || minDistance < 50) {
      return { level: "CRITICAL", color: "#FF4444" };
    } else if (hostileCount >= 2 || minDistance < 100) {
      return { level: "HIGH", color: "#FF6B6B" };
    } else if (hostileCount >= 1 || minDistance < 200) {
      return { level: "MEDIUM", color: "#FFAB00" };
    }
    return { level: "LOW", color: "#0066CC" };
  }, [hostileCount, tracks, entities]);

  return (
    <div className="tactical-radar">
      <div className="tactical-radar__header">
        <span className="tactical-radar__title">RADAR</span>
        <span className="tactical-radar__range">{RADAR_RANGE_KM}km</span>
      </div>

      <svg
        className="tactical-radar__display"
        viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
        width={RADAR_SIZE}
        height={RADAR_SIZE}
      >
        {/* Background */}
        <circle
          cx={RADAR_SIZE / 2}
          cy={RADAR_SIZE / 2}
          r={RADAR_SIZE / 2 - 2}
          fill="#0a0f14"
          stroke="#1e2a35"
          strokeWidth="2"
        />

        {/* Range rings */}
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <circle
            key={ratio}
            cx={RADAR_SIZE / 2}
            cy={RADAR_SIZE / 2}
            r={(RADAR_SIZE / 2 - 2) * ratio}
            fill="none"
            stroke="#1e3a4a"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Cross hairs */}
        <line
          x1={RADAR_SIZE / 2}
          y1={2}
          x2={RADAR_SIZE / 2}
          y2={RADAR_SIZE - 2}
          stroke="#1e3a4a"
          strokeWidth="1"
        />
        <line
          x1={2}
          y1={RADAR_SIZE / 2}
          x2={RADAR_SIZE - 2}
          y2={RADAR_SIZE / 2}
          stroke="#1e3a4a"
          strokeWidth="1"
        />

        {/* Compass markers */}
        <text x={RADAR_SIZE / 2} y={12} fill="#3a5a6a" fontSize="10" textAnchor="middle">N</text>
        <text x={RADAR_SIZE / 2} y={RADAR_SIZE - 4} fill="#3a5a6a" fontSize="10" textAnchor="middle">S</text>
        <text x={8} y={RADAR_SIZE / 2 + 3} fill="#3a5a6a" fontSize="10" textAnchor="middle">W</text>
        <text x={RADAR_SIZE - 8} y={RADAR_SIZE / 2 + 3} fill="#3a5a6a" fontSize="10" textAnchor="middle">E</text>

        {/* Blips - NATO APP-6/MIL-STD-2525 Style */}
        {blips.map((blip) => (
          <g key={blip.id}>
            {blip.type === "friendly" && (
              <>
                {/* NATO Friendly: Blue rounded rectangle */}
                <rect
                  x={blip.x - 5}
                  y={blip.y - 4}
                  width={10}
                  height={8}
                  rx={2}
                  fill="none"
                  stroke="#0066CC"
                  strokeWidth="1.5"
                  className="radar-blip radar-blip--friendly"
                />
                {/* UAV indicator inside */}
                <circle
                  cx={blip.x}
                  cy={blip.y}
                  r={2}
                  fill="#0066CC"
                />
                <text
                  x={blip.x + 8}
                  y={blip.y + 3}
                  fill="#0066CC"
                  fontSize="7"
                  fontWeight="600"
                  fontFamily="var(--font-family-mono)"
                >
                  {blip.label}
                </text>
              </>
            )}
            {blip.type === "hostile" && !blip.destroyed && (
              <>
                {/* NATO Hostile: Red diamond */}
                <polygon
                  points={`${blip.x},${blip.y - 6} ${blip.x + 5},${blip.y} ${blip.x},${blip.y + 6} ${blip.x - 5},${blip.y}`}
                  fill="none"
                  stroke="#FF4444"
                  strokeWidth="1.5"
                  className="radar-blip radar-blip--hostile"
                />
                {/* Drone indicator */}
                <circle
                  cx={blip.x}
                  cy={blip.y}
                  r={2}
                  fill="#FF4444"
                />
                <text
                  x={blip.x + 7}
                  y={blip.y + 3}
                  fill="#FF4444"
                  fontSize="7"
                  fontWeight="600"
                  fontFamily="var(--font-family-mono)"
                >
                  {blip.label}
                </text>
              </>
            )}
            {blip.type === "missile" && (
              <>
                {/* Missile: Small filled triangle pointing in direction of travel */}
                <polygon
                  points={`${blip.x},${blip.y - 3} ${blip.x + 2},${blip.y + 2} ${blip.x - 2},${blip.y + 2}`}
                  fill="#FF6B6B"
                  className="radar-blip radar-blip--missile"
                />
              </>
            )}
          </g>
        ))}

        {/* Sweep line animation */}
        <line
          x1={RADAR_SIZE / 2}
          y1={RADAR_SIZE / 2}
          x2={RADAR_SIZE / 2}
          y2={4}
          stroke="rgba(0, 230, 118, 0.5)"
          strokeWidth="2"
          className="radar-sweep"
        />
      </svg>

      {/* Threat Level Indicator */}
      <div className="tactical-radar__threat-level" style={{ borderColor: threatLevel.color }}>
        <span className="tactical-radar__threat-label">THREAT</span>
        <span className="tactical-radar__threat-value" style={{ color: threatLevel.color }}>
          {threatLevel.level}
        </span>
      </div>

      <div className="tactical-radar__legend">
        <span className="tactical-radar__stat tactical-radar__stat--friendly">
          {friendlyCount} FRIENDLY
        </span>
        <span className="tactical-radar__stat tactical-radar__stat--hostile">
          {hostileCount} HOSTILE
        </span>
      </div>

      <style>{`
        .tactical-radar {
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-default);
          border-radius: 4px;
          padding: 8px;
        }

        .tactical-radar__header {
          display: flex;
          justify-content: space-between;
          width: 100%;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 8px;
        }

        .tactical-radar__title {
          font-size: var(--font-size-xs);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }

        .tactical-radar__range {
          font-size: var(--font-size-xs);
          font-family: var(--font-family-mono);
          color: var(--text-muted);
        }

        .tactical-radar__display {
          border-radius: 50%;
        }

        .tactical-radar__threat-level {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 6px 10px;
          margin-top: 8px;
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid;
          border-radius: 4px;
        }

        .tactical-radar__threat-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .tactical-radar__threat-value {
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-family-mono);
        }

        .tactical-radar__legend {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          font-size: 10px;
          font-family: var(--font-family-mono);
        }

        .tactical-radar__stat {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tactical-radar__stat--friendly {
          color: #0066CC;
        }

        .tactical-radar__stat--hostile {
          color: #FF4444;
        }

        .radar-blip {
          filter: drop-shadow(0 0 2px currentColor);
        }

        .radar-sweep {
          transform-origin: ${RADAR_SIZE / 2}px ${RADAR_SIZE / 2}px;
          animation: radar-sweep 4s linear infinite;
        }

        @keyframes radar-sweep {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
