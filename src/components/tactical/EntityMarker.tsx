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
} from "cesium";
import type { EntityWithTrail } from "../../stores/entityStore";
import { generateCustomSymbol } from "../../lib/milsymbol";

interface EntityMarkerProps {
  entity: EntityWithTrail;
  selected: boolean;
}

/**
 * EntityMarker - Renders a single entity on the tactical map.
 *
 * Uses MIL-STD-2525E symbology via milsymbol library.
 * Shows callsign label and status indicators.
 */
export function EntityMarker({ entity, selected }: EntityMarkerProps) {
  const position = useMemo(
    () =>
      Cartesian3.fromDegrees(
        entity.position.lon,
        entity.position.lat,
        entity.position.alt_m
      ),
    [entity.position.lon, entity.position.lat, entity.position.alt_m]
  );

  // Generate custom aircraft silhouette symbol
  const symbolUrl = useMemo(
    () =>
      generateCustomSymbol({
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
      {/* Aircraft Silhouette Symbol */}
      <BillboardGraphics
        image={symbolUrl}
        verticalOrigin={VerticalOrigin.CENTER}
        horizontalOrigin={HorizontalOrigin.CENTER}
        scale={1.0}
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
        fillColor={Color.fromCssColorString("#9AA0A6")}
        outlineColor={Color.BLACK}
        outlineWidth={1}
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
