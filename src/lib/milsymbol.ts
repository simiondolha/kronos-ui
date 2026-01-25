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

// 3D Model paths for Cesium ModelGraphics
export const PLATFORM_3D_MODELS: Record<PlatformType, string> = {
  STRIGOI: "/models/strigoi.glb",
  CORVUS: "/models/corvus.glb",
  VULTUR: "/models/vultur.glb",
};

// 3D Model paths for tracks/threats
export const THREAT_3D_MODELS: Record<string, string> = {
  FIGHTER: "/models/hostile-fighter.glb",
  HOSTILE: "/models/hostile-fighter.glb",
  SHAHED: "/models/shahed-136.glb",
  DRONE: "/models/shahed-136.glb",
  KAMIKAZE: "/models/shahed-136.glb",
  HELICOPTER: "/models/helicopter.glb",
  MISSILE: "/models/missile.glb",
  UNKNOWN: "/models/fighter.glb",
};

// Silhouette colors for 3D model visibility
export const MODEL_SILHOUETTE_COLORS = {
  FRIENDLY: "#00BCD4",   // Cyan
  HOSTILE: "#FF4444",    // Red
  UNKNOWN: "#FFAB00",    // Amber
  NEUTRAL: "#4CAF50",    // Green
  SELECTED: "#FFFFFF",   // White
} as const;

// Silhouette sizes (pixels) - larger = more visible glow
export const MODEL_SILHOUETTE_SIZES = {
  DEFAULT: 3.0,
  HOSTILE: 4.0,
  SELECTED: 6.0,
} as const;

interface SymbolOptions {
  platformType: PlatformType;
  linkStatus: LinkStatus;
  weaponsSafety: WeaponsSafety;
  selected?: boolean;
  size?: number;
}

// =============================================================================
// SLEEK MODERN AIRCRAFT ICONS (FlightRadar24 style)
// Clean, minimal top-down silhouettes for professional tactical display
// =============================================================================

// Sleek aircraft SVG - clean filled silhouette, no details
const SLEEK_AIRCRAFT_SVG = `
  <path d="M12 2 L14 8 L22 12 L14 13 L14 20 L16 22 L12 21 L8 22 L10 20 L10 13 L2 12 L10 8 Z" fill="currentColor"/>
`;

// Sleek drone SVG - delta wing style
const SLEEK_DRONE_SVG = `
  <path d="M12 2 L20 18 L12 14 L4 18 Z" fill="currentColor"/>
  <path d="M12 14 L12 22" stroke="currentColor" stroke-width="2"/>
`;

// Sleek hostile fighter SVG - pointed aggressive look
const SLEEK_HOSTILE_SVG = `
  <path d="M12 1 L15 10 L23 14 L15 15 L15 21 L12 19 L9 21 L9 15 L1 14 L9 10 Z" fill="currentColor"/>
`;

// Professional SVG paths - Based on Font Awesome 6 (MIT License) and military references
// Clean, recognizable silhouettes optimized for 24x24 viewBox on tactical displays
const PLATFORM_SVG_PATHS: Record<PlatformType, string> = {
  // STRIGOI - Combat UCAV - Sleek fighter silhouette
  STRIGOI: SLEEK_AIRCRAFT_SVG,
  // CORVUS - ISR Drone - Delta wing
  CORVUS: SLEEK_DRONE_SVG,
  // VULTUR - HALE Surveillance - Similar sleek look
  VULTUR: SLEEK_AIRCRAFT_SVG,
};

// Colors based on link status
const LINK_STATUS_COLORS: Record<LinkStatus, string> = {
  CONNECTED: "#00E676",  // Green
  DEGRADED: "#FFAB00",   // Amber
  LOST: "#FF4444",       // Red
};

/**
 * Generate a custom aircraft silhouette symbol as a data URL.
 * Uses platform-specific SVG paths instead of MIL-STD symbols.
 */
export function generateCustomSymbol(options: SymbolOptions): string {
  const {
    platformType,
    linkStatus,
    selected = false,
    size = 40,
  } = options;

  const color = LINK_STATUS_COLORS[linkStatus];
  const svgContent = PLATFORM_SVG_PATHS[platformType];
  const selectionRing = selected
    ? `<circle cx="12" cy="12" r="11" fill="none" stroke="#00BCD4" stroke-width="2" opacity="0.8"/>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    ${selectionRing}
    ${svgContent.replace(/currentColor/g, color)}
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
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

// Track classification colors
const TRACK_COLORS: Record<string, string> = {
  HOSTILE: "#FF4444",   // Red
  UNKNOWN: "#FFAB00",   // Amber
  NEUTRAL: "#9AA0A6",   // Gray
  FRIENDLY: "#00E676",  // Green
};

/**
 * Generate a sleek modern track symbol (FlightRadar24 style).
 * Uses clean SVG aircraft silhouettes instead of MIL-STD symbols.
 */
export function generateTrackSymbol(
  classification: "HOSTILE" | "UNKNOWN" | "NEUTRAL" | "FRIENDLY",
  selected: boolean = false,
  size: number = 32,
  _threatType?: string
): string {
  const color = TRACK_COLORS[classification] ?? "#FFAB00";
  const selectionRing = selected
    ? `<circle cx="12" cy="12" r="11" fill="none" stroke="#00BCD4" stroke-width="2" stroke-dasharray="3,2"/>`
    : "";

  // Add glow effect for hostiles
  const glowFilter = classification === "HOSTILE"
    ? `<defs><filter id="glow"><feGaussianBlur stdDeviation="1" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
    : "";
  const filterAttr = classification === "HOSTILE" ? 'filter="url(#glow)"' : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    ${glowFilter}
    ${selectionRing}
    <g ${filterAttr}>
      ${SLEEK_HOSTILE_SVG.replace(/currentColor/g, color)}
    </g>
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate a MIL-STD-2525E symbol as a data URL (legacy - kept for compatibility).
 */
export function generateMilStdTrackSymbol(
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
