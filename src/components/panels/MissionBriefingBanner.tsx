import { type FC } from "react";
import { useEntityStore, type DemoPhase } from "../../stores/entityStore";
import { type Scenario } from "../../lib/scenarios";

interface MissionBriefingBannerProps {
  scenario: Scenario;
}

/**
 * MissionBriefingBanner - Shows mission info when demo is active.
 *
 * Displays: mission name, objective, assets with home bases, current phase.
 * Only visible when phase != IDLE.
 */
export const MissionBriefingBanner: FC<MissionBriefingBannerProps> = ({ scenario }) => {
  const phase = useEntityStore((s) => s.phase);
  const entities = useEntityStore((s) => s.entities);

  // Don't show when idle
  if (phase === "IDLE") {
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
      ? assetList.join(" | ")
      : scenario.briefing.assets.map((a) => `${a.callsign} (${a.home_base})`).join(" | ");

  return (
    <div style={styles.banner}>
      <div style={styles.row}>
        <span style={styles.label}>MISSION:</span>
        <span style={styles.missionName}>{scenario.name}</span>
        <span style={styles.phaseBadge} data-phase={phase.toLowerCase()}>
          {phase}
        </span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>OBJECTIVE:</span>
        <span style={styles.objective}>{scenario.learning}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>ASSETS:</span>
        <span style={styles.assets}>{displayAssets}</span>
      </div>
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
            {p}
          </span>
        ))}
      </div>

      <style>{`
        [data-phase="briefing"],
        [data-phase="patrol"] {
          background-color: rgba(0, 230, 118, 0.2) !important;
          color: var(--color-friendly) !important;
        }
        [data-phase="detection"],
        [data-phase="auth_pending"] {
          background-color: rgba(255, 171, 0, 0.2) !important;
          color: var(--color-warning) !important;
        }
        [data-phase="engaging"] {
          background-color: rgba(255, 68, 68, 0.2) !important;
          color: var(--color-hostile) !important;
          animation: pulse 1s ease-in-out infinite;
        }
        [data-phase="complete"] {
          background-color: rgba(0, 230, 118, 0.3) !important;
          color: var(--color-friendly) !important;
        }
        [data-phase="failed"] {
          background-color: rgba(255, 68, 68, 0.3) !important;
          color: var(--color-hostile) !important;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

function getPhaseIndex(phase: DemoPhase): number {
  const phases: DemoPhase[] = ["BRIEFING", "PATROL", "DETECTION", "AUTH_PENDING", "ENGAGING", "COMPLETE"];
  return phases.indexOf(phase);
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "8px 12px",
    backgroundColor: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border-default)",
    fontFamily: "var(--font-family-mono)",
    fontSize: "11px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  label: {
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    minWidth: "70px",
  },
  missionName: {
    color: "var(--color-accent)",
    fontWeight: 700,
    letterSpacing: "0.05em",
    flex: 1,
  },
  phaseBadge: {
    padding: "2px 8px",
    borderRadius: "3px",
    fontWeight: 700,
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    backgroundColor: "var(--bg-tertiary)",
    color: "var(--text-secondary)",
  },
  objective: {
    color: "var(--text-secondary)",
    fontStyle: "italic",
  },
  assets: {
    color: "var(--color-friendly)",
  },
  phaseProgress: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    marginTop: "4px",
    fontSize: "9px",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  phaseStep: {
    display: "inline-flex",
    alignItems: "center",
  },
  arrow: {
    color: "var(--text-muted)",
    opacity: 0.5,
  },
};
