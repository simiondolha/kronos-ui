import { useUIStore, type ConnectionStatus } from "../../stores/uiStore";

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; color: string; bgColor: string; pulse: boolean }
> = {
  disconnected: {
    label: "DISCONNECTED",
    color: "var(--color-hostile)",
    bgColor: "rgba(255, 68, 68, 0.15)",
    pulse: false,
  },
  connecting: {
    label: "CONNECTING",
    color: "var(--color-warning)",
    bgColor: "rgba(255, 171, 0, 0.15)",
    pulse: true,
  },
  connected: {
    label: "CONNECTED",
    color: "var(--color-friendly)",
    bgColor: "rgba(0, 230, 118, 0.15)",
    pulse: false,
  },
  error: {
    label: "ERROR",
    color: "var(--color-hostile)",
    bgColor: "rgba(255, 68, 68, 0.15)",
    pulse: false,
  },
};

export function ConnectionBadge() {
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const missedHeartbeats = useUIStore((s) => s.missedHeartbeats);
  const lastHeartbeatAt = useUIStore((s) => s.lastHeartbeatAt);

  const config = STATUS_CONFIG[connectionStatus];

  // Show degraded state if missing heartbeats
  const isDegraded = connectionStatus === "connected" && missedHeartbeats > 0;
  const displayConfig = isDegraded
    ? {
        ...config,
        label: "DEGRADED",
        color: "var(--color-warning)",
        bgColor: "rgba(255, 171, 0, 0.15)",
      }
    : config;

  const lastPing = lastHeartbeatAt
    ? Math.floor((Date.now() - lastHeartbeatAt) / 1000)
    : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        borderRadius: "4px",
        backgroundColor: displayConfig.bgColor,
        border: `1px solid ${displayConfig.color}`,
        fontFamily: "var(--font-family-mono)",
        fontSize: "var(--font-size-xs)",
      }}
    >
      {/* Status indicator dot */}
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: displayConfig.color,
          animation: displayConfig.pulse
            ? "pulse 1.5s ease-in-out infinite"
            : undefined,
        }}
      />

      {/* Status label */}
      <span style={{ color: displayConfig.color, fontWeight: 700 }}>
        {displayConfig.label}
      </span>

      {/* Heartbeat info for connected state */}
      {connectionStatus === "connected" && lastPing !== null && (
        <span style={{ color: "var(--text-muted)", marginLeft: "4px" }}>
          {lastPing}s ago
        </span>
      )}

      {/* Missed heartbeats warning */}
      {isDegraded && (
        <span style={{ color: "var(--color-warning)" }}>
          ({missedHeartbeats} missed)
        </span>
      )}

      {/* CSS animation for pulse */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}
      </style>
    </div>
  );
}
