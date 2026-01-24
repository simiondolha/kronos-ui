import { useState, useEffect, useCallback, useRef } from "react";
import {
  type Scenario,
  type BriefingThreat,
  type BriefingAsset,
} from "../../lib/scenarios";
import {
  flyToRomaniaOverview,
  flyToMissionArea,
  flyToTacticalOverview,
  setCameraPosition,
  type EntityPosition,
} from "../../lib/cesium-config";
import { getGlobalViewer } from "../tactical";

/**
 * Briefing phases for the cinematic intro sequence.
 */
type BriefingPhase =
  | "INITIALIZING"
  | "OVERVIEW"
  | "ZOOM_TO_MISSION"
  | "THREATS_SPAWN"
  | "PAN_TO_BASE"
  | "ASSETS_LAUNCH"
  | "TACTICAL_VIEW"
  | "READY";

interface MissionBriefingProps {
  scenario: Scenario;
  isOpen: boolean;
  onStart: () => void; // User clicks CONTINUE
  onSkip: () => void; // User clicks SKIP
}

/**
 * MissionBriefing - Cinematic mission introduction.
 *
 * Plays a 14-second camera sequence showing:
 * 1. Wide view of Romania
 * 2. Zoom to mission area
 * 3. Threat markers spawn from north
 * 4. Pan to airbase
 * 5. Friendly assets launch
 * 6. Tactical overview
 */
export function MissionBriefing({
  scenario,
  isOpen,
  onStart,
  onSkip,
}: MissionBriefingProps) {
  const [phase, setPhase] = useState<BriefingPhase>("INITIALIZING");
  const [visibleThreats, setVisibleThreats] = useState<BriefingThreat[]>([]);
  const [visibleAssets, setVisibleAssets] = useState<BriefingAsset[]>([]);
  const [assetProgress, setAssetProgress] = useState<Map<string, number>>(
    new Map()
  );
  const animationRef = useRef<number | null>(null);
  const sequenceAbortRef = useRef(false);

  // Get the Cesium viewer
  const getViewer = useCallback(() => {
    return getGlobalViewer();
  }, []);

  // Run the briefing sequence
  const runSequence = useCallback(async () => {
    const viewer = getViewer();
    if (!viewer) {
      console.warn("[MissionBriefing] No viewer available");
      setPhase("READY");
      return;
    }

    sequenceAbortRef.current = false;
    const { briefing } = scenario;

    // Helper to check abort
    const checkAbort = () => sequenceAbortRef.current;

    try {
      // Phase 1: Set initial position (Romania overview)
      setPhase("OVERVIEW");
      setCameraPosition(viewer, 45.9, 25.0, 1200000);

      // Wait a moment, then fly to Romania overview
      await new Promise((r) => setTimeout(r, 500));
      if (checkAbort()) return;

      await flyToRomaniaOverview(viewer, 2);
      if (checkAbort()) return;

      // Phase 2: Zoom to mission area
      setPhase("ZOOM_TO_MISSION");
      await flyToMissionArea(
        viewer,
        briefing.missionCenter.lat,
        briefing.missionCenter.lon,
        2
      );
      if (checkAbort()) return;

      // Phase 3: Show threats spawning
      setPhase("THREATS_SPAWN");
      for (let i = 0; i < briefing.threats.length; i++) {
        if (checkAbort()) return;
        await new Promise((r) => setTimeout(r, 400));
        setVisibleThreats((prev) => [...prev, briefing.threats[i]!]);
      }
      // Hold on threats
      await new Promise((r) => setTimeout(r, 1000));
      if (checkAbort()) return;

      // Phase 4: Pan to airbase
      setPhase("PAN_TO_BASE");
      await flyToMissionArea(
        viewer,
        briefing.airbase.lat,
        briefing.airbase.lon,
        2
      );
      if (checkAbort()) return;

      // Phase 5: Assets launch animation
      setPhase("ASSETS_LAUNCH");
      // Show all assets at once
      setVisibleAssets(briefing.assets);

      // Animate assets from start to end position
      const animationDuration = 2500; // 2.5 seconds
      const startTime = Date.now();

      const animateAssets = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);

        // Easing function (ease-out cubic)
        const eased = 1 - Math.pow(1 - progress, 3);

        const newProgress = new Map<string, number>();
        for (const asset of briefing.assets) {
          newProgress.set(asset.id, eased);
        }
        setAssetProgress(newProgress);

        if (progress < 1 && !checkAbort()) {
          animationRef.current = requestAnimationFrame(animateAssets);
        }
      };
      animationRef.current = requestAnimationFrame(animateAssets);

      // Wait for animation
      await new Promise((r) => setTimeout(r, animationDuration + 500));
      if (checkAbort()) return;

      // Phase 6: Tactical overview
      setPhase("TACTICAL_VIEW");

      // Collect all positions for overview
      const allPositions: EntityPosition[] = [
        ...briefing.threats.map((t) => ({
          lat: t.position.lat,
          lon: t.position.lon,
          alt_m: t.position.alt_m,
        })),
        ...briefing.assets.map((a) => ({
          lat: a.end.lat,
          lon: a.end.lon,
          alt_m: a.end.alt_m,
        })),
      ];

      await flyToTacticalOverview(viewer, allPositions, 2);
      if (checkAbort()) return;

      // Ready for user input
      setPhase("READY");
    } catch (error) {
      console.error("[MissionBriefing] Sequence error:", error);
      setPhase("READY");
    }
  }, [scenario, getViewer]);

  // Start sequence when opened
  useEffect(() => {
    if (isOpen) {
      setPhase("INITIALIZING");
      setVisibleThreats([]);
      setVisibleAssets([]);
      setAssetProgress(new Map());
      sequenceAbortRef.current = false;

      // Start the sequence after a short delay
      const timer = setTimeout(() => {
        runSequence();
      }, 300);

      return () => {
        clearTimeout(timer);
        sequenceAbortRef.current = true;
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isOpen, runSequence]);

  // Handle skip
  const handleSkip = useCallback(() => {
    sequenceAbortRef.current = true;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    onSkip();
  }, [onSkip]);

  // Handle continue
  const handleContinue = useCallback(() => {
    sequenceAbortRef.current = true;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    onStart();
  }, [onStart]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleSkip();
      }
      if (e.key === "Enter" && phase === "READY") {
        e.preventDefault();
        handleContinue();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, phase, handleSkip, handleContinue]);

  if (!isOpen) return null;

  // Calculate interpolated positions for assets
  const getAssetPosition = (asset: BriefingAsset) => {
    const progress = assetProgress.get(asset.id) ?? 0;
    return {
      lat: asset.start.lat + (asset.end.lat - asset.start.lat) * progress,
      lon: asset.start.lon + (asset.end.lon - asset.start.lon) * progress,
      alt_m:
        asset.start.alt_m + (asset.end.alt_m - asset.start.alt_m) * progress,
    };
  };

  return (
    <div style={styles.overlay}>
      {/* HUD Overlay on the globe */}
      <div style={styles.hudOverlay}>
        {/* Phase indicator */}
        <div style={styles.phaseIndicator}>
          <span style={styles.phaseLabel}>
            {getPhaseLabel(phase)}
          </span>
          {phase !== "READY" && (
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${getPhaseProgress(phase)}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Threat markers (rendered as overlay badges) */}
        {visibleThreats.map((threat, i) => (
          <div
            key={threat.id}
            style={{
              ...styles.threatBadge,
              animationDelay: `${i * 0.1}s`,
            }}
          >
            <span style={styles.threatIcon}>!</span>
            <span style={styles.threatLabel}>{threat.label}</span>
          </div>
        ))}

        {/* Asset markers (rendered as overlay badges) */}
        {visibleAssets.map((asset) => {
          const pos = getAssetPosition(asset);
          return (
            <div
              key={asset.id}
              style={{
                ...styles.assetBadge,
                opacity: assetProgress.get(asset.id) ?? 0 > 0 ? 1 : 0,
              }}
            >
              <span style={styles.assetIcon}>
                {asset.type === "STRIGOI"
                  ? "S"
                  : asset.type === "VULTUR"
                  ? "V"
                  : "C"}
              </span>
              <span style={styles.assetLabel}>{asset.callsign}</span>
              <span style={styles.assetAlt}>
                {Math.round(pos.alt_m / 1000)}km
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom info panel */}
      <div style={styles.infoPanel}>
        <div style={styles.infoPanelContent}>
          <div style={styles.scenarioHeader}>
            <span style={styles.scenarioKey}>{scenario.key}</span>
            <span style={styles.scenarioName}>{scenario.name}</span>
          </div>
          <p style={styles.scenarioMission}>
            {getMissionSummary(scenario)}
          </p>
        </div>

        <div style={styles.buttonRow}>
          <button style={styles.skipButton} onClick={handleSkip}>
            SKIP
          </button>
          <button
            style={{
              ...styles.continueButton,
              opacity: phase === "READY" ? 1 : 0.5,
            }}
            onClick={handleContinue}
            disabled={phase !== "READY"}
          >
            {phase === "READY" ? "BEGIN MISSION" : "LOADING..."}
          </button>
        </div>
      </div>

      {/* Keyboard hints */}
      <div style={styles.keyboardHints}>
        ESC to skip | ENTER to continue
      </div>
    </div>
  );
}

/**
 * Get human-readable phase label.
 */
function getPhaseLabel(phase: BriefingPhase): string {
  switch (phase) {
    case "INITIALIZING":
      return "INITIALIZING...";
    case "OVERVIEW":
      return "THEATER OF OPERATIONS";
    case "ZOOM_TO_MISSION":
      return "MISSION AREA";
    case "THREATS_SPAWN":
      return "THREAT ASSESSMENT";
    case "PAN_TO_BASE":
      return "AIRBASE";
    case "ASSETS_LAUNCH":
      return "ASSETS DEPLOYING";
    case "TACTICAL_VIEW":
      return "TACTICAL OVERVIEW";
    case "READY":
      return "MISSION READY";
  }
}

/**
 * Get approximate phase progress (0-100).
 */
function getPhaseProgress(phase: BriefingPhase): number {
  const phases: BriefingPhase[] = [
    "INITIALIZING",
    "OVERVIEW",
    "ZOOM_TO_MISSION",
    "THREATS_SPAWN",
    "PAN_TO_BASE",
    "ASSETS_LAUNCH",
    "TACTICAL_VIEW",
    "READY",
  ];
  const index = phases.indexOf(phase);
  return (index / (phases.length - 1)) * 100;
}

/**
 * Extract mission summary from scenario.
 */
function getMissionSummary(scenario: Scenario): string {
  // Get first sentence of hero story
  const firstParagraph = scenario.heroStory.split("\n\n")[0] ?? "";
  const firstSentence = firstParagraph.split(".")[0] ?? "";
  return firstSentence + ".";
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 900,
    pointerEvents: "none",
  },
  hudOverlay: {
    position: "absolute",
    top: "80px",
    left: "24px",
    right: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    pointerEvents: "none",
  },
  phaseIndicator: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxWidth: "400px",
  },
  phaseLabel: {
    fontSize: "24px",
    fontWeight: 700,
    color: "var(--color-accent)",
    letterSpacing: "0.1em",
    textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
  },
  progressBar: {
    height: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "var(--color-accent)",
    transition: "width 0.5s ease-out",
  },
  threatBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "rgba(255, 69, 58, 0.9)",
    borderRadius: "4px",
    maxWidth: "fit-content",
    animation: "fadeInSlide 0.5s ease-out forwards",
    boxShadow: "0 2px 12px rgba(255, 69, 58, 0.5)",
  },
  threatIcon: {
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "50%",
    fontSize: "12px",
    fontWeight: 700,
    color: "white",
  },
  threatLabel: {
    fontSize: "14px",
    fontWeight: 700,
    color: "white",
    letterSpacing: "0.05em",
  },
  assetBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "rgba(52, 199, 89, 0.9)",
    borderRadius: "4px",
    maxWidth: "fit-content",
    transition: "opacity 0.3s ease-out",
    boxShadow: "0 2px 12px rgba(52, 199, 89, 0.5)",
  },
  assetIcon: {
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: "50%",
    fontSize: "11px",
    fontWeight: 700,
    color: "white",
    fontFamily: "var(--font-family-mono)",
  },
  assetLabel: {
    fontSize: "14px",
    fontWeight: 700,
    color: "white",
    letterSpacing: "0.05em",
  },
  assetAlt: {
    fontSize: "12px",
    fontWeight: 500,
    color: "rgba(255, 255, 255, 0.7)",
    fontFamily: "var(--font-family-mono)",
  },
  infoPanel: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "rgba(10, 14, 20, 0.95)",
    border: "1px solid var(--border-default)",
    borderRadius: "12px",
    padding: "32px 48px",
    pointerEvents: "auto",
    minWidth: "500px",
    maxWidth: "700px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
  },
  infoPanelContent: {
    textAlign: "center",
    marginBottom: "24px",
  },
  scenarioHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    marginBottom: "12px",
  },
  scenarioKey: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--bg-primary)",
    backgroundColor: "var(--color-accent)",
    padding: "4px 12px",
    borderRadius: "4px",
    fontFamily: "var(--font-family-mono)",
  },
  scenarioName: {
    fontSize: "28px",
    fontWeight: 700,
    color: "white",
    letterSpacing: "0.05em",
  },
  scenarioMission: {
    fontSize: "16px",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.5,
  },
  buttonRow: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
  },
  skipButton: {
    padding: "12px 32px",
    backgroundColor: "transparent",
    border: "2px solid var(--border-default)",
    borderRadius: "6px",
    color: "var(--text-secondary)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    letterSpacing: "0.05em",
  },
  continueButton: {
    padding: "12px 48px",
    backgroundColor: "var(--color-accent)",
    border: "none",
    borderRadius: "6px",
    color: "white",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
    letterSpacing: "0.05em",
  },
  keyboardHints: {
    position: "absolute",
    bottom: "8px",
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: "11px",
    color: "var(--text-muted)",
    fontFamily: "var(--font-family-mono)",
    pointerEvents: "none",
  },
};
