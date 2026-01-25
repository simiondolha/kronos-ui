import { useEffect, useRef } from "react";
import { useEntityStore } from "../stores/entityStore";
import type { Scenario, BriefingAsset } from "../lib/scenarios";
import type { EntityUpdatePayload } from "../lib/protocol";

/**
 * useScenarioEntities - Spawns mock entities from scenario data when backend is unavailable.
 *
 * When mission starts (phase = BRIEFING) and no entities arrive from backend after 1s,
 * creates entities from currentScenario.briefing.assets.
 *
 * This enables UI testing and demos without requiring the Rust backend.
 */
export function useScenarioEntities(scenario: Scenario) {
  const phase = useEntityStore((s) => s.phase);
  const updateEntity = useEntityStore((s) => s.updateEntity);
  const setPhase = useEntityStore((s) => s.setPhase);
  const spawnedRef = useRef(false);

  useEffect(() => {
    // On BRIEFING phase, spawn entities if store is empty after 1s
    if (phase === "BRIEFING" && !spawnedRef.current) {
      const timer = setTimeout(() => {
        const entities = useEntityStore.getState().entities;
        if (entities.size === 0) {
          console.log("[MOCK] No backend - spawning scenario entities");

          // Spawn each asset from the scenario briefing
          scenario.briefing.assets.forEach((asset) => {
            const entity = createMockEntity(asset);
            updateEntity(entity);
            console.log(`[MOCK] Spawned: ${asset.callsign} (${asset.type}) @ ${asset.end.lat.toFixed(4)},${asset.end.lon.toFixed(4)}`);
          });

          spawnedRef.current = true;

          // Transition to PATROL phase after spawning
          setTimeout(() => {
            setPhase("PATROL");
            console.log("[MOCK] Phase: BRIEFING -> PATROL");
          }, 2000);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Reset spawn flag on IDLE (for restart)
    if (phase === "IDLE") {
      spawnedRef.current = false;
    }
  }, [phase, scenario, updateEntity, setPhase]);
}

/**
 * Create a mock EntityUpdatePayload from scenario briefing asset.
 */
function createMockEntity(asset: BriefingAsset): EntityUpdatePayload {
  return {
    type: "ENTITY_UPDATE",
    delta: false,
    entity_id: asset.id,
    platform_type: asset.type,
    callsign: asset.callsign,
    home_base: asset.home_base,
    position: {
      lat: asset.end.lat,
      lon: asset.end.lon,
      alt_m: asset.end.alt_m,
    },
    attitude: {
      roll_deg: 0,
      pitch_deg: 2, // Slight nose-up for realism
      yaw_deg: 270, // Heading west
    },
    velocity: {
      speed_mps: 200, // ~720 km/h
      heading_deg: 270, // West
      climb_rate_mps: 0,
    },
    flight_phase: "ON_STATION",
    operational_status: "MISSION_ACTIVE",
    fuel_percent: 85,
    link_status: "CONNECTED",
    weapons_state: {
      simulated: true,
      safety: "SAFE",
      inventory: [],
    },
    sensor_active: true,
    sensor_mode: "SEARCH",
  };
}
