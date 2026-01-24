import {
  Ion,
  createWorldTerrainAsync,
  SceneMode,
  Color,
  Cartesian3,
  Rectangle,
  type Viewer,
} from "cesium";

/**
 * Cesium configuration for KRONOS tactical display.
 * Uses requestRenderMode for performance - requires explicit requestRender() on updates.
 */

// Default camera position (Eastern Europe - training area)
export const DEFAULT_CAMERA_POSITION = {
  longitude: 26.1,
  latitude: 44.4,
  height: 500000, // 500km altitude
};

// Viewer configuration options
export const VIEWER_OPTIONS = {
  // Performance: Only render when needed
  requestRenderMode: true,
  maximumRenderTimeChange: Infinity,

  // Disable unnecessary widgets for tactical display
  animation: false,
  baseLayerPicker: false,
  fullscreenButton: false,
  vrButton: false,
  geocoder: false,
  homeButton: false,
  infoBox: false,
  sceneModePicker: false,
  selectionIndicator: false,
  timeline: false,
  navigationHelpButton: false,
  navigationInstructionsInitiallyVisible: false,

  // Scene settings
  sceneMode: SceneMode.SCENE3D,
  shadows: false,

  // Credit display (required by Cesium)
  creditContainer: undefined as unknown as Element,
};

/**
 * Initialize Cesium Ion with token from environment.
 * Called once at app startup (in main.tsx).
 */
export function initializeCesiumIon(token: string): void {
  if (token) {
    Ion.defaultAccessToken = token;
  } else {
    console.warn("[Cesium] No Ion token provided - some features may not work");
  }
}

/**
 * Configure viewer after creation.
 * Sets up terrain, lighting, and performance optimizations.
 */
export async function configureViewer(viewer: Viewer): Promise<void> {
  // Enable depth testing for proper entity rendering
  viewer.scene.globe.depthTestAgainstTerrain = true;

  // Performance optimizations
  viewer.scene.fog.enabled = false;
  viewer.scene.globe.showGroundAtmosphere = false;

  // Dark theme for command center aesthetic - #0A0E14 = --bg-primary
  viewer.scene.backgroundColor = new Color(0.039, 0.055, 0.078, 1.0);

  // Load Cesium World Terrain
  try {
    const terrain = await createWorldTerrainAsync();
    viewer.terrainProvider = terrain;
  } catch (error) {
    console.warn("[Cesium] Failed to load terrain:", error);
  }

  // Set initial camera position
  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(
      DEFAULT_CAMERA_POSITION.longitude,
      DEFAULT_CAMERA_POSITION.latitude,
      DEFAULT_CAMERA_POSITION.height
    ),
  });
}

/**
 * Request a render frame.
 * Must be called after any data update when using requestRenderMode.
 */
export function requestRender(viewer: Viewer | null): void {
  if (viewer && !viewer.isDestroyed()) {
    viewer.scene.requestRender();
  }
}

/**
 * Position for flyToEntities.
 */
export interface EntityPosition {
  lat: number;
  lon: number;
  alt_m: number;
}

/**
 * Fly camera to frame all entities.
 * Computes bounding box and flies to show all entities with padding.
 */
export function flyToEntities(
  viewer: Viewer | null,
  positions: EntityPosition[]
): void {
  if (!viewer || viewer.isDestroyed() || positions.length === 0) {
    return;
  }

  // Compute bounding box
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  let maxAlt = 0;

  for (const pos of positions) {
    west = Math.min(west, pos.lon);
    east = Math.max(east, pos.lon);
    south = Math.min(south, pos.lat);
    north = Math.max(north, pos.lat);
    maxAlt = Math.max(maxAlt, pos.alt_m);
  }

  // Add padding (0.5 degrees ~ 50km)
  const padding = 0.5;
  west -= padding;
  east += padding;
  south -= padding;
  north += padding;

  // Fly to rectangle (height is handled by Rectangle destination)
  viewer.camera.flyTo({
    destination: Rectangle.fromDegrees(west, south, east, north),
    duration: 1.5,
    complete: () => {
      requestRender(viewer);
    },
  });
}

/**
 * Fly camera to a single position.
 */
export function flyToPosition(
  viewer: Viewer | null,
  position: EntityPosition,
  height?: number
): void {
  if (!viewer || viewer.isDestroyed()) {
    return;
  }

  const altitude = height ?? Math.max(position.alt_m * 5, 50000);

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(
      position.lon,
      position.lat,
      altitude
    ),
    duration: 1.5,
    complete: () => {
      requestRender(viewer);
    },
  });
}

// ============================================================================
// CINEMATIC BRIEFING CAMERA ANIMATIONS
// ============================================================================

/**
 * Fly camera to a location at specified altitude with custom duration.
 * Returns a Promise that resolves when the flight is complete.
 */
export function flyToLocation(
  viewer: Viewer | null,
  lat: number,
  lon: number,
  altitude: number,
  durationSeconds: number
): Promise<void> {
  return new Promise((resolve) => {
    if (!viewer || viewer.isDestroyed()) {
      resolve();
      return;
    }

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(lon, lat, altitude),
      duration: durationSeconds,
      complete: () => {
        requestRender(viewer);
        resolve();
      },
    });
  });
}

/**
 * Fly camera to show a rectangular region.
 * Good for tactical overview shots.
 */
export function flyToRectangle(
  viewer: Viewer | null,
  west: number,
  south: number,
  east: number,
  north: number,
  durationSeconds: number
): Promise<void> {
  return new Promise((resolve) => {
    if (!viewer || viewer.isDestroyed()) {
      resolve();
      return;
    }

    viewer.camera.flyTo({
      destination: Rectangle.fromDegrees(west, south, east, north),
      duration: durationSeconds,
      complete: () => {
        requestRender(viewer);
        resolve();
      },
    });
  });
}

/**
 * Fly to country overview (Romania).
 * High altitude shot showing the whole country.
 */
export function flyToRomaniaOverview(
  viewer: Viewer | null,
  durationSeconds: number = 2
): Promise<void> {
  // Romania approximate center
  return flyToLocation(viewer, 45.9, 25.0, 800000, durationSeconds);
}

/**
 * Fly to mission area (Bucharest defense sector).
 * Medium altitude shot showing the tactical area.
 */
export function flyToMissionArea(
  viewer: Viewer | null,
  lat: number,
  lon: number,
  durationSeconds: number = 2
): Promise<void> {
  return flyToLocation(viewer, lat, lon, 50000, durationSeconds);  // 50km altitude for entity visibility
}

/**
 * Fly to show both threats and assets in tactical overview.
 * Computes optimal view based on all positions.
 */
export function flyToTacticalOverview(
  viewer: Viewer | null,
  positions: EntityPosition[],
  durationSeconds: number = 2
): Promise<void> {
  return new Promise((resolve) => {
    if (!viewer || viewer.isDestroyed() || positions.length === 0) {
      resolve();
      return;
    }

    // Compute bounding box
    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;

    for (const pos of positions) {
      west = Math.min(west, pos.lon);
      east = Math.max(east, pos.lon);
      south = Math.min(south, pos.lat);
      north = Math.max(north, pos.lat);
    }

    // Add padding (1 degree ~ 100km)
    const padding = 1.0;
    west -= padding;
    east += padding;
    south -= padding;
    north += padding;

    viewer.camera.flyTo({
      destination: Rectangle.fromDegrees(west, south, east, north),
      duration: durationSeconds,
      complete: () => {
        requestRender(viewer);
        resolve();
      },
    });
  });
}

/**
 * Set camera position immediately (no animation).
 * Useful for setting up the initial view before a sequence.
 */
export function setCameraPosition(
  viewer: Viewer | null,
  lat: number,
  lon: number,
  altitude: number
): void {
  if (!viewer || viewer.isDestroyed()) {
    return;
  }

  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(lon, lat, altitude),
  });
  requestRender(viewer);
}
