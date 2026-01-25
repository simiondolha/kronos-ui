import { type FC, useMemo, useCallback } from "react";
import { useEntityStore, type EntityWithTrail } from "../../stores/entityStore";
import { getGlobalViewer } from "../tactical";
import { flyToLocation } from "../../lib/cesium-config";
import { PlatformIcon, WeaponsLoadIndicator } from "../icons/PlatformIcons";
import { PlatformType } from "../../lib/protocol";

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
  const weaponsInventory = entity.weapons_state?.inventory || [];
  const platformType = (entity.platform_type || "STRIGOI") as PlatformType;

  return (
    <button
      style={{
        ...styles.row,
        borderColor: isSelected ? "var(--color-accent)" : "transparent",
        backgroundColor: isSelected ? "rgba(0, 209, 255, 0.1)" : "var(--bg-tertiary)",
      }}
      onClick={onSelect}
    >
      {/* Platform icon */}
      <span style={styles.iconWrapper}>
        <PlatformIcon
          platformType={platformType}
          size={18}
          color={isSelected ? "var(--color-accent)" : "var(--color-friendly)"}
        />
      </span>

      {/* Callsign */}
      <span style={styles.callsign}>{entity.callsign}</span>

      {/* Weapons load indicator (discreet) */}
      <span style={styles.weaponsLoad}>
        <WeaponsLoadIndicator inventory={weaponsInventory} maxSlots={4} />
      </span>

      {/* Armed indicator (small dot when armed) */}
      {isArmed && (
        <span style={styles.armedDot} title="WEAPONS ARMED">
          ●
        </span>
      )}
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
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    flexShrink: 0,
  },
  callsign: {
    flex: 1,
    fontWeight: 600,
    color: "var(--color-friendly)",
    fontSize: "11px",
    letterSpacing: "0.02em",
  },
  weaponsLoad: {
    display: "flex",
    alignItems: "center",
    opacity: 0.7,
  },
  armedDot: {
    color: "var(--color-hostile)",
    fontSize: "8px",
    marginLeft: "4px",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  empty: {
    padding: "20px",
    textAlign: "center",
    color: "var(--text-muted)",
    fontStyle: "italic",
    fontSize: "10px",
  },
};
