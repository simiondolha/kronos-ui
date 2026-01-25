import { create } from "zustand";
import type {
  EntityId,
  EntityUpdatePayload,
  PositionPayload,
  FlightMode,
  EmconMode,
  FuelStatus,
  LostLinkProfile,
  SensorStatePayload,
  DetailedWeaponsState,
  OrbitPatternParams,
} from "../lib/protocol";

// Ring buffer for position history (60 seconds at ~10Hz = 600 points, keep 1000)
const MAX_TRAIL_POINTS = 1000;
const MAX_EVENTS = 100;

interface TrailPoint {
  position: PositionPayload;
  timestamp: number;
}

export interface EntityWithTrail extends Omit<EntityUpdatePayload, "type"> {
  trail: TrailPoint[];
  lastUpdate: number;

  // UAV Control state (commanded values - from operator input)
  commanded_altitude_m?: number;
  commanded_speed_mps?: number;
  commanded_heading_deg?: number;
  flight_mode?: FlightMode;

  // Detailed sensor state
  sensors?: SensorStatePayload[];
  emcon_mode?: EmconMode;

  // Detailed weapons state (STRIGOI only)
  detailed_weapons?: DetailedWeaponsState;

  // Mission/fuel state
  current_objective?: string;
  lost_link_profile?: LostLinkProfile;
  time_to_bingo_sec?: number;
  fuel_status?: FuelStatus;

  // Orbit pattern (for ISR platforms)
  orbit_pattern?: OrbitPatternParams;
}

// Track (hostile/unknown contacts)
export interface Track {
  track_id: string;
  callsign: string;
  affiliation: "HOSTILE" | "UNKNOWN" | "NEUTRAL" | "FRIENDLY";
  position: PositionPayload;
  velocity: {
    speed_mps: number;
    heading_deg: number;
    climb_rate_mps: number;
  };
  destroyed: boolean;
}

// Missile in flight
export interface Missile {
  missile_id: string;
  shooter_id: string;
  target_id: string;
  position: PositionPayload;
  heading_deg: number;
  active: boolean;
}

// Explosion effect (visual only)
export interface Explosion {
  id: string;
  position: PositionPayload;
  startTime: number;
  duration: number; // milliseconds
}

// Mission event
export interface MissionEvent {
  id: string;
  timestamp: number;
  missionTime: number;
  type: "SYSTEM" | "ALERT" | "AUTH" | "COMBAT" | "NARRATION";
  text: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// Demo phase
export type DemoPhase =
  | "IDLE"
  | "BRIEFING"
  | "PATROL"
  | "DETECTION"
  | "AUTH_PENDING"
  | "ENGAGING"
  | "COMPLETE"
  | "FAILED";

interface EntityState {
  // Friendly entities
  entities: Map<EntityId, EntityWithTrail>;
  selectedEntityId: EntityId | null;

  // Hostile/unknown tracks
  tracks: Map<string, Track>;

  // Missiles in flight
  missiles: Map<string, Missile>;

  // Visual explosions
  explosions: Map<string, Explosion>;

  // Mission events (narration log)
  events: MissionEvent[];

  // Current demo phase
  phase: DemoPhase;

  // Weapons status (global)
  weaponsStatus: "SAFE" | "ARMED";

  // AI enabled state (for toggle demo)
  aiEnabled: boolean;

  // Actions - Entities
  updateEntity: (payload: EntityUpdatePayload) => void;
  updateEntityPosition: (entityId: EntityId, position: { lat: number; lon: number }) => void;
  removeEntity: (entityId: EntityId) => void;
  selectEntity: (entityId: EntityId | null) => void;

  // Actions - Tracks
  updateTrack: (track: Track) => void;
  removeTrack: (trackId: string) => void;
  clearTracks: () => void;

  // Actions - Missiles
  updateMissile: (missile: Missile) => void;
  removeMissile: (missileId: string) => void;
  clearMissiles: () => void;

  // Actions - Explosions
  addExplosion: (explosion: Explosion) => void;
  removeExplosion: (id: string) => void;

  // Actions - Events
  addEvent: (event: MissionEvent) => void;
  clearEvents: () => void;

  // Actions - Phase
  setPhase: (phase: DemoPhase) => void;
  setWeaponsStatus: (status: "SAFE" | "ARMED") => void;
  setAiEnabled: (enabled: boolean) => void;

  // Actions - Reset
  clearAll: () => void;

  // Selectors (getters)
  getEntity: (entityId: EntityId) => EntityWithTrail | undefined;
  getSelectedEntity: () => EntityWithTrail | undefined;
  getAllEntities: () => EntityWithTrail[];
  getAllTracks: () => Track[];
  getAllMissiles: () => Missile[];
  getAllExplosions: () => Explosion[];
}

export const useEntityStore = create<EntityState>((set, get) => ({
  entities: new Map(),
  selectedEntityId: null,
  tracks: new Map(),
  missiles: new Map(),
  explosions: new Map(),
  events: [],
  phase: "IDLE",
  weaponsStatus: "SAFE",
  aiEnabled: true, // AI ON by default

  updateEntity: (payload: EntityUpdatePayload) => {
    set((state) => {
      const now = Date.now();
      const entities = new Map(state.entities);
      const existing = entities.get(payload.entity_id);

      // Build trail (ring buffer)
      let trail: TrailPoint[] = existing?.trail ?? [];
      trail = [
        ...trail,
        { position: payload.position, timestamp: now },
      ].slice(-MAX_TRAIL_POINTS);

      // Normalize velocity field names (Rust sends heading/climb, UI expects heading_deg/climb_rate_mps)
      const velocityRaw = payload.velocity as unknown as Record<string, unknown>;
      const velocity = {
        speed_mps: payload.velocity.speed_mps,
        heading_deg: (velocityRaw.heading ?? velocityRaw.heading_deg ?? 0) as number,
        climb_rate_mps: (velocityRaw.climb ?? velocityRaw.climb_rate_mps ?? 0) as number,
      };

      // Normalize attitude field names (Rust sends roll/pitch/yaw, UI expects *_deg)
      const attitudeRaw = payload.attitude as unknown as Record<string, unknown>;
      const attitude = {
        roll_deg: (attitudeRaw.roll ?? attitudeRaw.roll_deg ?? 0) as number,
        pitch_deg: (attitudeRaw.pitch ?? attitudeRaw.pitch_deg ?? 0) as number,
        yaw_deg: (attitudeRaw.yaw ?? attitudeRaw.yaw_deg ?? 0) as number,
      };

      // Normalize weapons_state from Rust's weapons_status
      const payloadAny = payload as unknown as Record<string, unknown>;
      const weaponsStatus = payloadAny.weapons_status as { a2a?: number; a2g?: number; weapons_safe?: boolean } | undefined;
      const weapons_state = payload.weapons_state ?? {
        simulated: true,
        safety: weaponsStatus?.weapons_safe ? "SAFE" : "ARMED",
        inventory: [],
      };

      const entity: EntityWithTrail = {
        delta: payload.delta ?? false,
        entity_id: payload.entity_id,
        platform_type: payload.platform_type,
        callsign: payload.callsign,
        ...(payload.home_base !== undefined && { home_base: payload.home_base }),
        position: payload.position,
        attitude,
        velocity,
        flight_phase: payload.flight_phase,
        operational_status: payload.operational_status ?? "MISSION_ACTIVE",
        fuel_percent: payload.fuel_percent,
        link_status: payload.link_status ?? "CONNECTED",
        weapons_state,
        sensor_active: payload.sensor_active,
        sensor_mode: payload.sensor_mode ?? "SEARCH",
        trail,
        lastUpdate: now,
      };

      entities.set(payload.entity_id, entity);
      return { entities };
    });
  },

  updateEntityPosition: (entityId: EntityId, position: { lat: number; lon: number }) => {
    set((state) => {
      const entities = new Map(state.entities);
      const existing = entities.get(entityId);
      if (!existing) return state;

      const now = Date.now();
      // Update trail with new position
      const trail = [
        ...existing.trail,
        { position: { ...existing.position, lat: position.lat, lon: position.lon }, timestamp: now },
      ].slice(-MAX_TRAIL_POINTS);

      const updated: EntityWithTrail = {
        ...existing,
        position: { ...existing.position, lat: position.lat, lon: position.lon },
        trail,
        lastUpdate: now,
      };
      entities.set(entityId, updated);
      return { entities };
    });
  },

  removeEntity: (entityId: EntityId) => {
    set((state) => {
      const entities = new Map(state.entities);
      entities.delete(entityId);
      const selectedEntityId =
        state.selectedEntityId === entityId ? null : state.selectedEntityId;
      return { entities, selectedEntityId };
    });
  },

  selectEntity: (entityId: EntityId | null) => {
    set({ selectedEntityId: entityId });
  },

  // Track actions
  updateTrack: (track: Track) => {
    set((state) => {
      const tracks = new Map(state.tracks);
      tracks.set(track.track_id, track);
      return { tracks };
    });
  },

  removeTrack: (trackId: string) => {
    set((state) => {
      const tracks = new Map(state.tracks);
      tracks.delete(trackId);
      return { tracks };
    });
  },

  clearTracks: () => {
    set({ tracks: new Map() });
  },

  // Missile actions
  updateMissile: (missile: Missile) => {
    set((state) => {
      const missiles = new Map(state.missiles);
      missiles.set(missile.missile_id, missile);
      return { missiles };
    });
  },

  removeMissile: (missileId: string) => {
    set((state) => {
      const missiles = new Map(state.missiles);
      missiles.delete(missileId);
      return { missiles };
    });
  },

  clearMissiles: () => {
    set({ missiles: new Map() });
  },

  // Explosion actions
  addExplosion: (explosion: Explosion) => {
    set((state) => {
      const explosions = new Map(state.explosions);
      explosions.set(explosion.id, explosion);
      return { explosions };
    });
  },

  removeExplosion: (id: string) => {
    set((state) => {
      const explosions = new Map(state.explosions);
      explosions.delete(id);
      return { explosions };
    });
  },

  // Event actions
  addEvent: (event: MissionEvent) => {
    set((state) => ({
      events: [...state.events, event].slice(-MAX_EVENTS),
    }));
  },

  clearEvents: () => {
    set({ events: [] });
  },

  // Phase actions
  setPhase: (phase: DemoPhase) => {
    set({ phase });
  },

  setWeaponsStatus: (status: "SAFE" | "ARMED") => {
    set({ weaponsStatus: status });
  },

  setAiEnabled: (enabled: boolean) => {
    set({ aiEnabled: enabled });
  },

  // Reset all
  clearAll: () => {
    set({
      entities: new Map(),
      selectedEntityId: null,
      tracks: new Map(),
      missiles: new Map(),
      explosions: new Map(),
      events: [],
      phase: "IDLE",
      weaponsStatus: "SAFE",
      aiEnabled: true, // Reset to ON
    });
  },

  // Selectors
  getEntity: (entityId: EntityId) => {
    return get().entities.get(entityId);
  },

  getSelectedEntity: () => {
    const state = get();
    if (!state.selectedEntityId) return undefined;
    return state.entities.get(state.selectedEntityId);
  },

  getAllEntities: () => {
    return Array.from(get().entities.values());
  },

  getAllTracks: () => {
    return Array.from(get().tracks.values());
  },

  getAllMissiles: () => {
    return Array.from(get().missiles.values());
  },

  getAllExplosions: () => {
    return Array.from(get().explosions.values());
  },
}));
