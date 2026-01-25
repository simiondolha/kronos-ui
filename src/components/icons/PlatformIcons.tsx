import { type FC } from "react";
import { PlatformType } from "../../lib/protocol";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * STRIGOI - Stealth UCAV (F-22 style silhouette)
 * Strike/interceptor platform
 */
export const StrigoiIcon: FC<IconProps> = ({
  size = 20,
  color = "currentColor",
  className
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: "block" }}
  >
    {/* F-22 style stealth fighter - angular, swept wings */}
    <path
      d="M12 2 L14 8 L22 12 L14 13 L12 22 L10 13 L2 12 L10 8 Z"
      fill={color}
      opacity={0.9}
    />
    {/* Tail fins */}
    <path
      d="M10 14 L8 18 L10 17 M14 14 L16 18 L14 17"
      stroke={color}
      strokeWidth={1}
      fill="none"
    />
  </svg>
);

/**
 * CORVUS - ISR Drone (MQ-9 Reaper style silhouette)
 * Reconnaissance/surveillance platform
 */
export const CorvusIcon: FC<IconProps> = ({
  size = 20,
  color = "currentColor",
  className
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: "block" }}
  >
    {/* MQ-9 Reaper style - long narrow fuselage, high aspect ratio wings */}
    <path
      d="M12 3 L12.5 10 L22 11 L12.5 12 L12 21 L11.5 12 L2 11 L11.5 10 Z"
      fill={color}
      opacity={0.9}
    />
    {/* V-tail */}
    <path
      d="M11 17 L9 21 L11 19 M13 17 L15 21 L13 19"
      stroke={color}
      strokeWidth={0.8}
      fill="none"
    />
    {/* Sensor pod */}
    <circle cx="12" cy="6" r="1.2" fill={color} />
  </svg>
);

/**
 * VULTUR - Heavy Strike/Surveillance (RQ-4 Global Hawk style)
 * High-altitude long-endurance platform
 */
export const VulturIcon: FC<IconProps> = ({
  size = 20,
  color = "currentColor",
  className
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: "block" }}
  >
    {/* RQ-4 style - bulbous nose, very long straight wings */}
    <ellipse cx="12" cy="5" rx="2" ry="3" fill={color} opacity={0.9} />
    <path
      d="M12 5 L12 20"
      stroke={color}
      strokeWidth={2}
    />
    {/* Long straight wings */}
    <path
      d="M2 10 L22 10"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
    {/* V-tail */}
    <path
      d="M10 18 L7 22 M14 18 L17 22"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Get the appropriate icon component for a platform type
 */
export const getPlatformIcon = (platformType: PlatformType): FC<IconProps> => {
  switch (platformType) {
    case "STRIGOI":
      return StrigoiIcon;
    case "CORVUS":
      return CorvusIcon;
    case "VULTUR":
      return VulturIcon;
    default:
      return StrigoiIcon;
  }
};

/**
 * WeaponsLoadIndicator - Shows weapon load as dots
 * Example: ●●●○ = 3 of 4 weapons remaining
 */
interface WeaponsLoadProps {
  inventory: string[];
  maxSlots?: number;
}

export const WeaponsLoadIndicator: FC<WeaponsLoadProps> = ({
  inventory,
  maxSlots = 4
}) => {
  const loadedCount = inventory.length;
  const emptyCount = Math.max(0, maxSlots - loadedCount);

  return (
    <span style={weaponsLoadStyles.container}>
      {/* Filled dots for loaded weapons */}
      {Array.from({ length: Math.min(loadedCount, maxSlots) }, (_, i) => (
        <span key={`loaded-${i}`} style={weaponsLoadStyles.dotFilled}>
          ●
        </span>
      ))}
      {/* Empty dots for empty slots */}
      {Array.from({ length: emptyCount }, (_, i) => (
        <span key={`empty-${i}`} style={weaponsLoadStyles.dotEmpty}>
          ○
        </span>
      ))}
    </span>
  );
};

const weaponsLoadStyles: Record<string, React.CSSProperties> = {
  container: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1px",
    fontSize: "8px",
    lineHeight: 1,
    letterSpacing: "-1px",
  },
  dotFilled: {
    color: "var(--color-friendly)",
    opacity: 0.8,
  },
  dotEmpty: {
    color: "var(--text-muted)",
    opacity: 0.4,
  },
};

/**
 * PlatformIcon - Unified component that renders the correct icon
 */
interface PlatformIconProps extends IconProps {
  platformType: PlatformType;
}

export const PlatformIcon: FC<PlatformIconProps> = ({
  platformType,
  ...props
}) => {
  const Icon = getPlatformIcon(platformType);
  return <Icon {...props} />;
};
