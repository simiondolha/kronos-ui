import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { Viewer, Entity, PointGraphics, LabelGraphics, PolylineGraphics } from "resium";
import {
  Viewer as CesiumViewer,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Cartographic,
  Cartesian3,
  Cartesian2,
  Color,
  LabelStyle,
  Math as CesiumMath,
} from "cesium";
import { useEntityStore } from "../../stores/entityStore";
import { useUIStore } from "../../stores/uiStore";
import { useMissionPlanningStore } from "../../stores/missionPlanningStore";
import { VIEWER_OPTIONS, configureViewer, requestRender } from "../../lib/cesium-config";
import { EntityMarker } from "./EntityMarker";
import { EntityModel } from "./EntityModel";
import { FlightPath } from "./FlightPath";
import { TrackMarker } from "./TrackMarker";
import { TrackModel } from "./TrackModel";
import { MissileMarker } from "./MissileMarker";
import { ExplosionEffect } from "./ExplosionEffect";

// Global viewer reference for external access (e.g., "Fly to Assets" button)
let globalViewerRef: CesiumViewer | null = null;

export function getGlobalViewer(): CesiumViewer | null {
  return globalViewerRef;
}

/**
 * TacticalMap - Main CesiumJS globe component for KRONOS.
 *
 * Features:
 * - MIL-STD-2525E entity symbols
 * - Flight path trails
 * - Click-to-select entities
 * - requestRenderMode for performance
 */
export function TacticalMap() {
  const viewerRef = useRef<CesiumViewer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  // Entity state - subscribe to Map directly to avoid new array on every render
  const entitiesMap = useEntityStore((s) => s.entities);
  const tracksMap = useEntityStore((s) => s.tracks);
  const missilesMap = useEntityStore((s) => s.missiles);
  const explosionsMap = useEntityStore((s) => s.explosions);
  const selectedEntityId = useEntityStore((s) => s.selectedEntityId);
  const selectEntity = useEntityStore((s) => s.selectEntity);

  // Visualization mode
  const use3DModels = useUIStore((s) => s.use3DModels);

  // Mission planning state
  const waypoints = useMissionPlanningStore((s) => s.waypoints);

  // Memoize array conversion - only recalculate when Map changes
  const entities = useMemo(
    () => Array.from(entitiesMap.values()),
    [entitiesMap]
  );

  const tracks = useMemo(
    () => Array.from(tracksMap.values()),
    [tracksMap]
  );

  const missiles = useMemo(
    () => Array.from(missilesMap.values()),
    [missilesMap]
  );

  const explosions = useMemo(
    () => Array.from(explosionsMap.values()),
    [explosionsMap]
  );

  // Configure viewer on mount
  const handleViewerReady = useCallback(async (viewer: CesiumViewer) => {
    viewerRef.current = viewer;
    globalViewerRef = viewer;

    // Apply configuration
    await configureViewer(viewer);

    // Setup click handler for entity selection
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handlerRef.current = handler;

    handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
      const pickedObject = viewer.scene.pick(event.position);

      const liveDrawMode = useMissionPlanningStore.getState().drawMode;
      if (liveDrawMode) {
        const picked = viewer.scene.pickPosition(event.position);
        if (defined(picked)) {
          const carto = Cartographic.fromCartesian(picked);
          useMissionPlanningStore.getState().addWaypoint({
            lat: CesiumMath.toDegrees(carto.latitude),
            lon: CesiumMath.toDegrees(carto.longitude),
            alt_m: Math.max(200.0, carto.height || 0),
          });
          requestRender(viewer);
          return;
        }
      }

      if (defined(pickedObject) && defined(pickedObject.id)) {
        const entityId = pickedObject.id.id;
        if (entityId) {
          selectEntity(entityId);
        }
      } else {
        // Click on empty space - deselect
        selectEntity(null);
      }

      requestRender(viewer);
    }, ScreenSpaceEventType.LEFT_CLICK);

    requestRender(viewer);
  }, [selectEntity]);

  // Request render when entities/tracks/missiles/explosions update or visualization mode changes
  useEffect(() => {
    requestRender(viewerRef.current);
  }, [entities, tracks, missiles, explosions, selectedEntityId, use3DModels]);

  // Periodic re-render to allow predictive interpolation
  useEffect(() => {
    const interval = setInterval(() => {
      setRenderTick((t) => (t + 1) % 1000000);
      requestRender(viewerRef.current);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const getPredictedPosition = useCallback((entity: (typeof entities)[number]) => {
    const now = Date.now();
    const dt = Math.min((now - entity.lastUpdate) / 1000, 1.5);
    if (dt <= 0) return entity.position;

    const distance = entity.velocity.speed_mps * dt;
    const bearing = (entity.velocity.heading_deg * Math.PI) / 180;
    const latRad = (entity.position.lat * Math.PI) / 180;

    const dlat = (distance / 111320) * Math.cos(bearing);
    const dlon = (distance / (111320 * Math.cos(latRad))) * Math.sin(bearing);

    const predicted = {
      lat: entity.position.lat + dlat,
      lon: entity.position.lon + dlon,
      alt_m: entity.position.alt_m + entity.velocity.climb_rate_mps * dt,
    };

    const snapped = distance > 50 ? entity.position : predicted;
    return snapped;
  }, [renderTick]);

  const getPredictedTrackPosition = useCallback((track: (typeof tracks)[number]) => {
    const now = Date.now();
    const dt = Math.min((now - (track.lastUpdate || now)) / 1000, 1.5);
    if (dt <= 0) return track.position;

    const distance = track.velocity.speed_mps * dt;
    const bearing = (track.velocity.heading_deg * Math.PI) / 180;
    const latRad = (track.position.lat * Math.PI) / 180;

    const dlat = (distance / 111320) * Math.cos(bearing);
    const dlon = (distance / (111320 * Math.cos(latRad))) * Math.sin(bearing);

    const predicted = {
      lat: track.position.lat + dlat,
      lon: track.position.lon + dlon,
      alt_m: track.position.alt_m + track.velocity.climb_rate_mps * dt,
    };

    const snapped = distance > 50 ? track.position : predicted;
    return snapped;
  }, [renderTick]);

  // DISABLED: Auto-fly removed - camera should only fly when user starts mission
  // The "FLY TO ASSETS" button or mission start trigger handles camera positioning
  // useEffect(() => {
  //   if (
  //     !hasAutoFlown.current &&
  //     entities.length > 0 &&
  //     viewerRef.current &&
  //     !viewerRef.current.isDestroyed()
  //   ) {
  //     hasAutoFlown.current = true;
  //     const positions = entities.map((e) => e.position);
  //     flyToEntities(viewerRef.current, positions);
  //   }
  // }, [entities]);

  // Cleanup handler on unmount
  useEffect(() => {
    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
    };
  }, []);

  return (
    <Viewer
      full
      {...VIEWER_OPTIONS}
      ref={(e) => {
        if (e?.cesiumElement && !viewerRef.current) {
          handleViewerReady(e.cesiumElement);
        }
      }}
    >
      {/* Entity markers - 3D models or 2D billboards */}
      {entities.map((entity) =>
        use3DModels ? (
          <EntityModel
            key={entity.entity_id}
            entity={entity}
            selected={entity.entity_id === selectedEntityId}
            positionOverride={getPredictedPosition(entity)}
          />
        ) : (
          <EntityMarker
            key={entity.entity_id}
            entity={entity}
            selected={entity.entity_id === selectedEntityId}
            positionOverride={getPredictedPosition(entity)}
          />
        )
      )}

      {/* Flight path trails */}
      {entities.map((entity) => (
        <FlightPath
          key={`trail-${entity.entity_id}`}
          entity={entity}
          selected={entity.entity_id === selectedEntityId}
        />
      ))}

      {/* Hostile/unknown tracks - 3D models or 2D billboards */}
      {tracks.map((track) =>
        use3DModels ? (
          <TrackModel
            key={track.track_id}
            track={track}
            positionOverride={getPredictedTrackPosition(track)}
          />
        ) : (
          <TrackMarker
            key={track.track_id}
            track={track}
            positionOverride={getPredictedTrackPosition(track)}
          />
        )
      )}

      {/* Missiles in flight */}
      {missiles.map((missile) => (
        <MissileMarker
          key={missile.missile_id}
          missile={missile}
        />
      ))}

      {/* Explosion effects */}
      {explosions.map((explosion) => (
        <ExplosionEffect
          key={explosion.id}
          explosion={explosion}
        />
      ))}

      {/* Mission waypoints (planning overlay) */}
      {waypoints.length > 0 && (
        <>
          <Entity>
            <PolylineGraphics
              positions={waypoints.map((w) => Cartesian3.fromDegrees(w.lon, w.lat, w.alt_m))}
              width={2}
              material={Color.fromCssColorString("#00D1FF")}
            />
          </Entity>
          {waypoints.map((w, idx) => (
            <Entity key={`wp-${idx}`} position={Cartesian3.fromDegrees(w.lon, w.lat, w.alt_m)}>
              <PointGraphics
                color={Color.fromCssColorString("#00E676")}
                pixelSize={10}
                outlineColor={Color.BLACK}
                outlineWidth={2}
                disableDepthTestDistance={Number.POSITIVE_INFINITY}
              />
              <LabelGraphics
                text={`WP${idx + 1}`}
                font="12px B612, monospace"
                fillColor={Color.fromCssColorString("#00E676")}
                outlineColor={Color.BLACK}
                outlineWidth={2}
                style={LabelStyle.FILL_AND_OUTLINE}
                pixelOffset={new Cartesian2(12, -8)}
                disableDepthTestDistance={Number.POSITIVE_INFINITY}
              />
            </Entity>
          ))}
        </>
      )}
    </Viewer>
  );
}
