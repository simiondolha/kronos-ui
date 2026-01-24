import { useMemo } from "react";
import { Entity, PolylineGraphics } from "resium";
import { Cartesian3, Color, PolylineDashMaterialProperty } from "cesium";
import type { EntityWithTrail } from "../../stores/entityStore";

interface FlightPathProps {
  entity: EntityWithTrail;
  selected: boolean;
}

// Trail display settings
const TRAIL_DURATION_MS = 60000; // 60 seconds of trail
const MIN_TRAIL_POINTS = 2;

/**
 * FlightPath - Renders the flight trail for an entity.
 *
 * Shows recent position history as a polyline.
 * Trail fades based on age and entity link status.
 */
export function FlightPath({ entity, selected }: FlightPathProps) {
  // Filter trail to recent points only
  const positions = useMemo(() => {
    const now = Date.now();
    const cutoff = now - TRAIL_DURATION_MS;

    const recentTrail = entity.trail.filter((p) => p.timestamp > cutoff);

    if (recentTrail.length < MIN_TRAIL_POINTS) {
      return null;
    }

    // Convert to Cartesian3 array
    return recentTrail.map((p) =>
      Cartesian3.fromDegrees(p.position.lon, p.position.lat, p.position.alt_m)
    );
  }, [entity.trail]);

  // Trail color based on link status
  const trailColor = useMemo(() => {
    const baseColor = (() => {
      switch (entity.link_status) {
        case "CONNECTED":
          return Color.fromCssColorString("#0066CC"); // NATO Blue - Friendly
        case "DEGRADED":
          return Color.fromCssColorString("#FFAB00"); // --color-warning
        case "LOST":
          return Color.fromCssColorString("#FF4444"); // --color-hostile
      }
    })();

    // Reduce opacity for trail
    return baseColor.withAlpha(selected ? 0.6 : 0.3);
  }, [entity.link_status, selected]);

  // Don't render if no trail
  if (!positions) {
    return null;
  }

  return (
    <Entity id={`trail-${entity.entity_id}`}>
      <PolylineGraphics
        positions={positions}
        width={selected ? 3 : 2}
        material={
          entity.link_status === "LOST"
            ? new PolylineDashMaterialProperty({
                color: trailColor,
                dashLength: 16,
              })
            : trailColor
        }
        clampToGround={false}
      />
    </Entity>
  );
}
