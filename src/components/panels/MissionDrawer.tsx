import React, { useMemo, useState } from "react";
import { useEntityStore } from "../../stores/entityStore";
import { useMissionPlanningStore } from "../../stores/missionPlanningStore";

interface MissionDrawerProps {
  onExecute: (missionId: string, assignments: Array<{
    entity_id: string;
    task_id: string;
    task_type: string;
    waypoints: Array<{ lat: number; lon: number; alt_m: number; speed_mps?: number }>;
    priority?: number;
  }>) => void;
}

export const MissionDrawer: React.FC<MissionDrawerProps> = ({ onExecute }) => {
  const waypoints = useMissionPlanningStore((s) => s.waypoints);
  const drawMode = useMissionPlanningStore((s) => s.drawMode);
  const setDrawMode = useMissionPlanningStore((s) => s.setDrawMode);
  const removeWaypoint = useMissionPlanningStore((s) => s.removeWaypoint);
  const clearWaypoints = useMissionPlanningStore((s) => s.clearWaypoints);
  const updateWaypoint = useMissionPlanningStore((s) => s.updateWaypoint);

  // Access Map directly to avoid infinite loop (getAllEntities returns new array each call)
  const entityMap = useEntityStore((s) => s.entities);
  const entities = useMemo(() => Array.from(entityMap.values()), [entityMap]);
  const [showBrief, setShowBrief] = useState(false);

  const assignments = useMemo(() => {
    return entities.map((e, idx) => ({
      entity_id: e.entity_id,
      task_id: `task-${idx + 1}`,
      task_type: "PATROL",
      waypoints: waypoints.map((w) => ({
        lat: w.lat,
        lon: w.lon,
        alt_m: w.alt_m,
        ...(w.speed_mps !== undefined && { speed_mps: w.speed_mps }),
      })),
      priority: 5,
    }));
  }, [entities, waypoints]);

  const handleExecute = () => {
    const missionId = `mission-${Date.now()}`;
    onExecute(missionId, assignments);
    setShowBrief(false);
  };

  return (
    <div className="mission-drawer glass-panel">
      <div className="mission-drawer__header">
        <span>MISSION DRAWER</span>
        <button
          className={`mission-drawer__toggle ${drawMode ? "active" : ""}`}
          onClick={() => setDrawMode(!drawMode)}
        >
          {drawMode ? "DRAWING" : "DRAW"}
        </button>
      </div>

      <div className="mission-drawer__actions">
        <button
          className="mission-drawer__btn"
          onClick={() => setShowBrief(true)}
          disabled={waypoints.length === 0}
        >
          PLAN MISSION
        </button>
        <button
          className="mission-drawer__btn ghost"
          onClick={clearWaypoints}
          disabled={waypoints.length === 0}
        >
          CLEAR
        </button>
      </div>

      <div className="mission-drawer__list">
        {waypoints.length === 0 && (
          <div className="mission-drawer__empty">Click "DRAW" then click the map to add waypoints.</div>
        )}
        {waypoints.map((wp, idx) => (
          <div key={`wp-${idx}`} className="mission-drawer__item">
            <div className="mission-drawer__item-header">
              <span>WP{idx + 1}</span>
              <button onClick={() => removeWaypoint(idx)}>X</button>
            </div>
            <div className="mission-drawer__coords">
              <div>Lat {wp.lat.toFixed(4)}</div>
              <div>Lon {wp.lon.toFixed(4)}</div>
            </div>
            <div className="mission-drawer__inputs">
              <label>
                Alt (m)
                <input
                  type="number"
                  value={Math.round(wp.alt_m)}
                  onChange={(e) => updateWaypoint(idx, { alt_m: Number(e.target.value) })}
                />
              </label>
              <label>
                Speed (m/s)
                <input
                  type="number"
                  value={wp.speed_mps ?? 250}
                  onChange={(e) => updateWaypoint(idx, { speed_mps: Number(e.target.value) })}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {showBrief && waypoints.length > 0 && (
        <div className="mission-drawer__brief">
          <div className="mission-drawer__brief-title">MISSION BRIEF</div>
          <div className="mission-drawer__brief-body">
            <div>{assignments.length} assets assigned</div>
            <div>{waypoints.length} waypoints</div>
            <div>Task: PATROL</div>
          </div>
          <div className="mission-drawer__brief-actions">
            <button className="mission-drawer__btn" onClick={handleExecute}>
              EXECUTE
            </button>
            <button className="mission-drawer__btn ghost" onClick={() => setShowBrief(false)}>
              CANCEL
            </button>
          </div>
        </div>
      )}

      <style>{`
        .mission-drawer {
          padding: 12px;
          border: 1px solid var(--border-default);
          background: rgba(11, 16, 22, 0.8);
        }

        .mission-drawer__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          letter-spacing: 0.12em;
          color: var(--color-accent);
          margin-bottom: 10px;
        }

        .mission-drawer__toggle {
          border: 1px solid rgba(0, 188, 212, 0.5);
          background: rgba(0, 188, 212, 0.1);
          color: var(--color-accent);
          padding: 4px 8px;
          font-size: 10px;
          cursor: pointer;
        }

        .mission-drawer__toggle.active {
          background: rgba(0, 230, 118, 0.2);
          border-color: rgba(0, 230, 118, 0.5);
          color: #00E676;
        }

        .mission-drawer__actions {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }

        .mission-drawer__btn {
          flex: 1;
          padding: 6px 8px;
          border: 1px solid var(--border-default);
          background: rgba(0, 188, 212, 0.12);
          color: var(--text-primary);
          font-size: 11px;
          cursor: pointer;
        }

        .mission-drawer__btn.ghost {
          background: transparent;
          color: var(--text-muted);
        }

        .mission-drawer__btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .mission-drawer__list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mission-drawer__empty {
          font-size: 11px;
          color: var(--text-muted);
          padding: 8px 0;
        }

        .mission-drawer__item {
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.03);
          padding: 8px;
          border-radius: 4px;
        }

        .mission-drawer__item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          margin-bottom: 6px;
          color: var(--text-primary);
        }

        .mission-drawer__item-header button {
          background: transparent;
          border: none;
          color: var(--color-hostile);
          cursor: pointer;
        }

        .mission-drawer__coords {
          font-size: 10px;
          color: var(--text-muted);
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .mission-drawer__inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        .mission-drawer__inputs label {
          font-size: 9px;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .mission-drawer__inputs input {
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-primary);
          padding: 4px;
          font-size: 10px;
        }

        .mission-drawer__brief {
          margin-top: 10px;
          padding: 10px;
          border: 1px solid rgba(0, 188, 212, 0.4);
          background: rgba(0, 188, 212, 0.08);
        }

        .mission-drawer__brief-title {
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--color-accent);
          margin-bottom: 6px;
        }

        .mission-drawer__brief-body {
          font-size: 11px;
          color: var(--text-secondary);
          display: grid;
          gap: 4px;
        }

        .mission-drawer__brief-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
};
