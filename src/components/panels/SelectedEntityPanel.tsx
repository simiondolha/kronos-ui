import { type FC, useMemo } from "react";
import { useEntityStore } from "../../stores/entityStore";

/**
 * SelectedEntityPanel - Shows details of selected entity.
 *
 * Displays when user clicks on an entity on the map.
 */
export const SelectedEntityPanel: FC = () => {
  const selectedEntityId = useEntityStore((s) => s.selectedEntityId);
  const entities = useEntityStore((s) => s.entities);
  const tracks = useEntityStore((s) => s.tracks);
  const selectEntity = useEntityStore((s) => s.selectEntity);

  const entity = selectedEntityId ? entities.get(selectedEntityId) : undefined;

  // Calculate nearest threat (memoized to prevent infinite loops)
  // Must be before early return to follow Rules of Hooks
  type ThreatInfo = { callsign: string; distance: number; bearing: number };
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
      <div className="selected-entity selected-entity--empty">
        <div className="selected-entity__header">
          <span className="selected-entity__title">SELECTED</span>
        </div>
        <div className="selected-entity__empty-message">
          Click an entity on the map to view details
        </div>
        <style>{selectedEntityStyles}</style>
      </div>
    );
  }

  // Format altitude
  const formatAltitude = (alt: number): string => {
    if (alt >= 1000) {
      return `${(alt / 1000).toFixed(1)}km`;
    }
    return `${Math.round(alt)}m`;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "NOMINAL":
        return "var(--color-friendly)";
      case "DEGRADED":
        return "var(--color-warning)";
      case "CRITICAL":
        return "var(--color-hostile)";
      default:
        return "var(--text-secondary)";
    }
  };

  // Get link status color
  const getLinkColor = (link: string): string => {
    switch (link) {
      case "CONNECTED":
        return "var(--color-friendly)";
      case "DEGRADED":
        return "var(--color-warning)";
      case "LOST":
        return "var(--color-hostile)";
      default:
        return "var(--text-secondary)";
    }
  };

  return (
    <div className="selected-entity">
      <div className="selected-entity__header">
        <div className="selected-entity__title-row">
          <span className="selected-entity__callsign">{entity.callsign}</span>
          <span className="selected-entity__platform">({entity.platform_type})</span>
        </div>
        <button
          className="selected-entity__close"
          onClick={() => selectEntity(null)}
          title="Deselect"
        >
          x
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
    display: flex;
    flex-direction: column;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: 4px;
    overflow: hidden;
  }

  .selected-entity--empty {
    opacity: 0.6;
  }

  .selected-entity__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-subtle);
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
    background-color: rgba(255, 68, 68, 0.05);
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
