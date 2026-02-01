import { useMemo } from "react";
import { Entity, ModelGraphics, LabelGraphics, PolylineGraphics } from "resium";
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
import { THREAT_3D_MODELS } from "../../lib/milsymbol";
import type { Track } from "./TrackMarker";

interface TrackModelProps {
  track: Track;
  selected?: boolean;
  positionOverride?: { lat: number; lon: number; alt_m: number };
}

// Pre-computed colors (avoid creating on every render)
const COLORS = {
  HOSTILE: Color.fromCssColorString("#FF1744"),
  UNKNOWN: Color.fromCssColorString("#FFD600"),
  NEUTRAL: Color.fromCssColorString("#78909C"),
  FRIENDLY: Color.fromCssColorString("#00E676"),
  SELECTED: Color.WHITE,
  DATA_BLOCK: Color.fromCssColorString("#00D1FF"), // Cyan for visibility
  OUTLINE: Color.BLACK,
} as const;

// Pre-computed offsets
const LABEL_OFFSET = new Cartesian2(35, -25);
const DATA_OFFSET = new Cartesian2(35, 0);
const LABEL_DISTANCE = new DistanceDisplayCondition(0, 3000000);
const DATA_DISTANCE = new DistanceDisplayCondition(0, 800000);

/**
 * TrackModel - 3D aircraft model for hostile/unknown tracks.
 */
export function TrackModel({ track, selected = false, positionOverride }: TrackModelProps) {
  if (track.destroyed) return null;

  const positionSource = positionOverride ?? track.position;
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
      (track.velocity.heading_deg * Math.PI) / 180,
      Math.atan2(track.velocity.climb_rate_mps, track.velocity.speed_mps || 1),
      0
    );
    return Transforms.headingPitchRollQuaternion(position, hpr);
  }, [position, track.velocity.heading_deg, track.velocity.climb_rate_mps, track.velocity.speed_mps]);

  const velocityEndpoint = useMemo(() => {
    const headingRad = (track.velocity.heading_deg * Math.PI) / 180;
    return Cartesian3.fromDegrees(
      positionSource.lon + Math.sin(headingRad) * 0.12,
      positionSource.lat + Math.cos(headingRad) * 0.12,
      positionSource.alt_m
    );
  }, [positionSource.lon, positionSource.lat, positionSource.alt_m, track.velocity.heading_deg]);

  // Get model and colors based on affiliation
  const modelUri = track.affiliation === "HOSTILE"
    ? (THREAT_3D_MODELS.HOSTILE ?? "/models/fighter.glb")
    : (THREAT_3D_MODELS.UNKNOWN ?? "/models/fighter.glb");
  const affiliationColor = COLORS[track.affiliation] ?? COLORS.UNKNOWN;
  const silhouetteColor = selected ? COLORS.SELECTED : affiliationColor;

  // Data block
  const altFt = Math.round(positionSource.alt_m * 3.28084);
  const flightLevel = `FL${Math.round(altFt / 100).toString().padStart(3, "0")}`;
  const speedKts = `${Math.round(track.velocity.speed_mps * 1.94384)}KT`;

  return (
    <Entity
      id={`model-${track.track_id}`}
      position={position}
      orientation={orientation}
    >
      <ModelGraphics
        uri={modelUri}
        scale={2.5}
        minimumPixelSize={72}
        maximumScale={1000}
        silhouetteColor={silhouetteColor}
        silhouetteSize={selected ? 8 : 6}
        colorBlendMode={ColorBlendMode.MIX}
        color={affiliationColor.withAlpha(0.7)}
      />

      <PolylineGraphics
        positions={[position, velocityEndpoint]}
        width={2.5}
        material={affiliationColor}
      />

      <LabelGraphics
        text={track.callsign}
        font="bold 15px 'B612', 'Consolas', monospace"
        fillColor={affiliationColor}
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
