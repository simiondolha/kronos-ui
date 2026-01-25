import { type FC, useEffect, useState, useMemo } from "react";
import { useAuthStore, type AuthRequestWithTimer } from "../../stores/authStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useEntityStore } from "../../stores/entityStore";

/**
 * AuthQueuePanel - Shows pending authorization requests inline.
 *
 * Critical panel for human-in-the-loop decision making.
 * Always visible when there are pending auth requests.
 */
export const AuthQueuePanel: FC = () => {
  // Use stable selector to avoid infinite re-renders
  const pendingRequestsMap = useAuthStore((s) => s.pendingRequests);
  const pendingRequests = useMemo(
    () => Array.from(pendingRequestsMap.values()),
    [pendingRequestsMap]
  );
  const recordResponse = useAuthStore((s) => s.recordResponse);
  const entities = useEntityStore((s) => s.entities);
  const tracks = useEntityStore((s) => s.tracks);
  const { send } = useWebSocket({ autoConnect: false });

  // Countdown timers - force re-render every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = (request: AuthRequestWithTimer) => {
    const response = {
      request_id: request.request_id,
      decision: "APPROVED" as const,
      rationale: "Operator approved",
      conditions: [],
      respondedAt: Date.now(),
    };
    recordResponse(response);
    send({
      type: "AUTH_RESPONSE",
      request_id: request.request_id,
      decision: "APPROVED",
      rationale: "Operator approved",
      conditions: [],
    });
  };

  const handleDeny = (request: AuthRequestWithTimer) => {
    const response = {
      request_id: request.request_id,
      decision: "DENIED" as const,
      rationale: "Operator denied",
      conditions: [],
      respondedAt: Date.now(),
    };
    recordResponse(response);
    send({
      type: "AUTH_RESPONSE",
      request_id: request.request_id,
      decision: "DENIED",
      rationale: "Operator denied",
      conditions: [],
    });
  };

  // Get entity callsign from entity_id
  const getEntityCallsign = (entityId: string): string => {
    const entity = entities.get(entityId);
    return entity?.callsign || entityId;
  };

  // Get target info from target_id
  const getTargetInfo = (targetId?: string): string => {
    if (!targetId) return "";
    const track = tracks.get(targetId);
    return track?.callsign || targetId;
  };

  // Calculate remaining seconds
  const getRemainingSeconds = (request: AuthRequestWithTimer): number => {
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((request.expiresAt - now) / 1000));
    return remaining;
  };

  if (pendingRequests.length === 0) {
    return null; // Don't render if no pending requests
  }

  return (
    <div className="auth-queue">
      <div className="auth-queue__header">
        <span className="auth-queue__title">AUTHORIZATION QUEUE</span>
        <span className="auth-queue__count">{pendingRequests.length}</span>
      </div>

      <div className="auth-queue__list">
        {pendingRequests.map((request) => {
          const remaining = getRemainingSeconds(request);
          const isUrgent = remaining <= 10;
          const entityCallsign = getEntityCallsign(request.entity_id);
          const targetInfo = getTargetInfo(request.target_id);

          return (
            <div
              key={request.request_id}
              className={`auth-queue__item ${isUrgent ? "auth-queue__item--urgent" : ""}`}
            >
              <div className="auth-queue__item-header">
                <span className="auth-queue__action-type">
                  {request.action_type.replace(/_/g, " ")}
                </span>
                <span className={`auth-queue__timer ${isUrgent ? "auth-queue__timer--urgent" : ""}`}>
                  {remaining}s
                </span>
              </div>

              <div className="auth-queue__details">
                <span className="auth-queue__entity">
                  {entityCallsign}
                  {targetInfo && <span className="auth-queue__arrow"> → </span>}
                  {targetInfo && <span className="auth-queue__target">{targetInfo}</span>}
                </span>
              </div>

              <div className="auth-queue__metrics">
                <span className="auth-queue__metric">
                  <span className="auth-queue__metric-label">Conf:</span>
                  <span className="auth-queue__metric-value">{Math.round(request.confidence * 100)}%</span>
                </span>
                <span className="auth-queue__metric">
                  <span className="auth-queue__metric-label">Risk:</span>
                  <span className={`auth-queue__metric-value auth-queue__risk--${request.risk_estimate.toLowerCase()}`}>
                    {request.risk_estimate}
                  </span>
                </span>
              </div>

              <div className="auth-queue__actions">
                <button
                  className="auth-queue__btn auth-queue__btn--approve"
                  onClick={() => handleApprove(request)}
                >
                  APPROVE
                </button>
                <button
                  className="auth-queue__btn auth-queue__btn--deny"
                  onClick={() => handleDeny(request)}
                >
                  DENY
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .auth-queue {
          display: flex;
          flex-direction: column;
          background: rgba(26, 32, 44, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 171, 0, 0.4);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .auth-queue__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: rgba(255, 171, 0, 0.1);
          border-bottom: 1px solid rgba(255, 171, 0, 0.2);
        }

        .auth-queue__title {
          font-size: var(--font-size-xs);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-warning);
        }

        .auth-queue__count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          background-color: var(--color-warning);
          color: var(--bg-primary);
          font-size: 11px;
          font-weight: 700;
          border-radius: 10px;
        }

        .auth-queue__list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .auth-queue__item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          border-left: 3px solid var(--color-warning);
        }

        .auth-queue__item--urgent {
          border-left-color: var(--color-hostile);
          animation: urgent-pulse 0.5s ease-in-out infinite;
        }

        @keyframes urgent-pulse {
          0%, 100% { background: rgba(255, 255, 255, 0.05); }
          50% { background: rgba(255, 68, 68, 0.15); }
        }

        .auth-queue__item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .auth-queue__action-type {
          font-size: var(--font-size-xs);
          font-weight: 600;
          color: var(--text-primary);
          text-transform: uppercase;
        }

        .auth-queue__timer {
          padding: 2px 8px;
          background-color: rgba(255, 171, 0, 0.2);
          color: var(--color-warning);
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-family-mono);
          border-radius: 3px;
        }

        .auth-queue__timer--urgent {
          background-color: rgba(255, 68, 68, 0.2);
          color: var(--color-hostile);
          animation: timer-blink 0.5s ease-in-out infinite;
        }

        @keyframes timer-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .auth-queue__details {
          font-size: var(--font-size-sm);
          font-family: var(--font-family-mono);
        }

        .auth-queue__entity {
          color: var(--color-friendly);
        }

        .auth-queue__arrow {
          color: var(--text-muted);
        }

        .auth-queue__target {
          color: var(--color-hostile);
        }

        .auth-queue__metrics {
          display: flex;
          gap: 12px;
        }

        .auth-queue__metric {
          display: flex;
          gap: 4px;
          font-size: 10px;
        }

        .auth-queue__metric-label {
          color: var(--text-muted);
        }

        .auth-queue__metric-value {
          font-family: var(--font-family-mono);
          font-weight: 600;
          color: var(--text-secondary);
        }

        .auth-queue__risk--low {
          color: var(--color-friendly);
        }

        .auth-queue__risk--medium {
          color: var(--color-warning);
        }

        .auth-queue__risk--high,
        .auth-queue__risk--critical {
          color: var(--color-hostile);
        }

        .auth-queue__actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .auth-queue__btn {
          flex: 1;
          padding: 6px 12px;
          font-size: var(--font-size-xs);
          font-weight: 700;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .auth-queue__btn--approve {
          background-color: rgba(0, 230, 118, 0.2);
          color: var(--color-friendly);
          border: 1px solid var(--color-friendly);
        }

        .auth-queue__btn--approve:hover {
          background-color: var(--color-friendly);
          color: var(--bg-primary);
        }

        .auth-queue__btn--deny {
          background-color: rgba(255, 68, 68, 0.2);
          color: var(--color-hostile);
          border: 1px solid var(--color-hostile);
        }

        .auth-queue__btn--deny:hover {
          background-color: var(--color-hostile);
          color: white;
        }
      `}</style>
    </div>
  );
};
