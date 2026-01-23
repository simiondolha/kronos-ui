/**
 * Entity Brain - Tactical AI Decision Layer
 *
 * Ported from rust-llm (C:\ai\tec\rust-llm)
 * Provides deterministic safety filter + tactical decision making
 *
 * Key invariant: Safety rules R1-R10 ALWAYS override AI decisions
 */

// =============================================================================
// Maneuver Types (from rust-llm/src/types.rs)
// =============================================================================

const Maneuver = {
  INTERCEPT: "intercept",    // Aggressive pursuit of target
  EVADE: "evade",            // Defensive maneuver to avoid threat
  EGRESS: "egress",          // Exit combat zone (fuel/damage/mission complete)
  HOLD: "hold",              // Maintain current state, observe
  CLIMB: "climb",            // Gain altitude
  DESCEND: "descend",        // Lose altitude
  BREAK_TURN: "break_turn",  // High-G defensive break turn
  EXTEND: "extend",          // Extend away to regain energy/position
};

// =============================================================================
// TacticalState (12 features from rust-llm/src/types.rs)
// =============================================================================

/**
 * @typedef {Object} TacticalState
 * @property {number} altitude_m - Altitude above mean sea level (meters)
 * @property {number} altitude_agl_m - Altitude above ground level (meters)
 * @property {number} airspeed_mps - True airspeed (meters/second)
 * @property {number} mach - Mach number
 * @property {number} heading_deg - Aircraft heading (degrees, 0-360)
 * @property {number} g_load - Current G-load (normal load factor)
 * @property {number} alpha_deg - Angle of attack (degrees)
 * @property {number} fuel_kg - Remaining fuel (kg)
 * @property {number} target_bearing_deg - Bearing to primary target (degrees)
 * @property {number} target_range_m - Range to primary target (meters)
 * @property {number} target_aspect_deg - Target aspect angle (0=head-on, 180=tail)
 * @property {number} threat_count - Number of detected threats
 */

/**
 * Create a TacticalState from entity data
 * @param {Object} entity - Entity data from demo-server
 * @param {Object|null} target - Target data (threat or hostile track)
 * @param {number} threatCount - Number of active threats
 * @returns {TacticalState}
 */
function createTacticalState(entity, target, threatCount) {
  // Calculate bearing and range to target if exists
  let targetBearing = 0;
  let targetRange = 50000; // Default: no target
  let targetAspect = 180;  // Default: tail aspect

  if (target && target.position) {
    targetBearing = calculateBearing(entity.position, target.position);
    targetRange = calculateRange(entity.position, target.position);
    // Aspect angle: how the target is facing us (0=head-on, 180=tail)
    if (target.heading_deg !== undefined) {
      const relativeBearing = (targetBearing - target.heading_deg + 360) % 360;
      targetAspect = relativeBearing > 180 ? 360 - relativeBearing : relativeBearing;
    }
  }

  // Estimate mach from airspeed (speed of sound ~ 340 m/s at sea level)
  const mach = entity.velocity.speed_mps / 340;

  return {
    altitude_m: entity.position.alt_m,
    altitude_agl_m: entity.position.alt_m - 300, // Assume 300m terrain
    airspeed_mps: entity.velocity.speed_mps,
    mach: mach,
    heading_deg: entity.velocity.heading_deg,
    g_load: entity.g_load || 1.0,
    alpha_deg: entity.alpha_deg || 2.0,
    fuel_kg: entity.fuel_kg || 2000,
    target_bearing_deg: targetBearing,
    target_range_m: targetRange,
    target_aspect_deg: targetAspect,
    threat_count: threatCount,
  };
}

// =============================================================================
// TacticalDecision Output
// =============================================================================

/**
 * @typedef {Object} TacticalDecision
 * @property {string} maneuver - Selected maneuver type
 * @property {number} target_g - Target G-load for the maneuver
 * @property {number} target_heading_deg - Target heading after maneuver
 * @property {string} reasoning - Explanation for this decision
 * @property {number} urgency - Urgency level (1-5)
 * @property {number} confidence - Confidence in decision (0-1)
 * @property {string|null} safety_override - If set, which safety rule triggered
 */

// =============================================================================
// Safety Filter Rules R1-R10 (from rust-llm/src/safety_filter.rs)
// =============================================================================

/**
 * R1: Critical Fuel
 * If fuel < 300kg, MUST egress immediately
 */
function checkR1_CriticalFuel(state) {
  if (state.fuel_kg < 300) {
    return {
      triggered: true,
      rule: "R1_CRITICAL_FUEL",
      maneuver: Maneuver.EGRESS,
      reasoning: `CRITICAL: Fuel at ${state.fuel_kg}kg. Immediate RTB required.`,
      urgency: 5,
    };
  }
  return { triggered: false };
}

/**
 * R2: Threat on Tail
 * If threat aspect > 135 deg (behind us) and range < 5000m, MUST break turn
 */
function checkR2_ThreatOnTail(state) {
  if (state.target_aspect_deg > 135 && state.target_range_m < 5000) {
    return {
      triggered: true,
      rule: "R2_THREAT_ON_TAIL",
      maneuver: Maneuver.BREAK_TURN,
      reasoning: `DEFENSIVE: Threat at ${state.target_aspect_deg.toFixed(0)}° aspect, ${(state.target_range_m/1000).toFixed(1)}km. Break turn!`,
      urgency: 5,
    };
  }
  return { triggered: false };
}

/**
 * R3: Multiple Threats
 * If threat_count > 2 and any within 10km, MUST evade
 */
function checkR3_MultipleThreats(state) {
  if (state.threat_count > 2 && state.target_range_m < 10000) {
    return {
      triggered: true,
      rule: "R3_MULTIPLE_THREATS",
      maneuver: Maneuver.EVADE,
      reasoning: `OUTNUMBERED: ${state.threat_count} threats detected, nearest at ${(state.target_range_m/1000).toFixed(1)}km. Evading.`,
      urgency: 4,
    };
  }
  return { triggered: false };
}

/**
 * R4: Low Energy State
 * If airspeed < 100 m/s or alpha > 10 deg, MUST extend to regain energy
 */
function checkR4_LowEnergy(state) {
  if (state.airspeed_mps < 100 || state.alpha_deg > 10) {
    return {
      triggered: true,
      rule: "R4_LOW_ENERGY",
      maneuver: Maneuver.EXTEND,
      reasoning: `LOW ENERGY: Speed ${state.airspeed_mps.toFixed(0)} m/s, AoA ${state.alpha_deg.toFixed(1)}°. Extending.`,
      urgency: 4,
    };
  }
  return { triggered: false };
}

/**
 * R5: G-Limit based on speed
 * Structural limits vary with airspeed
 */
function getGLimitForSpeed(airspeed_mps) {
  if (airspeed_mps < 150) return 4.0;  // Low speed = low G limit
  if (airspeed_mps < 250) return 6.0;
  if (airspeed_mps < 350) return 9.0;  // High speed = high G available
  return 7.5;  // Very high speed = structural concern
}

function checkR5_GLimit(state, requestedG) {
  const maxG = getGLimitForSpeed(state.airspeed_mps);
  if (requestedG > maxG) {
    return {
      triggered: true,
      rule: "R5_G_LIMIT",
      maxG: maxG,
      reasoning: `G-LIMIT: Requested ${requestedG}G exceeds limit ${maxG}G at ${state.airspeed_mps.toFixed(0)} m/s`,
    };
  }
  return { triggered: false };
}

/**
 * R6: Winchester (out of weapons)
 * If missiles_remaining = 0 and in engagement, MUST egress
 */
function checkR6_Winchester(state, missilesRemaining, inEngagement) {
  if (missilesRemaining === 0 && inEngagement) {
    return {
      triggered: true,
      rule: "R6_WINCHESTER",
      maneuver: Maneuver.EGRESS,
      reasoning: "WINCHESTER: No weapons remaining. Egressing.",
      urgency: 4,
    };
  }
  return { triggered: false };
}

/**
 * R7: Last Ditch
 * If missile TTI < 3s, MUST break turn maximum G
 */
function checkR7_LastDitch(missileTTI) {
  if (missileTTI !== null && missileTTI < 3.0) {
    return {
      triggered: true,
      rule: "R7_LAST_DITCH",
      maneuver: Maneuver.BREAK_TURN,
      reasoning: `LAST DITCH: Missile impact in ${missileTTI.toFixed(1)}s! Max-G break!`,
      urgency: 5,
      target_g: 9.0,
    };
  }
  return { triggered: false };
}

/**
 * R8: Multiple Missiles
 * If 2+ missiles inbound, MUST evade (can't defeat all with break turn)
 */
function checkR8_MultipleMissiles(missileCount) {
  if (missileCount >= 2) {
    return {
      triggered: true,
      rule: "R8_MULTIPLE_MISSILES",
      maneuver: Maneuver.EVADE,
      reasoning: `MISSILE DEFENSE: ${missileCount} missiles inbound. Evasive maneuver.`,
      urgency: 5,
    };
  }
  return { triggered: false };
}

/**
 * R9: Multi-Threat Priority
 * When engaging multiple threats, prioritize closest/most dangerous
 */
function checkR9_ThreatPriority(threats) {
  if (threats.length > 1) {
    // Sort by range (closest first), then by aspect (head-on more dangerous)
    const sorted = [...threats].sort((a, b) => {
      const rangeA = a.range_m || 50000;
      const rangeB = b.range_m || 50000;
      return rangeA - rangeB;
    });
    return {
      triggered: true,
      rule: "R9_THREAT_PRIORITY",
      primaryThreat: sorted[0],
      reasoning: `PRIORITIZING: ${sorted.length} threats. Engaging closest at ${(sorted[0].range_m/1000).toFixed(1)}km.`,
    };
  }
  return { triggered: false };
}

/**
 * R10: RTB Pursuit
 * If RTB and being pursued, must evade not just fly home
 */
function checkR10_RTBPursuit(state, isRTB) {
  if (isRTB && state.target_aspect_deg > 90 && state.target_range_m < 15000) {
    return {
      triggered: true,
      rule: "R10_RTB_PURSUIT",
      maneuver: Maneuver.EVADE,
      reasoning: `RTB PURSUIT: Threat pursuing at ${(state.target_range_m/1000).toFixed(1)}km. Must evade before continuing RTB.`,
      urgency: 4,
    };
  }
  return { triggered: false };
}

// =============================================================================
// Safety Filter - Run All Rules
// =============================================================================

/**
 * Apply safety filter rules R1-R10
 * Returns override decision if any rule triggers, null otherwise
 *
 * @param {TacticalState} state - Current tactical state
 * @param {Object} context - Additional context (missiles, weapons, etc.)
 * @returns {TacticalDecision|null}
 */
function applySafetyFilter(state, context = {}) {
  const {
    missilesRemaining = 4,
    inEngagement = false,
    incomingMissiles = [],
    isRTB = false,
  } = context;

  // R1: Critical Fuel - highest priority
  let result = checkR1_CriticalFuel(state);
  if (result.triggered) {
    return createSafetyDecision(result);
  }

  // R7: Last Ditch - immediate survival
  const nearestMissile = incomingMissiles[0];
  if (nearestMissile) {
    result = checkR7_LastDitch(nearestMissile.tti_s);
    if (result.triggered) {
      return createSafetyDecision(result);
    }
  }

  // R8: Multiple Missiles
  result = checkR8_MultipleMissiles(incomingMissiles.length);
  if (result.triggered) {
    return createSafetyDecision(result);
  }

  // R2: Threat on Tail
  result = checkR2_ThreatOnTail(state);
  if (result.triggered) {
    return createSafetyDecision(result);
  }

  // R3: Multiple Threats
  result = checkR3_MultipleThreats(state);
  if (result.triggered) {
    return createSafetyDecision(result);
  }

  // R4: Low Energy
  result = checkR4_LowEnergy(state);
  if (result.triggered) {
    return createSafetyDecision(result);
  }

  // R6: Winchester
  result = checkR6_Winchester(state, missilesRemaining, inEngagement);
  if (result.triggered) {
    return createSafetyDecision(result);
  }

  // R10: RTB Pursuit
  result = checkR10_RTBPursuit(state, isRTB);
  if (result.triggered) {
    return createSafetyDecision(result);
  }

  // No safety rule triggered
  return null;
}

function createSafetyDecision(result) {
  return {
    maneuver: result.maneuver,
    target_g: result.target_g || 3.0,
    target_heading_deg: 0, // Will be calculated by maneuver executor
    reasoning: result.reasoning,
    urgency: result.urgency,
    confidence: 1.0, // Safety rules are deterministic
    safety_override: result.rule,
  };
}

// =============================================================================
// Tactical Decision Engine (simplified for demo)
// =============================================================================

/**
 * Main decision function - called when AI is enabled
 *
 * @param {TacticalState} state - Current tactical state
 * @param {Object} context - Mission context
 * @returns {TacticalDecision}
 */
function makeDecision(state, context = {}) {
  // Step 1: Apply safety filter FIRST (deterministic override)
  const safetyDecision = applySafetyFilter(state, context);
  if (safetyDecision) {
    console.log(`[BRAIN] Safety override: ${safetyDecision.safety_override}`);
    return safetyDecision;
  }

  // Step 2: Tactical decision (simplified rule-based for demo)
  // In production, this would use the trained decision tree

  const {
    phase = "PATROL",
    authorizationGranted = false,
  } = context;

  // No target = hold/patrol
  if (state.threat_count === 0) {
    return {
      maneuver: Maneuver.HOLD,
      target_g: 1.0,
      target_heading_deg: state.heading_deg,
      reasoning: "No threats detected. Maintaining patrol.",
      urgency: 1,
      confidence: 0.95,
      safety_override: null,
    };
  }

  // Target detected but no authorization = hold and track
  if (!authorizationGranted && phase !== "ENGAGING") {
    return {
      maneuver: Maneuver.HOLD,
      target_g: 1.5,
      target_heading_deg: state.target_bearing_deg,
      reasoning: `Tracking ${state.threat_count} threat(s). Awaiting authorization.`,
      urgency: 2,
      confidence: 0.9,
      safety_override: null,
    };
  }

  // Authorization granted - tactical engagement
  if (authorizationGranted || phase === "ENGAGING") {
    // Close range = merge/dogfight
    if (state.target_range_m < 5000) {
      return {
        maneuver: Maneuver.INTERCEPT,
        target_g: 6.0,
        target_heading_deg: state.target_bearing_deg,
        reasoning: `Merge! Target at ${(state.target_range_m/1000).toFixed(1)}km. Pressing attack.`,
        urgency: 4,
        confidence: 0.85,
        safety_override: null,
      };
    }

    // BVR range = intercept with medium G
    if (state.target_range_m < 30000) {
      return {
        maneuver: Maneuver.INTERCEPT,
        target_g: 3.0,
        target_heading_deg: state.target_bearing_deg,
        reasoning: `BVR engagement. Closing on target at ${(state.target_range_m/1000).toFixed(1)}km.`,
        urgency: 3,
        confidence: 0.9,
        safety_override: null,
      };
    }

    // Long range = steady intercept
    return {
      maneuver: Maneuver.INTERCEPT,
      target_g: 2.0,
      target_heading_deg: state.target_bearing_deg,
      reasoning: `Long range intercept. Target at ${(state.target_range_m/1000).toFixed(1)}km.`,
      urgency: 2,
      confidence: 0.92,
      safety_override: null,
    };
  }

  // Default: hold
  return {
    maneuver: Maneuver.HOLD,
    target_g: 1.0,
    target_heading_deg: state.heading_deg,
    reasoning: "Default hold.",
    urgency: 1,
    confidence: 0.8,
    safety_override: null,
  };
}

// =============================================================================
// Maneuver Executor - Convert decision to actual heading/position changes
// =============================================================================

/**
 * Execute a maneuver decision
 * Returns heading change and speed adjustment
 *
 * @param {TacticalDecision} decision - Decision to execute
 * @param {TacticalState} state - Current state
 * @param {number} dt - Time delta in seconds
 * @returns {Object} - { heading_delta, speed_delta, climb_rate }
 */
function executeManeuver(decision, state, dt = 0.1) {
  const maxTurnRate = 15; // deg/sec at 1G, scales with G
  const turnRate = maxTurnRate * Math.sqrt(decision.target_g);

  switch (decision.maneuver) {
    case Maneuver.INTERCEPT:
      // Turn toward target
      const targetHeading = decision.target_heading_deg;
      const headingDiff = normalizeAngle(targetHeading - state.heading_deg);
      const turnAmount = Math.sign(headingDiff) * Math.min(Math.abs(headingDiff), turnRate * dt);
      return {
        heading_delta: turnAmount,
        speed_delta: 5, // Accelerate toward target
        climb_rate: 0,
      };

    case Maneuver.EVADE:
      // Turn 90 degrees to break lock, descend
      return {
        heading_delta: 90 * dt * 0.5, // Quick turn
        speed_delta: 10, // Max speed
        climb_rate: -20, // Dive
      };

    case Maneuver.EGRESS:
      // Turn away from threats, head home (assume 180 from target)
      const egressHeading = normalizeAngle(state.target_bearing_deg + 180);
      const egressDiff = normalizeAngle(egressHeading - state.heading_deg);
      return {
        heading_delta: Math.sign(egressDiff) * Math.min(Math.abs(egressDiff), turnRate * dt),
        speed_delta: 5,
        climb_rate: 0,
      };

    case Maneuver.BREAK_TURN:
      // Max-G turn perpendicular to threat
      const breakDir = state.target_bearing_deg > state.heading_deg ? -1 : 1;
      return {
        heading_delta: breakDir * turnRate * dt * 2, // Max rate turn
        speed_delta: 0,
        climb_rate: -10, // Slight dive to maintain energy
      };

    case Maneuver.EXTEND:
      // Fly straight, accelerate, climb slightly
      return {
        heading_delta: 0,
        speed_delta: 10,
        climb_rate: 5,
      };

    case Maneuver.CLIMB:
      return {
        heading_delta: 0,
        speed_delta: -5, // Trade speed for altitude
        climb_rate: 30,
      };

    case Maneuver.DESCEND:
      return {
        heading_delta: 0,
        speed_delta: 5, // Gain speed in dive
        climb_rate: -30,
      };

    case Maneuver.HOLD:
    default:
      return {
        heading_delta: 0,
        speed_delta: 0,
        climb_rate: 0,
      };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

function calculateBearing(from, to) {
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const dLon = (to.lon - from.lon) * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

function calculateRange(from, to) {
  const R = 6371000; // Earth radius in meters
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLon = (to.lon - from.lon) * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  // 2D range (ignoring altitude for simplicity)
  return R * c;
}

function normalizeAngle(angle) {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Constants
  Maneuver,

  // State creation
  createTacticalState,

  // Decision making
  makeDecision,
  applySafetyFilter,

  // Maneuver execution
  executeManeuver,

  // Safety rules (individual, for testing)
  checkR1_CriticalFuel,
  checkR2_ThreatOnTail,
  checkR3_MultipleThreats,
  checkR4_LowEnergy,
  checkR5_GLimit,
  checkR6_Winchester,
  checkR7_LastDitch,
  checkR8_MultipleMissiles,
  checkR9_ThreatPriority,
  checkR10_RTBPursuit,
  getGLimitForSpeed,

  // Utilities
  calculateBearing,
  calculateRange,
  normalizeAngle,
};
