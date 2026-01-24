import { useEffect, useState } from "react";

export interface MissionAlert {
  id: string;
  title?: string;
  message: string;
  category: "MISSION" | "THREAT" | "INTEL" | "COMBAT" | "SYSTEM";
  duration?: number; // ms, default 5000
}

interface MissionAlertOverlayProps {
  alert: MissionAlert | null;
  onDismiss: () => void;
}

/**
 * MissionAlertOverlay - Centered overlay for critical mission alerts.
 *
 * Displays MISSION, THREAT, INTEL, and COMBAT alerts in center screen
 * for maximum operator visibility. Auto-dismisses after duration.
 */
export function MissionAlertOverlay({ alert, onDismiss }: MissionAlertOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Handle visibility and auto-dismiss
  useEffect(() => {
    if (!alert) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const duration = alert.duration || 5000;
    setTimeLeft(Math.ceil(duration / 1000));

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    // Auto-dismiss
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade animation
    }, duration);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(dismissTimer);
    };
  }, [alert, onDismiss]);

  if (!alert) return null;

  const categoryStyles = getCategoryStyles(alert.category);

  return (
    <div
      style={{
        ...styles.backdrop,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          ...styles.overlay,
          borderColor: categoryStyles.borderColor,
          transform: visible ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -50%) scale(0.95)",
          opacity: visible ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Category Badge */}
        <div style={{ ...styles.categoryBadge, backgroundColor: categoryStyles.badgeColor }}>
          {categoryStyles.icon} {alert.category}
        </div>

        {/* Title */}
        {alert.title && (
          <h2 style={{ ...styles.title, color: categoryStyles.titleColor }}>
            {alert.title}
          </h2>
        )}

        {/* Message */}
        <p style={styles.message}>{alert.message}</p>

        {/* Countdown */}
        <div style={styles.countdown}>
          Auto-dismiss in {timeLeft}s
        </div>

        {/* Dismiss Button */}
        <button style={styles.dismissButton} onClick={onDismiss}>
          ACKNOWLEDGE
        </button>
      </div>
    </div>
  );
}

function getCategoryStyles(category: MissionAlert["category"]) {
  switch (category) {
    case "THREAT":
      return {
        borderColor: "#FF4444",
        badgeColor: "rgba(255, 68, 68, 0.2)",
        titleColor: "#FF4444",
        icon: "\u26A0\uFE0F", // Warning sign
      };
    case "COMBAT":
      return {
        borderColor: "#FF6B6B",
        badgeColor: "rgba(255, 107, 107, 0.2)",
        titleColor: "#FF6B6B",
        icon: "\u{1F4A5}", // Explosion
      };
    case "INTEL":
      return {
        borderColor: "#00BCD4",
        badgeColor: "rgba(0, 188, 212, 0.2)",
        titleColor: "#00BCD4",
        icon: "\u{1F50D}", // Magnifying glass
      };
    case "MISSION":
    default:
      return {
        borderColor: "#00E676",
        badgeColor: "rgba(0, 230, 118, 0.2)",
        titleColor: "#00E676",
        icon: "\u{1F3AF}", // Target
      };
  }
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    zIndex: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.3s ease",
  },
  overlay: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    minWidth: "450px",
    maxWidth: "600px",
    backgroundColor: "var(--bg-secondary, #111620)",
    border: "2px solid",
    borderRadius: "12px",
    padding: "24px 32px",
    textAlign: "center",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
    transition: "all 0.3s ease",
  },
  categoryBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 700,
    fontFamily: "var(--font-family-mono, monospace)",
    letterSpacing: "0.1em",
    marginBottom: "16px",
  },
  title: {
    margin: "0 0 12px 0",
    fontSize: "24px",
    fontWeight: 700,
    fontFamily: "var(--font-family, sans-serif)",
    letterSpacing: "0.02em",
  },
  message: {
    margin: "0 0 20px 0",
    fontSize: "16px",
    lineHeight: 1.5,
    color: "var(--text-primary, #E8EAED)",
    fontFamily: "var(--font-family, sans-serif)",
  },
  countdown: {
    fontSize: "11px",
    color: "var(--text-muted, #5F6368)",
    fontFamily: "var(--font-family-mono, monospace)",
    marginBottom: "16px",
  },
  dismissButton: {
    padding: "10px 24px",
    fontSize: "12px",
    fontWeight: 700,
    fontFamily: "var(--font-family-mono, monospace)",
    letterSpacing: "0.05em",
    color: "var(--text-primary, #E8EAED)",
    backgroundColor: "var(--bg-tertiary, #1A1F2E)",
    border: "1px solid var(--border-default, #252B3B)",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
};
