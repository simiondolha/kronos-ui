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

  // Missile trail endpoint (behind missile) - longer trail for visibility
  const trailEndpoint = useMemo(() => {
    const headingRad = (missile.heading_deg * Math.PI) / 180;
    const trailLength = 0.08; // ~8km trail behind for visibility
    const endLat = missile.position.lat - Math.cos(headingRad) * trailLength;
    const endLon = missile.position.lon - Math.sin(headingRad) * trailLength;
    return Cartesian3.fromDegrees(endLon, endLat, missile.position.alt_m);
  }, [
    missile.position.lat,
    missile.position.lon,
    missile.position.alt_m,
    missile.heading_deg,
  ]);

  // Generate missile SVG - bright, visible, rotated to heading
  const missileSvg = useMemo(() => {
    const rotation = missile.heading_deg - 90; // Adjust for SVG coordinate system
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="12,2 22,22 12,17 2,22" fill="#FF4444" stroke="#FFFF00" stroke-width="2" transform="rotate(${rotation}, 12, 12)"/>
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

      {/* Missile Trail - bright yellow/orange for visibility */}
      <PolylineGraphics
        positions={[trailEndpoint, position]}
        width={5}
        material={Color.fromCssColorString("#FFAA00").withAlpha(0.9)}
      />
    </Entity>
  );
}
