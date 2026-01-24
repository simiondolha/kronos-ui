import { type FC, useState, useCallback, useRef, useEffect } from "react";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useAuditStore } from "../../stores/auditStore";
import { type Scenario, SCENARIOS } from "../../lib/scenarios";

interface CompactInstructorControlsProps {
  currentScenario: Scenario;
  onSelectScenario: (scenario: Scenario) => void;
  onStart: () => void;
  onReset: () => void;
}

/**
 * CompactInstructorControls - Tiny instructor controls panel.
 *
 * Size: 200px x 140px
 * Features:
 * - Scenario dropdown
 * - Start/Reset buttons (inline)
 * - Kill switch (always visible, red)
 */
export const CompactInstructorControls: FC<CompactInstructorControlsProps> = ({
  currentScenario,
  onSelectScenario,
  onStart,
  onReset,
}) => {
  const { send } = useWebSocket({ autoConnect: false });
  const logInstructorCommand = useAuditStore((s) => s.logInstructorCommand);

  const [showDropdown, setShowDropdown] = useState(false);
  const [killConfirm, setKillConfirm] = useState(false);
  const killTimeoutRef = useRef<number | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (killTimeoutRef.current) {
        clearTimeout(killTimeoutRef.current);
      }
    };
  }, []);

  const handleKillSwitch = useCallback(() => {
    if (!killConfirm) {
      setKillConfirm(true);
      if (killTimeoutRef.current) {
        clearTimeout(killTimeoutRef.current);
      }
      killTimeoutRef.current = window.setTimeout(() => {
        setKillConfirm(false);
        killTimeoutRef.current = null;
      }, 5000);
      return;
    }
    // Confirmed - execute kill switch
    if (killTimeoutRef.current) {
      clearTimeout(killTimeoutRef.current);
      killTimeoutRef.current = null;
    }
    send({ type: "INSTRUCTOR_CONTROL", command: "KILL_SWITCH" });
    logInstructorCommand("KILL_SWITCH", { type: "INSTRUCTOR_CONTROL", command: "KILL_SWITCH" });
    setKillConfirm(false);
  }, [killConfirm, send, logInstructorCommand]);

  return (
    <div style={styles.container}>
      {/* Header with scenario dropdown */}
      <div style={styles.header}>
        <span style={styles.title}>INSTRUCTOR</span>
        <button style={styles.dropdown} onClick={() => setShowDropdown(!showDropdown)}>
          <span style={styles.scenarioKey}>{currentScenario.key}</span>
          <span style={styles.scenarioName}>{currentScenario.shortName}</span>
          <span style={styles.arrow}>▼</span>
        </button>
      </div>

      {/* Dropdown menu */}
      {showDropdown && (
        <div style={styles.dropdownMenu}>
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              style={{
                ...styles.dropdownItem,
                backgroundColor: scenario.id === currentScenario.id ? "var(--color-accent)" : "transparent",
                color: scenario.id === currentScenario.id ? "var(--bg-primary)" : "var(--text-secondary)",
              }}
              onClick={() => {
                onSelectScenario(scenario);
                setShowDropdown(false);
              }}
            >
              <span style={styles.dropdownKey}>{scenario.key}</span>
              {scenario.shortName}
            </button>
          ))}
        </div>
      )}

      {/* Start/Reset buttons */}
      <div style={styles.buttonRow}>
        <button style={styles.startBtn} onClick={onStart}>
          ▶ START
        </button>
        <button style={styles.resetBtn} onClick={onReset}>
          ⏹ RESET
        </button>
      </div>

      {/* Kill switch */}
      <button
        style={{
          ...styles.killBtn,
          backgroundColor: killConfirm ? "#FF0000" : "var(--color-hostile)",
          animation: killConfirm ? "kill-pulse 0.5s ease-in-out infinite" : "none",
        }}
        onClick={handleKillSwitch}
      >
        {killConfirm ? "⚠ CONFIRM KILL" : "⚠ KILL ALL AUTONOMY"}
      </button>

      <style>{`
        @keyframes kill-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "200px",
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-default)",
    borderRadius: "6px",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontFamily: "var(--font-family-mono)",
    fontSize: "10px",
    position: "relative",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "4px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  title: {
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--text-muted)",
    fontSize: "9px",
  },
  dropdown: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 6px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "3px",
    cursor: "pointer",
    color: "var(--text-primary)",
    fontSize: "9px",
  },
  scenarioKey: {
    padding: "1px 4px",
    backgroundColor: "var(--color-accent)",
    color: "var(--bg-primary)",
    borderRadius: "2px",
    fontWeight: 700,
    fontSize: "8px",
  },
  scenarioName: {
    maxWidth: "80px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  arrow: {
    fontSize: "7px",
    color: "var(--text-muted)",
  },
  dropdownMenu: {
    position: "absolute",
    top: "32px",
    right: "8px",
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    zIndex: 100,
    boxShadow: "var(--shadow-lg)",
    maxHeight: "200px",
    overflowY: "auto",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    width: "100%",
    textAlign: "left",
    border: "none",
    cursor: "pointer",
    fontSize: "10px",
    whiteSpace: "nowrap",
  },
  dropdownKey: {
    padding: "1px 4px",
    backgroundColor: "var(--bg-tertiary)",
    borderRadius: "2px",
    fontWeight: 700,
    fontSize: "9px",
  },
  buttonRow: {
    display: "flex",
    gap: "4px",
  },
  startBtn: {
    flex: 1,
    padding: "6px",
    backgroundColor: "var(--color-friendly)",
    border: "none",
    borderRadius: "4px",
    color: "var(--bg-primary)",
    fontWeight: 700,
    fontSize: "10px",
    cursor: "pointer",
  },
  resetBtn: {
    flex: 1,
    padding: "6px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    color: "var(--text-secondary)",
    fontWeight: 600,
    fontSize: "10px",
    cursor: "pointer",
  },
  killBtn: {
    padding: "10px",
    backgroundColor: "var(--color-hostile)",
    border: "none",
    borderRadius: "4px",
    color: "white",
    fontWeight: 700,
    fontSize: "10px",
    letterSpacing: "0.05em",
    cursor: "pointer",
  },
};
