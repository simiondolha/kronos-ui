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

export interface Track {
  track_id: string;
  callsign: string;
  affiliation: "HOSTILE" | "UNKNOWN" | "NEUTRAL" | "FRIENDLY";
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

  // Generate MIL-STD symbol for track
  const symbolUrl = useMemo(
    () => generateTrackSymbol(track.affiliation, selected, 35),
    [track.affiliation, selected]
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

  // Label color based on affiliation
  const labelColor = useMemo(() => {
    switch (track.affiliation) {
      case "HOSTILE":
        return Color.fromCssColorString("#FF4444"); // Red
      case "UNKNOWN":
        return Color.fromCssColorString("#FFAB00"); // Yellow/amber
      case "NEUTRAL":
        return Color.fromCssColorString("#9AA0A6"); // Gray
      case "FRIENDLY":
        return Color.fromCssColorString("#00E676"); // Green
      default:
        return Color.WHITE;
    }
  }, [track.affiliation]);

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
        outlineColor={Color.BLACK}
        outlineWidth={2}
        style={LabelStyle.FILL_AND_OUTLINE}
        pixelOffset={new Cartesian2(25, -15)}
        verticalOrigin={VerticalOrigin.CENTER}
        horizontalOrigin={HorizontalOrigin.LEFT}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
        distanceDisplayCondition={new DistanceDisplayCondition(0, 2000000)}
      />

      {/* Data Block (altitude/speed) */}
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
