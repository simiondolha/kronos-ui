/**
 * Fleet Store - Manages available fleet aircraft for mission assignment
 *
 * Tracks all aircraft from populated fleet (500 at NATO airports).
 * Filters for assignable aircraft (PARKED status).
 * Supports proximity-based sorting using Haversine distance.
 */

import { create } from "zustand";
import type { EntityId, PositionPayload } from "../lib/protocol";
import { haversineDistance } from "../lib/geo-utils";

export type PlatformType = "STRIGOI" | "VULTUR" | "CORVUS";
export type FlightPhase = "PARKED" | "TAXI" | "TAKEOFF" | "TRANSIT" | "ON_STATION" | "RTB" | "LANDING";
export type OperationalStatus = "READY" | "MISSION_ACTIVE" | "MAINTENANCE" | "DAMAGED";

export interface FleetEntity {
  id: EntityId;
  platformType: PlatformType;
  callsign: string;
  homeBase: string;
  position: PositionPayload;
  flightPhase: FlightPhase;
  operationalStatus: OperationalStatus;
  fuelPercent: number;
  assignedMissionId?: string | undefined;
}

// AO (Area of Operations) position for distance calculations
export interface AOPosition {
  lat: number;
  lon: number;
}

interface FleetStore {
  // All fleet entities
  fleet: Map<EntityId, FleetEntity>;

  // Currently selected mission ID
  activeMissionId: string | null;

  // Mission AO position for proximity sorting
  missionAO: AOPosition | null;

  // Actions
  setFleet: (entities: FleetEntity[]) => void;
  updateFleetEntity: (entity: FleetEntity) => void;
  assignToMission: (entityId: EntityId, missionId: string) => void;
  unassignFromMission: (entityId: EntityId) => void;
  setActiveMission: (missionId: string | null) => void;
  setMissionAO: (ao: AOPosition | null) => void;
  clearFleet: () => void;

  // Selectors
  getAvailableFleet: () => FleetEntity[];
  getAvailableFleetSorted: () => { entity: FleetEntity; distanceKm: number }[];
  getAssignedToMission: (missionId: string) => FleetEntity[];
  getByPlatform: (platform: PlatformType) => FleetEntity[];
}

export const useFleetStore = create<FleetStore>((set, get) => ({
  fleet: new Map(),
  activeMissionId: null,
  missionAO: null,

  setFleet: (entities: FleetEntity[]) => {
    const fleet = new Map<EntityId, FleetEntity>();
    for (const entity of entities) {
      fleet.set(entity.id, entity);
    }
    set({ fleet });
    console.log(`[FLEET_STORE] Set ${entities.length} fleet entities`);
  },

  updateFleetEntity: (entity: FleetEntity) => {
    set((state) => {
      const fleet = new Map(state.fleet);
      fleet.set(entity.id, entity);
      return { fleet };
    });
  },

  assignToMission: (entityId: EntityId, missionId: string) => {
    set((state) => {
      const fleet = new Map(state.fleet);
      const entity = fleet.get(entityId);
      if (entity) {
        fleet.set(entityId, {
          ...entity,
          assignedMissionId: missionId,
          operationalStatus: "MISSION_ACTIVE",
          flightPhase: "TRANSIT",
        });
        console.log(`[FLEET_STORE] Assigned ${entity.callsign} to mission ${missionId}`);
      }
      return { fleet };
    });
  },

  unassignFromMission: (entityId: EntityId) => {
    set((state) => {
      const fleet = new Map(state.fleet);
      const entity = fleet.get(entityId);
      if (entity) {
        fleet.set(entityId, {
          ...entity,
          assignedMissionId: undefined,
          operationalStatus: "READY",
        });
      }
      return { fleet };
    });
  },

  setActiveMission: (missionId: string | null) => {
    set({ activeMissionId: missionId });
  },

  setMissionAO: (ao: AOPosition | null) => {
    set({ missionAO: ao });
    if (ao) {
      console.log(`[FLEET_STORE] Mission AO set to ${ao.lat.toFixed(4)}, ${ao.lon.toFixed(4)}`);
    }
  },

  clearFleet: () => {
    set({ fleet: new Map(), activeMissionId: null, missionAO: null });
  },

  // Get available (PARKED + READY) fleet for assignment
  getAvailableFleet: () => {
    const { fleet } = get();
    return Array.from(fleet.values()).filter(
      (e) => e.flightPhase === "PARKED" &&
             e.operationalStatus === "READY" &&
             !e.assignedMissionId
    );
  },

  // Get available fleet sorted by distance to mission AO (closest first)
  getAvailableFleetSorted: () => {
    const { fleet, missionAO } = get();
    const available = Array.from(fleet.values()).filter(
      (e) => e.flightPhase === "PARKED" &&
             e.operationalStatus === "READY" &&
             !e.assignedMissionId
    );

    // If no AO set, return with distance 0
    if (!missionAO) {
      return available.map((entity) => ({ entity, distanceKm: 0 }));
    }

    // Calculate distance for each entity and sort
    const withDistance = available.map((entity) => {
      const distanceKm = haversineDistance(
        entity.position.lat,
        entity.position.lon,
        missionAO.lat,
        missionAO.lon
      );
      return { entity, distanceKm: Math.round(distanceKm) };
    });

    // Sort by distance ascending (closest first)
    withDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    return withDistance;
  },

  // Get entities assigned to a specific mission
  getAssignedToMission: (missionId: string) => {
    const { fleet } = get();
    return Array.from(fleet.values()).filter(
      (e) => e.assignedMissionId === missionId
    );
  },

  // Get entities by platform type
  getByPlatform: (platform: PlatformType) => {
    const { fleet } = get();
    return Array.from(fleet.values()).filter(
      (e) => e.platformType === platform
    );
  },
}));

// Export actions separately for use outside components
export const getFleetActions = () => ({
  setFleet: useFleetStore.getState().setFleet,
  updateFleetEntity: useFleetStore.getState().updateFleetEntity,
  assignToMission: useFleetStore.getState().assignToMission,
  unassignFromMission: useFleetStore.getState().unassignFromMission,
  setActiveMission: useFleetStore.getState().setActiveMission,
  setMissionAO: useFleetStore.getState().setMissionAO,
  clearFleet: useFleetStore.getState().clearFleet,
});
