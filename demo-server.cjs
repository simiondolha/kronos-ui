/**
 * KRONOS Demo Server - Demo 1: Autonomous Defense
 *
 * Full mission state machine for interactive website demo.
 * Runs ~2 minute scenario with human-in-the-loop authorization.
 */

const WebSocket = require("ws");

const PORT = 9000;
const HEARTBEAT_INTERVAL = 500;
const UPDATE_INTERVAL = 100;
const PROTOCOL_VERSION = "1.0.0";

// ============================================================================
// MISSION STATE MACHINE
// ============================================================================

const PHASES = {
  IDLE: "IDLE",
  BRIEFING: "BRIEFING",
  PATROL: "PATROL",
  DETECTION: "DETECTION",
  AUTH_PENDING: "AUTH_PENDING",
  ENGAGING: "ENGAGING",
  COMPLETE: "COMPLETE",
  FAILED: "FAILED",
};

// Phase durations in milliseconds (compressed for ~2min demo)
const PHASE_DURATIONS = {
  BRIEFING: 15000,    // 15s - cinematic intro
  PATROL: 10000,      // 10s - assets on station
  DETECTION: 5000,    // 5s - threats detected
  AUTH_PENDING: 30000, // 30s max - user decision (or timeout)
  ENGAGING: 45000,    // 45s - combat phase
};

// ============================================================================
// ENTITY DATA
// ============================================================================

// Friendly assets - Romania (Bucharest area)
const AIRBASE = { lat: 44.5, lon: 25.0, alt_m: 200 };

const createFriendlyAssets = () => [
  {
    entity_id: "strigoi-001",
    callsign: "SHADOW-1",
    platform_type: "STRIGOI",
    position: { lat: 45.0, lon: 25.0, alt_m: 8000 },
    velocity: { speed_mps: 250, heading_deg: 0, climb_rate_mps: 0 },
    attitude: { roll_deg: 0, pitch_deg: 2, yaw_deg: 0 },
    weapons: ["AAM-1", "AAM-2", "AAM-3", "AAM-4"],
    weaponsSafety: "SAFE",
    destroyed: false,
  },
  {
    entity_id: "strigoi-002",
    callsign: "SHADOW-2",
    platform_type: "STRIGOI",
    position: { lat: 45.0, lon: 25.1, alt_m: 8500 },
    velocity: { speed_mps: 250, heading_deg: 15, climb_rate_mps: 0 },
    attitude: { roll_deg: 5, pitch_deg: 3, yaw_deg: 15 },
    weapons: ["AAM-1", "AAM-2", "AAM-3", "AAM-4"],
    weaponsSafety: "SAFE",
    destroyed: false,
  },
  {
    entity_id: "vultur-001",
    callsign: "HAWK-1",
    platform_type: "VULTUR",
    position: { lat: 45.2, lon: 25.0, alt_m: 12000 },
    velocity: { speed_mps: 42, heading_deg: 90, climb_rate_mps: 0 },
    attitude: { roll_deg: 0, pitch_deg: 0, yaw_deg: 90 },
    weapons: [],
    weaponsSafety: "SAFE",
    destroyed: false,
  },
];

// Hostile tracks - spawn from north
const createHostileTracks = () => [
  {
    track_id: "hostile-001",
    callsign: "BANDIT-1",
    affiliation: "HOSTILE",
    position: { lat: 47.0, lon: 24.5, alt_m: 9000 },
    velocity: { speed_mps: 300, heading_deg: 180, climb_rate_mps: 0 },
    destroyed: false,
  },
  {
    track_id: "hostile-002",
    callsign: "BANDIT-2",
    affiliation: "HOSTILE",
    position: { lat: 47.0, lon: 25.0, alt_m: 9200 },
    velocity: { speed_mps: 300, heading_deg: 180, climb_rate_mps: 0 },
    destroyed: false,
  },
  {
    track_id: "hostile-003",
    callsign: "BANDIT-3",
    affiliation: "HOSTILE",
    position: { lat: 47.0, lon: 25.5, alt_m: 8800 },
    velocity: { speed_mps: 300, heading_deg: 180, climb_rate_mps: 0 },
    destroyed: false,
  },
  {
    track_id: "hostile-004",
    callsign: "BANDIT-4",
    affiliation: "HOSTILE",
    position: { lat: 47.0, lon: 26.0, alt_m: 9100 },
    velocity: { speed_mps: 300, heading_deg: 180, climb_rate_mps: 0 },
    destroyed: false,
  },
];

// ============================================================================
// MISSION STATE
// ============================================================================

let missionState = {
  phase: PHASES.IDLE,
  phaseStartTime: null,
  friendlyAssets: [],
  hostileTracks: [],
  missiles: [], // Active missiles in flight
  events: [],
  authRequestId: null,
  authDecision: null,
  engagementIndex: 0,
  simTick: 0,
  seq: 0,
  timeScale: 1.0,
  aiEnabled: true, // AI mode - ON by default
};

let missileIdCounter = 0;

function resetMission() {
  missionState = {
    phase: PHASES.IDLE,
    phaseStartTime: null,
    friendlyAssets: createFriendlyAssets(),
    hostileTracks: createHostileTracks(),
    missiles: [],
    events: [],
    authRequestId: null,
    authDecision: null,
    engagementIndex: 0,
    simTick: 0,
    seq: 0,
    timeScale: 1.0,
    aiEnabled: true, // Reset AI to ON
  };
  missileIdCounter = 0;
  console.log("[DEMO] Mission reset to IDLE");
}

// Create a missile from shooter to target
function launchMissile(shooterId, targetId) {
  const shooter = missionState.friendlyAssets.find(
    (e) => e.callsign === shooterId
  );
  const target = missionState.hostileTracks.find(
    (t) => t.callsign === targetId
  );

  if (!shooter || !target) return null;

  const missile = {
    missile_id: `missile-${++missileIdCounter}`,
    shooter_id: shooterId,
    target_id: targetId,
    position: { ...shooter.position },
    heading_deg: calculateHeading(shooter.position, target.position),
    speed_mps: 1000, // Fast missile
    active: true,
    launchTime: Date.now(),
  };

  missionState.missiles.push(missile);
  return missile;
}

function calculateHeading(from, to) {
  const dLon = to.lon - from.lon;
  const dLat = to.lat - from.lat;
  return (Math.atan2(dLon, dLat) * 180) / Math.PI;
}

function createMissileUpdate(missile) {
  return {
    type: "MISSILE_UPDATE",
    missile_id: missile.missile_id,
    shooter_id: missile.shooter_id,
    target_id: missile.target_id,
    position: { ...missile.position },
    heading_deg: missile.heading_deg,
    active: missile.active,
  };
}

// ============================================================================
// MESSAGE HELPERS
// ============================================================================

function createEnvelope(payload) {
  return {
    schema_version: PROTOCOL_VERSION,
    timestamp_utc: new Date().toISOString(),
    sim_time_utc: new Date().toISOString(),
    sim_tick: missionState.simTick,
    seq: ++missionState.seq,
    source_system: "kronos-demo",
    time_scale: missionState.timeScale,
    payload,
  };
}

function broadcast(wss, payload) {
  const msg = JSON.stringify(createEnvelope(payload));
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

function addEvent(type, text, data = {}) {
  const event = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    missionTime: missionState.phaseStartTime
      ? Date.now() - missionState.phaseStartTime
      : 0,
    type,
    text,
    ...data,
  };
  missionState.events.push(event);
  return event;
}

// ============================================================================
// ENTITY UPDATES
// ============================================================================

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
      safety: entity.weaponsSafety,
      inventory: entity.weapons,
    },
    sensor_active: true,
    sensor_mode: "SEARCH",
  };
}

function createTrackUpdate(track) {
  return {
    type: "TRACK_UPDATE",
    track_id: track.track_id,
    callsign: track.callsign,
    affiliation: track.affiliation,
    position: { ...track.position },
    velocity: { ...track.velocity },
    destroyed: track.destroyed,
  };
}

function updatePositions(dt) {
  // Update friendly assets
  for (const entity of missionState.friendlyAssets) {
    if (entity.destroyed) continue;

    // AI-controlled tactical maneuvers
    if (missionState.aiEnabled && missionState.phase === PHASES.ENGAGING) {
      // Combat drones turn toward nearest hostile
      if (entity.platform_type === "STRIGOI") {
        const nearestThreat = missionState.hostileTracks.find(t => !t.destroyed);
        if (nearestThreat) {
          // Turn toward threat (smooth turn)
          const targetHeading = calculateHeading(entity.position, nearestThreat.position);
          const headingDiff = targetHeading - entity.velocity.heading_deg;
          const normalizedDiff = ((headingDiff + 540) % 360) - 180; // Normalize to -180 to 180
          const turnRate = 5; // degrees per second
          const maxTurn = turnRate * dt;
          if (Math.abs(normalizedDiff) > maxTurn) {
            entity.velocity.heading_deg += Math.sign(normalizedDiff) * maxTurn;
          } else {
            entity.velocity.heading_deg = targetHeading;
          }
          entity.velocity.heading_deg = ((entity.velocity.heading_deg % 360) + 360) % 360;
        }
      }
    }
    // When AI is OFF or not engaging: entities fly straight (autopilot)

    const headingRad = (entity.velocity.heading_deg * Math.PI) / 180;
    const speedDegPerSec = entity.velocity.speed_mps / 111000;
    entity.position.lat += Math.cos(headingRad) * speedDegPerSec * dt;
    entity.position.lon += Math.sin(headingRad) * speedDegPerSec * dt;
    entity.attitude.yaw_deg = entity.velocity.heading_deg;
  }

  // Update hostile tracks
  for (const track of missionState.hostileTracks) {
    if (track.destroyed) continue;
    const headingRad = (track.velocity.heading_deg * Math.PI) / 180;
    const speedDegPerSec = track.velocity.speed_mps / 111000;
    track.position.lat += Math.cos(headingRad) * speedDegPerSec * dt;
    track.position.lon += Math.sin(headingRad) * speedDegPerSec * dt;
  }

  // Update missiles - move towards target
  for (const missile of missionState.missiles) {
    if (!missile.active) continue;

    // Find target
    const target = missionState.hostileTracks.find(
      (t) => t.callsign === missile.target_id
    );

    if (target && !target.destroyed) {
      // Update heading towards target
      missile.heading_deg = calculateHeading(missile.position, target.position);

      // Move missile
      const headingRad = (missile.heading_deg * Math.PI) / 180;
      const speedDegPerSec = missile.speed_mps / 111000;
      missile.position.lat += Math.cos(headingRad) * speedDegPerSec * dt;
      missile.position.lon += Math.sin(headingRad) * speedDegPerSec * dt;
    }
  }

  missionState.simTick++;
}

// ============================================================================
// PHASE TRANSITIONS
// ============================================================================

function transitionTo(wss, newPhase) {
  const oldPhase = missionState.phase;
  missionState.phase = newPhase;
  missionState.phaseStartTime = Date.now();

  console.log(`[DEMO] Phase: ${oldPhase} -> ${newPhase}`);

  broadcast(wss, {
    type: "PHASE_CHANGE",
    phase: newPhase,
    previous_phase: oldPhase,
  });

  // Phase-specific initialization
  switch (newPhase) {
    case PHASES.BRIEFING:
      addEvent("SYSTEM", "Mission briefing initiated");
      broadcast(wss, {
        type: "MISSION_EVENT",
        event_type: "NARRATION",
        text: "KRONOS Control online. Initiating mission briefing.",
      });
      break;

    case PHASES.PATROL:
      addEvent("SYSTEM", "Assets on station");
      broadcast(wss, {
        type: "MISSION_EVENT",
        event_type: "NARRATION",
        text: "SHADOW-1 and SHADOW-2 on station. HAWK-1 providing overwatch.",
      });
      break;

    case PHASES.DETECTION:
      addEvent("ALERT", "Multiple hostile tracks detected");
      broadcast(wss, {
        type: "MISSION_EVENT",
        event_type: "ALERT",
        text: "HAWK-1 reports: Multiple contacts bearing north. Classify HOSTILE.",
        priority: "HIGH",
      });
      // Send track updates
      for (const track of missionState.hostileTracks) {
        broadcast(wss, createTrackUpdate(track));
      }
      broadcast(wss, {
        type: "MISSION_EVENT",
        event_type: "NARRATION",
        text: `Track count: ${missionState.hostileTracks.length} hostile fighters inbound.`,
      });
      break;

    case PHASES.AUTH_PENDING:
      missionState.authRequestId = `auth-${Date.now()}`;
      addEvent("AUTH", "Engagement authorization requested");
      broadcast(wss, {
        type: "AUTH_REQUEST",
        request_id: missionState.authRequestId,
        entity_id: "strigoi-001",
        action_type: "SIMULATED_WEAPONS_RELEASE",
        target_id: "hostile-001",
        confidence: 0.94,
        risk_estimate: "MEDIUM",
        collateral_risk: "LOW",
        rationale:
          "4 hostile tracks confirmed on intercept course. Recommend immediate engagement to defend airbase.",
        timeout_sec: 30,
      });
      broadcast(wss, {
        type: "MISSION_EVENT",
        event_type: "NARRATION",
        text: "KRONOS requests weapons release authorization.",
      });
      break;

    case PHASES.ENGAGING:
      addEvent("COMBAT", "Engagement authorized - weapons HOT");
      // Update weapons status to ARMED
      for (const entity of missionState.friendlyAssets) {
        if (entity.platform_type === "STRIGOI") {
          entity.weaponsSafety = "ARMED";
        }
      }
      broadcast(wss, {
        type: "WEAPONS_STATUS_CHANGE",
        status: "ARMED",
        reason: "Engagement authorized",
      });
      broadcast(wss, {
        type: "MISSION_EVENT",
        event_type: "NARRATION",
        text: "Authorization confirmed. SHADOW flight, weapons HOT. Engaging.",
      });
      missionState.engagementIndex = 0;
      break;

    case PHASES.COMPLETE:
      addEvent("SYSTEM", "Mission complete - all threats neutralized");
      // Set weapons back to SAFE
      for (const entity of missionState.friendlyAssets) {
        entity.weaponsSafety = "SAFE";
      }
      broadcast(wss, {
        type: "WEAPONS_STATUS_CHANGE",
        status: "SAFE",
        reason: "Mission complete",
      });
      broadcast(wss, {
        type: "MISSION_COMPLETE",
        outcome: "SUCCESS",
        threats_neutralized: 4,
        friendly_losses: 0,
        events: missionState.events,
      });
      broadcast(wss, {
        type: "MISSION_EVENT",
        event_type: "NARRATION",
        text: "All threats neutralized. SHADOW flight RTB. Mission successful.",
      });
      break;

    case PHASES.FAILED:
      addEvent("SYSTEM", "Mission failed - engagement denied");
      broadcast(wss, {
        type: "MISSION_COMPLETE",
        outcome: "FAILED",
        threats_neutralized: 0,
        friendly_losses: 0,
        events: missionState.events,
        reason: "Engagement authorization denied",
      });
      broadcast(wss, {
        type: "MISSION_EVENT",
        event_type: "ALERT",
        text: "Engagement denied. Threats continuing approach. Mission failed.",
        priority: "CRITICAL",
      });
      break;
  }
}

// ============================================================================
// ENGAGEMENT LOGIC
// ============================================================================

const ENGAGEMENT_SCRIPT = [
  { delay: 3000, attacker: "SHADOW-1", target: "BANDIT-1", narration: "SHADOW-1 engaging BANDIT-1. Fox three.", launch: true },
  { delay: 5000, attacker: "SHADOW-1", target: "BANDIT-1", narration: "Splash one. BANDIT-1 destroyed.", splash: true },
  { delay: 8000, attacker: "SHADOW-2", target: "BANDIT-2", narration: "SHADOW-2 engaging BANDIT-2. Fox three.", launch: true },
  { delay: 10000, attacker: "SHADOW-2", target: "BANDIT-2", narration: "Splash two. BANDIT-2 destroyed.", splash: true },
  { delay: 14000, attacker: "SHADOW-1", target: "BANDIT-3", narration: "SHADOW-1 re-engaging. Targeting BANDIT-3. Fox three.", launch: true },
  { delay: 17000, attacker: "SHADOW-1", target: "BANDIT-3", narration: "Splash three. BANDIT-3 destroyed.", splash: true },
  { delay: 21000, attacker: "SHADOW-2", target: "BANDIT-4", narration: "SHADOW-2 prosecuting final target. Fox three.", launch: true },
  { delay: 24000, attacker: "SHADOW-2", target: "BANDIT-4", narration: "Splash four. All bandits destroyed.", splash: true },
];

let engagementTimeouts = [];

function runEngagementScript(wss) {
  // Clear any existing timeouts
  engagementTimeouts.forEach(clearTimeout);
  engagementTimeouts = [];

  for (const event of ENGAGEMENT_SCRIPT) {
    const timeout = setTimeout(() => {
      if (missionState.phase !== PHASES.ENGAGING) return;

      // Skip engagement actions if AI is disabled
      if (!missionState.aiEnabled) {
        return; // Just skip - entities in autopilot mode
      }

      // Find target track
      const targetTrack = missionState.hostileTracks.find(
        (t) => t.callsign === event.target
      );

      // Launch missile
      if (event.launch) {
        const missile = launchMissile(event.attacker, event.target);
        if (missile) {
          broadcast(wss, createMissileUpdate(missile));
        }
      }

      // Splash - destroy target and deactivate missile
      if (event.splash && targetTrack) {
        targetTrack.destroyed = true;
        broadcast(wss, createTrackUpdate(targetTrack));

        // Deactivate missiles targeting this track
        for (const m of missionState.missiles) {
          if (m.target_id === event.target && m.active) {
            m.active = false;
            broadcast(wss, createMissileUpdate(m));
          }
        }
        addEvent("COMBAT", event.narration);
      } else {
        addEvent("COMBAT", event.narration);
      }

      broadcast(wss, {
        type: "MISSION_EVENT",
        event_type: "NARRATION",
        text: event.narration,
      });

      // Check if all destroyed
      const allDestroyed = missionState.hostileTracks.every((t) => t.destroyed);
      if (allDestroyed && missionState.phase === PHASES.ENGAGING) {
        setTimeout(() => {
          if (missionState.phase === PHASES.ENGAGING) {
            transitionTo(wss, PHASES.COMPLETE);
          }
        }, 3000);
      }
    }, event.delay);

    engagementTimeouts.push(timeout);
  }
}

// ============================================================================
// MISSION TICK
// ============================================================================

function missionTick(wss) {
  if (missionState.phase === PHASES.IDLE) return;

  const dt = (UPDATE_INTERVAL / 1000) * missionState.timeScale;
  const elapsed = Date.now() - missionState.phaseStartTime;

  // Update positions
  updatePositions(dt);

  // Send entity updates
  for (const entity of missionState.friendlyAssets) {
    if (!entity.destroyed) {
      broadcast(wss, createEntityUpdate(entity));
    }
  }

  // Send track updates (if detected)
  if (
    missionState.phase === PHASES.DETECTION ||
    missionState.phase === PHASES.AUTH_PENDING ||
    missionState.phase === PHASES.ENGAGING
  ) {
    for (const track of missionState.hostileTracks) {
      broadcast(wss, createTrackUpdate(track));
    }
  }

  // Send missile updates (if engaging)
  if (missionState.phase === PHASES.ENGAGING) {
    for (const missile of missionState.missiles) {
      if (missile.active) {
        broadcast(wss, createMissileUpdate(missile));
      }
    }
  }

  // Phase transitions
  switch (missionState.phase) {
    case PHASES.BRIEFING:
      if (elapsed >= PHASE_DURATIONS.BRIEFING) {
        transitionTo(wss, PHASES.PATROL);
      }
      break;

    case PHASES.PATROL:
      if (elapsed >= PHASE_DURATIONS.PATROL) {
        transitionTo(wss, PHASES.DETECTION);
      }
      break;

    case PHASES.DETECTION:
      if (elapsed >= PHASE_DURATIONS.DETECTION) {
        transitionTo(wss, PHASES.AUTH_PENDING);
      }
      break;

    case PHASES.AUTH_PENDING:
      // Timeout after 30 seconds
      if (elapsed >= PHASE_DURATIONS.AUTH_PENDING) {
        console.log("[DEMO] Authorization timeout");
        missionState.authDecision = "CANCELLED";
        broadcast(wss, {
          type: "AUTH_TIMEOUT",
          request_id: missionState.authRequestId,
        });
        addEvent("AUTH", "Authorization request timed out");
        broadcast(wss, {
          type: "MISSION_EVENT",
          event_type: "ALERT",
          text: "Authorization timeout. Request cancelled.",
          priority: "HIGH",
        });
        transitionTo(wss, PHASES.FAILED);
      }
      break;
  }
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

function handleMessage(wss, ws, msg) {
  const payload = msg.payload;
  if (!payload) return;

  switch (payload.type) {
    case "HEARTBEAT_ACK":
      break;

    case "START_DEMO":
      console.log("[DEMO] Starting Demo 1: Autonomous Defense");
      resetMission();
      transitionTo(wss, PHASES.BRIEFING);
      break;

    case "RESTART_DEMO":
      console.log("[DEMO] Restarting demo");
      engagementTimeouts.forEach(clearTimeout);
      engagementTimeouts = [];
      resetMission();
      broadcast(wss, { type: "DEMO_RESET" });
      break;

    case "AUTH_RESPONSE":
      if (missionState.phase === PHASES.AUTH_PENDING) {
        missionState.authDecision = payload.decision;
        console.log(`[DEMO] Auth decision: ${payload.decision}`);

        if (payload.decision === "APPROVED") {
          addEvent("AUTH", "Engagement APPROVED by operator");
          transitionTo(wss, PHASES.ENGAGING);
          runEngagementScript(wss);
        } else if (payload.decision === "DENIED") {
          addEvent("AUTH", "Engagement DENIED by operator");
          transitionTo(wss, PHASES.FAILED);
        }
      }
      break;

    case "INSTRUCTOR_CONTROL":
      console.log(`[DEMO] Instructor command: ${payload.command}`);
      if (payload.command === "KILL_SWITCH") {
        engagementTimeouts.forEach(clearTimeout);
        resetMission();
        broadcast(wss, {
          type: "SAFE_MODE_ACTIVE",
          reason: "Kill switch activated",
          can_resume: true,
        });
      }
      break;

    case "SET_AI_MODE":
      const newAiState = payload.enabled;
      missionState.aiEnabled = newAiState;
      console.log(`[DEMO] AI mode: ${newAiState ? "ON" : "OFF"}`);

      // Add narration event
      if (newAiState) {
        addEvent("NARRATION", "KRONOS AI ONLINE. Resuming tactical control.");
      } else {
        addEvent("NARRATION", "AI DISABLED. Entities switching to autopilot mode.");
      }

      // Broadcast AI mode change to all clients
      broadcast(wss, {
        type: "AI_MODE_CHANGED",
        enabled: newAiState,
      });
      break;

    default:
      console.log(`[DEMO] Unknown message: ${payload.type}`);
  }
}

// ============================================================================
// SERVER SETUP
// ============================================================================

const wss = new WebSocket.Server({ port: PORT, host: "127.0.0.1" });

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║     KRONOS DEMO SERVER - Demo 1: Autonomous Defense              ║
╚══════════════════════════════════════════════════════════════════╝

WebSocket server listening on ws://127.0.0.1:${PORT}

Commands:
  START_DEMO    - Begin mission
  RESTART_DEMO  - Reset to IDLE
  AUTH_RESPONSE - APPROVED/DENIED

Press Ctrl+C to stop
`);

// Initialize mission state
resetMission();

wss.on("connection", (ws, req) => {
  console.log(`[DEMO] Client connected from ${req.socket.remoteAddress}`);

  // Send heartbeats
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify(
          createEnvelope({
            type: "HEARTBEAT",
            seq: missionState.seq,
          })
        )
      );
    }
  }, HEARTBEAT_INTERVAL);

  // Handle messages
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMessage(wss, ws, msg);
    } catch (e) {
      console.error("[DEMO] Parse error:", e.message);
    }
  });

  ws.on("close", () => {
    console.log("[DEMO] Client disconnected");
    clearInterval(heartbeatInterval);
  });

  ws.on("error", (err) => {
    console.error("[DEMO] WebSocket error:", err.message);
  });

  // Send initial state
  setTimeout(() => {
    // Send current phase
    ws.send(
      JSON.stringify(
        createEnvelope({
          type: "DEMO_STATE",
          phase: missionState.phase,
          events: missionState.events,
        })
      )
    );

    // Send initial entities
    for (const entity of missionState.friendlyAssets) {
      ws.send(JSON.stringify(createEnvelope(createEntityUpdate(entity))));
    }
  }, 100);
});

// Mission tick
setInterval(() => {
  missionTick(wss);
}, UPDATE_INTERVAL);

console.log("Server ready. Waiting for client...");
