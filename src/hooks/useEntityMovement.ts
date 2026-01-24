import { useEffect, useRef, useCallback } from "react";
import { useEntityStore } from "../stores/entityStore";

/**
 * useEntityMovement - Hook that animates entity positions based on heading/speed.
 *
 * When mission is active (phase != IDLE), entities move across the map
 * toward their waypoints every 500ms.
 *
 * Speed is tuned for visual effect - not realistic.
 */
export function useEntityMovement() {
  const phase = useEntityStore((s) => s.phase);
  const entities = useEntityStore((s) => s.entities);
  const updateEntityPosition = useEntityStore((s) => s.updateEntityPosition);
  const intervalRef = useRef<number | null>(null);

  // Move entities based on their heading
  const tick = useCallback(() => {
    const current = useEntityStore.getState().entities;

    current.forEach((entity) => {
      // Speed factor: degrees per tick
      // ~0.002 deg = ~220m per 500ms = ~1600 km/h (fast but visible)
      const speed = 0.002;
      const headingRad = (entity.velocity.heading_deg * Math.PI) / 180;

      // Calculate new position
      // Note: In simplified 2D, North = +lat, East = +lon
      const newLat = entity.position.lat + Math.cos(headingRad) * speed;
      const newLon = entity.position.lon + Math.sin(headingRad) * speed;

      updateEntityPosition(entity.entity_id, { lat: newLat, lon: newLon });
    });
  }, [updateEntityPosition]);

  // Start/stop movement based on phase
  useEffect(() => {
    // Only run when not IDLE or COMPLETE or FAILED
    const shouldMove = phase !== "IDLE" && phase !== "COMPLETE" && phase !== "FAILED";

    if (shouldMove && entities.size > 0) {
      // Start interval
      if (!intervalRef.current) {
        intervalRef.current = window.setInterval(tick, 500);
      }
    } else {
      // Stop interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase, entities.size, tick]);

  // Return nothing - this hook just has side effects
  return null;
}
