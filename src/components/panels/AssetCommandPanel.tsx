import { type FC, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEntityStore, type EntityWithTrail } from "../../stores/entityStore";

type TabId = "status" | "weapons" | "mission" | "commands";

const TABS: readonly { id: TabId; label: string; key: string }[] = [
  { id: "status", label: "STATUS", key: "1" },
  { id: "weapons", label: "WEAPONS", key: "2" },
  { id: "mission", label: "MISSION", key: "3" },
  { id: "commands", label: "COMMANDS", key: "4" },
];

const PANEL_VARIANTS = {
  hidden: { x: 320, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { x: 320, opacity: 0, transition: { duration: 0.2 } },
};

const TAB_VARIANTS = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0, transition: { duration: 0.15 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.1 } },
};

/**
 * AssetCommandPanel - Tabbed command interface for selected asset.
 */
export const AssetCommandPanel: FC = () => {
  const selectedEntityId = useEntityStore((s) => s.selectedEntityId);
  const entities = useEntityStore((s) => s.entities);
  const selectEntity = useEntityStore((s) => s.selectEntity);
  const [activeTab, setActiveTab] = useState<TabId>("status");

  // Drag state for floating panel - positioned to right of SelectedEntityPanel
  const [position, setPosition] = useState({ x: 320, y: 100 });
  const dragRef = useRef<{ isDragging: boolean; offsetX: number; offsetY: number }>({
    isDragging: false, offsetX: 0, offsetY: 0,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = {
      isDragging: true,
      offsetX: e.clientX - position.x,
      offsetY: e.clientY - position.y,
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current.isDragging) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragRef.current.offsetX));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragRef.current.offsetY));
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const entity = selectedEntityId ? entities.get(selectedEntityId) : undefined;

  // Keyboard navigation
  useEffect(() => {
    if (!entity) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        selectEntity(null);
        return;
      }
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < TABS.length) {
        setActiveTab(TABS[idx]!.id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [entity, selectEntity]);

  // Reset tab on entity change
  useEffect(() => {
    setActiveTab("status");
  }, [selectedEntityId]);

  if (!entity) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="asset-panel"
        className="acp"
        style={{ left: position.x, top: position.y }}
        variants={PANEL_VARIANTS}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <header className="acp__header acp__header--draggable" onMouseDown={handleMouseDown}>
          <div className="acp__title">
            <span className="acp__callsign">{entity.callsign}</span>
            <span className="acp__platform">{entity.platform_type}</span>
          </div>
          <button className="acp__close" onClick={() => selectEntity(null)} title="Close (Esc)">×</button>
        </header>

        <nav className="acp__tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`acp__tab ${activeTab === t.id ? "acp__tab--active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
              <span className="acp__tab-key">{t.key}</span>
            </button>
          ))}
        </nav>

        <div className="acp__content">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} variants={TAB_VARIANTS} initial="enter" animate="center" exit="exit">
              {activeTab === "status" && <StatusTab entity={entity} />}
              {activeTab === "weapons" && <WeaponsTab entity={entity} />}
              {activeTab === "mission" && <MissionTab entity={entity} />}
              {activeTab === "commands" && <CommandsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
      <style>{STYLES}</style>
    </AnimatePresence>
  );
};

// =============================================================================
// TABS
// =============================================================================

const StatusTab: FC<{ entity: EntityWithTrail }> = ({ entity }) => {
  const altFt = Math.round(entity.position.alt_m * 3.28084);
  const fl = `FL${Math.round(altFt / 100).toString().padStart(3, "0")}`;
  const spd = `${Math.round(entity.velocity.speed_mps * 1.94384)} KT`;
  const hdg = `${Math.round(entity.velocity.heading_deg)}°`;
  const vs = entity.velocity.climb_rate_mps;
  const fuel = Math.round(entity.fuel_percent);

  return (
    <div className="acp__tab-inner">
      <div className="acp__grid">
        <div className="acp__metric"><span className="acp__metric-label">ALT</span><span className="acp__metric-value">{fl}</span></div>
        <div className="acp__metric"><span className="acp__metric-label">SPD</span><span className="acp__metric-value">{spd}</span></div>
        <div className="acp__metric"><span className="acp__metric-label">HDG</span><span className="acp__metric-value">{hdg}</span></div>
        <div className="acp__metric"><span className="acp__metric-label">VS</span><span className="acp__metric-value">{vs > 0 ? "+" : ""}{Math.round(vs)} m/s</span></div>
      </div>

      <div className="acp__section">
        <div className="acp__label">FUEL</div>
        <div className="acp__fuel">
          <div className={`acp__fuel-fill acp__fuel-fill--${fuel < 20 ? "critical" : fuel < 40 ? "warning" : "ok"}`} style={{ width: `${fuel}%` }} />
          <span className="acp__fuel-text">{fuel}%</span>
        </div>
      </div>

      <div className="acp__section">
        <div className="acp__label">DATALINK</div>
        <div className="acp__status-row">
          <span className={`acp__dot acp__dot--${entity.link_status.toLowerCase()}`} />
          <span>{entity.link_status}</span>
        </div>
      </div>

      <div className="acp__section">
        <div className="acp__label">SENSOR</div>
        <div className="acp__status-row">
          <span className={`acp__dot ${entity.sensor_active ? "acp__dot--active" : ""}`} />
          <span>{entity.sensor_active ? entity.sensor_mode : "OFF"}</span>
        </div>
      </div>
    </div>
  );
};

const WeaponsTab: FC<{ entity: EntityWithTrail }> = ({ entity }) => {
  const isArmed = entity.weapons_state?.safety === "ARMED";
  const inventory = entity.weapons_state?.inventory ?? [];

  return (
    <div className="acp__tab-inner">
      <div className="acp__section">
        <div className="acp__label">MASTER ARM</div>
        <div className={`acp__safety acp__safety--${isArmed ? "armed" : "safe"}`}>
          <span className="acp__safety-dot" />
          <span>{isArmed ? "ARMED" : "SAFE"}</span>
        </div>
      </div>

      <div className="acp__section">
        <div className="acp__label">LOADOUT</div>
        {inventory.length > 0 ? (
          <div className="acp__loadout">
            {inventory.map((w, i) => (
              <div key={i} className="acp__weapon">◆ {w}</div>
            ))}
          </div>
        ) : (
          <div className="acp__empty">No weapons loaded</div>
        )}
      </div>

      <div className="acp__section">
        <div className="acp__label">ENGAGEMENT</div>
        <div className="acp__status-row">
          <span className="acp__dot" />
          <span>NO TARGET LOCK</span>
        </div>
      </div>
    </div>
  );
};

const MissionTab: FC<{ entity: EntityWithTrail }> = ({ entity }) => (
  <div className="acp__tab-inner">
    <div className="acp__section">
      <div className="acp__label">OBJECTIVE</div>
      <div className="acp__objective">
        <span className="acp__objective-type">CAP</span>
        Combat Air Patrol - Sector ALPHA
      </div>
    </div>

    <div className="acp__section">
      <div className="acp__label">PHASE</div>
      <div className="acp__phase">{entity.flight_phase}</div>
    </div>

    <div className="acp__section">
      <div className="acp__label">TIME ON STATION</div>
      <div className="acp__time">02:34:15</div>
    </div>

    <div className="acp__section">
      <div className="acp__label">BINGO / RTB</div>
      <div className="acp__bingo">
        <span>Est. RTB:</span>
        <span className="acp__bingo-value">45 min</span>
      </div>
    </div>
  </div>
);

const CommandsTab: FC = () => (
  <div className="acp__tab-inner">
    <div className="acp__section">
      <div className="acp__label">QUICK ACTIONS</div>
      <div className="acp__cmd-grid">
        <button className="acp__cmd">⏎<span>RTB</span></button>
        <button className="acp__cmd">◎<span>ORBIT</span></button>
        <button className="acp__cmd acp__cmd--warning">⚡<span>BREAK</span></button>
        <button className="acp__cmd acp__cmd--hostile">◆<span>ENGAGE</span></button>
      </div>
    </div>

    <div className="acp__section">
      <div className="acp__label">AUTHORITY</div>
      <button className="acp__auth">🔐 REQUEST WEAPONS RELEASE</button>
    </div>

    <div className="acp__section">
      <div className="acp__label">FORMATION</div>
      <div className="acp__formation">
        <button>SPREAD</button>
        <button>ECHELON</button>
        <button>TRAIL</button>
      </div>
    </div>
  </div>
);

// =============================================================================
// STYLES
// =============================================================================

const STYLES = `
.acp {
  position: fixed;
  width: 300px;
  max-height: calc(100vh - 160px);
  background: rgba(18, 22, 28, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 209, 255, 0.2);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  font-family: var(--font-family-mono);
  font-size: 11px;
  z-index: 1000;
}

.acp__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(0, 209, 255, 0.15);
  background: rgba(0, 209, 255, 0.05);
}

.acp__header--draggable {
  cursor: move;
  user-select: none;
}

.acp__title { display: flex; align-items: baseline; gap: 8px; }
.acp__callsign { font-size: 14px; font-weight: 700; color: var(--color-friendly); }
.acp__platform { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }

.acp__close {
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
}
.acp__close:hover { background: var(--color-hostile); color: #fff; border-color: var(--color-hostile); }

.acp__tabs { display: flex; border-bottom: 1px solid rgba(0, 209, 255, 0.1); }

.acp__tab {
  flex: 1;
  padding: 10px 4px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.acp__tab:hover { color: var(--text-primary); }
.acp__tab--active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
  background: linear-gradient(180deg, rgba(0, 209, 255, 0.1) 0%, transparent 100%);
}
.acp__tab-key { font-size: 8px; opacity: 0.5; }

.acp__content { padding: 12px; overflow-y: auto; max-height: calc(100vh - 280px); }
.acp__tab-inner { display: flex; flex-direction: column; gap: 12px; }
.acp__section { display: flex; flex-direction: column; gap: 6px; }
.acp__label { font-size: 9px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.1em; }

.acp__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.acp__metric {
  display: flex; flex-direction: column; gap: 2px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.acp__metric-label { font-size: 8px; color: var(--text-muted); font-weight: 600; }
.acp__metric-value { font-size: 14px; font-weight: 700; color: var(--text-primary); }

.acp__fuel {
  position: relative; height: 24px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.acp__fuel-fill {
  position: absolute; top: 0; left: 0; height: 100%;
  transition: width 0.3s ease;
  border-radius: 3px;
}
.acp__fuel-fill--ok { background: var(--color-friendly); }
.acp__fuel-fill--warning { background: var(--color-warning); }
.acp__fuel-fill--critical { background: var(--color-hostile); }
.acp__fuel-text {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px; font-weight: 700; color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.acp__status-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  font-weight: 600;
}

.acp__dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
}
.acp__dot--connected { background: var(--color-friendly); }
.acp__dot--degraded { background: var(--color-warning); }
.acp__dot--lost { background: var(--color-hostile); }
.acp__dot--active { background: var(--color-accent); }

.acp__safety {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border-radius: 6px;
  border: 2px solid;
  font-weight: 700;
}
.acp__safety--safe {
  background: rgba(0, 230, 118, 0.1);
  border-color: var(--color-friendly);
  color: var(--color-friendly);
}
.acp__safety--armed {
  background: rgba(255, 68, 68, 0.2);
  border-color: var(--color-hostile);
  color: var(--color-hostile);
}
.acp__safety-dot {
  width: 12px; height: 12px;
  border-radius: 50%;
  background: currentColor;
}
.acp__safety--armed .acp__safety-dot { box-shadow: 0 0 8px var(--color-hostile); }

.acp__loadout { display: flex; flex-direction: column; gap: 4px; }
.acp__weapon {
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-weight: 600;
  color: var(--color-warning);
}
.acp__empty { padding: 12px; text-align: center; color: var(--text-muted); font-style: italic; }

.acp__objective {
  padding: 10px;
  background: rgba(0, 209, 255, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(0, 209, 255, 0.2);
}
.acp__objective-type {
  display: inline-block;
  padding: 2px 6px;
  background: var(--color-accent);
  color: #000;
  font-size: 9px;
  font-weight: 700;
  border-radius: 3px;
  margin-right: 8px;
}

.acp__phase {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-friendly);
}

.acp__time {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.acp__bingo {
  display: flex; justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
.acp__bingo-value { font-weight: 700; color: var(--color-warning); }

.acp__cmd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.acp__cmd {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 8px;
  background: var(--bg-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
}
.acp__cmd:hover { background: rgba(255, 255, 255, 0.1); }
.acp__cmd--warning {
  background: linear-gradient(135deg, #FFAB00 0%, #CC8800 100%);
  color: #fff;
  box-shadow: 0 0 12px rgba(255, 171, 0, 0.3);
}
.acp__cmd--hostile {
  background: linear-gradient(135deg, #FF4444 0%, #CC0000 100%);
  color: #fff;
  box-shadow: 0 0 12px rgba(255, 68, 68, 0.4);
}

.acp__auth {
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(255, 68, 68, 0.2) 0%, rgba(204, 0, 0, 0.3) 100%);
  border: 2px solid var(--color-hostile);
  border-radius: 6px;
  color: var(--color-hostile);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.acp__auth:hover { background: rgba(255, 68, 68, 0.3); }

.acp__formation { display: flex; gap: 6px; }
.acp__formation button {
  flex: 1;
  padding: 8px 6px;
  background: var(--bg-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 600;
  cursor: pointer;
}
.acp__formation button:hover { background: rgba(255, 255, 255, 0.1); }
`;
