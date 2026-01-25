import { type FC, useMemo, useState, useEffect, useRef } from "react";
import { useEntityStore } from "../../stores/entityStore";

type ThreatInfo = { callsign: string; distance: number; bearing: number };

const formatAltitude = (alt: number): string =>
  alt >= 1000 ? `${(alt / 1000).toFixed(1)}km` : `${Math.round(alt)}m`;

const getStatusColor = (status: string): string => {
  switch (status) {
    case "NOMINAL": return "var(--color-friendly)";
    case "DEGRADED": return "var(--color-warning)";
    case "CRITICAL": return "var(--color-hostile)";
    default: return "var(--text-secondary)";
  }
};

const getLinkColor = (link: string): string => {
  switch (link) {
    case "CONNECTED": return "var(--color-friendly)";
    case "DEGRADED": return "var(--color-warning)";
    case "LOST": return "var(--color-hostile)";
    default: return "var(--text-secondary)";
  }
};

/**
 * SelectedEntityPanel - Shows details of selected entity.
 * Floating, draggable panel with glass-morphism styling.
 */
export const SelectedEntityPanel: FC = () => {
  const selectedEntityId = useEntityStore((s) => s.selectedEntityId);
  const entities = useEntityStore((s) => s.entities);
  const tracks = useEntityStore((s) => s.tracks);
  const selectEntity = useEntityStore((s) => s.selectEntity);

  // Drag state for floating panel
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const dragRef = useRef<{ isDragging: boolean; offsetX: number; offsetY: number }>({
    isDragging: false, offsetX: 0, offsetY: 0,
  });

  // Handle mouse down on header to start drag
  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = {
      isDragging: true,
      offsetX: e.clientX - position.x,
      offsetY: e.clientY - position.y,
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current.isDragging) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 280, e.clientX - dragRef.current.offsetX));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragRef.current.offsetY));
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const entity = selectedEntityId ? entities.get(selectedEntityId) : undefined;

  // Calculate nearest threat (memoized)
  const nearestThreat = useMemo((): ThreatInfo | null => {
    if (!entity) return null;

    let nearest: ThreatInfo | null = null;
    let minDist = Infinity;

    tracks.forEach((track) => {
      if (track.destroyed) return;

      // Simple distance calculation (approximate km)
      const dLat = track.position.lat - entity.position.lat;
      const dLon = track.position.lon - entity.position.lon;
      const dist = Math.sqrt(dLat * dLat + dLon * dLon) * 111; // Rough km

      if (dist < minDist) {
        minDist = dist;
        // Calculate bearing
        const bearing = Math.atan2(dLon, dLat) * (180 / Math.PI);
        nearest = {
          callsign: track.callsign,
          distance: Math.round(dist),
          bearing: Math.round((bearing + 360) % 360),
        };
      }
    });

    return nearest;
  }, [tracks, entity]);

  if (!entity) {
    return (
      <div
        className="selected-entity selected-entity--empty"
        style={{ left: position.x, top: position.y }}
      >
        <div
          className="selected-entity__header selected-entity__header--draggable"
          onMouseDown={handleMouseDown}
        >
          <span className="selected-entity__title">SELECTED</span>
        </div>
        <div className="selected-entity__empty-message">
          Click an entity on the map to view details
        </div>
        <style>{selectedEntityStyles}</style>
      </div>
    );
  }

  return (
    <div
      className="selected-entity"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="selected-entity__header selected-entity__header--draggable"
        onMouseDown={handleMouseDown}
      >
        <div className="selected-entity__title-row">
          <span className="selected-entity__callsign">{entity.callsign}</span>
          <span className="selected-entity__platform">({entity.platform_type})</span>
        </div>
        <button
          className="selected-entity__close"
          onClick={() => selectEntity(null)}
          title="Deselect"
          aria-label="Close entity details"
        >
          ×
        </button>
      </div>

      <div className="selected-entity__section">
        <div className="selected-entity__row">
          <span className="selected-entity__label">Status</span>
          <span
            className="selected-entity__value"
            style={{ color: getStatusColor(entity.operational_status) }}
          >
            {entity.operational_status}
          </span>
        </div>
        <div className="selected-entity__row">
          <span className="selected-entity__label">Phase</span>
          <span className="selected-entity__value">{entity.flight_phase}</span>
        </div>
      </div>

      <div className="selected-entity__section">
        <div className="selected-entity__section-title">Position</div>
        <div className="selected-entity__row">
          <span className="selected-entity__label">Altitude</span>
          <span className="selected-entity__value selected-entity__value--mono">
            {formatAltitude(entity.position.alt_m)}
          </span>
        </div>
        <div className="selected-entity__row">
          <span className="selected-entity__label">Speed</span>
          <span className="selected-entity__value selected-entity__value--mono">
            {Math.round(entity.velocity.speed_mps)} m/s
          </span>
        </div>
        <div className="selected-entity__row">
          <span className="selected-entity__label">Heading</span>
          <span className="selected-entity__value selected-entity__value--mono">
            {Math.round(entity.velocity.heading_deg)}°
          </span>
        </div>
      </div>

      <div className="selected-entity__section">
        <div className="selected-entity__section-title">Systems</div>
        <div className="selected-entity__row">
          <span className="selected-entity__label">Weapons</span>
          <span
            className={`selected-entity__value selected-entity__weapons--${entity.weapons_state.safety.toLowerCase()}`}
          >
            {entity.weapons_state.safety}
            {entity.weapons_state.inventory && (
              <span className="selected-entity__weapon-count">
                ({entity.weapons_state.inventory.length})
              </span>
            )}
          </span>
        </div>
        <div className="selected-entity__row">
          <span className="selected-entity__label">Fuel</span>
          <span className="selected-entity__value selected-entity__value--mono">
            {Math.round(entity.fuel_percent)}%
          </span>
        </div>
        <div className="selected-entity__row">
          <span className="selected-entity__label">Link</span>
          <span
            className="selected-entity__value"
            style={{ color: getLinkColor(entity.link_status) }}
          >
            {entity.link_status}
          </span>
        </div>
        <div className="selected-entity__row">
          <span className="selected-entity__label">Sensor</span>
          <span className="selected-entity__value">
            {entity.sensor_active ? entity.sensor_mode : "OFF"}
          </span>
        </div>
      </div>

      {nearestThreat && (
        <div className="selected-entity__section selected-entity__section--threat">
          <div className="selected-entity__section-title selected-entity__section-title--hostile">
            Nearest Threat
          </div>
          <div className="selected-entity__row">
            <span className="selected-entity__label">Target</span>
            <span className="selected-entity__value selected-entity__value--hostile">
              {nearestThreat.callsign}
            </span>
          </div>
          <div className="selected-entity__row">
            <span className="selected-entity__label">Distance</span>
            <span className="selected-entity__value selected-entity__value--mono">
              {nearestThreat.distance} km
            </span>
          </div>
          <div className="selected-entity__row">
            <span className="selected-entity__label">Bearing</span>
            <span className="selected-entity__value selected-entity__value--mono">
              {nearestThreat.bearing}°
            </span>
          </div>
        </div>
      )}

      <style>{selectedEntityStyles}</style>
    </div>
  );
};

const selectedEntityStyles = `
  .selected-entity {
    position: fixed;
    z-index: 1000;
    width: 280px;
    display: flex;
    flex-direction: column;
    background: rgba(26, 32, 44, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .selected-entity--empty {
    opacity: 0.7;
  }

  .selected-entity__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .selected-entity__header--draggable {
    cursor: move;
    user-select: none;
  }

  .selected-entity__title {
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }

  .selected-entity__title-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .selected-entity__callsign {
    font-size: var(--font-size-base);
    font-weight: 700;
    color: var(--color-friendly);
  }

  .selected-entity__platform {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    font-family: var(--font-family-mono);
  }

  .selected-entity__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: none;
    border: 1px solid var(--border-subtle);
    border-radius: 3px;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .selected-entity__close:hover {
    background-color: var(--color-hostile);
    border-color: var(--color-hostile);
    color: white;
  }

  .selected-entity__empty-message {
    padding: 16px;
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    text-align: center;
    font-style: italic;
  }

  .selected-entity__section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .selected-entity__section:last-child {
    border-bottom: none;
  }

  .selected-entity__section--threat {
    background: rgba(255, 68, 68, 0.1);
  }

  .selected-entity__section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 4px;
  }

  .selected-entity__section-title--hostile {
    color: var(--color-hostile);
  }

  .selected-entity__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .selected-entity__label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .selected-entity__value {
    font-size: var(--font-size-xs);
    color: var(--text-primary);
    font-weight: 500;
  }

  .selected-entity__value--mono {
    font-family: var(--font-family-mono);
  }

  .selected-entity__value--hostile {
    color: var(--color-hostile);
    font-weight: 700;
  }

  .selected-entity__weapons--safe {
    color: var(--color-friendly);
  }

  .selected-entity__weapons--armed {
    color: var(--color-hostile);
    font-weight: 700;
  }

  .selected-entity__weapons--master_arm {
    color: var(--color-hostile);
    font-weight: 700;
    text-shadow: 0 0 4px var(--color-hostile);
  }

  .selected-entity__weapon-count {
    margin-left: 4px;
    font-size: 10px;
    color: var(--text-muted);
  }
`;
