import { useMemo } from "react";
import { Entity, BillboardGraphics, LabelGraphics } from "resium";
import {
  Cartesian2,
  Cartesian3,
  Color,
  VerticalOrigin,
  HorizontalOrigin,
  LabelStyle,
  DistanceDisplayCondition,
  Math as CesiumMath,
} from "cesium";
import type { EntityWithTrail } from "../../stores/entityStore";
import { generateSymbol } from "../../lib/milsymbol";

interface EntityMarkerProps {
  entity: EntityWithTrail;
  selected: boolean;
  positionOverride?: { lat: number; lon: number; alt_m: number };
}

/**
 * EntityMarker - Renders a single entity on the tactical map.
 *
 * Uses MIL-STD-2525E symbology via milsymbol library.
 * Shows callsign label and status indicators.
 */
export function EntityMarker({ entity, selected, positionOverride }: EntityMarkerProps) {
  const positionSource = positionOverride ?? entity.position;
  const position = useMemo(
    () =>
      Cartesian3.fromDegrees(
        positionSource.lon,
        positionSource.lat,
        positionSource.alt_m
      ),
    [positionSource.lon, positionSource.lat, positionSource.alt_m]
  );

  // Generate MIL-STD-2525E NATO symbol
  const symbolUrl = useMemo(
    () =>
      generateSymbol({
        platformType: entity.platform_type,
        linkStatus: entity.link_status,
        weaponsSafety: entity.weapons_state.safety,
        selected,
        size: 40,
      }),
    [entity.platform_type, entity.link_status, entity.weapons_state.safety, selected]
  );

  // Label color based on link status
  const labelColor = useMemo(() => {
    switch (entity.link_status) {
      case "CONNECTED":
        return Color.fromCssColorString("#00E676"); // --color-friendly
      case "DEGRADED":
        return Color.fromCssColorString("#FFAB00"); // --color-warning
      case "LOST":
        return Color.fromCssColorString("#FF4444"); // --color-hostile
    }
  }, [entity.link_status]);

  // Altitude display
  const altitudeText = useMemo(() => {
    const altFt = Math.round(entity.position.alt_m * 3.28084);
    return `FL${Math.round(altFt / 100).toString().padStart(3, "0")}`;
  }, [entity.position.alt_m]);

  // Speed display
  const speedText = useMemo(() => {
    const speedKts = Math.round(entity.velocity.speed_mps * 1.94384);
    return `${speedKts}KT`;
  }, [entity.velocity.speed_mps]);

  return (
    <Entity id={entity.entity_id} position={position}>
      {/* Aircraft Silhouette Symbol - rotates with heading */}
      <BillboardGraphics
        image={symbolUrl}
        rotation={CesiumMath.toRadians(-entity.velocity.heading_deg)}
        alignedAxis={Cartesian3.UNIT_Z}
        verticalOrigin={VerticalOrigin.CENTER}
        horizontalOrigin={HorizontalOrigin.CENTER}
        scale={1.2}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
      />

      {/* Callsign Label */}
      <LabelGraphics
        text={entity.callsign}
        font="14px B612, monospace"
        fillColor={labelColor}
        outlineColor={Color.BLACK}
        outlineWidth={2}
        style={LabelStyle.FILL_AND_OUTLINE}
        pixelOffset={new Cartesian2(25, -15)}
        verticalOrigin={VerticalOrigin.CENTER}
        horizontalOrigin={HorizontalOrigin.LEFT}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
        distanceDisplayCondition={new DistanceDisplayCondition(0, 2000000)}
      />

      {/* Data Block (altitude/speed) - shown when closer */}
      <LabelGraphics
        text={`${altitudeText}\n${speedText}`}
        font="11px B612 Mono, monospace"
        fillColor={Color.fromCssColorString("#00D1FF")}
        outlineColor={Color.BLACK}
        outlineWidth={3}
        style={LabelStyle.FILL_AND_OUTLINE}
        pixelOffset={new Cartesian2(25, 8)}
        verticalOrigin={VerticalOrigin.TOP}
        horizontalOrigin={HorizontalOrigin.LEFT}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
        distanceDisplayCondition={new DistanceDisplayCondition(0, 500000)}
      />
    </Entity>
  );
}
