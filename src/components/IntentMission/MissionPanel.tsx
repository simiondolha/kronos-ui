/**
 * MissionPanel - Floating draggable panel for active mission management
 *
 * Features:
 * - Draggable and resizable using react-rnd
 * - Shows mission status, assets, threats, objectives
 * - Add Asset button opens FleetPicker
 * - Kill switch for emergency stop
 */

import { type FC, useState, useCallback } from "react";
import { Rnd } from "react-rnd";
import type { Proposal, ThreatSpec, AssetProposal, Objective } from "./ProposalPanel";
import { FleetPicker } from "./FleetPicker";
import { useFleetStore } from "../../stores/fleetStore";

interface MissionPanelProps {
  missionId: string;
  proposal: Proposal;
  isPaused: boolean;
  onKillMission: () => void;
  onResumeMission: () => void;
  onAssignAsset: (entityId: string) => void;
  onClose: () => void;
}

// Platform type icons (military symbology)
const PLATFORM_ICONS: Record<string, string> = {
  STRIGOI: "S",
  VULTUR: "V",
  CORVUS: "C",
};

// Role colors
const ROLE_COLORS: Record<string, string> = {
  PRIMARY: "#22c55e",
  SUPPORT: "#3b82f6",
  ESCORT: "#f59e0b",
  ISR: "#8b5cf6",
};

// Threat type colors
const THREAT_COLORS: Record<string, string> = {
  FIGHTER: "#ef4444",
  BOMBER: "#dc2626",
  DRONE: "#f97316",
  SAM: "#a855f7",
  AAA: "#ec4899",
};

export const MissionPanel: FC<MissionPanelProps> = ({
  missionId,
  proposal,
  isPaused,
  onKillMission,
  onResumeMission,
  onAssignAsset,
  onClose,
}) => {
  const [showFleetPicker, setShowFleetPicker] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 });
  const [size, setSize] = useState({ width: 380, height: 520 });

  const handleAddAsset = useCallback(() => {
    setShowFleetPicker(true);
  }, []);

  const handleAssignFromPicker = useCallback((entityId: string) => {
    onAssignAsset(entityId);
    setShowFleetPicker(false);
  }, [onAssignAsset]);

  // Get fleet-assigned assets for this mission
  const getAssignedToMission = useFleetStore((s) => s.getAssignedToMission);
  const fleetAssignedAssets = getAssignedToMission(missionId);

  // Combine proposal assets + fleet-assigned assets
  const allAssets: AssetProposal[] = [
    ...proposal.assets,
    ...fleetAssignedAssets.map((e) => ({
      callsign: e.callsign,
      platform_type: e.platformType,
      role: "SUPPORT" as const,
      weapons_load: [],
      status: "CONFIRMED" as const,
    })),
  ];

  const totalThreats = proposal.threats.reduce((sum, t) => sum + t.count, 0);

  return (
    <>
      <Rnd
        position={position}
        size={size}
        onDragStop={(_, d) => setPosition({ x: d.x, y: d.y })}
        onResizeStop={(_, __, ref, ___, pos) => {
          setSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          });
          setPosition(pos);
        }}
        minWidth={320}
        minHeight={400}
        maxWidth={600}
        maxHeight={800}
        dragHandleClassName="mission-panel-handle"
        bounds="window"
        style={{ zIndex: 1000 }}
      >
        <div className="mission-panel">
          {/* Header / Drag Handle */}
          <div className="mission-panel-handle">
            <div className="mission-header">
              <div className="mission-status">
                <span className={`status-dot ${isPaused ? "paused" : "active"}`} />
                <span className="status-text">{isPaused ? "PAUSED" : "EXECUTING"}</span>
              </div>
              <span className="mission-name">{proposal.missionName}</span>
              <button className="close-btn" onClick={onClose} title="Close panel">×</button>
            </div>
            <div className="mission-meta">
              <span className="tier-badge">{proposal.tierUsed}</span>
              <span className="roe-badge">{proposal.roe.replace("_", " ")}</span>
              <span className="confidence">{Math.round(proposal.confidence * 100)}% conf</span>
            </div>
          </div>

          {/* Content */}
          <div className="mission-content">
            {/* Assets Section */}
            <section className="panel-section">
              <div className="section-header">
                <h3>ASSETS ({allAssets.length})</h3>
                <button className="add-btn" onClick={handleAddAsset}>+ ADD</button>
              </div>
              <div className="asset-grid">
                {allAssets.map((asset, idx) => (
                  <AssetCard key={idx} asset={asset} />
                ))}
              </div>
            </section>

            {/* Threats Section */}
            <section className="panel-section">
              <div className="section-header">
                <h3>THREATS ({totalThreats})</h3>
              </div>
              <div className="threat-list">
                {proposal.threats.map((threat, idx) => (
                  <ThreatCard key={idx} threat={threat} />
                ))}
              </div>
            </section>

            {/* Objectives Section */}
            <section className="panel-section">
              <div className="section-header">
                <h3>OBJECTIVES</h3>
              </div>
              <div className="objective-list">
                {proposal.objectives.map((obj, idx) => (
                  <ObjectiveCard key={idx} objective={obj} />
                ))}
              </div>
            </section>

            {/* Risks Section */}
            {proposal.risks.length > 0 && (
              <section className="panel-section risks">
                <div className="section-header">
                  <h3>RISKS</h3>
                </div>
                <ul className="risk-list">
                  {proposal.risks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mission-footer">
            {isPaused ? (
              <button className="resume-btn" onClick={onResumeMission}>
                RESUME MISSION
              </button>
            ) : (
              <button className="kill-btn" onClick={onKillMission}>
                KILL SWITCH
              </button>
            )}
          </div>
        </div>
      </Rnd>

      {/* Fleet Picker Modal */}
      {showFleetPicker && (
        <FleetPicker
          missionId={missionId}
          onAssign={handleAssignFromPicker}
          onClose={() => setShowFleetPicker(false)}
        />
      )}

      <style>{`
        .mission-panel {
          background: linear-gradient(180deg, #0a1628 0%, #0d1f35 100%);
          border: 1px solid #1e3a5f;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          height: 100%;
          font-family: 'JetBrains Mono', monospace;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .mission-panel-handle {
          cursor: move;
          background: linear-gradient(180deg, #122840 0%, #0f1f32 100%);
          border-bottom: 1px solid #1e3a5f;
          padding: 12px;
        }

        .mission-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mission-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-dot.active {
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
        }

        .status-dot.paused {
          background: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
          animation: none;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .status-text {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .mission-name {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: #22d3ee;
          text-transform: uppercase;
        }

        .close-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 20px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }

        .close-btn:hover {
          color: #ef4444;
        }

        .mission-meta {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .tier-badge, .roe-badge {
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tier-badge {
          background: #1e3a5f;
          color: #3b82f6;
        }

        .roe-badge {
          background: #1e1e2e;
          color: #f59e0b;
        }

        .confidence {
          font-size: 10px;
          color: #64748b;
          margin-left: auto;
        }

        .mission-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .panel-section {
          margin-bottom: 16px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .section-header h3 {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0;
        }

        .add-btn {
          background: #1e3a5f;
          border: 1px solid #3b82f6;
          color: #3b82f6;
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit;
          text-transform: uppercase;
        }

        .add-btn:hover {
          background: #3b82f6;
          color: white;
        }

        .asset-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 8px;
        }

        .asset-card {
          background: #0f1f32;
          border: 1px solid #1e3a5f;
          border-radius: 4px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .asset-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: white;
        }

        .asset-callsign {
          font-size: 10px;
          color: #e2e8f0;
          font-weight: 500;
        }

        .asset-role {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .threat-list, .objective-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .threat-card {
          background: #0f1f32;
          border: 1px solid #1e3a5f;
          border-radius: 4px;
          padding: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .threat-badge {
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 3px;
          color: white;
          font-weight: 600;
        }

        .threat-info {
          flex: 1;
        }

        .threat-count {
          font-size: 12px;
          color: #e2e8f0;
        }

        .threat-location {
          font-size: 9px;
          color: #64748b;
        }

        .objective-card {
          background: #0f1f32;
          border: 1px solid #1e3a5f;
          border-radius: 4px;
          padding: 8px;
        }

        .objective-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .objective-status {
          font-size: 8px;
          padding: 2px 4px;
          border-radius: 2px;
          text-transform: uppercase;
        }

        .objective-status.pending { background: #1e3a5f; color: #64748b; }
        .objective-status.in_progress { background: #1e3a5f; color: #3b82f6; }
        .objective-status.complete { background: #166534; color: #22c55e; }
        .objective-status.failed { background: #7f1d1d; color: #ef4444; }

        .objective-desc {
          font-size: 11px;
          color: #e2e8f0;
        }

        .objective-progress {
          height: 3px;
          background: #1e3a5f;
          border-radius: 2px;
          margin-top: 6px;
          overflow: hidden;
        }

        .objective-progress-bar {
          height: 100%;
          background: #22c55e;
          transition: width 0.3s ease;
        }

        .risks {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 4px;
          padding: 8px;
        }

        .risk-list {
          margin: 0;
          padding-left: 16px;
        }

        .risk-list li {
          font-size: 10px;
          color: #fca5a5;
          margin-bottom: 4px;
        }

        .mission-footer {
          padding: 12px;
          border-top: 1px solid #1e3a5f;
          display: flex;
          justify-content: center;
        }

        .kill-btn {
          background: linear-gradient(180deg, #dc2626 0%, #991b1b 100%);
          border: 1px solid #ef4444;
          color: white;
          font-size: 12px;
          font-weight: 600;
          padding: 10px 32px;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.3);
        }

        .kill-btn:hover {
          background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
        }

        .resume-btn {
          background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
          border: 1px solid #22c55e;
          color: white;
          font-size: 12px;
          font-weight: 600;
          padding: 10px 32px;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 0 16px rgba(34, 197, 94, 0.3);
        }

        .resume-btn:hover {
          background: linear-gradient(180deg, #4ade80 0%, #22c55e 100%);
        }
      `}</style>
    </>
  );
};

// Sub-components
const AssetCard: FC<{ asset: AssetProposal }> = ({ asset }) => (
  <div className="asset-card">
    <div
      className="asset-icon"
      style={{ backgroundColor: ROLE_COLORS[asset.role] || "#3b82f6" }}
    >
      {PLATFORM_ICONS[asset.platform_type] || "?"}
    </div>
    <span className="asset-callsign">{asset.callsign}</span>
    <span className="asset-role" style={{ color: ROLE_COLORS[asset.role] || "#64748b" }}>
      {asset.role}
    </span>
  </div>
);

const ThreatCard: FC<{ threat: ThreatSpec }> = ({ threat }) => (
  <div className="threat-card">
    <span
      className="threat-badge"
      style={{ backgroundColor: THREAT_COLORS[threat.type] || "#ef4444" }}
    >
      {threat.type}
    </span>
    <div className="threat-info">
      <span className="threat-count">{threat.count}× hostile</span>
      <span className="threat-location">
        {threat.location.city_name || `${threat.location.lat.toFixed(2)}, ${threat.location.lon.toFixed(2)}`}
      </span>
    </div>
  </div>
);

const ObjectiveCard: FC<{ objective: Objective }> = ({ objective }) => (
  <div className="objective-card">
    <div className="objective-header">
      <span className={`objective-status ${objective.status.toLowerCase().replace("_", "-")}`}>
        {objective.status.replace("_", " ")}
      </span>
    </div>
    <div className="objective-desc">{objective.description}</div>
    <div className="objective-progress">
      <div
        className="objective-progress-bar"
        style={{ width: `${objective.progress}%` }}
      />
    </div>
  </div>
);
