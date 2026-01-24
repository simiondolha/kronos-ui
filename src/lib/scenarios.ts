/**
 * KRONOS Training Scenarios
 *
 * 6 demo scenarios with hero stories and mission evolution.
 * Each scenario teaches a different aspect of human-machine teaming.
 */

export interface MissionEvent {
  time: number; // seconds
  event: string;
  isPause: boolean;
}

export interface ScenarioAsset {
  type: "STRIGOI" | "CORVUS" | "VULTUR";
  callsign: string;
  count: number;
}

/** Position for briefing animations */
export interface BriefingPosition {
  lat: number;
  lon: number;
  alt_m: number;
}

/** Threat marker for briefing */
export interface BriefingThreat {
  id: string;
  position: BriefingPosition;
  heading: number; // degrees
  label: string;
}

/** Asset position for briefing animation */
export interface BriefingAsset {
  id: string;
  callsign: string;
  type: "STRIGOI" | "CORVUS" | "VULTUR";
  start: BriefingPosition; // Airbase position
  end: BriefingPosition;   // Patrol/mission position
}

/** Briefing configuration for cinematic intro */
export interface BriefingConfig {
  airbase: BriefingPosition;
  missionCenter: BriefingPosition;
  threats: BriefingThreat[];
  assets: BriefingAsset[];
}

export interface Scenario {
  id: string;
  key: string; // 1-6
  name: string;
  shortName: string;
  duration: string;
  durationMin: number;
  heroStory: string;
  assets: ScenarioAsset[];
  threats: string;
  learning: string;
  evolution: MissionEvent[];
  briefing: BriefingConfig;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "demo-1",
    key: "1",
    name: "AUTONOMOUS DEFENSE",
    shortName: "DCA Point Defense",
    duration: "5 min",
    durationMin: 5,
    heroStory: `0430 hours. Bucharest Air Defense Sector.

You are the duty commander at KRONOS Ground Control. Your two Strigoi combat drones, SHADOW-1 and SHADOW-2, patrol at 8,000 meters. HAWK-1 provides early warning from 12,000m.

Radar contacts. Four hostile fighters inbound from the north, heading straight for the airbase.

The AI has a plan. It needs ONE approval from you. With that single authorization, KRONOS will coordinate both aircraft autonomously to defend the base. Every decision logged. Every action traceable.

This is bounded autonomy. One human command. Multiple autonomous executions.`,
    assets: [
      { type: "STRIGOI", callsign: "SHADOW-1/2", count: 2 },
      { type: "VULTUR", callsign: "HAWK-1", count: 1 },
    ],
    threats: "4x Hostile Fighters",
    learning: "Authority gating enables bounded autonomy",
    evolution: [
      { time: 0, event: "Patrol phase - Assets on station", isPause: false },
      { time: 30, event: "Detection - 4 hostile fighters spawn", isPause: false },
      { time: 45, event: "PAUSE: Review track confidence levels", isPause: true },
      { time: 60, event: "AI requests engagement authorization", isPause: false },
      { time: 75, event: "PAUSE: Discuss threat assessment", isPause: true },
      { time: 120, event: "Autonomous intercept coordination", isPause: false },
      { time: 210, event: "Threats neutralized, RTB", isPause: false },
      { time: 270, event: "DEBRIEF: 0 commands after initial approval", isPause: true },
    ],
    briefing: {
      airbase: { lat: 44.5, lon: 25.0, alt_m: 0 },
      missionCenter: { lat: 45.5, lon: 25.0, alt_m: 0 },
      threats: [
        { id: "hostile-1", position: { lat: 47.0, lon: 24.5, alt_m: 8000 }, heading: 180, label: "BANDIT-1" },
        { id: "hostile-2", position: { lat: 47.0, lon: 25.0, alt_m: 8000 }, heading: 180, label: "BANDIT-2" },
        { id: "hostile-3", position: { lat: 47.0, lon: 25.5, alt_m: 8500 }, heading: 180, label: "BANDIT-3" },
        { id: "hostile-4", position: { lat: 47.0, lon: 26.0, alt_m: 8500 }, heading: 180, label: "BANDIT-4" },
      ],
      assets: [
        { id: "strigoi-001", callsign: "SHADOW-1", type: "STRIGOI", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.0, lon: 25.0, alt_m: 8000 } },
        { id: "strigoi-002", callsign: "SHADOW-2", type: "STRIGOI", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.0, lon: 25.1, alt_m: 8500 } },
        { id: "vultur-001", callsign: "HAWK-1", type: "VULTUR", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.2, lon: 25.0, alt_m: 12000 } },
      ],
    },
  },
  {
    id: "demo-2",
    key: "2",
    name: "STRIKE PACKAGE",
    shortName: "Coordinated Strike",
    duration: "7 min",
    durationMin: 7,
    heroStory: `The intelligence is solid. An enemy command post, 80km beyond the FEBA.

This mission requires the full TRIAD: VULTUR for surveillance, CORVUS for target designation, STRIGOI for prosecution. Three platforms, one objective.

You will guide the package to the target. The AI coordinates the choreography—timing, approach vectors, sensor handoffs. But every weapons release requires YOUR authorization.

Coordinate. Authorize. Execute.`,
    assets: [
      { type: "STRIGOI", callsign: "SHADOW-1", count: 1 },
      { type: "CORVUS", callsign: "RAVEN-1", count: 1 },
      { type: "VULTUR", callsign: "HAWK-1", count: 1 },
    ],
    threats: "Enemy Command Post + Air Defenses",
    learning: "Multi-platform coordination with human authority",
    evolution: [
      { time: 0, event: "Package assembly - TRIAD forms up", isPause: false },
      { time: 60, event: "Ingress begins - Coordinated penetration", isPause: false },
      { time: 120, event: "VULTUR detects target", isPause: false },
      { time: 150, event: "PAUSE: CORVUS confirms target", isPause: true },
      { time: 180, event: "Weapons authorization requested", isPause: false },
      { time: 210, event: "PAUSE: Strike decision point", isPause: true },
      { time: 240, event: "Prosecution phase", isPause: false },
      { time: 300, event: "Target destroyed - Egress", isPause: false },
      { time: 420, event: "DEBRIEF: Coordinated strike success", isPause: true },
    ],
    briefing: {
      airbase: { lat: 44.5, lon: 25.0, alt_m: 0 },
      missionCenter: { lat: 45.8, lon: 25.5, alt_m: 0 },
      threats: [
        { id: "target-1", position: { lat: 46.5, lon: 25.5, alt_m: 0 }, heading: 0, label: "COMMAND POST" },
        { id: "sam-1", position: { lat: 46.2, lon: 25.3, alt_m: 0 }, heading: 0, label: "SAM SITE" },
        { id: "sam-2", position: { lat: 46.2, lon: 25.7, alt_m: 0 }, heading: 0, label: "SAM SITE" },
      ],
      assets: [
        { id: "strigoi-001", callsign: "SHADOW-1", type: "STRIGOI", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.5, lon: 25.2, alt_m: 6000 } },
        { id: "corvus-001", callsign: "RAVEN-1", type: "CORVUS", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.8, lon: 25.5, alt_m: 4000 } },
        { id: "vultur-001", callsign: "HAWK-1", type: "VULTUR", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.5, lon: 25.8, alt_m: 12000 } },
      ],
    },
  },
  {
    id: "demo-3",
    key: "3",
    name: "HUMAN CONTROL",
    shortName: "Coordinated ISR",
    duration: "5 min",
    durationMin: 5,
    heroStory: `Surveillance sector active. VULTUR orbits at angels 40, sensors sweeping.

Contact. Unknown aircraft, patrol pattern. The AI wants to prosecute—confidence 0.78.

But you pause. Something feels wrong. You task CORVUS for visual confirmation.

The contact is hostile. But the mission doesn't require destruction—surveillance continues. Intelligence gathered is often more valuable than targets destroyed.

Sometimes the right decision is to NOT shoot. Restraint is also a decision.`,
    assets: [
      { type: "VULTUR", callsign: "HAWK-1", count: 1 },
      { type: "CORVUS", callsign: "RAVEN-1", count: 1 },
      { type: "STRIGOI", callsign: "SHADOW-1", count: 1 },
    ],
    threats: "Unknown Contact (Hostile)",
    learning: "Restraint demonstrates human judgment value",
    evolution: [
      { time: 0, event: "Surveillance active - VULTUR on station", isPause: false },
      { time: 50, event: "VULTUR detects unknown contact", isPause: false },
      { time: 60, event: "PAUSE: Show dynamic tasking to CORVUS", isPause: true },
      { time: 90, event: "CORVUS repositions for visual", isPause: false },
      { time: 120, event: "Contact classified HOSTILE", isPause: false },
      { time: 150, event: "PAUSE: Operator DENIES prosecution", isPause: true },
      { time: 180, event: "Surveillance continues", isPause: false },
      { time: 270, event: "DEBRIEF: Restraint as valid decision", isPause: true },
    ],
    briefing: {
      airbase: { lat: 44.5, lon: 25.0, alt_m: 0 },
      missionCenter: { lat: 45.5, lon: 25.0, alt_m: 0 },
      threats: [
        { id: "unknown-1", position: { lat: 46.0, lon: 25.3, alt_m: 6000 }, heading: 225, label: "UNKNOWN" },
      ],
      assets: [
        { id: "vultur-001", callsign: "HAWK-1", type: "VULTUR", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.5, lon: 25.0, alt_m: 12000 } },
        { id: "corvus-001", callsign: "RAVEN-1", type: "CORVUS", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.3, lon: 25.2, alt_m: 4000 } },
        { id: "strigoi-001", callsign: "SHADOW-1", type: "STRIGOI", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.0, lon: 24.8, alt_m: 8000 } },
      ],
    },
  },
  {
    id: "demo-4",
    key: "4",
    name: "RESILIENCE",
    shortName: "Lost Link Safety",
    duration: "4 min",
    durationMin: 4,
    heroStory: `Electronic warfare. The enemy is jamming.

SHADOW-1's datalink flickers. Then dies. Your screen shows "LINK LOST."

This is the moment that separates trustworthy autonomy from dangerous automation.

Within 100 milliseconds—faster than human reaction—KRONOS executes the safety invariant: WEAPONS SAFE. Non-negotiable. Hardcoded. Unjammable.

The aircraft doesn't panic. It executes its pre-briefed profile: orbit and wait for link restoration. No rogue decisions. No autonomous violence without human connection.

The link returns. Operations resume. The audit log shows every autonomous action during the outage.`,
    assets: [
      { type: "STRIGOI", callsign: "SHADOW-1", count: 1 },
      { type: "STRIGOI", callsign: "SHADOW-2", count: 1 },
    ],
    threats: "Electronic Warfare / Jamming",
    learning: "Lost link = weapons SAFE. Non-negotiable.",
    evolution: [
      { time: 0, event: "Normal CAP operations", isPause: false },
      { time: 30, event: "Jamming starts - Link degradation", isPause: false },
      { time: 45, event: "PAUSE: Link lost - Weapons -> SAFE", isPause: true },
      { time: 60, event: "CRITICAL: Weapons automatically SAFE", isPause: false },
      { time: 90, event: "Pre-briefed profile: orbit and wait", isPause: false },
      { time: 150, event: "Link restored - Operations resume", isPause: false },
      { time: 180, event: "DEBRIEF: Review autonomous actions", isPause: true },
    ],
    briefing: {
      airbase: { lat: 44.5, lon: 25.0, alt_m: 0 },
      missionCenter: { lat: 45.5, lon: 25.0, alt_m: 0 },
      threats: [
        { id: "jammer-1", position: { lat: 46.0, lon: 25.5, alt_m: 0 }, heading: 0, label: "EW SOURCE" },
      ],
      assets: [
        { id: "strigoi-001", callsign: "SHADOW-1", type: "STRIGOI", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.0, lon: 25.0, alt_m: 8000 } },
        { id: "strigoi-002", callsign: "SHADOW-2", type: "STRIGOI", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.0, lon: 25.2, alt_m: 8500 } },
      ],
    },
  },
  {
    id: "demo-5",
    key: "5",
    name: "ETHICAL DECISION",
    shortName: "Safety Guarantees",
    duration: "4 min",
    durationMin: 4,
    heroStory: `Contact approaching. The AI is confident—72% probability hostile.

72% is not 100%.

You order visual identification. SHADOW-1 closes for a look.

"VISUAL: CIVILIAN AIRCRAFT."

Your stomach drops. The AI would have engaged. 72% confidence on a civilian airliner.

This is why humans stay in the loop. This is why we don't automate death.

The audit trail shows everything: the AI's recommendation, your decision to verify, the correct outcome. Evidence that human judgment prevented catastrophe.`,
    assets: [
      { type: "STRIGOI", callsign: "SHADOW-1", count: 1 },
    ],
    threats: "Unknown Contact (Actually Civilian)",
    learning: "AI confidence != certainty. Human judgment prevents tragedy.",
    evolution: [
      { time: 0, event: "Contact detected", isPause: false },
      { time: 15, event: "PAUSE: AI classifies 'probable hostile' (0.72)", isPause: true },
      { time: 30, event: "AI recommends intercept", isPause: false },
      { time: 45, event: "PAUSE: Operator requests VISUAL ID", isPause: true },
      { time: 60, event: "SHADOW-1 closes for visual", isPause: false },
      { time: 75, event: "CRITICAL: CIVILIAN AIRCRAFT", isPause: false },
      { time: 90, event: "PAUSE: Without human = catastrophic", isPause: true },
      { time: 150, event: "DEBRIEF: Full decision chain in audit", isPause: true },
    ],
    briefing: {
      airbase: { lat: 44.5, lon: 25.0, alt_m: 0 },
      missionCenter: { lat: 45.5, lon: 25.0, alt_m: 0 },
      threats: [
        { id: "civilian-1", position: { lat: 46.0, lon: 25.5, alt_m: 10000 }, heading: 200, label: "UNKNOWN (0.72)" },
      ],
      assets: [
        { id: "strigoi-001", callsign: "SHADOW-1", type: "STRIGOI", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.0, lon: 25.0, alt_m: 8000 } },
      ],
    },
  },
  {
    id: "demo-6",
    key: "6",
    name: "AMBIGUOUS ROE",
    shortName: "Escalation Ladder",
    duration: "4 min",
    durationMin: 4,
    heroStory: `Unknown aircraft. No IFF response. Erratic flight path. Heading toward the defended asset.

Your ROE says "engage hostile only." But this isn't hostile—it's UNKNOWN. The rules don't cover this case.

The AI cannot decide. It escalates to you.

You order radio challenge. No response. Visual intercept. Still unclear. The aircraft keeps coming.

You authorize warning shots. The aircraft diverts.

The target was never classified. It remained UNKNOWN throughout. But through graduated escalation—detect, challenge, intercept, warn—you navigated the ambiguity without loss of life.

Rules cannot cover all cases. That's why humans command.`,
    assets: [
      { type: "STRIGOI", callsign: "SHADOW-1", count: 1 },
    ],
    threats: "Unknown Aircraft (No IFF, Erratic)",
    learning: "ROE cannot cover all cases. Human judgment navigates ambiguity.",
    evolution: [
      { time: 0, event: "Defending high-value asset", isPause: false },
      { time: 30, event: "Unknown aircraft approaching", isPause: false },
      { time: 45, event: "PAUSE: No IFF, erratic flight, ROE gap", isPause: true },
      { time: 60, event: "AI requests guidance - cannot classify", isPause: false },
      { time: 75, event: "Operator: Challenge via radio", isPause: false },
      { time: 90, event: "No response. Continues approach.", isPause: false },
      { time: 120, event: "AI recommends warning shots", isPause: false },
      { time: 135, event: "PAUSE: Discuss escalation ladder", isPause: true },
      { time: 150, event: "Operator approves warning", isPause: false },
      { time: 180, event: "Aircraft diverts", isPause: false },
      { time: 210, event: "DEBRIEF: Ambiguity requires human judgment", isPause: true },
    ],
    briefing: {
      airbase: { lat: 44.5, lon: 25.0, alt_m: 0 },
      missionCenter: { lat: 45.5, lon: 25.0, alt_m: 0 },
      threats: [
        { id: "unknown-1", position: { lat: 46.2, lon: 25.8, alt_m: 5000 }, heading: 210, label: "NO IFF" },
      ],
      assets: [
        { id: "strigoi-001", callsign: "SHADOW-1", type: "STRIGOI", start: { lat: 44.5, lon: 25.0, alt_m: 0 }, end: { lat: 45.0, lon: 25.0, alt_m: 8000 } },
      ],
    },
  },
];

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

/**
 * Get scenario by key (1-6)
 */
export function getScenarioByKey(key: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.key.toUpperCase() === key.toUpperCase());
}

/**
 * Format time in seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
