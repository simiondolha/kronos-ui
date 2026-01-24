import { z } from "zod";

// ============================================================================
// PROTOCOL VERSION
// ============================================================================
export const PROTOCOL_VERSION = "1.0.0" as const;

// ============================================================================
// ID TYPES (newtype wrappers serialize as UUID strings)
// ============================================================================
export type EntityId = string;
export type TrackId = string;
export type MissionId = string;
export type RequestId = string;

// ============================================================================
// ENUMS (match Rust SCREAMING_SNAKE_CASE)
// ============================================================================

export const PlatformType = {
  STRIGOI: "STRIGOI",
  CORVUS: "CORVUS",
  VULTUR: "VULTUR",
} as const;
export type PlatformType = (typeof PlatformType)[keyof typeof PlatformType];

export const FlightPhase = {
  PARKED: "PARKED",
  STARTUP: "STARTUP",
  PREFLIGHT: "PREFLIGHT",
  TAXI: "TAXI",
  TAKEOFF: "TAKEOFF",
  TAKEOFF_ROLL: "TAKEOFF_ROLL",
  AIRBORNE_CLIMB: "AIRBORNE_CLIMB",
  AIRBORNE_CRUISE: "AIRBORNE_CRUISE",
  AIRBORNE_DESCENT: "AIRBORNE_DESCENT",
  CLIMBING: "CLIMBING",
  CRUISE: "CRUISE",
  DESCENDING: "DESCENDING",
  ON_STATION: "ON_STATION",
  APPROACH: "APPROACH",
  LANDING: "LANDING",
  TAXI_IN: "TAXI_IN",
  COMBAT_MANEUVERING: "COMBAT_MANEUVERING",
  EMERGENCY: "EMERGENCY",
} as const;
export type FlightPhase = (typeof FlightPhase)[keyof typeof FlightPhase];

export const OperationalStatus = {
  READY: "READY",
  MISSION_ACTIVE: "MISSION_ACTIVE",
  RETURNING: "RETURNING",
  MAINTENANCE: "MAINTENANCE",
  DAMAGED: "DAMAGED",
  LOST: "LOST",
} as const;
export type OperationalStatus = (typeof OperationalStatus)[keyof typeof OperationalStatus];

export const LinkStatus = {
  CONNECTED: "CONNECTED",
  DEGRADED: "DEGRADED",
  LOST: "LOST",
} as const;
export type LinkStatus = (typeof LinkStatus)[keyof typeof LinkStatus];

export const WeaponsSafety = {
  SAFE: "SAFE",
  ARMED: "ARMED",
} as const;
export type WeaponsSafety = (typeof WeaponsSafety)[keyof typeof WeaponsSafety];

export const WeaponType = {
  "AAM-1": "AAM-1",
  "AAM-2": "AAM-2",
  "AAM-3": "AAM-3",
  "AAM-4": "AAM-4",
  PGM_X: "PGM_X",
  SDB_SIM: "SDB_SIM",
} as const;
export type WeaponType = (typeof WeaponType)[keyof typeof WeaponType];

export const SensorMode = {
  OFF: "OFF",
  STANDBY: "STANDBY",
  SEARCH: "SEARCH",
  TRACK: "TRACK",
  TARGET_ILLUMINATION: "TARGET_ILLUMINATION",
  TWS: "TWS",
} as const;
export type SensorMode = (typeof SensorMode)[keyof typeof SensorMode];

export const ActionCategory = {
  NAVIGATION: "NAVIGATION",
  SENSOR_ACTIVE: "SENSOR_ACTIVE",
  DEFENSIVE_COUNTERMEASURES: "DEFENSIVE_COUNTERMEASURES",
  TRACK_REPORT: "TRACK_REPORT",
  WEAPONS_SAFE: "WEAPONS_SAFE",
  WEAPONS_ARM: "WEAPONS_ARM",
  SIMULATED_WEAPONS_RELEASE: "SIMULATED_WEAPONS_RELEASE",
  ABORT_MISSION: "ABORT_MISSION",
  CROSS_BOUNDARY: "CROSS_BOUNDARY",
} as const;
export type ActionCategory = (typeof ActionCategory)[keyof typeof ActionCategory];

export const RiskLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const AuthDecision = {
  APPROVED: "APPROVED",
  DENIED: "DENIED",
  PENDING: "PENDING",
  CANCELLED: "CANCELLED",
} as const;
export type AuthDecision = (typeof AuthDecision)[keyof typeof AuthDecision];

export const TrackClassification = {
  UNKNOWN: "UNKNOWN",
  PENDING: "PENDING",
  FRIENDLY: "FRIENDLY",
  NEUTRAL: "NEUTRAL",
  HOSTILE: "HOSTILE",
  CIVILIAN: "CIVILIAN",
  SUSPECT: "SUSPECT",
} as const;
export type TrackClassification = (typeof TrackClassification)[keyof typeof TrackClassification];

export const ThreatType = {
  FIGHTER: "FIGHTER",
  BOMBER: "BOMBER",
  TRANSPORT: "TRANSPORT",
  SAM_SITE: "SAM_SITE",
  AAA: "AAA",
  SHIP: "SHIP",
  GROUND: "GROUND",
} as const;
export type ThreatType = (typeof ThreatType)[keyof typeof ThreatType];

export const Severity = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

export const MissionState = {
  DRAFT: "DRAFT",
  VALIDATING: "VALIDATING",
  APPROVED: "APPROVED",
  SCHEDULED: "SCHEDULED",
  BRIEFING: "BRIEFING",
  PREFLIGHT: "PREFLIGHT",
  READY: "READY",
  LAUNCHING: "LAUNCHING",
  AIRBORNE: "AIRBORNE",
  ON_STATION: "ON_STATION",
  EXECUTING: "EXECUTING",
  EGRESSING: "EGRESSING",
  RECOVERING: "RECOVERING",
  COMPLETE: "COMPLETE",
  ABORTED: "ABORTED",
  EMERGENCY: "EMERGENCY",
  ARCHIVED: "ARCHIVED",
} as const;
export type MissionState = (typeof MissionState)[keyof typeof MissionState];

// ============================================================================
// HELPER STRUCTS
// ============================================================================

export interface PositionPayload {
  lat: number;
  lon: number;
  alt_m: number;
}

export interface AttitudePayload {
  roll_deg: number;
  pitch_deg: number;
  yaw_deg: number;
}

export interface VelocityPayload {
  speed_mps: number;
  heading_deg: number;
  climb_rate_mps: number;
}

export interface WeaponsState {
  simulated: boolean; // Always true for training
  safety: WeaponsSafety;
  inventory: WeaponType[];
}

// ============================================================================
// MESSAGE ENVELOPE
// ============================================================================

export interface MessageEnvelope<T> {
  schema_version: string;
  timestamp_utc: string; // ISO8601
  sim_time_utc: string; // ISO8601
  sim_tick: number;
  seq: number;
  source_system: string;
  correlation_id?: string; // UUID, optional
  time_scale: number;
  payload: T;
}

// ============================================================================
// OUTBOUND PAYLOADS (Rust → UI)
// Uses internally tagged enum with "type" field
// ============================================================================

export interface EntityUpdatePayload {
  type: "ENTITY_UPDATE";
  delta: boolean;
  entity_id: EntityId;
  platform_type: PlatformType;
  callsign: string;
  home_base?: string;  // ICAO code: "MK", "CT", "FT"
  position: PositionPayload;
  attitude: AttitudePayload;
  velocity: VelocityPayload;
  flight_phase: FlightPhase;
  operational_status: OperationalStatus;
  fuel_percent: number;
  link_status: LinkStatus;
  weapons_state: WeaponsState;
  sensor_active: boolean;
  sensor_mode: SensorMode;
}

export interface TrackUpdatePayload {
  type: "TRACK_UPDATE";
  track_id: TrackId;
  callsign: string;
  affiliation: "HOSTILE" | "UNKNOWN" | "NEUTRAL" | "FRIENDLY";
  position: PositionPayload;
  velocity: VelocityPayload;
  destroyed: boolean;
  // Legacy fields (optional)
  classification?: TrackClassification;
  confidence?: number;
  threat_type?: ThreatType;
  detected_by?: EntityId[];
}

export interface MissionStatusPayload {
  type: "MISSION_STATUS";
  mission_id: MissionId;
  mission_type: string;
  state: MissionState;
  assigned_assets: EntityId[];
  objectives_complete: number;
  objectives_total: number;
  time_remaining_sec?: number;
}

export interface AlertPayload {
  type: "ALERT";
  alert_id: string;
  priority: Severity;
  category: string;
  title: string;
  message: string;
  requires_action: boolean;
  timeout_sec?: number;
}

export interface AuthRequestPayload {
  type: "AUTH_REQUEST";
  request_id: RequestId;
  entity_id: EntityId;
  action_type: ActionCategory;
  target_id?: TrackId;
  confidence: number;
  risk_estimate: RiskLevel;
  collateral_risk: RiskLevel;
  rationale: string;
  timeout_sec: number;
}

export interface MissionEventPayload {
  type: "MISSION_EVENT";
  event_type: string;
  text?: string;
  severity?: Severity;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommended_action?: string;
}

export interface SafeModePayload {
  type: "SAFE_MODE_ACTIVE";
  reason: string;
  can_resume: boolean;
}

export interface HeartbeatPayload {
  type: "HEARTBEAT";
  seq: number;
}

// Demo-specific outbound payloads
export interface MissileUpdatePayload {
  type: "MISSILE_UPDATE";
  missile_id: string;
  shooter_id: string;
  target_id: string;
  position: PositionPayload;
  heading_deg: number;
  active: boolean;
}

export interface PhaseChangePayload {
  type: "PHASE_CHANGE";
  phase: "IDLE" | "BRIEFING" | "PATROL" | "DETECTION" | "AUTH_PENDING" | "ENGAGING" | "COMPLETE" | "FAILED";
  previous_phase?: string;
}

export interface WeaponsStatusChangePayload {
  type: "WEAPONS_STATUS_CHANGE";
  status: "SAFE" | "ARMED";
  reason?: string;
}

export interface MissionCompletePayload {
  type: "MISSION_COMPLETE";
  outcome: "SUCCESS" | "FAILED";
  summary?: string;
}

export interface DemoStatePayload {
  type: "DEMO_STATE";
  phase: "IDLE" | "BRIEFING" | "PATROL" | "DETECTION" | "AUTH_PENDING" | "ENGAGING" | "COMPLETE" | "FAILED";
}

export interface DemoResetPayload {
  type: "DEMO_RESET";
}

export interface AiModeChangedPayload {
  type: "AI_MODE_CHANGED";
  enabled: boolean;
}

export type OutboundPayload =
  | EntityUpdatePayload
  | TrackUpdatePayload
  | MissionStatusPayload
  | AlertPayload
  | AuthRequestPayload
  | MissionEventPayload
  | SafeModePayload
  | HeartbeatPayload
  // Demo-specific
  | MissileUpdatePayload
  | PhaseChangePayload
  | WeaponsStatusChangePayload
  | MissionCompletePayload
  | DemoStatePayload
  | DemoResetPayload
  | AiModeChangedPayload;

export type OutboundMessage = MessageEnvelope<OutboundPayload>;

// ============================================================================
// INBOUND PAYLOADS (UI → Rust)
// Uses internally tagged enum with "type" field
// ============================================================================

export interface AuthResponsePayload {
  type: "AUTH_RESPONSE";
  request_id: RequestId;
  decision: AuthDecision;
  rationale?: string;
  conditions: string[];
}

export interface CommandPayload {
  type: "COMMAND";
  command_id: string;
  command_type: string;
  parameters: unknown;
}

export interface AckPayload {
  type: "ACK";
  seq: number;
}

export interface NackPayload {
  type: "NACK";
  seq: number;
  error: string;
  details?: string;
}

export interface HeartbeatAckPayload {
  type: "HEARTBEAT_ACK";
  seq: number;
}

// InstructorControl uses "command" tag (not "type")
export type InstructorControlPayload =
  | { type: "INSTRUCTOR_CONTROL"; command: "PAUSE" }
  | { type: "INSTRUCTOR_CONTROL"; command: "RESUME" }
  | { type: "INSTRUCTOR_CONTROL"; command: "STEP" }
  | { type: "INSTRUCTOR_CONTROL"; command: "STEP_N"; count: number }
  | { type: "INSTRUCTOR_CONTROL"; command: "SET_TIME_SCALE"; scale: number }
  | { type: "INSTRUCTOR_CONTROL"; command: "REWIND"; seconds: number }
  | { type: "INSTRUCTOR_CONTROL"; command: "KILL_SWITCH" }
  | { type: "INSTRUCTOR_CONTROL"; command: "RESUME_FROM_SAFE_MODE" }
  | { type: "INSTRUCTOR_CONTROL"; command: "INJECT_EVENT"; event: unknown };

// Demo control payloads
export interface StartDemoPayload {
  type: "START_DEMO";
}

export interface RestartDemoPayload {
  type: "RESTART_DEMO";
}

export interface SetAiModePayload {
  type: "SET_AI_MODE";
  enabled: boolean;
}

export type InboundPayload =
  | AuthResponsePayload
  | CommandPayload
  | AckPayload
  | NackPayload
  | HeartbeatAckPayload
  | InstructorControlPayload
  | StartDemoPayload
  | RestartDemoPayload
  | SetAiModePayload;

export type InboundMessage = MessageEnvelope<InboundPayload>;

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const PlatformTypeSchema = z.enum(["STRIGOI", "CORVUS", "VULTUR"]);

export const FlightPhaseSchema = z.enum([
  "PARKED", "STARTUP", "PREFLIGHT", "TAXI", "TAKEOFF", "TAKEOFF_ROLL",
  "AIRBORNE_CLIMB", "AIRBORNE_CRUISE", "AIRBORNE_DESCENT", "CLIMBING",
  "CRUISE", "DESCENDING", "ON_STATION", "APPROACH", "LANDING", "TAXI_IN",
  "COMBAT_MANEUVERING", "EMERGENCY",
]);

export const OperationalStatusSchema = z.enum([
  "READY", "MISSION_ACTIVE", "RETURNING", "MAINTENANCE", "DAMAGED", "LOST",
]);

export const LinkStatusSchema = z.enum(["CONNECTED", "DEGRADED", "LOST"]);

export const WeaponsSafetySchema = z.enum(["SAFE", "ARMED"]);

export const WeaponTypeSchema = z.enum(["AAM-1", "AAM-2", "AAM-3", "AAM-4", "PGM_X", "SDB_SIM"]);

export const SensorModeSchema = z.enum([
  "OFF", "STANDBY", "SEARCH", "TRACK", "TARGET_ILLUMINATION", "TWS",
]);

export const ActionCategorySchema = z.enum([
  "NAVIGATION", "SENSOR_ACTIVE", "DEFENSIVE_COUNTERMEASURES", "TRACK_REPORT",
  "WEAPONS_SAFE", "WEAPONS_ARM", "SIMULATED_WEAPONS_RELEASE", "ABORT_MISSION",
  "CROSS_BOUNDARY",
]);

export const RiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const AuthDecisionSchema = z.enum(["APPROVED", "DENIED", "PENDING", "CANCELLED"]);

export const TrackClassificationSchema = z.enum([
  "UNKNOWN", "PENDING", "FRIENDLY", "NEUTRAL", "HOSTILE", "CIVILIAN", "SUSPECT",
]);

export const ThreatTypeSchema = z.enum([
  "FIGHTER", "BOMBER", "TRANSPORT", "SAM_SITE", "AAA", "SHIP", "GROUND",
]);

export const SeveritySchema = z.enum(["DEBUG", "INFO", "WARNING", "CRITICAL"]);

export const MissionStateSchema = z.enum([
  "DRAFT", "VALIDATING", "APPROVED", "SCHEDULED", "BRIEFING", "PREFLIGHT",
  "READY", "LAUNCHING", "AIRBORNE", "ON_STATION", "EXECUTING", "EGRESSING",
  "RECOVERING", "COMPLETE", "ABORTED", "EMERGENCY", "ARCHIVED",
]);

// Helper struct schemas
export const PositionPayloadSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  alt_m: z.number(),
});

export const AttitudePayloadSchema = z.object({
  roll_deg: z.number(),
  pitch_deg: z.number(),
  yaw_deg: z.number(),
});

export const VelocityPayloadSchema = z.object({
  speed_mps: z.number().min(0),
  heading_deg: z.number().min(0).max(360),
  climb_rate_mps: z.number(),
});

export const WeaponsStateSchema = z.object({
  simulated: z.boolean(),
  safety: WeaponsSafetySchema,
  inventory: z.array(WeaponTypeSchema),
});

// Outbound payload schemas
export const EntityUpdatePayloadSchema = z.object({
  type: z.literal("ENTITY_UPDATE"),
  delta: z.boolean(),
  entity_id: z.string().min(1),  // Accept any non-empty string (not just UUID)
  platform_type: PlatformTypeSchema,
  callsign: z.string(),
  home_base: z.string().optional(),  // ICAO code: "MK", "CT", "FT"
  position: PositionPayloadSchema,
  attitude: AttitudePayloadSchema,
  velocity: VelocityPayloadSchema,
  flight_phase: FlightPhaseSchema,
  operational_status: OperationalStatusSchema,
  fuel_percent: z.number().min(0).max(100),
  link_status: LinkStatusSchema,
  weapons_state: WeaponsStateSchema,
  sensor_active: z.boolean(),
  sensor_mode: SensorModeSchema,
}).passthrough();  // Allow extra fields like g_load, last_decision

export const TrackUpdatePayloadSchema = z.object({
  type: z.literal("TRACK_UPDATE"),
  track_id: z.string(),
  callsign: z.string(),
  affiliation: z.enum(["HOSTILE", "UNKNOWN", "NEUTRAL", "FRIENDLY"]),
  position: PositionPayloadSchema,
  velocity: VelocityPayloadSchema,
  destroyed: z.boolean(),
  // Legacy fields (optional for backward compatibility)
  classification: TrackClassificationSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  threat_type: ThreatTypeSchema.optional(),
  detected_by: z.array(z.string()).optional(),
});

export const MissionStatusPayloadSchema = z.object({
  type: z.literal("MISSION_STATUS"),
  mission_id: z.string().uuid(),
  mission_type: z.string(),
  state: MissionStateSchema,
  assigned_assets: z.array(z.string().uuid()),
  objectives_complete: z.number().int().nonnegative(),
  objectives_total: z.number().int().nonnegative(),
  time_remaining_sec: z.number().int().nonnegative().optional(),
});

export const AlertPayloadSchema = z.object({
  type: z.literal("ALERT"),
  alert_id: z.string().uuid(),
  priority: SeveritySchema,
  category: z.string(),
  title: z.string(),
  message: z.string(),
  requires_action: z.boolean(),
  timeout_sec: z.number().int().nonnegative().optional(),
});

export const AuthRequestPayloadSchema = z.object({
  type: z.literal("AUTH_REQUEST"),
  request_id: z.string().min(1),  // Accept any non-empty string
  entity_id: z.string().min(1),   // Accept any non-empty string
  action_type: ActionCategorySchema,
  target_id: z.string().optional(),  // Accept any string
  confidence: z.number().min(0).max(1),
  risk_estimate: RiskLevelSchema,
  collateral_risk: RiskLevelSchema,
  rationale: z.string(),
  timeout_sec: z.number().int().nonnegative(),
});

export const MissionEventPayloadSchema = z.object({
  type: z.literal("MISSION_EVENT"),
  event_type: z.string(),
  text: z.string().optional(),
  severity: SeveritySchema.optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  recommended_action: z.string().optional(),
});

export const SafeModePayloadSchema = z.object({
  type: z.literal("SAFE_MODE_ACTIVE"),
  reason: z.string(),
  can_resume: z.boolean(),
});

export const HeartbeatPayloadSchema = z.object({
  type: z.literal("HEARTBEAT"),
  seq: z.number().int().nonnegative(),
});

// Demo-specific payloads
export const MissileUpdatePayloadSchema = z.object({
  type: z.literal("MISSILE_UPDATE"),
  missile_id: z.string(),
  shooter_id: z.string(),
  target_id: z.string(),
  position: PositionPayloadSchema,
  heading_deg: z.number(),
  active: z.boolean(),
});

export const PhaseChangePayloadSchema = z.object({
  type: z.literal("PHASE_CHANGE"),
  phase: z.enum(["IDLE", "BRIEFING", "PATROL", "DETECTION", "AUTH_PENDING", "ENGAGING", "COMPLETE", "FAILED"]),
  previous_phase: z.string().optional(),
});

export const WeaponsStatusChangePayloadSchema = z.object({
  type: z.literal("WEAPONS_STATUS_CHANGE"),
  status: z.enum(["SAFE", "ARMED"]),
  reason: z.string().optional(),  // Optional to match interface
});

export const MissionCompletePayloadSchema = z.object({
  type: z.literal("MISSION_COMPLETE"),
  outcome: z.enum(["SUCCESS", "FAILED"]),
  threats_neutralized: z.number().int().nonnegative().optional(),
  friendly_losses: z.number().int().nonnegative().optional(),
  events: z.array(z.unknown()).optional(),
  reason: z.string().optional(),
});

export const DemoStatePayloadSchema = z.object({
  type: z.literal("DEMO_STATE"),
  phase: z.enum(["IDLE", "BRIEFING", "PATROL", "DETECTION", "AUTH_PENDING", "ENGAGING", "COMPLETE", "FAILED"]),
  events: z.array(z.unknown()).optional(),
});

export const DemoResetPayloadSchema = z.object({
  type: z.literal("DEMO_RESET"),
});

export const AuthTimeoutPayloadSchema = z.object({
  type: z.literal("AUTH_TIMEOUT"),
  request_id: z.string(),
});

export const AiModeChangedPayloadSchema = z.object({
  type: z.literal("AI_MODE_CHANGED"),
  enabled: z.boolean(),
});

export const OutboundPayloadSchema = z.discriminatedUnion("type", [
  EntityUpdatePayloadSchema,
  TrackUpdatePayloadSchema,
  MissionStatusPayloadSchema,
  AlertPayloadSchema,
  AuthRequestPayloadSchema,
  MissionEventPayloadSchema,
  SafeModePayloadSchema,
  HeartbeatPayloadSchema,
  // Demo-specific
  MissileUpdatePayloadSchema,
  PhaseChangePayloadSchema,
  WeaponsStatusChangePayloadSchema,
  MissionCompletePayloadSchema,
  DemoStatePayloadSchema,
  DemoResetPayloadSchema,
  AuthTimeoutPayloadSchema,
  AiModeChangedPayloadSchema,
]);

export const MessageEnvelopeSchema = <T extends z.ZodTypeAny>(payloadSchema: T) =>
  z.object({
    schema_version: z.string(),
    timestamp_utc: z.string().datetime(),
    sim_time_utc: z.string().datetime(),
    sim_tick: z.number().int().nonnegative(),
    seq: z.number().int().nonnegative(),
    source_system: z.string().min(1),
    correlation_id: z.string().uuid().optional(),
    time_scale: z.number().positive(),
    payload: payloadSchema,
  });

export const OutboundMessageSchema = MessageEnvelopeSchema(OutboundPayloadSchema);

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function validateOutboundMessage(data: unknown): {
  success: true;
  data: OutboundMessage;
} | {
  success: false;
  error: z.ZodError;
} {
  const result = OutboundMessageSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as OutboundMessage };
  }
  return { success: false, error: result.error };
}

export function createInboundMessage<T extends InboundPayload>(
  payload: T,
  options: {
    simTimeUtc: string;
    simTick: number;
    timeScale: number;
    seq: number;
    sourceSystem: string;
    correlationId?: string;
  }
): MessageEnvelope<T> {
  const envelope: MessageEnvelope<T> = {
    schema_version: PROTOCOL_VERSION,
    timestamp_utc: new Date().toISOString(),
    sim_time_utc: options.simTimeUtc,
    sim_tick: options.simTick,
    time_scale: options.timeScale,
    seq: options.seq,
    source_system: options.sourceSystem,
    payload,
  };
  if (options.correlationId !== undefined) {
    envelope.correlation_id = options.correlationId;
  }
  return envelope;
}

// ============================================================================
// MESSAGE SIZE CONSTANTS
// ============================================================================

export const MAX_MESSAGE_SIZE_BYTES = 64 * 1024; // 64KB

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Create an AUTH_RESPONSE for timeout (use CANCELLED decision) */
export function createTimeoutResponse(
  requestId: RequestId,
  options: {
    simTimeUtc: string;
    simTick: number;
    timeScale: number;
    seq: number;
  }
): InboundMessage {
  return createInboundMessage(
    {
      type: "AUTH_RESPONSE",
      request_id: requestId,
      decision: "CANCELLED",
      rationale: "Operator timeout - request expired",
      conditions: [],
    },
    {
      ...options,
      sourceSystem: "kronos-ui",
    }
  );
}

/** Create a HEARTBEAT_ACK response */
export function createHeartbeatAck(
  seq: number,
  options: {
    simTimeUtc: string;
    simTick: number;
    timeScale: number;
  }
): InboundMessage {
  return createInboundMessage(
    {
      type: "HEARTBEAT_ACK",
      seq,
    },
    {
      ...options,
      seq,
      sourceSystem: "kronos-ui",
    }
  );
}
