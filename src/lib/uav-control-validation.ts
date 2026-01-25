/**
 * UAV Control Validation
 *
 * Platform-specific performance limits and command validation
 * for the UAV control panel.
 */

import type {
  PlatformType,
  SensorType,
  UAVControlPayload,
  // EntityId, // Unused for now
} from "./protocol";

// ============================================================================
// PLATFORM PERFORMANCE LIMITS
// ============================================================================

export interface PlatformLimits {
  /** Maximum altitude in meters (ceiling) */
  ceiling_m: number;
  /** Maximum speed in m/s */
  max_speed_mps: number;
  /** Stall speed in m/s */
  stall_speed_mps: number;
  /** Cruise speed in m/s */
  cruise_speed_mps: number;
  /** Maximum climb rate in m/s */
  max_climb_mps: number;
  /** Maximum descent rate in m/s */
  max_descent_mps: number;
  /** Maximum turn rate in deg/s */
  max_turn_rate_dps: number;
  /** Maximum G-load */
  max_g: number;
  /** Whether platform has weapons capability */
  weapons_capable: boolean;
  /** Available sensor types */
  sensors: SensorType[];
  /** Typical endurance in hours */
  endurance_hr: number;
}

/** STRIGOI - Combat UCAV */
export const STRIGOI_LIMITS: PlatformLimits = {
  ceiling_m: 15000,
  max_speed_mps: 323, // Mach 0.95 at sea level
  stall_speed_mps: 62, // 120 knots
  cruise_speed_mps: 250, // 900 km/h
  max_climb_mps: 150,
  max_descent_mps: 100,
  max_turn_rate_dps: 20,
  max_g: 9,
  weapons_capable: true,
  sensors: ["AESA_RADAR", "EO_IR", "RWR", "IFF"],
  endurance_hr: 5,
};

/** CORVUS - Tactical Reconnaissance UAV */
export const CORVUS_LIMITS: PlatformLimits = {
  ceiling_m: 8000,
  max_speed_mps: 78, // 280 km/h
  stall_speed_mps: 23, // 45 knots
  cruise_speed_mps: 56, // 200 km/h
  max_climb_mps: 10,
  max_descent_mps: 15,
  max_turn_rate_dps: 6,
  max_g: 3,
  weapons_capable: false,
  sensors: ["EO_IR", "LIDAR", "SIGINT"],
  endurance_hr: 11,
};

/** VULTUR - HALE ISR Platform */
export const VULTUR_LIMITS: PlatformLimits = {
  ceiling_m: 12500,
  max_speed_mps: 56, // 200 km/h
  stall_speed_mps: 21, // 40 knots
  cruise_speed_mps: 42, // 150 km/h
  max_climb_mps: 5,
  max_descent_mps: 8,
  max_turn_rate_dps: 3,
  max_g: 1.5,
  weapons_capable: false,
  sensors: ["SAR", "EO_IR", "SIGINT", "SATCOM_RELAY"],
  endurance_hr: 24,
};

/**
 * Get performance limits for a platform type
 */
export function getPlatformLimits(platform: PlatformType): PlatformLimits {
  switch (platform) {
    case "STRIGOI":
      return STRIGOI_LIMITS;
    case "CORVUS":
      return CORVUS_LIMITS;
    case "VULTUR":
      return VULTUR_LIMITS;
    default:
      // Fallback to most restrictive (VULTUR)
      return VULTUR_LIMITS;
  }
}

// ============================================================================
// COMMAND VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  clamped_value?: number;
}

/**
 * Clamp a value to platform limits
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Validate and optionally clamp altitude command
 */
export function validateAltitude(
  altitude_m: number,
  platform: PlatformType
): ValidationResult {
  const limits = getPlatformLimits(platform);

  if (altitude_m < 0) {
    return { valid: false, error: "Altitude cannot be negative" };
  }

  if (altitude_m > limits.ceiling_m) {
    return {
      valid: true,
      clamped_value: limits.ceiling_m,
      error: `Clamped to ceiling: ${limits.ceiling_m}m`,
    };
  }

  return { valid: true };
}

/**
 * Validate and optionally clamp speed command
 */
export function validateSpeed(
  speed_mps: number,
  platform: PlatformType
): ValidationResult {
  const limits = getPlatformLimits(platform);

  if (speed_mps < limits.stall_speed_mps) {
    return {
      valid: true,
      clamped_value: limits.stall_speed_mps,
      error: `Below stall speed, clamped to ${limits.stall_speed_mps} m/s`,
    };
  }

  if (speed_mps > limits.max_speed_mps) {
    return {
      valid: true,
      clamped_value: limits.max_speed_mps,
      error: `Above max speed, clamped to ${limits.max_speed_mps} m/s`,
    };
  }

  return { valid: true };
}

/**
 * Validate heading (normalize to 0-360)
 */
export function validateHeading(heading_deg: number): ValidationResult {
  // Normalize heading to 0-360
  let normalized = heading_deg % 360;
  if (normalized < 0) normalized += 360;

  if (normalized !== heading_deg) {
    return { valid: true, clamped_value: normalized };
  }

  return { valid: true };
}

/**
 * Validate sensor is available on platform
 */
export function validateSensorType(
  sensor_type: SensorType,
  platform: PlatformType
): ValidationResult {
  const limits = getPlatformLimits(platform);

  if (!limits.sensors.includes(sensor_type)) {
    return {
      valid: false,
      error: `Sensor ${sensor_type} not available on ${platform}`,
    };
  }

  return { valid: true };
}

/**
 * Validate gimbal angles
 */
export function validateGimbal(
  azimuth_deg: number,
  elevation_deg: number,
  sensor_type: SensorType
): ValidationResult {
  // Default gimbal limits (most sensors)
  let az_min = -180,
    az_max = 180;
  let el_min = -90,
    el_max = 30;

  // SATCOM relay has limited gimbal
  if (sensor_type === "SATCOM_RELAY") {
    az_min = -30;
    az_max = 30;
    el_min = 30;
    el_max = 90; // Points up
  }

  const clamped_az = clamp(azimuth_deg, az_min, az_max);
  const clamped_el = clamp(elevation_deg, el_min, el_max);

  if (clamped_az !== azimuth_deg || clamped_el !== elevation_deg) {
    return {
      valid: true,
      error: `Gimbal angles clamped to limits`,
    };
  }

  return { valid: true };
}

/**
 * Validate weapons commands (STRIGOI only)
 */
export function validateWeaponsCommand(
  platform: PlatformType
): ValidationResult {
  const limits = getPlatformLimits(platform);

  if (!limits.weapons_capable) {
    return {
      valid: false,
      error: `${platform} is not weapons capable`,
    };
  }

  return { valid: true };
}

/**
 * Full UAV control command validation
 */
export function validateUAVCommand(
  command: UAVControlPayload,
  platform: PlatformType
): ValidationResult {
  switch (command.command) {
    case "SET_ALTITUDE":
      return validateAltitude(command.altitude_m, platform);

    case "SET_SPEED":
      return validateSpeed(command.speed_mps, platform);

    case "SET_HEADING":
      return validateHeading(command.heading_deg);

    case "SET_SENSOR_MODE":
      return validateSensorType(command.sensor_type, platform);

    case "SET_GIMBAL":
      const sensorCheck = validateSensorType(command.sensor_type, platform);
      if (!sensorCheck.valid) return sensorCheck;
      return validateGimbal(
        command.azimuth_deg,
        command.elevation_deg,
        command.sensor_type
      );

    case "REQUEST_MASTER_ARM":
    case "SELECT_STATION":
      return validateWeaponsCommand(platform);

    case "START_RECORDING":
    case "STOP_RECORDING":
      return validateSensorType(command.sensor_type, platform);

    default:
      return { valid: true };
  }
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Format speed for display (m/s to knots)
 */
export function formatSpeedKnots(speed_mps: number): string {
  const knots = speed_mps * 1.94384;
  return `${Math.round(knots)} KT`;
}

/**
 * Format speed for display (m/s to km/h)
 */
export function formatSpeedKmh(speed_mps: number): string {
  const kmh = speed_mps * 3.6;
  return `${Math.round(kmh)} km/h`;
}

/**
 * Format altitude for display (flight level or meters)
 */
export function formatAltitude(alt_m: number): string {
  if (alt_m >= 1000) {
    // Flight level (hundreds of feet)
    const fl = Math.round((alt_m * 3.28084) / 100);
    return `FL${fl.toString().padStart(3, "0")}`;
  }
  return `${Math.round(alt_m)}m`;
}

/**
 * Format fuel percentage with status color
 */
export function getFuelStatusColor(percent: number): string {
  if (percent <= 10) return "var(--color-hostile)"; // Emergency
  if (percent <= 20) return "var(--color-warning)"; // Bingo
  if (percent <= 35) return "#FFD700"; // Low (gold)
  return "var(--color-friendly)"; // OK
}

/**
 * Get sensor display name
 */
export function getSensorDisplayName(sensor: SensorType): string {
  const names: Record<SensorType, string> = {
    AESA_RADAR: "AESA Radar",
    EO_IR: "EO/IR",
    RWR: "RWR",
    SAR: "SAR",
    SIGINT: "SIGINT",
    LIDAR: "LiDAR",
    SATCOM_RELAY: "SATCOM",
    IFF: "IFF",
  };
  return names[sensor] || sensor;
}

/**
 * Get platform display name
 */
export function getPlatformDisplayName(platform: PlatformType): string {
  const names: Record<PlatformType, string> = {
    STRIGOI: "STRIGOI (Combat UCAV)",
    CORVUS: "CORVUS (Tactical Recon)",
    VULTUR: "VULTUR (HALE ISR)",
  };
  return names[platform] || platform;
}
