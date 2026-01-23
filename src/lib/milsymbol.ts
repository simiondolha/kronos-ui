import ms from "milsymbol";
import type { PlatformType, LinkStatus, WeaponsSafety } from "./protocol";

/**
 * MIL-STD-2525E Symbol Generation for KRONOS
 *
 * SIDC (Symbol Identification Code) structure for Air platforms:
 * Position 1: Version (1 = MIL-STD-2525D/E)
 * Position 2: Standard Identity (F=Friend, H=Hostile, U=Unknown, N=Neutral)
 * Position 3: Symbol Set (01 = Air)
 * Position 4-5: Status (0=Present, 1=Planned)
 * Position 6-7: HQ/TF/Dummy (00 = None)
 * Position 8-9: Amplifier (00 = None)
 * Position 10-15: Entity/Type/Subtype
 */

// Platform type to MIL-STD entity codes
const PLATFORM_ENTITY_CODES: Record<PlatformType, string> = {
  STRIGOI: "110000", // Military Fixed Wing (generic UAV)
  CORVUS: "110100",  // Military Rotary Wing
  VULTUR: "110200",  // Military Fixed Wing - Attack
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
 * Generate a hostile/unknown track symbol.
 */
export function generateTrackSymbol(
  classification: "HOSTILE" | "UNKNOWN" | "NEUTRAL" | "FRIENDLY",
  selected: boolean = false,
  size: number = 30
): string {
  // Standard Identity codes
  const identityCode: Record<string, string> = {
    HOSTILE: "6",  // Hostile
    UNKNOWN: "1",  // Unknown
    NEUTRAL: "4",  // Neutral
    FRIENDLY: "3", // Friend
  };

  const identity = identityCode[classification] || "1";

  // Generic air track
  const sidc = `10${identity}30000110000`;

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
