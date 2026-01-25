import { useRef, useEffect, useCallback, useMemo } from "react";
import { Viewer } from "resium";
import {
  Viewer as CesiumViewer,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
} from "cesium";
import { useEntityStore } from "../../stores/entityStore";
import { useUIStore } from "../../stores/uiStore";
import { VIEWER_OPTIONS, configureViewer, requestRender } from "../../lib/cesium-config";
import { EntityMarker } from "./EntityMarker";
import { EntityModel } from "./EntityModel";
import { FlightPath } from "./FlightPath";
import { TrackMarker } from "./TrackMarker";
import { TrackModel } from "./TrackModel";
import { MissileMarker } from "./MissileMarker";

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

  // Entity state - subscribe to Map directly to avoid new array on every render
  const entitiesMap = useEntityStore((s) => s.entities);
  const tracksMap = useEntityStore((s) => s.tracks);
  const missilesMap = useEntityStore((s) => s.missiles);
  const selectedEntityId = useEntityStore((s) => s.selectedEntityId);
  const selectEntity = useEntityStore((s) => s.selectEntity);

  // Visualization mode
  const use3DModels = useUIStore((s) => s.use3DModels);

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

  // Request render when entities/tracks/missiles update or visualization mode changes
  useEffect(() => {
    requestRender(viewerRef.current);
  }, [entities, tracks, missiles, selectedEntityId, use3DModels]);

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
          />
        ) : (
          <EntityMarker
            key={entity.entity_id}
            entity={entity}
            selected={entity.entity_id === selectedEntityId}
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
          />
        ) : (
          <TrackMarker
            key={track.track_id}
            track={track}
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
    </Viewer>
  );
}
