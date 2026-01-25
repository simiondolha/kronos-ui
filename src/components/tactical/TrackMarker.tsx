import { useMemo } from "react";
import { Entity, BillboardGraphics, LabelGraphics, PolylineGraphics } from "resium";
import {
  Cartesian2,
  Cartesian3,
  Color,
  VerticalOrigin,
  HorizontalOrigin,
  LabelStyle,
  DistanceDisplayCondition,
} from "cesium";
import { generateTrackSymbol } from "../../lib/milsymbol";

// Pre-computed colors (avoid creating on every render)
const COLORS = {
  HOSTILE: Color.fromCssColorString("#FF4444"),
  UNKNOWN: Color.fromCssColorString("#FFAB00"),
  NEUTRAL: Color.fromCssColorString("#9AA0A6"),
  FRIENDLY: Color.fromCssColorString("#00E676"),
  DATA_BLOCK: Color.fromCssColorString("#9AA0A6"),
  OUTLINE: Color.BLACK,
} as const;

// Pre-computed offsets
const LABEL_OFFSET = new Cartesian2(25, -15);
const DATA_OFFSET = new Cartesian2(25, 8);
const LABEL_DISTANCE = new DistanceDisplayCondition(0, 2000000);
const DATA_DISTANCE = new DistanceDisplayCondition(0, 500000);

export interface Track {
  track_id: string;
  callsign: string;
  affiliation: "HOSTILE" | "UNKNOWN" | "NEUTRAL" | "FRIENDLY";
  threat_type?: string;
  position: {
    lat: number;
    lon: number;
    alt_m: number;
  };
  velocity: {
    speed_mps: number;
    heading_deg: number;
    climb_rate_mps: number;
  };
  destroyed: boolean;
}

interface TrackMarkerProps {
  track: Track;
  selected?: boolean;
}

/**
 * TrackMarker - Renders a hostile/unknown track on the tactical map.
 *
 * Uses MIL-STD-2525E symbology with red for hostile, yellow for unknown.
 * Shows velocity vector, callsign, and altitude/speed data block.
 */
export function TrackMarker({ track, selected = false }: TrackMarkerProps) {
  // Don't render destroyed tracks
  if (track.destroyed) return null;

  const position = useMemo(
    () =>
      Cartesian3.fromDegrees(
        track.position.lon,
        track.position.lat,
        track.position.alt_m
      ),
    [track.position.lon, track.position.lat, track.position.alt_m]
  );

  // Generate MIL-STD symbol for track with threat type
  const symbolUrl = useMemo(
    () => generateTrackSymbol(track.affiliation, selected, 35, track.threat_type),
    [track.affiliation, selected, track.threat_type]
  );

  // Velocity vector endpoint (10km ahead)
  const velocityEndpoint = useMemo(() => {
    const headingRad = (track.velocity.heading_deg * Math.PI) / 180;
    const vectorLength = 0.1; // ~10km in degrees
    const endLat = track.position.lat + Math.cos(headingRad) * vectorLength;
    const endLon = track.position.lon + Math.sin(headingRad) * vectorLength;
    return Cartesian3.fromDegrees(endLon, endLat, track.position.alt_m);
  }, [
    track.position.lat,
    track.position.lon,
    track.position.alt_m,
    track.velocity.heading_deg,
  ]);

  // Label color based on affiliation (use pre-computed colors)
  const labelColor = COLORS[track.affiliation] ?? COLORS.UNKNOWN;

  // Altitude display
  const altitudeText = useMemo(() => {
    const altFt = Math.round(track.position.alt_m * 3.28084);
    return `FL${Math.round(altFt / 100).toString().padStart(3, "0")}`;
  }, [track.position.alt_m]);

  // Speed display
  const speedText = useMemo(() => {
    const speedKts = Math.round(track.velocity.speed_mps * 1.94384);
    return `${speedKts}KT`;
  }, [track.velocity.speed_mps]);

  return (
    <Entity id={track.track_id} position={position}>
      {/* MIL-STD Symbol */}
      <BillboardGraphics
        image={symbolUrl}
        verticalOrigin={VerticalOrigin.CENTER}
        horizontalOrigin={HorizontalOrigin.CENTER}
        scale={1.0}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
      />

      {/* Velocity Vector Line */}
      <PolylineGraphics
        positions={[position, velocityEndpoint]}
        width={2}
        material={labelColor}
      />

      {/* Callsign Label */}
      <LabelGraphics
        text={track.callsign}
        font="14px B612, monospace"
        fillColor={labelColor}
        outlineColor={COLORS.OUTLINE}
        outlineWidth={2}
        style={LabelStyle.FILL_AND_OUTLINE}
        pixelOffset={LABEL_OFFSET}
        verticalOrigin={VerticalOrigin.CENTER}
        horizontalOrigin={HorizontalOrigin.LEFT}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
        distanceDisplayCondition={LABEL_DISTANCE}
      />

      {/* Data Block (altitude/speed) */}
      <LabelGraphics
        text={`${altitudeText}\n${speedText}`}
        font="11px B612 Mono, monospace"
        fillColor={COLORS.DATA_BLOCK}
        outlineColor={COLORS.OUTLINE}
        outlineWidth={1}
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
