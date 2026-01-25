import { type FC, useState } from "react";

// Types for AI proposal
export interface ThreatSpec {
  type: "FIGHTER" | "BOMBER" | "DRONE" | "SAM" | "AAA";
  count: number;
  location: { lat: number; lon: number; city_name?: string };
  behavior: "AGGRESSIVE" | "DEFENSIVE" | "PATROL";
}

export interface AssetProposal {
  callsign: string;
  platform_type: "STRIGOI" | "CORVUS" | "VULTUR";
  role: "PRIMARY" | "SUPPORT" | "ESCORT" | "ISR";
  weapons_load: string[];
  status: "PROPOSED" | "CONFIRMED" | "REJECTED";
}

export interface Objective {
  id: string;
  description: string;
  target_type: string;
  target_count: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "FAILED";
  progress: number;
}

export interface Proposal {
  proposalId: string;
  missionName: string;
  assets: AssetProposal[];
  objectives: Objective[];
  threats: ThreatSpec[];
  confidence: number;
  rationale: string;
  risks: string[];
  tierUsed: "GEMINI" | "GROQ" | "LOCAL" | "STUB";
  roe: "WEAPONS_FREE" | "WEAPONS_TIGHT" | "WEAPONS_HOLD" | "WEAPONS_SAFE";
}

interface ProposalPanelProps {
  proposal: Proposal | null;
  onConfirm: () => void;
  onDeny: () => void;
  onModify: (modificationText: string) => void;
  isLoading?: boolean;
}

/**
 * ProposalPanel - Military-style tactical display of AI proposal
 *
 * Design: Dark HUD aesthetic with phosphor green accents
 * - Scan line overlay effect
 * - Geometric borders
 * - Pulsing confidence indicator
 */
export const ProposalPanel: FC<ProposalPanelProps> = ({
  proposal,
  onConfirm,
  onDeny,
  onModify,
  isLoading = false,
}) => {
  const [showModifyInput, setShowModifyInput] = useState(false);
  const [modifyText, setModifyText] = useState("");

  const handleModifySubmit = () => {
    if (modifyText.trim()) {
      onModify(modifyText.trim());
      setModifyText("");
      setShowModifyInput(false);
    }
  };

  const handleModifyCancel = () => {
    setModifyText("");
    setShowModifyInput(false);
  };

  if (!proposal && !isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>&#x2630;</div>
          <div style={styles.emptyText}>AWAITING MISSION INTENT</div>
          <div style={styles.emptySubtext}>Enter intent to generate proposal</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <div style={styles.scanLine} />
          <div style={styles.loadingIcon}>&#x25C9;</div>
          <div style={styles.loadingText}>ANALYZING INTENT...</div>
          <div style={styles.loadingBar}>
            <div style={styles.loadingProgress} />
          </div>
        </div>
      </div>
    );
  }

  const confidenceColor =
    proposal!.confidence >= 0.8 ? "var(--color-friendly)" :
    proposal!.confidence >= 0.6 ? "#f59e0b" :
    "var(--color-hostile)";

  const roeColors: Record<string, string> = {
    WEAPONS_FREE: "#ef4444",
    WEAPONS_TIGHT: "#f59e0b",
    WEAPONS_HOLD: "#22c55e",
    WEAPONS_SAFE: "#3b82f6",
  };

  return (
    <div style={styles.container}>
      {/* Scan line overlay */}
      <div style={styles.scanLineOverlay} />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.proposalBadge}>PROPOSAL</span>
          <span style={styles.missionName}>{proposal!.missionName}</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.tierBadge}>via {proposal!.tierUsed}</span>
        </div>
      </div>

      {/* Confidence + ROE Bar */}
      <div style={styles.statusBar}>
        <div style={styles.confidenceSection}>
          <span style={styles.statusLabel}>CONFIDENCE</span>
          <div style={styles.confidenceMeter}>
            <div
              style={{
                ...styles.confidenceFill,
                width: `${proposal!.confidence * 100}%`,
                backgroundColor: confidenceColor,
              }}
            />
          </div>
          <span style={{ ...styles.confidenceValue, color: confidenceColor }}>
            {(proposal!.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div style={styles.roeSection}>
          <span style={styles.statusLabel}>ROE</span>
          <span style={{
            ...styles.roeBadge,
            backgroundColor: roeColors[proposal!.roe] + "20",
            color: roeColors[proposal!.roe],
            borderColor: roeColors[proposal!.roe],
          }}>
            {proposal!.roe.replace("WEAPONS_", "")}
          </span>
        </div>
      </div>

      {/* Assets Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>&#x2708;</span>
          <span style={styles.sectionTitle}>ALLOCATED ASSETS</span>
          <span style={styles.sectionCount}>{proposal!.assets.length}</span>
        </div>
        <div style={styles.assetGrid}>
          {proposal!.assets.map((asset, idx) => (
            <div key={idx} style={styles.assetCard}>
              <div style={styles.assetCallsign}>{asset.callsign}</div>
              <div style={styles.assetDetails}>
                <span style={styles.assetType}>{asset.platform_type}</span>
                <span style={styles.assetRole}>{asset.role}</span>
              </div>
              <div style={styles.assetWeapons}>
                {asset.weapons_load.map((w, i) => (
                  <span key={i} style={styles.weaponBadge}>{w}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Threats Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>&#x26A0;</span>
          <span style={styles.sectionTitle}>THREAT ASSESSMENT</span>
          <span style={styles.sectionCount}>{proposal!.threats.length}</span>
        </div>
        <div style={styles.threatList}>
          {proposal!.threats.map((threat, idx) => (
            <div key={idx} style={styles.threatRow}>
              <span style={styles.threatType}>{threat.count}x {threat.type}</span>
              <span style={styles.threatLocation}>
                {threat.location.city_name || `${threat.location.lat.toFixed(2)}N ${threat.location.lon.toFixed(2)}E`}
              </span>
              <span style={styles.threatBehavior}>{threat.behavior}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Objectives Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>&#x2713;</span>
          <span style={styles.sectionTitle}>OBJECTIVES</span>
          <span style={styles.sectionCount}>{proposal!.objectives.length}</span>
        </div>
        <div style={styles.objectiveList}>
          {proposal!.objectives.map((obj, idx) => (
            <div key={idx} style={styles.objectiveRow}>
              <span style={styles.objectiveNumber}>{idx + 1}</span>
              <span style={styles.objectiveDesc}>{obj.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rationale */}
      <div style={styles.rationaleSection}>
        <span style={styles.rationaleLabel}>AI RATIONALE</span>
        <p style={styles.rationaleText}>{proposal!.rationale}</p>
      </div>

      {/* Risk Assessment */}
      {proposal!.risks.length > 0 && (
        <div style={styles.riskSection}>
          <span style={styles.riskLabel}>RISK FACTORS</span>
          <div style={styles.riskList}>
            {proposal!.risks.map((risk, idx) => (
              <span key={idx} style={styles.riskItem}>{risk}</span>
            ))}
          </div>
        </div>
      )}

      {/* Modify Input Panel */}
      {showModifyInput && (
        <div style={styles.modifyInputPanel}>
          <div style={styles.modifyInputHeader}>
            <span style={styles.modifyInputLabel}>MODIFICATION REQUEST</span>
          </div>
          <textarea
            style={styles.modifyTextarea}
            value={modifyText}
            onChange={(e) => setModifyText(e.target.value)}
            placeholder="Describe changes to the proposal..."
            rows={3}
            autoFocus
          />
          <div style={styles.modifyInputActions}>
            <button style={styles.modifyCancelButton} onClick={handleModifyCancel}>
              CANCEL
            </button>
            <button
              style={styles.modifySubmitButton}
              onClick={handleModifySubmit}
              disabled={!modifyText.trim()}
            >
              SUBMIT MODIFICATION
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.actions}>
        <button style={styles.denyButton} onClick={onDeny}>
          DENY
        </button>
        <button
          style={styles.modifyButton}
          onClick={() => setShowModifyInput(true)}
        >
          MODIFY
        </button>
        <button style={styles.confirmButton} onClick={onConfirm}>
          CONFIRM MISSION
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    backgroundColor: "rgba(0, 12, 20, 0.95)",
    border: "1px solid rgba(0, 209, 255, 0.3)",
    borderRadius: "4px",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: "11px",
    color: "rgba(0, 209, 255, 0.9)",
    overflow: "hidden",
    boxShadow: "0 0 30px rgba(0, 209, 255, 0.1), inset 0 0 60px rgba(0, 0, 0, 0.5)",
  },
  scanLineOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 209, 255, 0.03) 2px, rgba(0, 209, 255, 0.03) 4px)",
    pointerEvents: "none",
    zIndex: 1,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "12px",
    borderBottom: "1px solid rgba(0, 209, 255, 0.2)",
    position: "relative",
    zIndex: 2,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  proposalBadge: {
    padding: "4px 8px",
    backgroundColor: "rgba(0, 209, 255, 0.15)",
    border: "1px solid rgba(0, 209, 255, 0.4)",
    borderRadius: "2px",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.15em",
  },
  missionName: {
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: "#fff",
    textShadow: "0 0 10px rgba(0, 209, 255, 0.5)",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
  },
  tierBadge: {
    padding: "3px 6px",
    backgroundColor: "rgba(100, 100, 100, 0.2)",
    border: "1px solid rgba(100, 100, 100, 0.4)",
    borderRadius: "2px",
    fontSize: "8px",
    color: "rgba(200, 200, 200, 0.7)",
    letterSpacing: "0.1em",
  },
  statusBar: {
    display: "flex",
    gap: "24px",
    padding: "10px 0",
    position: "relative",
    zIndex: 2,
  },
  confidenceSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: 1,
  },
  statusLabel: {
    fontSize: "8px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "rgba(0, 209, 255, 0.6)",
  },
  confidenceMeter: {
    flex: 1,
    height: "6px",
    backgroundColor: "rgba(0, 209, 255, 0.1)",
    borderRadius: "3px",
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: "3px",
    transition: "width 0.5s ease",
    boxShadow: "0 0 10px currentColor",
  },
  confidenceValue: {
    fontSize: "12px",
    fontWeight: 700,
    minWidth: "40px",
    textAlign: "right",
  },
  roeSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  roeBadge: {
    padding: "4px 10px",
    border: "1px solid",
    borderRadius: "2px",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.1em",
  },
  section: {
    padding: "10px 0",
    borderTop: "1px solid rgba(0, 209, 255, 0.1)",
    position: "relative",
    zIndex: 2,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  sectionIcon: {
    fontSize: "12px",
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "rgba(0, 209, 255, 0.7)",
  },
  sectionCount: {
    padding: "2px 6px",
    backgroundColor: "rgba(0, 209, 255, 0.2)",
    borderRadius: "10px",
    fontSize: "9px",
    fontWeight: 700,
  },
  assetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "8px",
  },
  assetCard: {
    padding: "10px",
    backgroundColor: "rgba(0, 230, 118, 0.08)",
    border: "1px solid rgba(0, 230, 118, 0.3)",
    borderRadius: "4px",
  },
  assetCallsign: {
    fontSize: "12px",
    fontWeight: 700,
    color: "rgba(0, 230, 118, 0.9)",
    marginBottom: "6px",
    textShadow: "0 0 8px rgba(0, 230, 118, 0.4)",
  },
  assetDetails: {
    display: "flex",
    gap: "8px",
    marginBottom: "6px",
  },
  assetType: {
    fontSize: "9px",
    color: "rgba(200, 200, 200, 0.7)",
  },
  assetRole: {
    fontSize: "9px",
    color: "rgba(0, 209, 255, 0.7)",
    fontWeight: 600,
  },
  assetWeapons: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
  },
  weaponBadge: {
    padding: "2px 4px",
    backgroundColor: "rgba(100, 100, 100, 0.3)",
    borderRadius: "2px",
    fontSize: "8px",
    color: "rgba(200, 200, 200, 0.8)",
  },
  threatList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  threatRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px",
    backgroundColor: "rgba(255, 68, 68, 0.08)",
    border: "1px solid rgba(255, 68, 68, 0.25)",
    borderRadius: "4px",
  },
  threatType: {
    fontSize: "11px",
    fontWeight: 700,
    color: "rgba(255, 68, 68, 0.9)",
    minWidth: "100px",
  },
  threatLocation: {
    flex: 1,
    fontSize: "10px",
    color: "rgba(200, 200, 200, 0.7)",
  },
  threatBehavior: {
    fontSize: "8px",
    padding: "2px 6px",
    backgroundColor: "rgba(255, 68, 68, 0.2)",
    borderRadius: "2px",
    color: "rgba(255, 68, 68, 0.8)",
    fontWeight: 600,
  },
  objectiveList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  objectiveRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px",
    backgroundColor: "rgba(0, 209, 255, 0.05)",
    borderLeft: "3px solid rgba(0, 209, 255, 0.5)",
  },
  objectiveNumber: {
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 209, 255, 0.2)",
    borderRadius: "50%",
    fontSize: "10px",
    fontWeight: 700,
  },
  objectiveDesc: {
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.85)",
  },
  rationaleSection: {
    padding: "12px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: "4px",
    position: "relative",
    zIndex: 2,
  },
  rationaleLabel: {
    fontSize: "8px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "rgba(0, 209, 255, 0.5)",
    display: "block",
    marginBottom: "8px",
  },
  rationaleText: {
    fontSize: "11px",
    lineHeight: 1.6,
    color: "rgba(200, 200, 200, 0.9)",
    margin: 0,
  },
  riskSection: {
    padding: "10px",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    border: "1px solid rgba(245, 158, 11, 0.25)",
    borderRadius: "4px",
    position: "relative",
    zIndex: 2,
  },
  riskLabel: {
    fontSize: "8px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "rgba(245, 158, 11, 0.7)",
    display: "block",
    marginBottom: "8px",
  },
  riskList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  riskItem: {
    padding: "4px 8px",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: "2px",
    fontSize: "10px",
    color: "rgba(245, 158, 11, 0.9)",
  },
  actions: {
    display: "flex",
    gap: "10px",
    paddingTop: "12px",
    borderTop: "1px solid rgba(0, 209, 255, 0.2)",
    position: "relative",
    zIndex: 2,
  },
  denyButton: {
    flex: 1,
    padding: "12px 20px",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    border: "1px solid rgba(255, 68, 68, 0.4)",
    borderRadius: "4px",
    color: "rgba(255, 68, 68, 0.9)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  modifyButton: {
    flex: 1,
    padding: "12px 20px",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    border: "1px solid rgba(245, 158, 11, 0.4)",
    borderRadius: "4px",
    color: "rgba(245, 158, 11, 0.9)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  confirmButton: {
    flex: 2,
    padding: "12px 20px",
    backgroundColor: "rgba(0, 230, 118, 0.15)",
    border: "1px solid rgba(0, 230, 118, 0.5)",
    borderRadius: "4px",
    color: "rgba(0, 230, 118, 0.95)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 0 20px rgba(0, 230, 118, 0.2)",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    position: "relative",
    zIndex: 2,
  },
  emptyIcon: {
    fontSize: "32px",
    opacity: 0.3,
    marginBottom: "12px",
  },
  emptyText: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "rgba(0, 209, 255, 0.5)",
    marginBottom: "8px",
  },
  emptySubtext: {
    fontSize: "10px",
    color: "rgba(100, 100, 100, 0.7)",
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    position: "relative",
    zIndex: 2,
  },
  scanLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "2px",
    background: "linear-gradient(90deg, transparent, rgba(0, 209, 255, 0.8), transparent)",
    animation: "scanDown 2s linear infinite",
  },
  loadingIcon: {
    fontSize: "28px",
    color: "rgba(0, 209, 255, 0.8)",
    marginBottom: "12px",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  loadingText: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.2em",
    color: "rgba(0, 209, 255, 0.7)",
    marginBottom: "16px",
  },
  loadingBar: {
    width: "200px",
    height: "3px",
    backgroundColor: "rgba(0, 209, 255, 0.1)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  loadingProgress: {
    width: "40%",
    height: "100%",
    backgroundColor: "rgba(0, 209, 255, 0.8)",
    borderRadius: "2px",
    animation: "loadingSlide 1.5s ease-in-out infinite",
  },
  modifyInputPanel: {
    padding: "12px",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    borderRadius: "4px",
    position: "relative",
    zIndex: 2,
  },
  modifyInputHeader: {
    marginBottom: "10px",
  },
  modifyInputLabel: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "rgba(245, 158, 11, 0.8)",
  },
  modifyTextarea: {
    width: "100%",
    padding: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    borderRadius: "4px",
    color: "rgba(255, 255, 255, 0.9)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    lineHeight: 1.5,
    resize: "vertical",
    outline: "none",
  },
  modifyInputActions: {
    display: "flex",
    gap: "8px",
    marginTop: "10px",
    justifyContent: "flex-end",
  },
  modifyCancelButton: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    border: "1px solid rgba(100, 100, 100, 0.4)",
    borderRadius: "4px",
    color: "rgba(200, 200, 200, 0.7)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  modifySubmitButton: {
    padding: "8px 16px",
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    border: "1px solid rgba(245, 158, 11, 0.5)",
    borderRadius: "4px",
    color: "rgba(245, 158, 11, 0.95)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
};

export default ProposalPanel;
