/**
 * KRONOS Tactical Platform Configuration
 * Centralized "Truth" for UI metrics, timing, and cinematic parameters.
 */

export const KRONOS_CONFIG = {
  UI: {
    GLASS_OPACITY: 0.4,
    BLUR_STRENGTH: "12px",
    BORDER_OPACITY: 0.1,
    GLOW_SPREAD: "8px",
    ACCENT_COLOR: "#00BCD4",
    HOSTILE_COLOR: "#FF4444",
    FRIENDLY_COLOR: "#00E676",
    HUD_Z_INDEX: 50,
  },
  RADAR: {
    DEFAULT_RANGE_KM: 400,
    SWEEP_DURATION_MS: 4000,
    PHOSPHOR_PERSISTENCE: 0.8, // 0 to 1
    PING_RADIUS: 15,
  },
  CINEMATIC: {
    BRIEFING_CAMERA_DURATION: 2.5,
    SEQUENCE_STEP_DELAY: 400,
    OVERLAY_FADE_MS: 800,
  },
  SYSTEM: {
    MAX_ENTITIES: 20,
    TICK_RATE_HZ: 20,
    HEARTBEAT_INTERVAL_MS: 1000,
    MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB
  }
};
