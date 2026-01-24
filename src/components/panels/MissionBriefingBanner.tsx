import { type FC } from "react";
import { useEntityStore, type DemoPhase } from "../../stores/entityStore";
import { type Scenario } from "../../lib/scenarios";

interface MissionBriefingBannerProps {
  scenario: Scenario;
}

/**
 * MissionBriefingBanner - Centered modal showing mission info at mission start.
 *
 * Displays: mission name, objective, assets with home bases, current phase.
 * Shows as centered modal overlay when phase === "BRIEFING".
 */
export const MissionBriefingBanner: FC<MissionBriefingBannerProps> = ({ scenario }) => {
  const phase = useEntityStore((s) => s.phase);
  const entities = useEntityStore((s) => s.entities);

  // Only show during BRIEFING phase (mission start)
  if (phase !== "BRIEFING") {
    return null;
  }

  // Get asset list with home bases
  const assetList = Array.from(entities.values()).map((entity) => {
    const homeBase = entity.home_base || "??";
    return `${entity.callsign} (${homeBase})`;
  });

  // If no entities yet, use scenario briefing assets
  const displayAssets =
    assetList.length > 0
      ? assetList
      : scenario.briefing.assets.map((a) => ({ callsign: a.callsign, home_base: a.home_base }));

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerIcon}>◆</span>
          <span style={styles.headerText}>MISSION BRIEFING</span>
          <span style={styles.headerIcon}>◆</span>
        </div>

        {/* Mission Name */}
        <div style={styles.missionName}>{scenario.name}</div>

        {/* Objective */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>OBJECTIVE</div>
          <div style={styles.objective}>{scenario.learning}</div>
        </div>

        {/* Assets */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>ASSIGNED ASSETS</div>
          <div style={styles.assetGrid}>
            {typeof displayAssets[0] === "string"
              ? (displayAssets as string[]).map((asset, i) => (
                  <div key={i} style={styles.assetItem}>
                    {asset}
                  </div>
                ))
              : (displayAssets as { callsign: string; home_base: string }[]).map((asset, i) => (
                  <div key={i} style={styles.assetItem}>
                    <span style={styles.assetCallsign}>{asset.callsign}</span>
                    <span style={styles.assetBase}>{asset.home_base}</span>
                  </div>
                ))}
          </div>
        </div>

        {/* Phase Progress */}
        <div style={styles.phaseSection}>
          <div style={styles.sectionLabel}>MISSION PHASES</div>
          <div style={styles.phaseProgress}>
            {(["BRIEFING", "PATROL", "DETECTION", "AUTH_PENDING", "ENGAGING", "COMPLETE"] as DemoPhase[]).map((p, i) => (
              <span
                key={p}
                style={{
                  ...styles.phaseStep,
                  opacity: getPhaseIndex(phase) >= i ? 1 : 0.3,
                  color: p === phase ? "var(--color-accent)" : "var(--text-muted)",
                }}
              >
                {i > 0 && <span style={styles.arrow}> → </span>}
                {p.replace("_", " ")}
              </span>
            ))}
          </div>
        </div>

        {/* Status */}
        <div style={styles.status}>
          <span style={styles.statusDot} />
          INITIALIZING...
        </div>
      </div>
    </div>
  );
};

function getPhaseIndex(phase: DemoPhase): number {
  const phases: DemoPhase[] = ["BRIEFING", "PATROL", "DETECTION", "AUTH_PENDING", "ENGAGING", "COMPLETE"];
  return phases.indexOf(phase);
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 950,
  },
  modal: {
    backgroundColor: "var(--bg-primary)",
    borderRadius: "12px",
    border: "2px solid var(--color-accent)",
    padding: "24px 32px",
    maxWidth: "600px",
    width: "90%",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 230, 255, 0.1)",
    fontFamily: "var(--font-family-mono)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "16px",
  },
  headerIcon: {
    color: "var(--color-accent)",
    fontSize: "12px",
  },
  headerText: {
    color: "var(--text-muted)",
    fontSize: "11px",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  },
  missionName: {
    color: "var(--color-accent)",
    fontSize: "20px",
    fontWeight: 700,
    textAlign: "center" as const,
    letterSpacing: "0.1em",
    marginBottom: "20px",
    textTransform: "uppercase",
  },
  section: {
    marginBottom: "16px",
  },
  sectionLabel: {
    color: "var(--text-muted)",
    fontSize: "10px",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  objective: {
    color: "var(--text-secondary)",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  assetGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
  },
  assetItem: {
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    padding: "6px 12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  assetCallsign: {
    color: "var(--color-friendly)",
    fontWeight: 600,
    fontSize: "12px",
  },
  assetBase: {
    color: "var(--text-muted)",
    fontSize: "10px",
    backgroundColor: "var(--bg-tertiary)",
    padding: "2px 6px",
    borderRadius: "3px",
  },
  phaseSection: {
    marginTop: "20px",
    paddingTop: "16px",
    borderTop: "1px solid var(--border-default)",
  },
  phaseProgress: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "4px",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  phaseStep: {
    display: "inline-flex",
    alignItems: "center",
  },
  arrow: {
    color: "var(--text-muted)",
    opacity: 0.5,
  },
  status: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "20px",
    color: "var(--color-accent)",
    fontSize: "11px",
    letterSpacing: "0.1em",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "var(--color-accent)",
    animation: "blink 1s ease-in-out infinite",
  },
};
