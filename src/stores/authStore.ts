import { create } from "zustand";
import type {
  RequestId,
  AuthRequestPayload,
  AuthDecision,
  ActionCategory,
  RiskLevel,
} from "../lib/protocol";

export interface AuthRequestWithTimer {
  request_id: RequestId;
  entity_id: string;
  action_type: ActionCategory;
  target_id?: string | undefined;
  confidence: number;
  risk_estimate: RiskLevel;
  collateral_risk: RiskLevel;
  rationale: string;
  timeout_sec: number;
  receivedAt: number;
  expiresAt: number;
}

export interface AuthResponse {
  request_id: RequestId;
  decision: AuthDecision;
  rationale?: string;
  conditions: string[];
  respondedAt: number;
}

export interface ProcessingRequest {
  request_id: RequestId;
  decision: AuthDecision;
  sentAt: number;
}

interface AuthState {
  // Active requests awaiting decision
  pendingRequests: Map<RequestId, AuthRequestWithTimer>;

  // Requests awaiting backend ACK (sent to backend, waiting for confirmation)
  processingRequests: Map<RequestId, ProcessingRequest>;

  // History of responses (for audit)
  responseHistory: AuthResponse[];

  // Actions
  addRequest: (payload: AuthRequestPayload) => void;
  removeRequest: (requestId: RequestId) => void;
  startProcessing: (requestId: RequestId, decision: AuthDecision) => void;
  confirmAck: (requestId: RequestId) => void;
  recordResponse: (response: AuthResponse) => void;
  clearExpired: () => RequestId[];
  clearAll: () => void;

  // Selectors
  getPendingRequest: (requestId: RequestId) => AuthRequestWithTimer | undefined;
  getAllPendingRequests: () => AuthRequestWithTimer[];
  getOldestPending: () => AuthRequestWithTimer | undefined;
  isProcessing: (requestId: RequestId) => boolean;
  getProcessingRequest: (requestId: RequestId) => ProcessingRequest | undefined;
  cleanupStaleProcessing: (maxAgeMs?: number) => RequestId[];
}

export const useAuthStore = create<AuthState>((set, get) => ({
  pendingRequests: new Map(),
  processingRequests: new Map(),
  responseHistory: [],

  addRequest: (payload: AuthRequestPayload) => {
    set((state) => {
      const now = Date.now();
      const pendingRequests = new Map(state.pendingRequests);

      const request: AuthRequestWithTimer = {
        request_id: payload.request_id,
        entity_id: payload.entity_id,
        action_type: payload.action_type,
        target_id: payload.target_id,
        confidence: payload.confidence,
        risk_estimate: payload.risk_estimate,
        collateral_risk: payload.collateral_risk,
        rationale: payload.rationale,
        timeout_sec: payload.timeout_sec,
        receivedAt: now,
        expiresAt: now + payload.timeout_sec * 1000,
      };

      pendingRequests.set(payload.request_id, request);
      return { pendingRequests };
    });
  },

  removeRequest: (requestId: RequestId) => {
    set((state) => {
      const pendingRequests = new Map(state.pendingRequests);
      pendingRequests.delete(requestId);
      return { pendingRequests };
    });
  },

  startProcessing: (requestId: RequestId, decision: AuthDecision) => {
    set((state) => {
      const processingRequests = new Map(state.processingRequests);
      processingRequests.set(requestId, {
        request_id: requestId,
        decision,
        sentAt: Date.now(),
      });
      return { processingRequests };
    });
  },

  confirmAck: (requestId: RequestId) => {
    set((state) => {
      const pendingRequests = new Map(state.pendingRequests);
      const processingRequests = new Map(state.processingRequests);
      pendingRequests.delete(requestId);
      processingRequests.delete(requestId);
      return { pendingRequests, processingRequests };
    });
  },

  recordResponse: (response: AuthResponse) => {
    set((state) => {
      const pendingRequests = new Map(state.pendingRequests);
      pendingRequests.delete(response.request_id);

      return {
        pendingRequests,
        responseHistory: [...state.responseHistory, response],
      };
    });
  },

  clearExpired: () => {
    const now = Date.now();
    const expiredIds: RequestId[] = [];

    set((state) => {
      const pendingRequests = new Map(state.pendingRequests);

      for (const [id, request] of pendingRequests) {
        if (request.expiresAt <= now) {
          expiredIds.push(id);
          pendingRequests.delete(id);
        }
      }

      return { pendingRequests };
    });

    return expiredIds;
  },

  clearAll: () => {
    set({ pendingRequests: new Map(), processingRequests: new Map(), responseHistory: [] });
  },

  getPendingRequest: (requestId: RequestId) => {
    return get().pendingRequests.get(requestId);
  },

  getAllPendingRequests: () => {
    return Array.from(get().pendingRequests.values());
  },

  getOldestPending: () => {
    const requests = Array.from(get().pendingRequests.values());
    if (requests.length === 0) return undefined;
    return requests.reduce((oldest, current) =>
      current.receivedAt < oldest.receivedAt ? current : oldest
    );
  },

  isProcessing: (requestId: RequestId) => {
    return get().processingRequests.has(requestId);
  },

  getProcessingRequest: (requestId: RequestId) => {
    return get().processingRequests.get(requestId);
  },

  // Cleanup stale processing requests (30s default) - prevents UI stuck on "PROCESSING..."
  cleanupStaleProcessing: (maxAgeMs = 30_000) => {
    const now = Date.now();
    const staleIds: RequestId[] = [];
    const currentProcessing = get().processingRequests;

    // First pass: identify stale requests without triggering state update
    for (const [id, req] of currentProcessing) {
      if (now - req.sentAt > maxAgeMs) {
        staleIds.push(id);
      }
    }

    // Only update state if there are actually stale items to clean
    if (staleIds.length > 0) {
      set((state) => {
        const processingRequests = new Map(state.processingRequests);
        const pendingRequests = new Map(state.pendingRequests);

        for (const id of staleIds) {
          processingRequests.delete(id);
          pendingRequests.delete(id);
          console.warn(`[AUTH] Stale processing request cleaned up: ${id} (no ACK after ${maxAgeMs}ms)`);
        }

        return { processingRequests, pendingRequests };
      });
    }

    return staleIds;
  },
}));
