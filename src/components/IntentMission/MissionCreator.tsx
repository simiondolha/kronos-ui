import { type FC, useState, useCallback, useEffect } from "react";
import { IntentInput } from "./IntentInput";
import { ProposalPanel, type Proposal } from "./ProposalPanel";
import { useEntityStore } from "../../stores/entityStore";

/**
 * Intent Mission State Machine:
 * idle -> parsing -> proposed -> confirmed -> executing -> paused -> complete
 */
export type IntentMissionState =
  | "idle"
  | "parsing"
  | "proposed"
  | "confirmed"
  | "executing"
  | "paused"
  | "complete"
  | "error";

interface MissionCreatorProps {
  onSendMessage: (payload: IntentPayload) => boolean;
  isConnected: boolean;
}

// Intent payloads for WebSocket communication
export interface SubmitIntentPayload {
  type: "SUBMIT_INTENT";
  intentText: string;
  requestId: string;
}

export interface ModifyIntentPayload {
  type: "MODIFY_INTENT";
  requestId: string;
  modificationText: string;
}

export interface ConfirmProposalPayload {
  type: "CONFIRM_PROPOSAL";
  proposalId: string;
}

export interface DenyProposalPayload {
  type: "DENY_PROPOSAL";
  proposalId: string;
  reason?: string;
}

export interface KillMissionPayload {
  type: "KILL_MISSION";
  missionId: string;
}

export interface ResumeMissionPayload {
  type: "RESUME_MISSION";
  missionId: string;
}

export type IntentPayload =
  | SubmitIntentPayload
  | ModifyIntentPayload
  | ConfirmProposalPayload
  | DenyProposalPayload
  | KillMissionPayload
  | ResumeMissionPayload;

// Response types from server
export interface IntentParsedResponse {
  type: "INTENT_PARSED";
  requestId: string;
  proposal: Proposal;
}

export interface IntentErrorResponse {
  type: "INTENT_ERROR";
  requestId: string;
  code: "INVALID_INTENT" | "RESOURCE_LIMIT" | "AMBIGUOUS" | "LLM_FAILURE";
  message: string;
  details?: string[];
}

export interface ClarificationRequestResponse {
  type: "CLARIFICATION_REQUEST";
  requestId: string;
  question: string;
  options?: string[];
}

export interface MissionStartedResponse {
  type: "MISSION_STARTED";
  missionId: string;
  proposalId: string;
}

/**
 * MissionCreator - Main orchestrator for intent-based mission creation
 *
 * Manages the complete flow from intent input to mission execution:
 * 1. User enters natural language intent
 * 2. AI parses and proposes assets/objectives
 * 3. Operator approves/modifies/denies
 * 4. Mission executes with kill switch available
 */
export const MissionCreator: FC<MissionCreatorProps> = ({
  onSendMessage,
  isConnected,
}) => {
  // State machine
  const [missionState, setMissionState] = useState<IntentMissionState>("idle");
  const [currentProposal, setCurrentProposal] = useState<Proposal | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [currentMissionId, setCurrentMissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);

  // Entity store for phase tracking
  const phase = useEntityStore((s) => s.phase);

  // Generate unique request ID
  const generateRequestId = useCallback(() => {
    return `intent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  // Handle intent submission
  const handleSubmitIntent = useCallback((intentText: string) => {
    if (!isConnected) {
      setError("Not connected to server");
      return;
    }

    const requestId = generateRequestId();
    setCurrentRequestId(requestId);
    setMissionState("parsing");
    setError(null);
    setClarificationQuestion(null);

    const success = onSendMessage({
      type: "SUBMIT_INTENT",
      intentText,
      requestId,
    });

    if (!success) {
      setMissionState("error");
      setError("Failed to send intent to server");
    }
  }, [isConnected, onSendMessage, generateRequestId]);

  // Handle proposal confirmation
  const handleConfirm = useCallback(() => {
    if (!currentProposal) return;

    const success = onSendMessage({
      type: "CONFIRM_PROPOSAL",
      proposalId: currentProposal.proposalId,
    });

    if (success) {
      setMissionState("confirmed");
    } else {
      setError("Failed to confirm proposal");
    }
  }, [currentProposal, onSendMessage]);

  // Handle proposal denial
  const handleDeny = useCallback(() => {
    if (!currentProposal) return;

    onSendMessage({
      type: "DENY_PROPOSAL",
      proposalId: currentProposal.proposalId,
      reason: "Operator denied proposal",
    });

    // Reset to idle
    setMissionState("idle");
    setCurrentProposal(null);
    setCurrentRequestId(null);
  }, [currentProposal, onSendMessage]);

  // Handle proposal modification
  const handleModify = useCallback((modificationText: string) => {
    if (!currentRequestId) return;

    setMissionState("parsing");
    setCurrentProposal(null);

    onSendMessage({
      type: "MODIFY_INTENT",
      requestId: currentRequestId,
      modificationText,
    });
  }, [currentRequestId, onSendMessage]);

  // Handle kill switch
  const handleKillMission = useCallback(() => {
    if (!currentMissionId) return;

    onSendMessage({
      type: "KILL_MISSION",
      missionId: currentMissionId,
    });

    setMissionState("paused");
  }, [currentMissionId, onSendMessage]);

  // Handle resume mission
  const handleResumeMission = useCallback(() => {
    if (!currentMissionId) return;

    onSendMessage({
      type: "RESUME_MISSION",
      missionId: currentMissionId,
    });

    setMissionState("executing");
  }, [currentMissionId, onSendMessage]);

  // Reset to idle
  const handleReset = useCallback(() => {
    setMissionState("idle");
    setCurrentProposal(null);
    setCurrentRequestId(null);
    setCurrentMissionId(null);
    setError(null);
    setClarificationQuestion(null);
  }, []);

  // Listen for server responses via custom events
  useEffect(() => {
    const handleIntentParsed = (event: CustomEvent) => {
      const { requestId, proposal } = event.detail;
      if (requestId === currentRequestId) {
        setCurrentProposal(proposal);
        setMissionState("proposed");
      }
    };

    const handleIntentError = (event: CustomEvent) => {
      const { requestId, message } = event.detail;
      if (requestId === currentRequestId) {
        setError(message);
        setMissionState("error");
      }
    };

    const handleClarificationRequest = (event: CustomEvent) => {
      const { requestId, question } = event.detail;
      if (requestId === currentRequestId) {
        setClarificationQuestion(question);
      }
    };

    const handleMissionStarted = (event: CustomEvent) => {
      const { missionId, proposalId } = event.detail;
      if (currentProposal?.proposalId === proposalId) {
        setCurrentMissionId(missionId);
        setMissionState("executing");
      }
    };

    const handleMissionPaused = (event: CustomEvent) => {
      const { missionId } = event.detail;
      if (missionId === currentMissionId) {
        setMissionState("paused");
      }
    };

    const handleMissionResumed = (event: CustomEvent) => {
      const { missionId } = event.detail;
      if (missionId === currentMissionId) {
        setMissionState("executing");
      }
    };

    window.addEventListener("kronos:intent-parsed", handleIntentParsed as EventListener);
    window.addEventListener("kronos:intent-error", handleIntentError as EventListener);
    window.addEventListener("kronos:clarification-request", handleClarificationRequest as EventListener);
    window.addEventListener("kronos:mission-started", handleMissionStarted as EventListener);
    window.addEventListener("kronos:mission-paused", handleMissionPaused as EventListener);
    window.addEventListener("kronos:mission-resumed", handleMissionResumed as EventListener);

    return () => {
      window.removeEventListener("kronos:intent-parsed", handleIntentParsed as EventListener);
      window.removeEventListener("kronos:intent-error", handleIntentError as EventListener);
      window.removeEventListener("kronos:clarification-request", handleClarificationRequest as EventListener);
      window.removeEventListener("kronos:mission-started", handleMissionStarted as EventListener);
      window.removeEventListener("kronos:mission-paused", handleMissionPaused as EventListener);
      window.removeEventListener("kronos:mission-resumed", handleMissionResumed as EventListener);
    };
  }, [currentRequestId, currentProposal, currentMissionId]);

  // Sync with entity store phase
  useEffect(() => {
    if (phase === "COMPLETE" || phase === "FAILED") {
      setMissionState("complete");
    } else if (phase === "ENGAGING" || phase === "AUTH_PENDING") {
      setMissionState("executing");
    }
  }, [phase]);

  const isLoading = missionState === "parsing";
  const showProposal = missionState === "proposed" || missionState === "confirmed";
  const isExecuting = missionState === "executing";
  const isPaused = missionState === "paused";
  const isComplete = missionState === "complete";

  return (
    <div style={styles.container}>
      {/* Header with status */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>&#x2726;</span>
          <span style={styles.headerTitle}>MISSION CREATOR</span>
          <span style={styles.stateBadge} data-state={missionState}>
            {missionState.toUpperCase()}
          </span>
        </div>
        {(showProposal || isExecuting || isPaused || isComplete) && (
          <button style={styles.resetButton} onClick={handleReset}>
            NEW MISSION
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div style={styles.errorBar}>
          <span style={styles.errorIcon}>&#x26A0;</span>
          <span style={styles.errorText}>{error}</span>
          <button style={styles.dismissError} onClick={() => setError(null)}>
            &#x2715;
          </button>
        </div>
      )}

      {/* Clarification prompt */}
      {clarificationQuestion && (
        <div style={styles.clarificationBar}>
          <span style={styles.clarificationIcon}>?</span>
          <span style={styles.clarificationText}>{clarificationQuestion}</span>
        </div>
      )}

      {/* Main content area */}
      <div style={styles.content}>
        {/* Intent Input - always visible in idle/parsing states */}
        {(missionState === "idle" || missionState === "parsing") && (
          <IntentInput
            onSubmit={handleSubmitIntent}
            isLoading={isLoading}
            disabled={!isConnected}
          />
        )}

        {/* Proposal Panel */}
        {showProposal && (
          <ProposalPanel
            proposal={currentProposal}
            onConfirm={handleConfirm}
            onDeny={handleDeny}
            onModify={handleModify}
            isLoading={false}
          />
        )}

        {/* Execution controls */}
        {isExecuting && (
          <div style={styles.executionPanel}>
            <div style={styles.executionHeader}>
              <span style={styles.executionIcon}>&#x25B6;</span>
              <span style={styles.executionTitle}>MISSION ACTIVE</span>
            </div>
            <div style={styles.executionInfo}>
              <span>{currentProposal?.missionName || "UNNAMED MISSION"}</span>
            </div>
            <button style={styles.killSwitch} onClick={handleKillMission}>
              <span style={styles.killIcon}>&#x23F8;</span>
              KILL SWITCH
            </button>
          </div>
        )}

        {/* Paused state */}
        {isPaused && (
          <div style={styles.pausedPanel}>
            <div style={styles.pausedHeader}>
              <span style={styles.pausedIcon}>&#x23F8;</span>
              <span style={styles.pausedTitle}>MISSION PAUSED</span>
            </div>
            <div style={styles.pausedInfo}>
              All assets RTB. Weapons safe.
            </div>
            <div style={styles.pausedActions}>
              <button style={styles.resumeButton} onClick={handleResumeMission}>
                RESUME (RE-AUTH REQUIRED)
              </button>
              <button style={styles.abortButton} onClick={handleReset}>
                ABORT MISSION
              </button>
            </div>
          </div>
        )}

        {/* Complete state */}
        {isComplete && (
          <div style={styles.completePanel}>
            <div style={styles.completeHeader}>
              <span style={styles.completeIcon}>&#x2713;</span>
              <span style={styles.completeTitle}>MISSION COMPLETE</span>
            </div>
            <div style={styles.completeInfo}>
              {currentProposal?.missionName || "Mission ended"}
            </div>
            <button style={styles.newMissionButton} onClick={handleReset}>
              CREATE NEW MISSION
            </button>
          </div>
        )}
      </div>

      {/* Connection status */}
      {!isConnected && (
        <div style={styles.disconnectedBar}>
          <span style={styles.disconnectedIcon}>&#x26A0;</span>
          <span>DISCONNECTED - Waiting for server connection...</span>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    height: "100%",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "rgba(0, 12, 20, 0.9)",
    border: "1px solid rgba(0, 209, 255, 0.3)",
    borderRadius: "4px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerIcon: {
    fontSize: "16px",
    color: "rgba(0, 209, 255, 0.8)",
  },
  headerTitle: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "#fff",
  },
  stateBadge: {
    padding: "4px 8px",
    backgroundColor: "rgba(0, 209, 255, 0.15)",
    border: "1px solid rgba(0, 209, 255, 0.4)",
    borderRadius: "2px",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "rgba(0, 209, 255, 0.9)",
  },
  resetButton: {
    padding: "6px 12px",
    backgroundColor: "transparent",
    border: "1px solid rgba(100, 100, 100, 0.4)",
    borderRadius: "4px",
    color: "rgba(200, 200, 200, 0.7)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.1em",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    overflow: "auto",
  },
  errorBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 16px",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    border: "1px solid rgba(255, 68, 68, 0.4)",
    borderRadius: "4px",
  },
  errorIcon: {
    fontSize: "14px",
    color: "rgba(255, 68, 68, 0.9)",
  },
  errorText: {
    flex: 1,
    fontSize: "11px",
    color: "rgba(255, 68, 68, 0.9)",
  },
  dismissError: {
    padding: "4px 8px",
    backgroundColor: "transparent",
    border: "none",
    color: "rgba(255, 68, 68, 0.6)",
    fontSize: "12px",
    cursor: "pointer",
  },
  clarificationBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    border: "1px solid rgba(245, 158, 11, 0.4)",
    borderRadius: "4px",
  },
  clarificationIcon: {
    fontSize: "16px",
    fontWeight: 700,
    color: "rgba(245, 158, 11, 0.9)",
  },
  clarificationText: {
    fontSize: "12px",
    color: "rgba(245, 158, 11, 0.9)",
  },
  executionPanel: {
    padding: "20px",
    backgroundColor: "rgba(0, 230, 118, 0.08)",
    border: "1px solid rgba(0, 230, 118, 0.3)",
    borderRadius: "4px",
  },
  executionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  executionIcon: {
    fontSize: "16px",
    color: "rgba(0, 230, 118, 0.9)",
  },
  executionTitle: {
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "rgba(0, 230, 118, 0.95)",
  },
  executionInfo: {
    fontSize: "12px",
    color: "rgba(200, 200, 200, 0.8)",
    marginBottom: "16px",
  },
  killSwitch: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "14px 20px",
    backgroundColor: "rgba(255, 68, 68, 0.15)",
    border: "2px solid rgba(255, 68, 68, 0.6)",
    borderRadius: "4px",
    color: "rgba(255, 68, 68, 0.95)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  killIcon: {
    fontSize: "14px",
  },
  pausedPanel: {
    padding: "20px",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    borderRadius: "4px",
  },
  pausedHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  pausedIcon: {
    fontSize: "16px",
    color: "rgba(245, 158, 11, 0.9)",
  },
  pausedTitle: {
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "rgba(245, 158, 11, 0.95)",
  },
  pausedInfo: {
    fontSize: "11px",
    color: "rgba(200, 200, 200, 0.7)",
    marginBottom: "16px",
  },
  pausedActions: {
    display: "flex",
    gap: "10px",
  },
  resumeButton: {
    flex: 2,
    padding: "12px 20px",
    backgroundColor: "rgba(0, 230, 118, 0.15)",
    border: "1px solid rgba(0, 230, 118, 0.5)",
    borderRadius: "4px",
    color: "rgba(0, 230, 118, 0.95)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  abortButton: {
    flex: 1,
    padding: "12px 20px",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    border: "1px solid rgba(255, 68, 68, 0.4)",
    borderRadius: "4px",
    color: "rgba(255, 68, 68, 0.9)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  completePanel: {
    padding: "20px",
    backgroundColor: "rgba(0, 209, 255, 0.08)",
    border: "1px solid rgba(0, 209, 255, 0.3)",
    borderRadius: "4px",
    textAlign: "center",
  },
  completeHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  completeIcon: {
    fontSize: "20px",
    color: "rgba(0, 230, 118, 0.9)",
  },
  completeTitle: {
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "rgba(0, 230, 118, 0.95)",
  },
  completeInfo: {
    fontSize: "12px",
    color: "rgba(200, 200, 200, 0.7)",
    marginBottom: "16px",
  },
  newMissionButton: {
    padding: "12px 24px",
    backgroundColor: "rgba(0, 209, 255, 0.15)",
    border: "1px solid rgba(0, 209, 255, 0.5)",
    borderRadius: "4px",
    color: "rgba(0, 209, 255, 0.95)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  disconnectedBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 16px",
    backgroundColor: "rgba(100, 100, 100, 0.2)",
    border: "1px solid rgba(100, 100, 100, 0.4)",
    borderRadius: "4px",
    fontSize: "10px",
    color: "rgba(200, 200, 200, 0.6)",
  },
  disconnectedIcon: {
    fontSize: "12px",
    color: "rgba(245, 158, 11, 0.8)",
  },
};

export default MissionCreator;
