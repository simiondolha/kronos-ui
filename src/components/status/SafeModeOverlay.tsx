import { useUIStore } from "../../stores/uiStore";
import { useAuditStore } from "../../stores/auditStore";
import { useWebSocket } from "../../hooks/useWebSocket";

/**
 * SafeModeOverlay - CRITICAL safety UI component.
 *
 * Full-width RED BANNER when safe mode is active.
 * Cannot be accidentally dismissed.
 * MUST be visible and unmissable.
 */
export function SafeModeOverlay() {
  const safeMode = useUIStore((s) => s.safeMode);
  const deactivateSafeMode = useUIStore((s) => s.deactivateSafeMode);
  const logSafeModeDeactivated = useAuditStore((s) => s.logSafeModeDeactivated);
  const { send } = useWebSocket({ autoConnect: false });

  if (!safeMode.active) {
    return null;
  }

  const handleResume = async () => {
    if (!safeMode.canResume) return;

    // Send RESUME_FROM_SAFE_MODE command
    const sent = send({
      type: "INSTRUCTOR_CONTROL",
      command: "RESUME_FROM_SAFE_MODE",
    });

    if (sent) {
      deactivateSafeMode();
      await logSafeModeDeactivated();
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.banner}>
        {/* Warning icon */}
        <div style={styles.iconContainer}>
          <span style={styles.icon}>⚠</span>
        </div>

        {/* Message */}
        <div style={styles.content}>
          <h2 style={styles.title}>SAFE MODE ACTIVE</h2>
          <p style={styles.reason}>{safeMode.reason}</p>
          <p style={styles.subtitle}>All weapons systems SAFE - Awaiting instructor</p>
        </div>

        {/* Resume button (only if allowed) */}
        {safeMode.canResume && (
          <button style={styles.resumeButton} onClick={handleResume}>
            RESUME OPERATIONS
          </button>
        )}
      </div>

      {/* Pulsing border effect */}
      <style>
        {`
          @keyframes safeModeFlash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 700, // Above everything
    pointerEvents: "auto",
  },
  banner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "24px",
    backgroundColor: "var(--color-hostile)",
    padding: "16px 24px",
    borderBottom: "4px solid #AA0000",
    animation: "safeModeFlash 2s ease-in-out infinite",
  },
  iconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "48px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: "50%",
  },
  icon: {
    fontSize: "28px",
    color: "white",
  },
  content: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "4px",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 700,
    color: "white",
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
  },
  reason: {
    margin: 0,
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.9)",
  },
  subtitle: {
    margin: 0,
    fontSize: "12px",
    color: "rgba(255, 255, 255, 0.7)",
    fontFamily: "var(--font-family-mono)",
  },
  resumeButton: {
    padding: "12px 24px",
    backgroundColor: "white",
    color: "var(--color-hostile)",
    border: "none",
    borderRadius: "4px",
    fontWeight: 700,
    fontSize: "14px",
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "transform 0.1s ease",
  },
};
