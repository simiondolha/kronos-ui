import { useEntityStore } from "../../stores/entityStore";
import type { WeaponsSafety, WeaponType } from "../../lib/protocol";

/**
 * WeaponsStatus - ALWAYS VISIBLE weapons state display.
 *
 * CRITICAL SAFETY UI RULE:
 * This component must ALWAYS be visible and NEVER hidden by other UI elements.
 * Shows weapons safety state and inventory for selected entity.
 */
export function WeaponsStatus() {
  const selectedEntity = useEntityStore((s) => {
    const id = s.selectedEntityId;
    return id ? s.entities.get(id) : undefined;
  });

  if (!selectedEntity) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.title}>WEAPONS</span>
        </div>
        <div style={styles.noSelection}>No entity selected</div>
      </div>
    );
  }

  const { weapons_state, callsign } = selectedEntity;
  const isArmed = weapons_state.safety === "ARMED";

  return (
    <div
      style={{
        ...styles.container,
        borderColor: isArmed ? "var(--color-hostile)" : "var(--border-default)",
        backgroundColor: isArmed
          ? "rgba(255, 68, 68, 0.1)"
          : "var(--bg-secondary)",
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>WEAPONS</span>
        <span style={styles.callsign}>{callsign}</span>
      </div>

      {/* Safety State - Large and prominent */}
      <div
        style={{
          ...styles.safetyBadge,
          backgroundColor: getSafetyColor(weapons_state.safety),
        }}
      >
        <span style={styles.safetyIcon}>{isArmed ? "⚠" : "✓"}</span>
        <span style={styles.safetyText}>{weapons_state.safety}</span>
      </div>

      {/* SIMULATED indicator - CRITICAL for training */}
      {weapons_state.simulated && (
        <div style={styles.simulatedBanner}>
          <span style={styles.simulatedText}>SIMULATED</span>
        </div>
      )}

      {/* Inventory */}
      <div style={styles.inventory}>
        <span style={styles.inventoryLabel}>INVENTORY</span>
        <div style={styles.inventoryList}>
          {weapons_state.inventory.length === 0 ? (
            <span style={styles.emptyInventory}>Empty</span>
          ) : (
            weapons_state.inventory.map((weapon, idx) => (
              <span key={idx} style={styles.weaponItem}>
                {formatWeaponType(weapon)}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function getSafetyColor(safety: WeaponsSafety): string {
  switch (safety) {
    case "SAFE":
      return "var(--color-friendly)";
    case "ARMED":
      return "var(--color-hostile)";
  }
}

function formatWeaponType(type: WeaponType): string {
  switch (type) {
    case "AAM1":
      return "AAM-1";
    case "AAM2":
      return "AAM-2";
    case "PGM_X":
      return "PGM-X";
    case "SDB_SIM":
      return "SDB-SIM";
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    bottom: "16px",
    left: "16px",
    width: "180px",
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-default)",
    borderRadius: "8px",
    padding: "12px",
    zIndex: 600, // --z-alert level
    fontFamily: "var(--font-family-mono)",
    fontSize: "12px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    paddingBottom: "8px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  title: {
    fontWeight: 700,
    color: "var(--text-secondary)",
    letterSpacing: "0.05em",
  },
  callsign: {
    color: "var(--color-accent)",
    fontWeight: 700,
  },
  noSelection: {
    color: "var(--text-muted)",
    textAlign: "center" as const,
    padding: "16px 0",
  },
  safetyBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "8px",
  },
  safetyIcon: {
    fontSize: "16px",
  },
  safetyText: {
    fontWeight: 700,
    fontSize: "14px",
    color: "var(--bg-primary)",
    letterSpacing: "0.1em",
  },
  simulatedBanner: {
    backgroundColor: "var(--color-warning)",
    padding: "4px 8px",
    borderRadius: "4px",
    textAlign: "center" as const,
    marginBottom: "8px",
  },
  simulatedText: {
    fontWeight: 700,
    fontSize: "11px",
    color: "var(--bg-primary)",
    letterSpacing: "0.1em",
  },
  inventory: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  inventoryLabel: {
    color: "var(--text-muted)",
    fontSize: "10px",
    letterSpacing: "0.05em",
  },
  inventoryList: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "4px",
  },
  weaponItem: {
    backgroundColor: "var(--bg-tertiary)",
    padding: "2px 6px",
    borderRadius: "2px",
    fontSize: "11px",
    color: "var(--text-primary)",
  },
  emptyInventory: {
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
};
