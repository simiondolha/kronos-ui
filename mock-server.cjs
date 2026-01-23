/**
 * KRONOS Mock WebSocket Server
 *
 * Simulates the Rust backend for UI development/demo.
 * Sends entity updates, heartbeats, and handles auth requests.
 */

const WebSocket = require('ws');

const PORT = 9000;
const HEARTBEAT_INTERVAL = 500; // 2Hz
const ENTITY_UPDATE_INTERVAL = 100; // 10Hz
const PROTOCOL_VERSION = "1.0.0";

// Simulated entities - Romania (Bucharest area) matching DCA scenario
// STRIGOI = Combat UCAV, CORVUS = Recon UAV, VULTUR = HALE ISR
const entities = [
  {
    entity_id: "strigoi-001",
    callsign: "SHADOW-1",
    platform_type: "STRIGOI",
    position: { lat: 45.0, lon: 25.0, alt_m: 8000 },
    velocity: { speed_mps: 250, heading_deg: 0, climb_rate_mps: 0 },
    attitude: { roll_deg: 0, pitch_deg: 2, yaw_deg: 0 },
  },
  {
    entity_id: "strigoi-002",
    callsign: "SHADOW-2",
    platform_type: "STRIGOI",
    position: { lat: 45.0, lon: 25.1, alt_m: 8500 },
    velocity: { speed_mps: 250, heading_deg: 15, climb_rate_mps: 0 },
    attitude: { roll_deg: 5, pitch_deg: 3, yaw_deg: 15 },
  },
  {
    entity_id: "vultur-001",
    callsign: "HAWK-1",
    platform_type: "VULTUR",
    position: { lat: 45.2, lon: 25.0, alt_m: 12000 },
    velocity: { speed_mps: 42, heading_deg: 90, climb_rate_mps: 0 },
    attitude: { roll_deg: 0, pitch_deg: 0, yaw_deg: 90 },
  },
];

let simTick = 0;
let seq = 0;
let timeScale = 1.0;
let paused = false;

function createEnvelope(payload) {
  return {
    schema_version: PROTOCOL_VERSION,
    timestamp_utc: new Date().toISOString(),
    sim_time_utc: new Date().toISOString(),
    sim_tick: simTick,
    seq: ++seq,
    source_system: "kronos-mock",
    time_scale: timeScale,
    payload,
  };
}

function updateEntityPositions() {
  if (paused) return;

  const dt = ENTITY_UPDATE_INTERVAL / 1000 * timeScale;

  for (const entity of entities) {
    // Simple movement model
    const headingRad = (entity.velocity.heading_deg * Math.PI) / 180;
    const speedDegPerSec = entity.velocity.speed_mps / 111000; // rough conversion

    entity.position.lat += Math.cos(headingRad) * speedDegPerSec * dt;
    entity.position.lon += Math.sin(headingRad) * speedDegPerSec * dt;
    entity.position.alt_m += entity.velocity.climb_rate_mps * dt;

    // Keep altitude reasonable
    entity.position.alt_m = Math.max(1000, Math.min(15000, entity.position.alt_m));

    // Slight heading drift
    entity.velocity.heading_deg += (Math.random() - 0.5) * 2;
    entity.attitude.yaw_deg = entity.velocity.heading_deg;
  }

  simTick++;
}

function createEntityUpdate(entity) {
  return {
    type: "ENTITY_UPDATE",
    delta: true,
    entity_id: entity.entity_id,
    platform_type: entity.platform_type,
    callsign: entity.callsign,
    position: { ...entity.position },
    attitude: { ...entity.attitude },
    velocity: { ...entity.velocity },
    flight_phase: "AIRBORNE_CRUISE",
    operational_status: "MISSION_ACTIVE",
    fuel_percent: 75 + Math.random() * 10,
    link_status: "CONNECTED",
    weapons_state: {
      simulated: true,
      safety: "SAFE",
      inventory: ["AAM1", "AAM2"],
    },
    sensor_active: true,
    sensor_mode: "SEARCH",
  };
}

const wss = new WebSocket.Server({ port: PORT, host: '127.0.0.1' });

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║     KRONOS MOCK SERVER - FOR DEVELOPMENT ONLY                    ║
╚══════════════════════════════════════════════════════════════════╝

Mock WebSocket server listening on ws://127.0.0.1:${PORT}
`);

wss.on('connection', (ws, req) => {
  console.log(`[MOCK] Client connected from ${req.socket.remoteAddress}`);

  let heartbeatSeq = 0;

  // Send heartbeats
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const envelope = createEnvelope({
        type: "HEARTBEAT",
        seq: ++heartbeatSeq,
      });
      ws.send(JSON.stringify(envelope));
    }
  }, HEARTBEAT_INTERVAL);

  // Send entity updates
  const entityInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN && !paused) {
      updateEntityPositions();

      for (const entity of entities) {
        const envelope = createEnvelope(createEntityUpdate(entity));
        ws.send(JSON.stringify(envelope));
      }
    }
  }, ENTITY_UPDATE_INTERVAL);

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const payload = msg.payload;

      if (!payload) return;

      switch (payload.type) {
        case "HEARTBEAT_ACK":
          // Heartbeat acknowledged - connection is healthy
          break;

        case "AUTH_RESPONSE":
          console.log(`[MOCK] Auth response: ${payload.decision} for ${payload.request_id}`);
          break;

        case "INSTRUCTOR_CONTROL":
          console.log(`[MOCK] Instructor command: ${payload.command}`);
          switch (payload.command) {
            case "PAUSE":
              paused = true;
              console.log("[MOCK] Simulation PAUSED");
              break;
            case "RESUME":
              paused = false;
              console.log("[MOCK] Simulation RESUMED");
              break;
            case "SET_TIME_SCALE":
              timeScale = payload.scale || 1.0;
              console.log(`[MOCK] Time scale set to ${timeScale}x`);
              break;
            case "KILL_SWITCH":
              console.log("[MOCK] KILL SWITCH activated - stopping simulation");
              paused = true;
              // Send safe mode
              const safeModeEnvelope = createEnvelope({
                type: "SAFE_MODE_ACTIVE",
                reason: "Kill switch activated by operator",
                can_resume: true,
              });
              ws.send(JSON.stringify(safeModeEnvelope));
              break;
            case "RESUME_FROM_SAFE_MODE":
              paused = false;
              console.log("[MOCK] Resumed from safe mode");
              break;
          }
          break;

        default:
          console.log(`[MOCK] Unknown message type: ${payload.type}`);
      }
    } catch (e) {
      console.error("[MOCK] Failed to parse message:", e.message);
    }
  });

  ws.on('close', () => {
    console.log("[MOCK] Client disconnected");
    clearInterval(heartbeatInterval);
    clearInterval(entityInterval);
  });

  ws.on('error', (err) => {
    console.error("[MOCK] WebSocket error:", err.message);
  });

  // Send initial entity state
  setTimeout(() => {
    for (const entity of entities) {
      const envelope = createEnvelope(createEntityUpdate(entity));
      ws.send(JSON.stringify(envelope));
    }
  }, 100);
});

// Periodically send an auth request for demo
let authRequestSent = false;
setInterval(() => {
  if (!authRequestSent && wss.clients.size > 0) {
    // Wait 10 seconds then send an auth request
    setTimeout(() => {
      wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          const envelope = createEnvelope({
            type: "AUTH_REQUEST",
            request_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            entity_id: entities[0].entity_id,
            action_type: "SIMULATED_WEAPONS_RELEASE",
            target_id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
            confidence: 0.92,
            risk_estimate: "MEDIUM",
            collateral_risk: "LOW",
            rationale: "Hostile track confirmed by multiple sensors. Target is in designated engagement zone.",
            timeout_sec: 30,
          });
          ws.send(JSON.stringify(envelope));
          console.log("[MOCK] Sent AUTH_REQUEST for weapons release");
          authRequestSent = true;
        }
      });
    }, 10000);
  }
}, 5000);

console.log("Press Ctrl+C to stop the server");
