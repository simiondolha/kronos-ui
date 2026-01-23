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

interface AuthState {
  // Active requests awaiting decision
  pendingRequests: Map<RequestId, AuthRequestWithTimer>;

  // History of responses (for audit)
  responseHistory: AuthResponse[];

  // Actions
  addRequest: (payload: AuthRequestPayload) => void;
  removeRequest: (requestId: RequestId) => void;
  recordResponse: (response: AuthResponse) => void;
  clearExpired: () => RequestId[];
  clearAll: () => void;

  // Selectors
  getPendingRequest: (requestId: RequestId) => AuthRequestWithTimer | undefined;
  getAllPendingRequests: () => AuthRequestWithTimer[];
  getOldestPending: () => AuthRequestWithTimer | undefined;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  pendingRequests: new Map(),
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
    set({ pendingRequests: new Map(), responseHistory: [] });
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
}));
