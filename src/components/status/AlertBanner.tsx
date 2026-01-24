import { useMemo } from "react";
import { useUIStore, type ActiveAlert } from "../../stores/uiStore";
import type { Severity } from "../../lib/protocol";

/**
 * AlertBanner - Displays active alerts at the top of the screen.
 *
 * Shows alerts by priority (CRITICAL first).
 * Alerts can be dismissed individually.
 */
export function AlertBanner() {
  // Subscribe to alerts array directly, filter with useMemo to avoid infinite loop
  const alerts = useUIStore((s) => s.alerts);
  const dismissAlert = useUIStore((s) => s.dismissAlert);

  const activeAlerts = useMemo(
    () => alerts.filter((a) => !a.dismissed),
    [alerts]
  );

  if (activeAlerts.length === 0) {
    return null;
  }

  // Sort by priority (CRITICAL first) and then by time (Newest first)
  const sortedAlerts = [...activeAlerts].sort((a, b) => {
    const priorityDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return b.receivedAt - a.receivedAt;
  });

  // Show more alerts during engagement to prevent "trap"
  const isEngaging = sortedAlerts.some(a => a.category === "COMBAT" || a.priority === "CRITICAL");
  const visibleCount = isEngaging ? 5 : 3;
  const visibleAlerts = sortedAlerts.slice(0, visibleCount);

  return (
    <div style={styles.container}>
      {visibleAlerts.map((alert) => (
        <AlertItem
          key={alert.alert_id}
          alert={alert}
          onDismiss={() => dismissAlert(alert.alert_id)}
        />
      ))}
      {sortedAlerts.length > 3 && (
        <div style={styles.moreIndicator}>
          +{sortedAlerts.length - 3} more alerts
        </div>
      )}
    </div>
  );
}

function AlertItem({
  alert,
  onDismiss,
}: {
  alert: ActiveAlert;
  onDismiss: () => void;
}) {
  // Map priority to severity (Rust sends LOW/MEDIUM/HIGH/CRITICAL, UI uses DEBUG/INFO/WARNING/CRITICAL)
  const mappedPriority = mapPriorityToSeverity(alert.priority);
  const config = SEVERITY_CONFIG[mappedPriority];

  return (
    <div
      style={{
        ...styles.alert,
        backgroundColor: config.bgColor,
        borderLeftColor: config.color,
      }}
    >
      {/* Icon */}
      <span style={{ ...styles.icon, color: config.color }}>{config.icon}</span>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.header}>
          <span style={{ ...styles.title, color: config.color }}>
            {alert.title}
          </span>
          <span style={styles.category}>{alert.category}</span>
        </div>
        <p style={styles.message}>{alert.message}</p>
      </div>

      {/* Dismiss button (unless requires_action) */}
      {!alert.requires_action && (
        <button 
          style={styles.dismissButton} 
          onClick={onDismiss}
          aria-label={`Dismiss ${alert.title} alert`}
        >
          ×
        </button>
      )}
    </div>
  );
}

function getPriorityWeight(priority: Severity | string): number {
  const mapped = mapPriorityToSeverity(priority);
  switch (mapped) {
    case "CRITICAL":
      return 4;
    case "WARNING":
      return 3;
    case "INFO":
      return 2;
    case "DEBUG":
      return 1;
  }
}

// Map Rust priority values (LOW/MEDIUM/HIGH/CRITICAL) to UI Severity values
function mapPriorityToSeverity(priority: Severity | string): Severity {
  switch (priority) {
    case "CRITICAL":
    case "Critical":
      return "CRITICAL";
    case "HIGH":
    case "High":
    case "WARNING":
      return "WARNING";
    case "MEDIUM":
    case "Medium":
    case "INFO":
      return "INFO";
    case "LOW":
    case "Low":
    case "DEBUG":
      return "DEBUG";
    default:
      return "INFO"; // Default fallback
  }
}

const SEVERITY_CONFIG: Record<
  Severity,
  { color: string; bgColor: string; icon: string }
> = {
  CRITICAL: {
    color: "var(--color-hostile)",
    bgColor: "rgba(255, 68, 68, 0.15)",
    icon: "⚠",
  },
  WARNING: {
    color: "var(--color-warning)",
    bgColor: "rgba(255, 171, 0, 0.15)",
    icon: "⚡",
  },
  INFO: {
    color: "var(--color-neutral)",
    bgColor: "rgba(33, 150, 243, 0.15)",
    icon: "ℹ",
  },
  DEBUG: {
    color: "var(--text-muted)",
    bgColor: "rgba(255, 255, 255, 0.05)",
    icon: "🔧",
  },
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    top: "72px", // Below header
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    zIndex: 500, // --z-toast level
    maxWidth: "600px",
    width: "90%",
  },
  alert: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "8px",
    borderLeft: "4px solid",
    boxShadow: "var(--shadow-md)",
  },
  icon: {
    fontSize: "18px",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
  title: {
    fontWeight: 700,
    fontSize: "14px",
  },
  category: {
    fontSize: "11px",
    color: "var(--text-muted)",
    backgroundColor: "var(--bg-tertiary)",
    padding: "2px 6px",
    borderRadius: "2px",
  },
  message: {
    margin: 0,
    fontSize: "13px",
    color: "var(--text-secondary)",
    lineHeight: 1.4,
  },
  dismissButton: {
    flexShrink: 0,
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "4px",
    color: "var(--text-muted)",
    fontSize: "18px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  moreIndicator: {
    textAlign: "center" as const,
    fontSize: "12px",
    color: "var(--text-muted)",
    padding: "4px",
  },
};
