import React, { useMemo } from "react";
import { useSwarmStore } from "../../stores/swarmStore";
import { useEntityStore } from "../../stores/entityStore";

const STATUS_COLORS: Record<string, string> = {
  OK: "#00E676",
  WARN: "#FFAB00",
  BAD: "#FF4444",
  OFF: "#7A7A7A",
};

function getBatteryStatus(battery: number) {
  if (battery >= 60) return "OK";
  if (battery >= 30) return "WARN";
  return "BAD";
}

export const SwarmStatusPiP: React.FC = () => {
  const swarm = useSwarmStore((s) => s.swarm);
  // Access raw Map to avoid infinite loop (getSwarmDrones returns new array each call)
  const droneMap = useSwarmStore((s) => s.drones);
  const phase = useEntityStore((s) => s.phase);
  const entityMap = useEntityStore((s) => s.entities);

  // Compute swarm drones in useMemo to avoid infinite re-renders
  const drones = useMemo(() => {
    if (!swarm) return [];
    return swarm.members
      .map((m) => droneMap.get(m.drone_id))
      .filter((d): d is NonNullable<typeof d> => d !== undefined);
  }, [swarm, droneMap]);

  const sorted = useMemo(
    () => [...drones].sort((a, b) => a.callsign.localeCompare(b.callsign)),
    [drones]
  );

  if (!swarm || sorted.length === 0) {
    return null;
  }

  return (
    <div className="swarm-pip glass-panel">
      <div className="swarm-pip__header">
        <div className="swarm-pip__title">SWARM STATUS</div>
        <div className="swarm-pip__phase">{phase}</div>
      </div>
      <div className="swarm-pip__formation">
        Formation: <span>{swarm.formation_type.toUpperCase()}</span>
      </div>
      <div className="swarm-pip__grid">
        {sorted.map((d) => {
          const batteryStatus = getBatteryStatus(d.battery);
          const entity = entityMap.get(d.entity_id);
          const linkStatus = entity?.link_status ?? "UNKNOWN";
          const linkColor =
            linkStatus === "CONNECTED" ? STATUS_COLORS.OK :
            linkStatus === "DEGRADED" ? STATUS_COLORS.WARN :
            linkStatus === "LOST" ? STATUS_COLORS.BAD :
            STATUS_COLORS.OFF;

          return (
            <div key={d.entity_id} className="swarm-pip__card">
              <div className="swarm-pip__card-header">
                <span className="swarm-pip__callsign">{d.callsign}</span>
                <span className="swarm-pip__role">
                  {swarm.leader_id === d.entity_id ? "LEAD" : "WING"}
                </span>
              </div>
              <div className="swarm-pip__row">
                <span className="swarm-pip__label">BAT</span>
                <div className="swarm-pip__bar">
                  <div
                    className="swarm-pip__bar-fill"
                    style={{
                      width: `${Math.max(0, Math.min(100, d.battery))}%`,
                      backgroundColor: STATUS_COLORS[batteryStatus],
                    }}
                  />
                </div>
                <span className="swarm-pip__value">{Math.round(d.battery)}%</span>
              </div>
              <div className="swarm-pip__row">
                <span className="swarm-pip__label">COMMS</span>
                <span className="swarm-pip__value" style={{ color: linkColor }}>
                  {linkStatus}
                </span>
              </div>
              <div className="swarm-pip__row">
                <span className="swarm-pip__label">MODE</span>
                <span className="swarm-pip__value">{d.mode}</span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .swarm-pip {
          position: absolute;
          right: 20px;
          bottom: 20px;
          width: 280px;
          padding: 12px;
          border: 1px solid rgba(0, 188, 212, 0.25);
          background: rgba(7, 12, 18, 0.75);
          backdrop-filter: blur(10px);
          z-index: 120;
        }

        .swarm-pip__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .swarm-pip__title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--color-accent);
        }

        .swarm-pip__phase {
          font-size: 10px;
          font-family: var(--font-family-mono);
          color: var(--text-secondary);
        }

        .swarm-pip__formation {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 10px;
        }

        .swarm-pip__formation span {
          color: var(--text-primary);
          font-weight: 700;
        }

        .swarm-pip__grid {
          display: grid;
          gap: 8px;
        }

        .swarm-pip__card {
          padding: 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .swarm-pip__card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .swarm-pip__callsign {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .swarm-pip__role {
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 10px;
          background: rgba(0, 188, 212, 0.2);
          color: var(--color-accent);
          letter-spacing: 0.1em;
        }

        .swarm-pip__row {
          display: grid;
          grid-template-columns: 44px 1fr auto;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }

        .swarm-pip__label {
          font-size: 9px;
          color: var(--text-muted);
          letter-spacing: 0.08em;
        }

        .swarm-pip__value {
          font-size: 10px;
          font-family: var(--font-family-mono);
          color: var(--text-primary);
        }

        .swarm-pip__bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
        }

        .swarm-pip__bar-fill {
          height: 100%;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

