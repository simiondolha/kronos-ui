import { useEffect, useRef, useCallback } from "react";
import { useEntityStore } from "../stores/entityStore";
import { useAuthStore } from "../stores/authStore";
import { useUIStore } from "../stores/uiStore";
import { useAuditStore } from "../stores/auditStore";
import {
  validateOutboundMessage,
  createHeartbeatAck,
  createInboundMessage,
  MAX_MESSAGE_SIZE_BYTES,
  type OutboundMessage,
  type InboundMessage,
  type InboundPayload,
} from "../lib/protocol";

// Configuration
const WS_URL = "ws://127.0.0.1:9000";
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 30000;
const HEARTBEAT_TIMEOUT_MS = 5000;
const MAX_MISSED_HEARTBEATS = 3;

interface UseWebSocketOptions {
  autoConnect?: boolean;
}

interface UseWebSocketReturn {
  connect: () => void;
  disconnect: () => void;
  send: (payload: InboundPayload) => boolean;
  isConnected: boolean;
}

export function useWebSocket(
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const { autoConnect = true } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatTimeoutRef = useRef<number | null>(null);
  const seqCounterRef = useRef(0);
  const isConnectingRef = useRef(false);

  // Get store actions via getState() to avoid subscriptions
  const getEntityActions = () => useEntityStore.getState();
  const getAuthActions = () => useAuthStore.getState();
  const getUIActions = () => useUIStore.getState();
  const getAuditActions = () => useAuditStore.getState();

  // Get current sim state for creating outbound messages
  const getSimState = useCallback(() => {
    const state = useUIStore.getState();
    return {
      simTimeUtc: state.simTimeUtc ?? new Date().toISOString(),
      simTick: state.simTick,
      timeScale: state.timeScale,
    };
  }, []);

  // Start heartbeat watchdog
  const startHeartbeatWatchdog = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    heartbeatTimeoutRef.current = window.setTimeout(() => {
      const missed = useUIStore.getState().missedHeartbeats;
      if (missed >= MAX_MISSED_HEARTBEATS) {
        console.error("[WS] Too many missed heartbeats, reconnecting");
        wsRef.current?.close();
        return;
      }
      getUIActions().incrementMissedHeartbeats();
      startHeartbeatWatchdog();
    }, HEARTBEAT_TIMEOUT_MS);
  }, []);

  // Send message to server
  const send = useCallback(
    (payload: InboundPayload): boolean => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn("[WS] Cannot send - not connected");
        return false;
      }

      const simState = getSimState();
      const message: InboundMessage = createInboundMessage(payload, {
        ...simState,
        seq: seqCounterRef.current++,
        sourceSystem: "kronos-ui",
      });

      const json = JSON.stringify(message);
      if (json.length > MAX_MESSAGE_SIZE_BYTES) {
        console.error("[WS] Message exceeds max size:", json.length);
        return false;
      }

      wsRef.current.send(json);
      return true;
    },
    [getSimState]
  );

  // Handle incoming message
  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      // Size guard
      const data = event.data;
      if (typeof data === "string" && data.length > MAX_MESSAGE_SIZE_BYTES) {
        console.error("[WS] Received message exceeds max size:", data.length);
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        console.error("[WS] Failed to parse JSON:", data);
        return;
      }

      // Validate with zod
      const result = validateOutboundMessage(parsed);
      if (!result.success) {
        console.error("[WS] Validation failed:", JSON.stringify(result.error.issues, null, 2));
        console.error("[WS] Raw message:", JSON.stringify(parsed, null, 2));
        return;
      }

      const message: OutboundMessage = result.data;

      // Update sim time from envelope (if present - Rust backend may not send these)
      if (message.sim_tick !== undefined && message.sim_time_utc) {
        getUIActions().updateSimTime(message.sim_tick, message.sim_time_utc);
      }

      // Route by payload type
      const payload = message.payload;

      switch (payload.type) {
        case "ENTITY_UPDATE":
        case "EntityUpdate":  // Rust sends PascalCase
          console.log(`[WS] Entity: ${payload.callsign} @ ${payload.position.lat.toFixed(4)},${payload.position.lon.toFixed(4)}`);
          getEntityActions().updateEntity(payload);
          break;

        case "TRACK_UPDATE":
        case "TrackUpdate":  // Rust sends PascalCase
        {
          // Normalize velocity field names (Rust sends heading/climb, UI expects heading_deg/climb_rate_mps)
          const velocityRaw = payload.velocity as unknown as Record<string, unknown>;
          const normalizedVelocity = {
            speed_mps: payload.velocity.speed_mps,
            heading_deg: (velocityRaw.heading ?? velocityRaw.heading_deg ?? 0) as number,
            climb_rate_mps: (velocityRaw.climb ?? velocityRaw.climb_rate_mps ?? 0) as number,
          };
          getEntityActions().updateTrack({
            track_id: payload.track_id,
            callsign: payload.callsign,
            affiliation: payload.affiliation,
            position: payload.position,
            velocity: normalizedVelocity,
            destroyed: payload.destroyed,
          });
          break;
        }

        case "MISSILE_UPDATE":
          getEntityActions().updateMissile({
            missile_id: payload.missile_id,
            shooter_id: payload.shooter_id,
            target_id: payload.target_id,
            position: payload.position,
            heading_deg: payload.heading_deg,
            active: payload.active,
          });
          break;

        case "MISSION_STATUS":
          console.log("[WS] MissionStatus:", payload.mission_id);
          break;

        case "PHASE_CHANGE":
          getEntityActions().setPhase(payload.phase);
          console.log("[WS] Phase:", payload.previous_phase, "->", payload.phase);
          break;

        case "WEAPONS_STATUS_CHANGE":
          getEntityActions().setWeaponsStatus(payload.status);
          console.log("[WS] Weapons:", payload.status, "-", payload.reason);
          break;

        case "ALERT":
        case "Alert":  // Rust sends PascalCase
          getUIActions().addAlert(payload);
          break;

        case "AUTH_REQUEST":
        case "AuthorizationRequest":  // Rust sends PascalCase
          getAuthActions().addRequest(payload);
          await getAuditActions().logAuthRequest(
            payload.request_id,
            payload.entity_id ?? (payload as unknown as { requesting_entity?: string }).requesting_entity ?? "unknown",
            payload.action_type
          );
          break;

        case "MISSION_EVENT": {
          const eventType = payload.event_type === "ALERT" ? "ALERT" : payload.event_type === "NARRATION" ? "NARRATION" : "SYSTEM";
          const event = {
            id: `evt-${Date.now()}`,
            timestamp: Date.now(),
            missionTime: 0,
            type: eventType as "SYSTEM" | "ALERT" | "AUTH" | "COMBAT" | "NARRATION",
            text: payload.text ?? "",
            ...(payload.priority && { priority: payload.priority }),
          };
          getEntityActions().addEvent(event);
          console.log("[WS] Event:", payload.event_type, "-", payload.text);
          break;
        }

        case "MISSION_COMPLETE":
          getEntityActions().setPhase(payload.outcome === "SUCCESS" ? "COMPLETE" : "FAILED");
          console.log("[WS] Mission complete:", payload.outcome);
          break;

        case "DEMO_STATE":
          getEntityActions().setPhase(payload.phase);
          break;

        case "DEMO_RESET":
          getEntityActions().clearAll();
          console.log("[WS] Demo reset");
          break;

        case "AI_MODE_CHANGED":
          getEntityActions().setAiEnabled(payload.enabled);
          console.log("[WS] AI mode:", payload.enabled ? "ON" : "OFF");
          break;

        case "SAFE_MODE_ACTIVE":
          getUIActions().activateSafeMode(payload.reason, payload.can_resume);
          await getAuditActions().logSafeModeActivated(payload.reason);
          break;

        case "HEARTBEAT": {
          getUIActions().recordHeartbeat();
          // Restart watchdog on heartbeat received
          startHeartbeatWatchdog();
          // Send ACK
          const simState = getSimState();
          const ack = createHeartbeatAck(payload.seq, simState);
          wsRef.current?.send(JSON.stringify(ack));
          break;
        }
      }
    },
    [getSimState, startHeartbeatWatchdog]
  );

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (
      isConnectingRef.current ||
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    isConnectingRef.current = true;

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    getUIActions().setConnectionStatus("connecting");
    console.log("[WS] Connecting to", WS_URL);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = async () => {
      console.log("[WS] Connected");
      isConnectingRef.current = false;
      getUIActions().setConnectionStatus("connected");
      reconnectAttemptRef.current = 0;
      await getAuditActions().initialize();
      startHeartbeatWatchdog();
    };

    ws.onclose = (event) => {
      console.log("[WS] Closed:", event.code, event.reason);
      isConnectingRef.current = false;
      getUIActions().setConnectionStatus("disconnected");

      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }

      // Exponential backoff reconnect
      const delay = Math.min(
        RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptRef.current),
        MAX_RECONNECT_DELAY_MS
      );
      reconnectAttemptRef.current++;

      console.log(
        `[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`
      );
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = (error) => {
      console.error("[WS] Error:", error);
      isConnectingRef.current = false;
      getUIActions().setConnectionStatus("error", "Connection error");
    };

    ws.onmessage = handleMessage;
  }, [handleMessage, startHeartbeatWatchdog]);

  // Disconnect
  const disconnect = useCallback(() => {
    isConnectingRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect on intentional close
      wsRef.current.close();
      wsRef.current = null;
    }
    getUIActions().setConnectionStatus("disconnected");
  }, []);

  // Auto-connect on mount - use refs to avoid dependency issues
  const connectRef = useRef(connect);
  const disconnectRef = useRef(disconnect);
  connectRef.current = connect;
  disconnectRef.current = disconnect;

  useEffect(() => {
    if (autoConnect) {
      connectRef.current();
    }

    return () => {
      disconnectRef.current();
    };
  }, [autoConnect]);

  const isConnected = useUIStore((s) => s.connectionStatus === "connected");

  return {
    connect,
    disconnect,
    send,
    isConnected,
  };
}
