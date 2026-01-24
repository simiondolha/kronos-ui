import ms from "milsymbol";
import type { PlatformType, LinkStatus, WeaponsSafety } from "./protocol";

/**
 * MIL-STD-2525E Symbol Generation for KRONOS
 *
 * SIDC (Symbol Identification Code) structure for Air platforms:
 * Position 1-2: Version/Context (10 = Reality)
 * Position 3: Standard Identity (3=Friend, 6=Hostile, 1=Unknown, 4=Neutral)
 * Position 4-5: Symbol Set (01 = Air, 05 = Air Track)
 * Position 6-7: Status (0=Present)
 * Position 8-9: HQ/TF/Dummy (00 = None)
 * Position 10-15: Entity/Type/Subtype
 *
 * UAV Entity Codes (Air Symbol Set 01):
 * - 110701: Military Fixed Wing - Unmanned Aerial Vehicle (UAV)
 * - 110702: UAV - Attack/Strike
 * - 110703: UAV - Reconnaissance/Surveillance
 * - 110704: UAV - HALE (High Altitude Long Endurance)
 */

// Platform type to MIL-STD entity codes for UAVs
const PLATFORM_ENTITY_CODES: Record<PlatformType, string> = {
  STRIGOI: "110702", // UAV - Attack/Strike (Combat UCAV)
  CORVUS: "110703",  // UAV - Reconnaissance/Surveillance
  VULTUR: "110704",  // UAV - HALE (High Altitude Long Endurance ISR)
};

// Threat type to entity codes for hostile aircraft
const THREAT_ENTITY_CODES: Record<string, string> = {
  // Drones/UAVs
  SHAHED: "110701",    // Hostile UAV (generic)
  DRONE: "110701",     // Generic drone
  KAMIKAZE: "110702",  // Attack UAV
  UAS: "110701",       // Unmanned Aircraft System
  // Fixed Wing
  FIGHTER: "110100",   // Military Fixed Wing - Fighter
  BOMBER: "110200",    // Military Fixed Wing - Bomber
  ATTACK: "110300",    // Military Fixed Wing - Attack/Strike
  STEALTH: "110100",   // Stealth fighter
  // Rotary Wing
  HELICOPTER: "120100", // Military Rotary Wing
  HELO: "120100",      // Helicopter shorthand
  // Missiles
  CRUISE_MISSILE: "130100", // Missile
  MISSILE: "130100",   // Generic missile
  // Default
  UNKNOWN: "110000",   // Unknown air track
};

// Link status affects symbol rendering
const LINK_STATUS_MODIFIERS: Record<LinkStatus, { opacity: number; dashed: boolean }> = {
  CONNECTED: { opacity: 1.0, dashed: false },
  DEGRADED: { opacity: 0.7, dashed: true },
  LOST: { opacity: 0.4, dashed: true },
};

interface SymbolOptions {
  platformType: PlatformType;
  linkStatus: LinkStatus;
  weaponsSafety: WeaponsSafety;
  selected?: boolean;
  size?: number;
}

/**
 * Generate a MIL-STD-2525E symbol as a data URL.
 */
export function generateSymbol(options: SymbolOptions): string {
  const {
    platformType,
    linkStatus,
    weaponsSafety,
    selected = false,
    size = 35,
  } = options;

  // Build SIDC for friendly air platform
  const sidc = `10030000${PLATFORM_ENTITY_CODES[platformType]}`;

  const linkMod = LINK_STATUS_MODIFIERS[linkStatus];

  // Build milsymbol options - avoid undefined for optional properties
  const msOptions: ms.SymbolOptions = {
    size,
    frame: true,
    fill: true,
    strokeWidth: selected ? 4 : 2,
    outlineWidth: selected ? 2 : 0,
  };

  // Only set colorMode if ARMED
  if (weaponsSafety === "ARMED") {
    msOptions.colorMode = "Light";
  }

  // Only set outlineColor if selected
  if (selected) {
    msOptions.outlineColor = "#00BCD4";
  }

  // Create symbol with milsymbol
  const symbol = new ms.Symbol(sidc, msOptions);

  // Get SVG and apply link status opacity
  const svg = symbol.asSVG();

  // Modify SVG opacity for degraded/lost links
  if (linkMod.opacity < 1.0) {
    const modifiedSvg = svg.replace(
      "<svg",
      `<svg style="opacity: ${linkMod.opacity}"`
    );
    return `data:image/svg+xml;base64,${btoa(modifiedSvg)}`;
  }

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate a hostile/unknown track symbol with threat type specificity.
 */
export function generateTrackSymbol(
  classification: "HOSTILE" | "UNKNOWN" | "NEUTRAL" | "FRIENDLY",
  selected: boolean = false,
  size: number = 30,
  threatType?: string
): string {
  // Standard Identity codes
  const identityCode: Record<string, string> = {
    HOSTILE: "6",  // Hostile
    UNKNOWN: "1",  // Unknown
    NEUTRAL: "4",  // Neutral
    FRIENDLY: "3", // Friend
  };

  const identity = identityCode[classification] || "1";

  // Get threat-specific entity code or fall back to generic
  const entityCode = threatType
    ? THREAT_ENTITY_CODES[threatType.toUpperCase()] || THREAT_ENTITY_CODES.UNKNOWN
    : THREAT_ENTITY_CODES.UNKNOWN;

  // Build SIDC: Version(10) + Identity + SymbolSet(01) + Status(00) + HQ(00) + EntityCode
  const sidc = `10${identity}30000${entityCode}`;

  // Build options - avoid undefined
  const msOptions: ms.SymbolOptions = {
    size,
    frame: true,
    fill: true,
    strokeWidth: selected ? 4 : 2,
    outlineWidth: selected ? 2 : 0,
  };

  if (selected) {
    msOptions.outlineColor = "#00BCD4";
  }

  const symbol = new ms.Symbol(sidc, msOptions);

  return `data:image/svg+xml;base64,${btoa(symbol.asSVG())}`;
}

/**
 * Get symbol anchor point (center of symbol).
 */
export function getSymbolAnchor(size: number = 35): { x: number; y: number } {
  // milsymbol centers the symbol, so anchor is at center
  return {
    x: size / 2,
    y: size / 2,
  };
}

/**
 * Get color for platform status indicators.
 */
export function getStatusColor(linkStatus: LinkStatus): string {
  switch (linkStatus) {
    case "CONNECTED":
      return "var(--color-friendly)";
    case "DEGRADED":
      return "var(--color-warning)";
    case "LOST":
      return "var(--color-hostile)";
  }
}

/**
 * Get color for weapons safety state.
 */
export function getWeaponsColor(safety: WeaponsSafety): string {
  switch (safety) {
    case "SAFE":
      return "var(--color-friendly)";
    case "ARMED":
      return "var(--color-hostile)";
  }
}
