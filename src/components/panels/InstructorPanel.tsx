import { useState, useCallback, useEffect, useRef } from "react";
import { useUIStore } from "../../stores/uiStore";
import { useAuditStore } from "../../stores/auditStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import type { InstructorControlPayload } from "../../lib/protocol";

/**
 * InstructorPanel - Controls for the instructor/supervisor.
 *
 * Features:
 * - PAUSE/RESUME simulation
 * - STEP/STEP_N for frame-by-frame
 * - Time scale slider (0.5x - 10x)
 * - REWIND controls
 * - KILL_SWITCH with confirmation
 */
export function InstructorPanel() {
  const simPaused = useUIStore((s) => s.simPaused);
  const timeScale = useUIStore((s) => s.timeScale);
  const simTick = useUIStore((s) => s.simTick);
  const safeMode = useUIStore((s) => s.safeMode);
  const logInstructorCommand = useAuditStore((s) => s.logInstructorCommand);
  const { send } = useWebSocket({ autoConnect: false });

  const [stepCount, setStepCount] = useState(10);
  const [rewindSeconds, setRewindSeconds] = useState(30);
  const [killSwitchConfirm, setKillSwitchConfirm] = useState(false);
  const killSwitchTimeoutRef = useRef<number | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (killSwitchTimeoutRef.current) {
        clearTimeout(killSwitchTimeoutRef.current);
      }
    };
  }, []);

  // Send instructor command helper
  const sendCommand = useCallback(
    async (payload: InstructorControlPayload) => {
      send(payload);
      await logInstructorCommand(payload.command, payload);
    },
    [send, logInstructorCommand]
  );

  // Control handlers
  const handlePause = useCallback(() => {
    sendCommand({ type: "INSTRUCTOR_CONTROL", command: "PAUSE" });
  }, [sendCommand]);

  const handleResume = useCallback(() => {
    sendCommand({ type: "INSTRUCTOR_CONTROL", command: "RESUME" });
  }, [sendCommand]);

  const handleStep = useCallback(() => {
    sendCommand({ type: "INSTRUCTOR_CONTROL", command: "STEP" });
  }, [sendCommand]);

  const handleStepN = useCallback(() => {
    sendCommand({ type: "INSTRUCTOR_CONTROL", command: "STEP_N", count: stepCount });
  }, [sendCommand, stepCount]);

  const handleTimeScale = useCallback(
    (scale: number) => {
      sendCommand({ type: "INSTRUCTOR_CONTROL", command: "SET_TIME_SCALE", scale });
    },
    [sendCommand]
  );

  const handleRewind = useCallback(() => {
    sendCommand({ type: "INSTRUCTOR_CONTROL", command: "REWIND", seconds: rewindSeconds });
  }, [sendCommand, rewindSeconds]);

  const handleKillSwitch = useCallback(() => {
    if (!killSwitchConfirm) {
      setKillSwitchConfirm(true);
      // Clear existing timeout if any
      if (killSwitchTimeoutRef.current) {
        clearTimeout(killSwitchTimeoutRef.current);
      }
      // Auto-reset confirmation after 5 seconds
      killSwitchTimeoutRef.current = window.setTimeout(() => {
        setKillSwitchConfirm(false);
        killSwitchTimeoutRef.current = null;
      }, 5000);
      return;
    }
    // Clear timeout since we're confirming
    if (killSwitchTimeoutRef.current) {
      clearTimeout(killSwitchTimeoutRef.current);
      killSwitchTimeoutRef.current = null;
    }
    sendCommand({ type: "INSTRUCTOR_CONTROL", command: "KILL_SWITCH" });
    setKillSwitchConfirm(false);
  }, [sendCommand, killSwitchConfirm]);

  const handleResumeFromSafeMode = useCallback(() => {
    sendCommand({ type: "INSTRUCTOR_CONTROL", command: "RESUME_FROM_SAFE_MODE" });
  }, [sendCommand]);

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>INSTRUCTOR CONTROLS</h2>

      {/* Simulation Status */}
      <div style={styles.section}>
        <div style={styles.statusRow}>
          <span style={styles.label}>Status</span>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor: simPaused ? "var(--color-warning)" : "var(--color-friendly)",
            }}
          >
            {simPaused ? "PAUSED" : "RUNNING"}
          </span>
        </div>
        <div style={styles.statusRow}>
          <span style={styles.label}>Tick</span>
          <span style={styles.value}>{simTick}</span>
        </div>
        <div style={styles.statusRow}>
          <span style={styles.label}>Time Scale</span>
          <span style={styles.value}>{timeScale.toFixed(1)}x</span>
        </div>
      </div>

      {/* Play Controls */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Playback</h3>
        <div style={styles.buttonRow}>
          <button
            style={{
              ...styles.button,
              ...(simPaused ? {} : styles.buttonActive),
            }}
            onClick={handlePause}
            disabled={simPaused}
          >
            ⏸ PAUSE
          </button>
          <button
            style={{
              ...styles.button,
              ...(simPaused ? styles.buttonActive : {}),
            }}
            onClick={handleResume}
            disabled={!simPaused}
          >
            ▶ RESUME
          </button>
        </div>
      </div>

      {/* Step Controls */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Step Control</h3>
        <div style={styles.buttonRow}>
          <button style={styles.button} onClick={handleStep} disabled={!simPaused}>
            ⏭ STEP
          </button>
          <button style={styles.button} onClick={handleStepN} disabled={!simPaused}>
            ⏩ STEP {stepCount}
          </button>
        </div>
        <div style={styles.inputRow}>
          <label style={styles.inputLabel}>Step Count:</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={stepCount}
            onChange={(e) => setStepCount(Math.max(1, parseInt(e.target.value) || 1))}
            style={styles.input}
          />
        </div>
      </div>

      {/* Time Scale */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Time Scale</h3>
        <div style={styles.sliderRow}>
          <span style={styles.sliderLabel}>0.5x</span>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={timeScale}
            onChange={(e) => handleTimeScale(parseFloat(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.sliderLabel}>10x</span>
        </div>
        <div style={styles.presetRow}>
          {[0.5, 1, 2, 5, 10].map((scale) => (
            <button
              key={scale}
              style={{
                ...styles.presetButton,
                ...(Math.abs(timeScale - scale) < 0.1 ? styles.presetActive : {}),
              }}
              onClick={() => handleTimeScale(scale)}
            >
              {scale}x
            </button>
          ))}
        </div>
      </div>

      {/* Rewind */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Rewind</h3>
        <div style={styles.inputRow}>
          <label style={styles.inputLabel}>Seconds:</label>
          <input
            type="number"
            min={1}
            max={300}
            value={rewindSeconds}
            onChange={(e) => setRewindSeconds(Math.max(1, parseInt(e.target.value) || 1))}
            style={styles.input}
          />
        </div>
        <button style={styles.button} onClick={handleRewind}>
          ⏪ REWIND {rewindSeconds}s
        </button>
      </div>

      {/* Safe Mode Resume */}
      {safeMode.active && safeMode.canResume && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Safe Mode</h3>
          <button style={styles.resumeSafeButton} onClick={handleResumeFromSafeMode}>
            ✓ RESUME FROM SAFE MODE
          </button>
        </div>
      )}

      {/* Kill Switch - DANGER ZONE */}
      <div style={styles.dangerSection}>
        <h3 style={styles.dangerTitle}>EMERGENCY</h3>
        <button
          style={{
            ...styles.killButton,
            ...(killSwitchConfirm ? styles.killButtonConfirm : {}),
          }}
          onClick={handleKillSwitch}
        >
          {killSwitchConfirm ? "⚠ CLICK AGAIN TO CONFIRM" : "⬛ KILL SWITCH"}
        </button>
        {killSwitchConfirm && (
          <p style={styles.killWarning}>
            This will immediately halt all simulated autonomous operations.
          </p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "8px",
    border: "1px solid var(--border-default)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxHeight: "100%",
    overflowY: "auto",
  },
  title: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--text-secondary)",
    paddingBottom: "8px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  value: {
    fontSize: "14px",
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-primary)",
  },
  statusBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--bg-primary)",
    letterSpacing: "0.05em",
  },
  buttonRow: {
    display: "flex",
    gap: "8px",
  },
  button: {
    flex: 1,
    padding: "10px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    color: "var(--text-primary)",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  buttonActive: {
    backgroundColor: "var(--color-accent)",
    color: "var(--bg-primary)",
    borderColor: "var(--color-accent)",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  inputLabel: {
    fontSize: "12px",
    color: "var(--text-muted)",
    minWidth: "80px",
  },
  input: {
    flex: 1,
    padding: "6px 8px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    color: "var(--text-primary)",
    fontFamily: "var(--font-family-mono)",
    fontSize: "12px",
  },
  sliderRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sliderLabel: {
    fontSize: "11px",
    color: "var(--text-muted)",
    fontFamily: "var(--font-family-mono)",
  },
  slider: {
    flex: 1,
    accentColor: "var(--color-accent)",
  },
  presetRow: {
    display: "flex",
    gap: "4px",
  },
  presetButton: {
    flex: 1,
    padding: "6px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "4px",
    color: "var(--text-secondary)",
    fontWeight: 500,
    fontSize: "11px",
    cursor: "pointer",
    fontFamily: "var(--font-family-mono)",
  },
  presetActive: {
    backgroundColor: "var(--color-accent)",
    color: "var(--bg-primary)",
    borderColor: "var(--color-accent)",
  },
  resumeSafeButton: {
    padding: "12px",
    backgroundColor: "var(--color-friendly)",
    border: "none",
    borderRadius: "4px",
    color: "var(--bg-primary)",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  },
  dangerSection: {
    marginTop: "8px",
    padding: "12px",
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    border: "1px solid var(--color-hostile)",
    borderRadius: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  dangerTitle: {
    margin: 0,
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--color-hostile)",
    letterSpacing: "0.1em",
  },
  killButton: {
    padding: "14px",
    backgroundColor: "var(--color-hostile)",
    border: "none",
    borderRadius: "4px",
    color: "white",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    letterSpacing: "0.05em",
  },
  killButtonConfirm: {
    backgroundColor: "#FF0000",
    animation: "pulse 0.5s ease-in-out infinite alternate",
  },
  killWarning: {
    margin: 0,
    fontSize: "11px",
    color: "var(--color-hostile)",
    textAlign: "center",
  },
};
