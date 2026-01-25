import { create } from "zustand";
import type { AlertPayload, Severity } from "../lib/protocol";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface SafeModeState {
  active: boolean;
  reason: string;
  canResume: boolean;
  activatedAt: number | null;
}

export interface ActiveAlert {
  alert_id: string;
  priority: Severity;
  category: string;
  title: string;
  message: string;
  requires_action: boolean;
  timeout_sec?: number | undefined;
  receivedAt: number;
  dismissed: boolean;
}

interface UIState {
  // WebSocket connection
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  lastHeartbeatAt: number | null;
  missedHeartbeats: number;

  // Simulation state
  simPaused: boolean;
  timeScale: number;
  simTick: number;
  simTimeUtc: string | null;

  // Safe mode (critical safety feature)
  safeMode: SafeModeState;

  // Alerts
  alerts: ActiveAlert[];

  // Visualization mode
  use3DModels: boolean;

  // Actions - Connection
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;
  recordHeartbeat: () => void;
  incrementMissedHeartbeats: () => void;
  resetMissedHeartbeats: () => void;

  // Actions - Simulation
  setSimPaused: (paused: boolean) => void;
  setTimeScale: (scale: number) => void;
  updateSimTime: (tick: number, timeUtc: string) => void;

  // Actions - Safe Mode
  activateSafeMode: (reason: string, canResume: boolean) => void;
  deactivateSafeMode: () => void;

  // Actions - Alerts
  addAlert: (payload: AlertPayload) => void;
  dismissAlert: (alertId: string) => void;
  clearAllAlerts: () => void;

  // Actions - Visualization
  toggle3DModels: () => void;
  set3DModels: (enabled: boolean) => void;

  // Selectors
  getActiveAlerts: () => ActiveAlert[];
  getCriticalAlerts: () => ActiveAlert[];
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  connectionStatus: "disconnected",
  connectionError: null,
  lastHeartbeatAt: null,
  missedHeartbeats: 0,

  simPaused: false,
  timeScale: 1.0,
  simTick: 0,
  simTimeUtc: null,

  safeMode: {
    active: false,
    reason: "",
    canResume: false,
    activatedAt: null,
  },

  alerts: [],

  use3DModels: true, // Default to 3D models for professional look

  // Connection actions
  setConnectionStatus: (status: ConnectionStatus, error?: string) => {
    set({
      connectionStatus: status,
      connectionError: error ?? null,
    });
  },

  recordHeartbeat: () => {
    set({
      lastHeartbeatAt: Date.now(),
      missedHeartbeats: 0,
    });
  },

  incrementMissedHeartbeats: () => {
    set((state) => ({
      missedHeartbeats: state.missedHeartbeats + 1,
    }));
  },

  resetMissedHeartbeats: () => {
    set({ missedHeartbeats: 0 });
  },

  // Simulation actions
  setSimPaused: (paused: boolean) => {
    set({ simPaused: paused });
  },

  setTimeScale: (scale: number) => {
    set({ timeScale: scale });
  },

  updateSimTime: (tick: number, timeUtc: string) => {
    set({ simTick: tick, simTimeUtc: timeUtc });
  },

  // Safe mode actions
  activateSafeMode: (reason: string, canResume: boolean) => {
    set({
      safeMode: {
        active: true,
        reason,
        canResume,
        activatedAt: Date.now(),
      },
    });
  },

  deactivateSafeMode: () => {
    set({
      safeMode: {
        active: false,
        reason: "",
        canResume: false,
        activatedAt: null,
      },
    });
  },

  // Alert actions
  addAlert: (payload: AlertPayload) => {
    set((state) => {
      // Don't add duplicate alerts
      if (state.alerts.some((a) => a.alert_id === payload.alert_id)) {
        return state;
      }

      const alert: ActiveAlert = {
        alert_id: payload.alert_id,
        priority: payload.priority,
        category: payload.category,
        title: payload.title,
        message: payload.message,
        requires_action: payload.requires_action,
        timeout_sec: payload.timeout_sec,
        receivedAt: Date.now(),
        dismissed: false,
      };

      return { alerts: [...state.alerts, alert] };
    });
  },

  dismissAlert: (alertId: string) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.alert_id === alertId ? { ...a, dismissed: true } : a
      ),
    }));
  },

  clearAllAlerts: () => {
    set({ alerts: [] });
  },

  // Visualization actions
  toggle3DModels: () => {
    set((state) => ({ use3DModels: !state.use3DModels }));
  },

  set3DModels: (enabled: boolean) => {
    set({ use3DModels: enabled });
  },

  // Selectors
  getActiveAlerts: () => {
    return get().alerts.filter((a) => !a.dismissed);
  },

  getCriticalAlerts: () => {
    const criticalPriorities: Severity[] = ["CRITICAL", "WARNING"];
    return get()
      .alerts.filter(
        (a) => !a.dismissed && criticalPriorities.includes(a.priority)
      );
  },
}));
