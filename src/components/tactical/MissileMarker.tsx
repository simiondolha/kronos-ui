import { useMemo } from "react";
import { Entity, BillboardGraphics, PolylineGraphics } from "resium";
import {
  Cartesian3,
  Color,
  VerticalOrigin,
  HorizontalOrigin,
} from "cesium";
import type { Missile } from "../../stores/entityStore";

interface MissileMarkerProps {
  missile: Missile;
}

/**
 * MissileMarker - Renders an active missile on the tactical map.
 *
 * Shows a small triangle/arrow pointing in direction of travel,
 * with a trail line showing recent path.
 */
export function MissileMarker({ missile }: MissileMarkerProps) {
  // Don't render inactive missiles
  if (!missile.active) return null;

  const position = useMemo(
    () =>
      Cartesian3.fromDegrees(
        missile.position.lon,
        missile.position.lat,
        missile.position.alt_m
      ),
    [missile.position.lon, missile.position.lat, missile.position.alt_m]
  );

  // Missile trail endpoint (behind missile)
  const trailEndpoint = useMemo(() => {
    const headingRad = (missile.heading_deg * Math.PI) / 180;
    const trailLength = 0.02; // ~2km trail behind
    const endLat = missile.position.lat - Math.cos(headingRad) * trailLength;
    const endLon = missile.position.lon - Math.sin(headingRad) * trailLength;
    return Cartesian3.fromDegrees(endLon, endLat, missile.position.alt_m);
  }, [
    missile.position.lat,
    missile.position.lon,
    missile.position.alt_m,
    missile.heading_deg,
  ]);

  // Generate missile SVG (simple triangle)
  const missileSvg = useMemo(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
        <polygon points="10,0 20,20 10,15 0,20" fill="#FF6B6B" stroke="#FF0000" stroke-width="1" transform="rotate(${missile.heading_deg - 90}, 10, 10)"/>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }, [missile.heading_deg]);

  return (
    <Entity id={missile.missile_id} position={position}>
      {/* Missile Icon */}
      <BillboardGraphics
        image={missileSvg}
        verticalOrigin={VerticalOrigin.CENTER}
        horizontalOrigin={HorizontalOrigin.CENTER}
        scale={1.0}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
      />

      {/* Missile Trail */}
      <PolylineGraphics
        positions={[trailEndpoint, position]}
        width={3}
        material={Color.fromCssColorString("#FF6B6B").withAlpha(0.6)}
      />
    </Entity>
  );
}
