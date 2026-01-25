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

// Professional SVG paths - Based on Font Awesome 6 (MIT License) and military references
// Clean, recognizable silhouettes optimized for 24x24 viewBox on tactical displays
const PLATFORM_SVG_PATHS: Record<PlatformType, string> = {
  // STRIGOI - Combat UCAV (Font Awesome jet-fighter-up adapted)
  // Distinctive fighter jet silhouette with swept wings
  STRIGOI: `
    <path d="M12 1l-2.5 6-7 3.5v2l7-.5v5.5l-2.5 2v2h5v-2l-2.5-2V12l7 .5v-2l-7-3.5L12 1z" fill="currentColor"/>
    <path d="M4.5 9l2 1.5M19.5 9l-2 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  // CORVUS - ISR Drone (MQ-9 Reaper style)
  // Long slender body, high-aspect ratio wings, visible pylons
  CORVUS: `
    <ellipse cx="12" cy="2.5" rx="1.8" ry="1.5" fill="currentColor"/>
    <rect x="11" y="3.5" width="2" height="16" rx="1" fill="currentColor"/>
    <rect x="2" y="9" width="20" height="1.8" rx="0.5" fill="currentColor"/>
    <path d="M10 18l-2 4h1.5l1.5-3zM14 18l2 4h-1.5l-1.5-3z" fill="currentColor"/>
    <rect x="5" y="10" width="1.2" height="2.5" rx="0.3" fill="currentColor" opacity="0.75"/>
    <rect x="8" y="10" width="1.2" height="2.5" rx="0.3" fill="currentColor" opacity="0.75"/>
    <rect x="14.8" y="10" width="1.2" height="2.5" rx="0.3" fill="currentColor" opacity="0.75"/>
    <rect x="17.8" y="10" width="1.2" height="2.5" rx="0.3" fill="currentColor" opacity="0.75"/>
  `,
  // VULTUR - HALE Surveillance (RQ-4 Global Hawk style)
  // Large bulbous radome, extremely long straight wings
  VULTUR: `
    <ellipse cx="12" cy="3.5" rx="3" ry="2.5" fill="currentColor"/>
    <rect x="10.5" y="5" width="3" height="14" rx="0.8" fill="currentColor"/>
    <rect x="0.5" y="9" width="23" height="2.5" rx="1" fill="currentColor"/>
    <path d="M9 17l-4 6h2.5l2.5-5zM15 17l4 6h-2.5l-2.5-5z" fill="currentColor"/>
    <circle cx="4" cy="10.5" r="1" fill="currentColor" opacity="0.7"/>
    <circle cx="20" cy="10.5" r="1" fill="currentColor" opacity="0.7"/>
  `,
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
  const strokeWidth = selected ? 3 : 0;
  const selectionRing = selected
    ? `<circle cx="12" cy="12" r="11" fill="none" stroke="#00BCD4" stroke-width="2" opacity="0.8"/>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="color: ${color}">
    ${selectionRing}
    <g style="color: ${color}">
      ${svgContent.replace(/currentColor/g, color)}
    </g>
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
