import React, { useMemo } from 'react';
import { Entity, PolylineGraphics, LabelGraphics } from 'resium';
import {
  Cartesian3,
  Cartesian2,
  Color,
  PolylineDashMaterialProperty,
  VerticalOrigin,
  LabelStyle,
} from 'cesium';
import { useSwarmStore } from '../../stores/swarmStore';
import type { FormationType } from '../../types/drone';

const FORMATION_COLORS: Record<FormationType, string> = {
  line: '#3b82f6',
  wedge: '#10b981',
  orbit: '#f59e0b',
  scatter: '#8b5cf6',
  diamond: '#ef4444',
};

function buildConnections(
  positions: Cartesian3[],
  formation: FormationType,
  leaderIdx: number
): Cartesian3[][] {
  const leader = leaderIdx >= 0 ? leaderIdx : 0;
  if (positions.length < 2) return [];

  switch (formation) {
    case 'line':
      return positions.slice(0, -1).map((p, i) => [p, positions[i + 1]!]);

    case 'wedge':
    case 'diamond':
      return positions
        .filter((_, i) => i !== leader)
        .map((p) => [positions[leader]!, p]);

    case 'orbit':
      return positions.map((p, i) => [p, positions[(i + 1) % positions.length]!]);

    case 'scatter':
    default:
      return positions.slice(1).map((p) => [positions[0]!, p]);
  }
}

export const SwarmOverlay: React.FC = React.memo(() => {
  const swarm = useSwarmStore((s) => s.swarm);
  // Access raw Map to avoid infinite loop (getSwarmDrones returns new array each call)
  const droneMap = useSwarmStore((s) => s.drones);

  // Compute swarm drones in useMemo to avoid infinite re-renders
  const drones = useMemo(() => {
    if (!swarm) return [];
    return swarm.members
      .map((m) => droneMap.get(m.drone_id))
      .filter((d): d is NonNullable<typeof d> => d !== undefined);
  }, [swarm, droneMap]);

  const { connections, labelPos, color } = useMemo(() => {
    if (!swarm || drones.length < 2) {
      return { connections: [], labelPos: null, color: null };
    }

    const pos = drones.map((d) =>
      Cartesian3.fromDegrees(d.position.lon, d.position.lat, d.position.alt_m)
    );
    const idx = drones.findIndex((d) => d.entity_id === swarm.leader_id);
    const conns = buildConnections(pos, swarm.formation_type, idx);
    const label = idx >= 0 ? pos[idx] : pos[0];
    const col = Color.fromCssColorString(FORMATION_COLORS[swarm.formation_type]);

    return { connections: conns, labelPos: label, color: col };
  }, [swarm, drones]);

  if (!swarm?.formation_active || drones.length < 2) {
    return null;
  }

  const labelText = swarm.formation_type.charAt(0).toUpperCase() +
    swarm.formation_type.slice(1) + ' Formation';

  return (
    <>
      {connections.map((pair, i) => (
        <Entity key={`swarm-line-${i}`}>
          <PolylineGraphics
            positions={pair}
            width={2}
            material={new PolylineDashMaterialProperty({
              color: color!.withAlpha(0.8),
              dashLength: 16,
            })}
          />
        </Entity>
      ))}

      {labelPos && (
        <Entity position={labelPos}>
          <LabelGraphics
            text={labelText}
            font="14px sans-serif"
            fillColor={color!}
            outlineColor={Color.BLACK}
            outlineWidth={2}
            style={LabelStyle.FILL_AND_OUTLINE}
            verticalOrigin={VerticalOrigin.BOTTOM}
            pixelOffset={new Cartesian2(0, -20)}
            disableDepthTestDistance={Number.POSITIVE_INFINITY}
          />
        </Entity>
      )}
    </>
  );
});

SwarmOverlay.displayName = 'SwarmOverlay';
