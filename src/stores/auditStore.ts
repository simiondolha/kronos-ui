import { create } from "zustand";
import type { RequestId, AuthDecision, ActionCategory } from "../lib/protocol";
import {
  type HashChainEntry,
  createHashChain,
  appendToChain,
  verifyChain,
  exportChain,
  getChainSummary,
} from "../lib/hashChain";

// Audit entry types
export interface AuditEntry {
  timestamp: string;
  entryType: AuditEntryType;
  entityId?: string;
  requestId?: string;
  details: Record<string, unknown>;
}

export type AuditEntryType =
  | "SESSION_START"
  | "SESSION_END"
  | "AUTH_REQUEST_RECEIVED"
  | "AUTH_DECISION_MADE"
  | "AUTH_TIMEOUT"
  | "SAFE_MODE_ACTIVATED"
  | "SAFE_MODE_DEACTIVATED"
  | "INSTRUCTOR_COMMAND"
  | "WEAPONS_STATE_CHANGE"
  | "LINK_STATUS_CHANGE"
  | "ALERT_RECEIVED"
  | "CUSTOM";

interface AuditState {
  chain: HashChainEntry<AuditEntry>[];
  isInitialized: boolean;
  isInitializing: boolean; // Guard against race conditions
  chainValid: boolean;

  // Actions
  initialize: () => Promise<void>;
  logEntry: (entry: Omit<AuditEntry, "timestamp">) => Promise<void>;

  // Convenience logging methods
  logAuthRequest: (
    requestId: RequestId,
    entityId: string,
    actionType: ActionCategory
  ) => Promise<void>;
  logAuthDecision: (
    requestId: RequestId,
    decision: AuthDecision,
    rationale?: string
  ) => Promise<void>;
  logAuthTimeout: (requestId: RequestId) => Promise<void>;
  logSafeModeActivated: (reason: string) => Promise<void>;
  logSafeModeDeactivated: () => Promise<void>;
  logInstructorCommand: (command: string, params?: unknown) => Promise<void>;

  // Verification
  verifyIntegrity: () => Promise<boolean>;

  // Export
  exportAuditLog: () => string;

  // Summary
  getSummary: () => {
    length: number;
    firstTimestamp: string | null;
    lastTimestamp: string | null;
    lastHash: string | null;
  };
}

// Queue for serializing log entries
let logQueue: Promise<void> = Promise.resolve();

export const useAuditStore = create<AuditState>((set, get) => ({
  chain: [],
  isInitialized: false,
  isInitializing: false,
  chainValid: true,

  initialize: async () => {
    const state = get();
    // Already initialized or currently initializing
    if (state.isInitialized || state.isInitializing) return;

    // Mark as initializing to prevent race conditions
    set({ isInitializing: true });

    try {
      const chain = await createHashChain<AuditEntry>({
        timestamp: new Date().toISOString(),
        entryType: "SESSION_START",
        details: {
          userAgent: navigator.userAgent,
          sessionId: crypto.randomUUID(),
        },
      });

      set({ chain, isInitialized: true, isInitializing: false, chainValid: true });
    } catch (error) {
      console.error("[Audit] Failed to initialize chain:", error);
      set({ isInitializing: false });
    }
  },

  logEntry: async (entry: Omit<AuditEntry, "timestamp">) => {
    // Queue entries to prevent concurrent modifications
    logQueue = logQueue.then(async () => {
      const state = get();

      // Ensure initialized
      if (!state.isInitialized) {
        await get().initialize();
        // Re-check after initialization
        if (!get().isInitialized) {
          console.error("[Audit] Cannot log - initialization failed");
          return;
        }
      }

      const fullEntry: AuditEntry = {
        ...entry,
        timestamp: new Date().toISOString(),
      };

      try {
        // Get fresh chain state
        const currentChain = get().chain;
        const newEntry = await appendToChain(currentChain, fullEntry);
        set({ chain: [...currentChain, newEntry] });
      } catch (error) {
        console.error("[Audit] Failed to append entry:", error);
      }
    });

    await logQueue;
  },

  logAuthRequest: async (
    requestId: RequestId,
    entityId: string,
    actionType: ActionCategory
  ) => {
    await get().logEntry({
      entryType: "AUTH_REQUEST_RECEIVED",
      requestId,
      entityId,
      details: { actionType },
    });
  },

  logAuthDecision: async (
    requestId: RequestId,
    decision: AuthDecision,
    rationale?: string
  ) => {
    await get().logEntry({
      entryType: "AUTH_DECISION_MADE",
      requestId,
      details: { decision, rationale },
    });
  },

  logAuthTimeout: async (requestId: RequestId) => {
    await get().logEntry({
      entryType: "AUTH_TIMEOUT",
      requestId,
      details: {},
    });
  },

  logSafeModeActivated: async (reason: string) => {
    await get().logEntry({
      entryType: "SAFE_MODE_ACTIVATED",
      details: { reason },
    });
  },

  logSafeModeDeactivated: async () => {
    await get().logEntry({
      entryType: "SAFE_MODE_DEACTIVATED",
      details: {},
    });
  },

  logInstructorCommand: async (command: string, params?: unknown) => {
    await get().logEntry({
      entryType: "INSTRUCTOR_COMMAND",
      details: { command, params },
    });
  },

  verifyIntegrity: async () => {
    const result = await verifyChain(get().chain);
    set({ chainValid: result.valid });
    return result.valid;
  },

  exportAuditLog: () => {
    return exportChain(get().chain);
  },

  getSummary: () => {
    return getChainSummary(get().chain);
  },
}));
