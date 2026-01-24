import { type FC, useMemo, useCallback } from "react";
import { useEntityStore, type EntityWithTrail } from "../../stores/entityStore";
import { getGlobalViewer } from "../tactical";
import { flyToLocation } from "../../lib/cesium-config";

/**
 * AssetPanel - Shows all friendly assets with selection capability.
 *
 * Features:
 * - Click to select entity (used by AI for auth requests)
 * - Shows callsign, home base, weapons state
 * - Selected entity highlighted with cyan border
 */
export const AssetPanel: FC = () => {
  const entities = useEntityStore((s) => s.entities);
  const selectedEntityId = useEntityStore((s) => s.selectedEntityId);
  const selectEntity = useEntityStore((s) => s.selectEntity);

  const entityList = useMemo(() => Array.from(entities.values()), [entities]);

  // Select entity and fly camera to its position
  const handleSelectEntity = useCallback((entity: EntityWithTrail) => {
    selectEntity(entity.entity_id);

    // Fly camera to selected entity
    const viewer = getGlobalViewer();
    if (viewer) {
      flyToLocation(viewer, entity.position.lat, entity.position.lon, 15000, 1);  // 15km, 1sec
    }
  }, [selectEntity]);

  if (entityList.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.title}>ASSETS</span>
          <span style={styles.count}>0</span>
        </div>
        <div style={styles.empty}>No assets deployed</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>ASSETS</span>
        <span style={styles.count}>{entityList.length}</span>
      </div>
      <div style={styles.list}>
        {entityList.map((entity) => (
          <AssetRow
            key={entity.entity_id}
            entity={entity}
            isSelected={entity.entity_id === selectedEntityId}
            onSelect={() => handleSelectEntity(entity)}
          />
        ))}
      </div>
    </div>
  );
};

interface AssetRowProps {
  entity: EntityWithTrail;
  isSelected: boolean;
  onSelect: () => void;
}

const AssetRow: FC<AssetRowProps> = ({ entity, isSelected, onSelect }) => {
  const isArmed = entity.weapons_state?.safety === "ARMED";
  const homeBase = entity.home_base || "??";

  return (
    <button
      style={{
        ...styles.row,
        borderColor: isSelected ? "var(--color-accent)" : "transparent",
        backgroundColor: isSelected ? "rgba(0, 209, 255, 0.1)" : "var(--bg-tertiary)",
      }}
      onClick={onSelect}
    >
      {/* Selection indicator */}
      <span style={styles.selector}>{isSelected ? "◉" : "○"}</span>

      {/* Callsign */}
      <span style={styles.callsign}>{entity.callsign}</span>

      {/* Home base */}
      <span style={styles.homeBase}>{homeBase}</span>

      {/* Weapons state */}
      <span
        style={{
          ...styles.weapons,
          color: isArmed ? "var(--color-hostile)" : "var(--color-friendly)",
          backgroundColor: isArmed ? "rgba(255, 68, 68, 0.2)" : "rgba(0, 230, 118, 0.2)",
        }}
      >
        {isArmed ? "ARMED" : "SAFE"}
      </span>
    </button>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "220px",
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-default)",
    borderRadius: "6px",
    overflow: "hidden",
    fontFamily: "var(--font-family-mono)",
    fontSize: "11px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 10px",
    borderBottom: "1px solid var(--border-subtle)",
    backgroundColor: "var(--bg-tertiary)",
  },
  title: {
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--text-muted)",
    fontSize: "10px",
  },
  count: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "18px",
    height: "18px",
    padding: "0 4px",
    backgroundColor: "var(--color-accent)",
    color: "var(--bg-primary)",
    fontWeight: 700,
    fontSize: "10px",
    borderRadius: "9px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    padding: "4px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 8px",
    borderRadius: "4px",
    border: "2px solid transparent",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.15s ease",
    width: "100%",
  },
  selector: {
    color: "var(--color-accent)",
    fontSize: "12px",
    lineHeight: 1,
  },
  callsign: {
    flex: 1,
    fontWeight: 600,
    color: "var(--color-friendly)",
    fontSize: "11px",
  },
  homeBase: {
    padding: "2px 5px",
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "3px",
    color: "var(--text-muted)",
    fontWeight: 500,
    fontSize: "9px",
    letterSpacing: "0.05em",
  },
  weapons: {
    padding: "2px 5px",
    borderRadius: "3px",
    fontWeight: 700,
    fontSize: "9px",
    letterSpacing: "0.03em",
  },
  empty: {
    padding: "20px",
    textAlign: "center",
    color: "var(--text-muted)",
    fontStyle: "italic",
    fontSize: "10px",
  },
};
