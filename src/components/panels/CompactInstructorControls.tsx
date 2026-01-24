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
 * CompactInstructorControls - Footer bar with instructor controls.
 *
 * Horizontal layout: Scenario dropdown | Start/Reset | Kill switch
 * Fixed to bottom of screen.
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
    <footer style={styles.footer}>
      {/* Scenario selector */}
      <div style={styles.section}>
        <button style={styles.dropdown} onClick={() => setShowDropdown(!showDropdown)}>
          <span style={styles.scenarioKey}>{currentScenario.key}</span>
          <span style={styles.scenarioName}>{currentScenario.shortName}</span>
          <span style={styles.arrow}>▼</span>
        </button>

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
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Start/Reset buttons */}
      <div style={styles.buttonGroup}>
        <button style={styles.startBtn} onClick={onStart}>
          ▶ START
        </button>
        <button style={styles.resetBtn} onClick={onReset}>
          ⏹ RESET
        </button>
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Kill switch */}
      <button
        style={{
          ...styles.killBtn,
          backgroundColor: killConfirm ? "#FF0000" : "var(--color-hostile)",
          animation: killConfirm ? "kill-pulse 0.5s ease-in-out infinite" : "none",
        }}
        onClick={handleKillSwitch}
      >
        {killConfirm ? "⚠ CONFIRM" : "⚠ KILL ALL AUTONOMY"}
      </button>

      <style>{`
        @keyframes kill-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </footer>
  );
};

const styles: Record<string, React.CSSProperties> = {
  footer: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: "48px",
    backgroundColor: "var(--bg-secondary)",
    borderTop: "1px solid var(--border-default)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    padding: "0 16px",
    zIndex: 100,
    fontFamily: "var(--font-family-mono)",
    fontSize: "11px",
  },
  section: {
    position: "relative",
  },
  dropdown: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    cursor: "pointer",
    color: "var(--text-primary)",
    fontSize: "11px",
  },
  scenarioKey: {
    padding: "2px 6px",
    backgroundColor: "var(--color-accent)",
    color: "var(--bg-primary)",
    borderRadius: "3px",
    fontWeight: 700,
    fontSize: "10px",
  },
  scenarioName: {
    maxWidth: "120px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  arrow: {
    fontSize: "8px",
    color: "var(--text-muted)",
  },
  dropdownMenu: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    marginBottom: "4px",
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    zIndex: 200,
    boxShadow: "var(--shadow-lg)",
    maxHeight: "300px",
    overflowY: "auto",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    width: "100%",
    textAlign: "left",
    border: "none",
    cursor: "pointer",
    fontSize: "11px",
    whiteSpace: "nowrap",
  },
  dropdownKey: {
    padding: "2px 6px",
    backgroundColor: "var(--bg-tertiary)",
    borderRadius: "3px",
    fontWeight: 700,
    fontSize: "10px",
  },
  divider: {
    width: "1px",
    height: "24px",
    backgroundColor: "var(--border-default)",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
  },
  startBtn: {
    padding: "8px 16px",
    backgroundColor: "var(--color-friendly)",
    border: "none",
    borderRadius: "4px",
    color: "var(--bg-primary)",
    fontWeight: 700,
    fontSize: "11px",
    cursor: "pointer",
  },
  resetBtn: {
    padding: "8px 16px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    color: "var(--text-secondary)",
    fontWeight: 600,
    fontSize: "11px",
    cursor: "pointer",
  },
  killBtn: {
    padding: "8px 16px",
    backgroundColor: "var(--color-hostile)",
    border: "none",
    borderRadius: "4px",
    color: "white",
    fontWeight: 700,
    fontSize: "11px",
    letterSpacing: "0.03em",
    cursor: "pointer",
  },
};
