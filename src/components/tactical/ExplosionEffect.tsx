import { useEffect, useState, useMemo } from "react";
import { Entity, BillboardGraphics, EllipseGraphics } from "resium";
import { Cartesian3, Color, VerticalOrigin, HorizontalOrigin } from "cesium";
import type { Explosion } from "../../stores/entityStore";
import { useEntityStore } from "../../stores/entityStore";

// Static fireball SVG - generated once, scaled by Cesium
const FIREBALL_SVG = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="fb">
      <stop offset="0%" stop-color="#FFFFC8"/>
      <stop offset="30%" stop-color="#FF6600"/>
      <stop offset="70%" stop-color="#CC2200"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#fb)"/>
</svg>
`)}`;

interface ExplosionEffectProps {
  explosion: Explosion;
}

/**
 * Animated explosion effect. Uses static SVG with dynamic scale/opacity.
 */
export function ExplosionEffect({ explosion }: ExplosionEffectProps) {
  const removeExplosion = useEntityStore((s) => s.removeExplosion);
  const [progress, setProgress] = useState(0);

  // Animation loop
  useEffect(() => {
    let frameId: number;
    const { startTime, duration } = explosion;

    const animate = () => {
      const p = Math.min((Date.now() - startTime) / duration, 1);
      setProgress(p);
      if (p < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        removeExplosion(explosion.id);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [explosion.id, explosion.startTime, explosion.duration, removeExplosion]);

  const position = useMemo(
    () => Cartesian3.fromDegrees(
      explosion.position.lon,
      explosion.position.lat,
      explosion.position.alt_m
    ),
    [explosion.position.lon, explosion.position.lat, explosion.position.alt_m]
  );

  // Scale: fast expand (0-30%), hold (30-100%) - smaller explosion
  const scale = progress < 0.3 ? 0.5 + 1.5 * (progress / 0.3) : 2;

  // Opacity: full until 50%, then fade
  const opacity = progress < 0.5 ? 1 : 1 - (progress - 0.5) / 0.5;

  // Ring radius expands throughout - smaller ring
  const ringRadius = 100 + 200 * progress;

  return (
    <Entity id={`explosion-${explosion.id}`} position={position}>
      <BillboardGraphics
        image={FIREBALL_SVG}
        scale={scale}
        color={Color.WHITE.withAlpha(opacity)}
        verticalOrigin={VerticalOrigin.CENTER}
        horizontalOrigin={HorizontalOrigin.CENTER}
        disableDepthTestDistance={Number.POSITIVE_INFINITY}
      />
      <EllipseGraphics
        semiMajorAxis={ringRadius}
        semiMinorAxis={ringRadius}
        height={explosion.position.alt_m}
        fill={false}
        outline
        outlineColor={Color.ORANGE.withAlpha(opacity * 0.5)}
        outlineWidth={2}
      />
    </Entity>
  );
}
