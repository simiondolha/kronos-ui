import { useMemo } from "react";
import { Entity, ModelGraphics, LabelGraphics } from "resium";
import {
  Cartesian3,
  Cartesian2,
  Color,
  VerticalOrigin,
  HorizontalOrigin,
  LabelStyle,
  DistanceDisplayCondition,
  HeadingPitchRoll,
  Transforms,
  ColorBlendMode,
} from "cesium";
import type { EntityWithTrail } from "../../stores/entityStore";
import { PLATFORM_3D_MODELS } from "../../lib/milsymbol";

interface EntityModelProps {
  entity: EntityWithTrail;
  selected: boolean;
  positionOverride?: { lat: number; lon: number; alt_m: number };
}

// Pre-computed colors (avoid creating on every render)
const COLORS = {
  CONNECTED: Color.fromCssColorString("#00E676"),
  DEGRADED: Color.fromCssColorString("#FFAB00"),
  LOST: Color.fromCssColorString("#FF4444"),
  SELECTED: Color.WHITE,
  DATA_BLOCK: Color.fromCssColorString("#B0BEC5"),
  OUTLINE: Color.BLACK,
} as const;

// Pre-computed offsets
const LABEL_OFFSET = new Cartesian2(35, -25);
const DATA_OFFSET = new Cartesian2(35, 0);
const LABEL_DISTANCE = new DistanceDisplayCondition(0, 3000000);
const DATA_DISTANCE = new DistanceDisplayCondition(0, 800000);

/**
 * EntityModel - 3D aircraft model for friendly platforms.
 */
export function EntityModel({ entity, selected, positionOverride }: EntityModelProps) {
  const positionSource = positionOverride ?? entity.position;
  const position = useMemo(
    () => Cartesian3.fromDegrees(
      positionSource.lon,
      positionSource.lat,
      positionSource.alt_m
    ),
    [positionSource.lon, positionSource.lat, positionSource.alt_m]
  );

  const orientation = useMemo(() => {
    const hpr = new HeadingPitchRoll(
      (entity.velocity.heading_deg * Math.PI) / 180,
      Math.atan2(entity.velocity.climb_rate_mps, entity.velocity.speed_mps || 1),
      0
    );
    return Transforms.headingPitchRollQuaternion(position, hpr);
  }, [position, entity.velocity.heading_deg, entity.velocity.climb_rate_mps, entity.velocity.speed_mps]);

  // Link status determines color
  const statusColor = COLORS[entity.link_status] ?? COLORS.CONNECTED;
  const silhouetteColor = selected ? COLORS.SELECTED : statusColor;

  // Data block text
  const altFt = Math.round(entity.position.alt_m * 3.28084);
  const flightLevel = `FL${Math.round(altFt / 100).toString().padStart(3, "0")}`;
  const speedKts = `${Math.round(entity.velocity.speed_mps * 1.94384)}KT`;

  return (
    <Entity
      id={`model-${entity.entity_id}`}
      position={position}
      orientation={orientation}
    >
      <ModelGraphics
        uri={PLATFORM_3D_MODELS[entity.platform_type]}
        scale={2.5}
        minimumPixelSize={80}
        maximumScale={1200}
        silhouetteColor={silhouetteColor}
        silhouetteSize={selected ? 8 : 5}
        colorBlendMode={ColorBlendMode.MIX}
        color={statusColor.withAlpha(0.6)}
      />

      <LabelGraphics
        text={entity.callsign}
        font="bold 15px 'B612', 'Consolas', monospace"
        fillColor={statusColor}
        outlineColor={COLORS.OUTLINE}
        outlineWidth={3}
        style={LabelStyle.FILL_AND_OUTLINE}
        pixelOffset={LABEL_OFFSET}
        verticalOrigin={VerticalOrigin.CENTER}
        horizontalOrigin={HorizontalOrigin.LEFT}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
        distanceDisplayCondition={LABEL_DISTANCE}
      />

      <LabelGraphics
        text={`${flightLevel}\n${speedKts}`}
        font="12px 'B612 Mono', 'Consolas', monospace"
        fillColor={COLORS.DATA_BLOCK}
        outlineColor={COLORS.OUTLINE}
        outlineWidth={2}
        style={LabelStyle.FILL_AND_OUTLINE}
        pixelOffset={DATA_OFFSET}
        verticalOrigin={VerticalOrigin.TOP}
        horizontalOrigin={HorizontalOrigin.LEFT}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
        distanceDisplayCondition={DATA_DISTANCE}
      />
    </Entity>
  );
}
