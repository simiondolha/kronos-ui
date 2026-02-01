import { type FC, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type OodaPhase = "observe" | "orient" | "decide" | "act";

interface PhaseData {
  id: OodaPhase;
  label: string;
  latency: number;
  budget: number;
  status: "idle" | "active" | "complete";
  detail: string;
}

const INITIAL_PHASES: PhaseData[] = [
  { id: "observe", label: "OBSERVE", latency: 0, budget: 2, status: "idle", detail: "Sensor fusion" },
  { id: "orient", label: "ORIENT", latency: 0, budget: 3, status: "idle", detail: "Threat assessment" },
  { id: "decide", label: "DECIDE", latency: 0, budget: 15, status: "idle", detail: "Minimax selection" },
  { id: "act", label: "ACT", latency: 0, budget: 5, status: "idle", detail: "Command generation" },
];

/**
 * OODAPanel - Visualizes the Observe-Orient-Decide-Act decision cycle
 * Shows real-time phase progression with latency metrics and decision rationale
 */
export const OODAPanel: FC = () => {
  const [phases, setPhases] = useState<PhaseData[]>(INITIAL_PHASES);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalLatency, setTotalLatency] = useState(0);
  const [currentDecision, setCurrentDecision] = useState<string>("HOLD");
  const [hypothesis, setHypothesis] = useState<string>("Evaluating 1000 futures...");

  // Simulate OODA cycle progression
  useEffect(() => {
    const cycleInterval = setInterval(() => {
      setPhases((prev) => {
        const newPhases = [...prev];
        const activeIdx = newPhases.findIndex((p) => p.status === "active");

        if (activeIdx === -1) {
          // Start new cycle
          newPhases[0]!.status = "active";
          newPhases[0]!.latency = Math.random() * 1.5 + 0.5;
        } else if (activeIdx < 3) {
          // Progress to next phase
          newPhases[activeIdx]!.status = "complete";
          newPhases[activeIdx + 1]!.status = "active";
          newPhases[activeIdx + 1]!.latency = Math.random() * (newPhases[activeIdx + 1]!.budget * 0.8);
        } else {
          // Cycle complete
          newPhases[3]!.status = "complete";
          const total = newPhases.reduce((sum, p) => sum + p.latency, 0);
          setTotalLatency(total);
          setCycleCount((c) => c + 1);

          // Update decision
          const decisions = ["INTERCEPT", "HOLD", "EVADE", "TRACK", "DISENGAGE"] as const;
          setCurrentDecision(decisions[Math.floor(Math.random() * decisions.length)]!);

          // Update hypothesis
          const hypotheses = [
            "High confidence intercept geometry achieved",
            "Threat closure rate exceeds threshold",
            "Fuel state requires defensive posture",
            "Target aspect favorable for engagement",
            "Multiple threats require prioritization",
          ] as const;
          setHypothesis(hypotheses[Math.floor(Math.random() * hypotheses.length)]!);

          // Reset for next cycle
          setTimeout(() => {
            setPhases(INITIAL_PHASES.map((p) => ({ ...p, latency: 0, status: "idle" })));
          }, 500);
        }

        return newPhases;
      });
    }, 400);

    return () => clearInterval(cycleInterval);
  }, []);

  return (
    <div className="ooda-panel">
      <header className="ooda-panel__header">
        <span className="ooda-panel__title">OODA CYCLE</span>
        <span className="ooda-panel__cycle">#{cycleCount}</span>
      </header>

      <div className="ooda-panel__phases">
        {phases.map((phase, idx) => (
          <div key={phase.id} className="ooda-phase-container">
            <motion.div
              className={`ooda-phase ooda-phase--${phase.status}`}
              animate={{
                scale: phase.status === "active" ? 1.05 : 1,
                boxShadow:
                  phase.status === "active"
                    ? "0 0 20px rgba(0, 209, 255, 0.5)"
                    : "none",
              }}
              transition={{ duration: 0.2 }}
            >
              <div className="ooda-phase__label">{phase.label}</div>
              <div className="ooda-phase__latency">
                {phase.latency > 0 ? `${phase.latency.toFixed(1)}ms` : "-"}
              </div>
              <div className="ooda-phase__detail">{phase.detail}</div>
            </motion.div>
            {idx < 3 && <div className="ooda-arrow">→</div>}
          </div>
        ))}
      </div>

      <div className="ooda-panel__metrics">
        <div className="ooda-metric">
          <span className="ooda-metric__label">Total Latency</span>
          <span className={`ooda-metric__value ${totalLatency > 25 ? "ooda-metric__value--warning" : ""}`}>
            {totalLatency.toFixed(1)}ms / 25ms
          </span>
        </div>
        <div className="ooda-metric">
          <span className="ooda-metric__label">Digital Twin</span>
          <span className="ooda-metric__value">1000 futures</span>
        </div>
      </div>

      <div className="ooda-panel__decision">
        <div className="ooda-decision__label">DECISION</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDecision}
            className={`ooda-decision__value ooda-decision__value--${currentDecision.toLowerCase()}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {currentDecision}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="ooda-panel__hypothesis">
        <div className="ooda-hypothesis__label">RATIONALE</div>
        <div className="ooda-hypothesis__text">{hypothesis}</div>
      </div>

      <style>{STYLES}</style>
    </div>
  );
};

const STYLES = `
.ooda-panel {
  background: rgba(18, 22, 28, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 209, 255, 0.2);
  border-radius: 8px;
  padding: 16px;
  font-family: var(--font-family-mono);
  font-size: 11px;
  min-width: 400px;
}

.ooda-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 209, 255, 0.15);
}

.ooda-panel__title {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent, #00D1FF);
  letter-spacing: 0.1em;
}

.ooda-panel__cycle {
  font-size: 10px;
  color: var(--text-muted, #666);
}

.ooda-panel__phases {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.ooda-phase-container {
  display: flex;
  align-items: center;
}

.ooda-phase {
  width: 80px;
  padding: 12px 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  text-align: center;
  transition: all 0.2s ease;
}

.ooda-phase--active {
  background: rgba(0, 209, 255, 0.15);
  border-color: var(--color-accent, #00D1FF);
}

.ooda-phase--complete {
  background: rgba(0, 230, 118, 0.1);
  border-color: var(--color-friendly, #00E676);
}

.ooda-phase__label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-primary, #fff);
  margin-bottom: 4px;
}

.ooda-phase__latency {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-accent, #00D1FF);
  margin-bottom: 2px;
}

.ooda-phase__detail {
  font-size: 8px;
  color: var(--text-muted, #666);
}

.ooda-arrow {
  color: var(--text-muted, #666);
  margin: 0 4px;
  font-size: 16px;
}

.ooda-panel__metrics {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.ooda-metric {
  flex: 1;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ooda-metric__label {
  font-size: 9px;
  color: var(--text-muted, #666);
  text-transform: uppercase;
}

.ooda-metric__value {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-friendly, #00E676);
}

.ooda-metric__value--warning {
  color: var(--color-warning, #FFAB00);
}

.ooda-panel__decision {
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  margin-bottom: 12px;
  text-align: center;
}

.ooda-decision__label {
  font-size: 9px;
  color: var(--text-muted, #666);
  margin-bottom: 8px;
  letter-spacing: 0.1em;
}

.ooda-decision__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-friendly, #00E676);
}

.ooda-decision__value--intercept {
  color: var(--color-hostile, #FF4444);
}

.ooda-decision__value--evade {
  color: var(--color-warning, #FFAB00);
}

.ooda-decision__value--track {
  color: var(--color-accent, #00D1FF);
}

.ooda-panel__hypothesis {
  padding: 10px 12px;
  background: rgba(0, 209, 255, 0.05);
  border: 1px solid rgba(0, 209, 255, 0.1);
  border-radius: 4px;
}

.ooda-hypothesis__label {
  font-size: 9px;
  color: var(--text-muted, #666);
  margin-bottom: 4px;
  letter-spacing: 0.05em;
}

.ooda-hypothesis__text {
  font-size: 11px;
  color: var(--text-secondary, #aaa);
  line-height: 1.4;
}
`;
