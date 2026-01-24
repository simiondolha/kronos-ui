import { useCallback } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useAuditStore } from "../../stores/auditStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useAuthTimeout } from "../../hooks/useAuthTimeout";
import type { AuthDecision, RiskLevel, ActionCategory } from "../../lib/protocol";

/**
 * AuthDialog - Human-in-the-loop authorization dialog.
 *
 * CRITICAL SAFETY FEATURES:
 * - Large countdown timer
 * - SIMULATED FIRE AUTHORIZATION label (prominent)
 * - Risk assessment display
 * - Large APPROVE/DENY buttons
 * - Timeout sends CANCELLED decision
 */
export function AuthDialog() {
  const oldestRequest = useAuthStore((s) => s.getOldestPending());
  const recordResponse = useAuthStore((s) => s.recordResponse);
  const logAuthDecision = useAuditStore((s) => s.logAuthDecision);
  const logAuthTimeout = useAuditStore((s) => s.logAuthTimeout);
  const { send } = useWebSocket({ autoConnect: false });

  // Handle timeout
  const handleTimeout = useCallback(async () => {
    if (!oldestRequest) return;

    // Send CANCELLED decision with timeout rationale
    send({
      type: "AUTH_RESPONSE",
      request_id: oldestRequest.request_id,
      decision: "CANCELLED",
      rationale: "Operator timeout - request expired",
      conditions: [],
    });

    recordResponse({
      request_id: oldestRequest.request_id,
      decision: "CANCELLED",
      rationale: "Operator timeout - request expired",
      conditions: [],
      respondedAt: Date.now(),
    });

    await logAuthTimeout(oldestRequest.request_id);
  }, [oldestRequest, send, recordResponse, logAuthTimeout]);

  // Use timeout hook - use stable fallback to avoid infinite loop when no request
  const { remainingSeconds, remainingPercent, isExpired } = useAuthTimeout({
    expiresAt: oldestRequest?.expiresAt ?? Number.MAX_SAFE_INTEGER,
    onTimeout: handleTimeout,
  });

  // Handle decision
  const handleDecision = useCallback(
    async (decision: AuthDecision, rationale?: string) => {
      if (!oldestRequest) return;

      // Build payload - only include rationale if provided
      const payload: {
        type: "AUTH_RESPONSE";
        request_id: string;
        decision: AuthDecision;
        rationale?: string;
        conditions: string[];
      } = {
        type: "AUTH_RESPONSE",
        request_id: oldestRequest.request_id,
        decision,
        conditions: [],
      };

      if (rationale) {
        payload.rationale = rationale;
      }

      send(payload);

      // Build response object - only include rationale if provided
      const response: {
        request_id: string;
        decision: AuthDecision;
        rationale?: string;
        conditions: string[];
        respondedAt: number;
      } = {
        request_id: oldestRequest.request_id,
        decision,
        conditions: [],
        respondedAt: Date.now(),
      };

      if (rationale) {
        response.rationale = rationale;
      }

      recordResponse(response);

      await logAuthDecision(oldestRequest.request_id, decision, rationale);
    },
    [oldestRequest, send, recordResponse, logAuthDecision]
  );

  if (!oldestRequest || isExpired) {
    return null;
  }

  const isWeaponsAction =
    oldestRequest.action_type === "SIMULATED_WEAPONS_RELEASE" ||
    oldestRequest.action_type === "WEAPONS_ARM";

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        {/* SIMULATED banner - CRITICAL */}
        <div style={styles.simulatedBanner}>
          <span style={styles.simulatedText}>
            {isWeaponsAction
              ? "⚠ SIMULATED FIRE AUTHORIZATION ⚠"
              : "AUTHORIZATION REQUEST"}
          </span>
        </div>

        {/* Countdown timer */}
        <div style={styles.timerContainer}>
          <div
            style={{
              ...styles.timerBar,
              width: `${remainingPercent}%`,
              backgroundColor:
                remainingSeconds <= 5
                  ? "var(--color-hostile)"
                  : remainingSeconds <= 10
                  ? "var(--color-warning)"
                  : "var(--color-accent)",
            }}
          />
          <span style={styles.timerText}>{remainingSeconds}s</span>
        </div>

        {/* Request details */}
        <div style={styles.details}>
          <DetailRow label="Entity" value={oldestRequest.entity_id.slice(0, 8)} />
          <DetailRow label="Action" value={formatAction(oldestRequest.action_type)} />
          {oldestRequest.target_id && (
            <DetailRow label="Target" value={oldestRequest.target_id.slice(0, 8)} />
          )}
          <DetailRow
            label="Confidence"
            value={`${Math.round(oldestRequest.confidence * 100)}%`}
          />
        </div>

        {/* Risk assessment */}
        <div style={styles.riskSection}>
          <h3 style={styles.riskTitle}>RISK ASSESSMENT</h3>
          <div style={styles.riskGrid}>
            <RiskBadge label="Action Risk" level={oldestRequest.risk_estimate} />
            <RiskBadge label="Collateral" level={oldestRequest.collateral_risk} />
          </div>
        </div>

        {/* Rationale */}
        <div style={styles.rationale}>
          <span style={styles.rationaleLabel}>Rationale:</span>
          <p style={styles.rationaleText}>{oldestRequest.rationale}</p>
        </div>

        {/* Decision buttons */}
        <div style={styles.buttonContainer}>
          <button
            style={styles.denyButton}
            onClick={() => handleDecision("DENIED", "Operator denied request")}
          >
            ✕ DENY
          </button>
          <button
            style={styles.approveButton}
            onClick={() => handleDecision("APPROVED")}
          >
            ✓ APPROVE
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

function RiskBadge({ label, level }: { label: string; level: RiskLevel }) {
  return (
    <div style={styles.riskBadge}>
      <span style={styles.riskLabel}>{label}</span>
      <span
        style={{
          ...styles.riskLevel,
          color: getRiskColor(level),
          backgroundColor: `${getRiskColor(level)}20`,
        }}
      >
        {level}
      </span>
    </div>
  );
}

function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case "LOW":
      return "var(--color-friendly)";
    case "MEDIUM":
      return "var(--color-warning)";
    case "HIGH":
      return "var(--color-hostile)";
    case "CRITICAL":
      return "#FF0000";
  }
}

function formatAction(action: ActionCategory): string {
  return action.replace(/_/g, " ");
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 400, // --z-modal
  },
  dialog: {
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "12px",
    border: "2px solid var(--color-warning)",
    width: "420px",
    maxWidth: "90vw",
    overflow: "hidden",
    boxShadow: "var(--shadow-lg)",
  },
  simulatedBanner: {
    backgroundColor: "var(--color-warning)",
    padding: "12px",
    textAlign: "center" as const,
  },
  simulatedText: {
    fontWeight: 700,
    fontSize: "14px",
    color: "var(--bg-primary)",
    letterSpacing: "0.1em",
  },
  timerContainer: {
    position: "relative" as const,
    height: "32px",
    backgroundColor: "var(--bg-tertiary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  timerBar: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    transition: "width 0.1s linear, background-color 0.3s ease",
  },
  timerText: {
    position: "relative" as const,
    zIndex: 1,
    fontWeight: 700,
    fontSize: "18px",
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-primary)",
  },
  details: {
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    color: "var(--text-muted)",
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  detailValue: {
    color: "var(--text-primary)",
    fontFamily: "var(--font-family-mono)",
    fontSize: "14px",
  },
  riskSection: {
    padding: "16px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  riskTitle: {
    margin: "0 0 12px 0",
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--text-muted)",
    letterSpacing: "0.1em",
  },
  riskGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  riskBadge: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  riskLabel: {
    fontSize: "11px",
    color: "var(--text-muted)",
  },
  riskLevel: {
    padding: "6px 12px",
    borderRadius: "4px",
    fontWeight: 700,
    fontSize: "12px",
    textAlign: "center" as const,
    letterSpacing: "0.05em",
  },
  rationale: {
    padding: "16px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  rationaleLabel: {
    fontSize: "11px",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  rationaleText: {
    margin: "8px 0 0 0",
    fontSize: "13px",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  buttonContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0",
  },
  denyButton: {
    padding: "20px",
    backgroundColor: "var(--color-hostile)",
    border: "none",
    borderRadius: "0 0 0 10px",
    color: "white",
    fontWeight: 700,
    fontSize: "16px",
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  approveButton: {
    padding: "20px",
    backgroundColor: "var(--color-friendly)",
    border: "none",
    borderRadius: "0 0 10px 0",
    color: "var(--bg-primary)",
    fontWeight: 700,
    fontSize: "16px",
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
};
