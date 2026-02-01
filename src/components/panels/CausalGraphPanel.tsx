import { type FC, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

type FactorCategory = "decision" | "timing" | "sensor" | "target" | "environment" | "vehicle";
type EdgeType = "necessary" | "sufficient" | "contributing" | "influences" | "inhibits";
type FactorRole = "primary" | "contributing" | "enabling" | "aggravating" | "mitigating";
type ConfidenceLevel = "high" | "medium" | "low" | "uncertain";

interface CausalNode {
  id: string;
  label: string;
  category: FactorCategory;
  isOutcome?: boolean;
  x: number;
  y: number;
}

interface CausalEdge {
  source: string;
  target: string;
  edgeType: EdgeType;
  strength: number;
  label?: string;
}

interface FactorExplanation {
  name: string;
  role: FactorRole;
  contribution: number;
  description: string;
}

interface WhatIfScenario {
  scenario: string;
  consequence: string;
  improvement: number;
}

const CATEGORY_COLORS: Record<FactorCategory, string> = {
  decision: "#00D1FF",
  timing: "#FFAB00",
  sensor: "#00E676",
  target: "#FF4444",
  environment: "#888888",
  vehicle: "#AB47BC",
};

const EDGE_COLORS: Record<EdgeType, string> = {
  necessary: "#FF4444",
  sufficient: "#00D1FF",
  contributing: "#00E676",
  influences: "#888888",
  inhibits: "#FFAB00",
};

const INITIAL_NODES: CausalNode[] = [
  { id: "sensor_lock", label: "Sensor Lock", category: "sensor", x: 50, y: 30 },
  { id: "track_quality", label: "Track Quality", category: "sensor", x: 50, y: 70 },
  { id: "threat_assessment", label: "Threat Level", category: "target", x: 180, y: 30 },
  { id: "timing", label: "Intercept Timing", category: "timing", x: 180, y: 70 },
  { id: "decision", label: "INTERCEPT", category: "decision", x: 310, y: 50, isOutcome: true },
];

const INITIAL_EDGES: CausalEdge[] = [
  { source: "sensor_lock", target: "threat_assessment", edgeType: "necessary", strength: 0.9 },
  { source: "track_quality", target: "timing", edgeType: "contributing", strength: 0.7 },
  { source: "threat_assessment", target: "decision", edgeType: "necessary", strength: 0.95 },
  { source: "timing", target: "decision", edgeType: "contributing", strength: 0.6 },
];

/**
 * CausalGraphPanel - XAI visualization for decision causality
 * Shows "Why did it decide this?" through causal graphs and counterfactuals
 */
export const CausalGraphPanel: FC = () => {
  const [nodes] = useState<CausalNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<CausalEdge[]>(INITIAL_EDGES);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceLevel>("high");
  const [factors, setFactors] = useState<FactorExplanation[]>([]);
  const [whatIf, setWhatIf] = useState<WhatIfScenario | null>(null);
  const [summary, setSummary] = useState("Analyzing causal factors...");

  // Simulate dynamic updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update edge strengths
      setEdges((prev) =>
        prev.map((e) => ({
          ...e,
          strength: Math.min(1, Math.max(0.3, e.strength + (Math.random() - 0.5) * 0.1)),
        }))
      );

      // Update confidence
      const confidences: ConfidenceLevel[] = ["high", "high", "high", "medium", "medium", "low"];
      setConfidence(confidences[Math.floor(Math.random() * confidences.length)]!);

      // Update factors
      const newFactors: FactorExplanation[] = [
        {
          name: "Sensor Lock",
          role: "primary",
          contribution: Math.random() * 20 + 75,
          description: "AESA radar achieved firm track on target",
        },
        {
          name: "Threat Level",
          role: "enabling",
          contribution: Math.random() * 15 + 60,
          description: "Target classified as HOSTILE with high confidence",
        },
        {
          name: "Intercept Timing",
          role: "contributing",
          contribution: Math.random() * 20 + 40,
          description: "Optimal engagement window identified",
        },
      ];
      setFactors(newFactors);

      // Update summary
      const summaries = [
        "Intercept decision driven by high-confidence threat classification",
        "Sensor fusion confirmed hostile intent with 94% confidence",
        "Engagement authorized: threat closure rate exceeds threshold",
        "Decision based on 1000 simulated futures with minimax selection",
      ];
      setSummary(summaries[Math.floor(Math.random() * summaries.length)]!);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Generate what-if on node selection
  useEffect(() => {
    if (selectedNode) {
      const node = nodes.find((n) => n.id === selectedNode);
      if (node) {
        const scenarios: WhatIfScenario[] = [
          {
            scenario: `Without ${node.label}`,
            consequence: "Outcome would change from INTERCEPT to TRACK",
            improvement: Math.random() * 30 + 40,
          },
          {
            scenario: `If ${node.label} delayed 2s`,
            consequence: "Miss distance would increase by 15m",
            improvement: Math.random() * 20 + 20,
          },
          {
            scenario: `${node.label} degraded by 50%`,
            consequence: "Confidence would drop to MEDIUM",
            improvement: Math.random() * 25 + 30,
          },
        ];
        setWhatIf(scenarios[Math.floor(Math.random() * scenarios.length)]!);
      }
    } else {
      setWhatIf(null);
    }
  }, [selectedNode, nodes]);

  // Calculate SVG viewBox
  const viewBox = useMemo(() => {
    const padding = 20;
    const maxX = Math.max(...nodes.map((n) => n.x)) + 80;
    const maxY = Math.max(...nodes.map((n) => n.y)) + 40;
    return `0 0 ${maxX + padding} ${maxY + padding}`;
  }, [nodes]);

  return (
    <div className="causal-panel">
      <header className="causal-panel__header">
        <span className="causal-panel__title">CAUSAL REASONING</span>
        <span className={`causal-panel__confidence causal-panel__confidence--${confidence}`}>
          {confidence.toUpperCase()}
        </span>
      </header>

      <div className="causal-panel__summary">
        <motion.p
          key={summary}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="summary-text"
        >
          {summary}
        </motion.p>
      </div>

      <div className="causal-panel__graph">
        <svg viewBox={viewBox} className="causal-svg">
          <defs>
            {Object.entries(EDGE_COLORS).map(([type, color]) => (
              <marker
                key={type}
                id={`arrow-${type}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
              </marker>
            ))}
          </defs>

          {/* Edges */}
          {edges.map((edge, idx) => {
            const source = nodes.find((n) => n.id === edge.source);
            const target = nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            const color = EDGE_COLORS[edge.edgeType];
            const strokeWidth = 1 + edge.strength * 2;
            const dashArray = edge.edgeType === "influences" ? "4,4" :
                             edge.edgeType === "inhibits" ? "2,2" : "none";

            return (
              <motion.line
                key={`edge-${idx}`}
                x1={source.x + 35}
                y1={source.y + 12}
                x2={target.x - 5}
                y2={target.y + 12}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                markerEnd={`url(#arrow-${edge.edgeType})`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              className={`causal-node ${selectedNode === node.id ? "causal-node--selected" : ""}`}
              onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              style={{ cursor: "pointer" }}
            >
              <motion.rect
                x={node.x}
                y={node.y}
                width={node.isOutcome ? 80 : 70}
                height={24}
                rx={node.isOutcome ? 12 : 4}
                fill={`${CATEGORY_COLORS[node.category]}20`}
                stroke={CATEGORY_COLORS[node.category]}
                strokeWidth={selectedNode === node.id ? 2 : 1}
                whileHover={{ scale: 1.05 }}
              />
              <text
                x={node.x + (node.isOutcome ? 40 : 35)}
                y={node.y + 15}
                textAnchor="middle"
                fill={CATEGORY_COLORS[node.category]}
                fontSize="9"
                fontWeight="600"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="causal-panel__legend">
        {Object.entries(EDGE_COLORS).map(([type, color]) => (
          <div key={type} className="legend-item">
            <div className="legend-line" style={{ backgroundColor: color }} />
            <span>{type}</span>
          </div>
        ))}
      </div>

      <div className="causal-panel__factors">
        <div className="factors-header">KEY FACTORS</div>
        {factors.map((factor, idx) => (
          <motion.div
            key={factor.name}
            className="factor-row"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className="factor-row__name">
              <span className={`factor-role factor-role--${factor.role}`}>
                {factor.role === "primary" ? "●" : factor.role === "enabling" ? "◐" : "○"}
              </span>
              {factor.name}
            </div>
            <div className="factor-row__bar">
              <motion.div
                className="factor-row__fill"
                initial={{ width: 0 }}
                animate={{ width: `${factor.contribution}%` }}
              />
            </div>
            <div className="factor-row__value">{factor.contribution.toFixed(0)}%</div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {whatIf && (
          <motion.div
            className="causal-panel__whatif"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="whatif-header">COUNTERFACTUAL</div>
            <div className="whatif-scenario">{whatIf.scenario}</div>
            <div className="whatif-consequence">{whatIf.consequence}</div>
            <div className="whatif-improvement">
              <span className="whatif-label">Impact:</span>
              <span className="whatif-value">{whatIf.improvement.toFixed(0)}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{STYLES}</style>
    </div>
  );
};

const STYLES = `
.causal-panel {
  background: rgba(18, 22, 28, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 209, 255, 0.2);
  border-radius: 8px;
  padding: 16px;
  font-family: var(--font-family-mono);
  font-size: 11px;
  min-width: 420px;
}

.causal-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 209, 255, 0.15);
}

.causal-panel__title {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent, #00D1FF);
  letter-spacing: 0.1em;
}

.causal-panel__confidence {
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 3px;
  letter-spacing: 0.05em;
}

.causal-panel__confidence--high {
  background: rgba(0, 230, 118, 0.2);
  color: var(--color-friendly, #00E676);
}

.causal-panel__confidence--medium {
  background: rgba(255, 171, 0, 0.2);
  color: var(--color-warning, #FFAB00);
}

.causal-panel__confidence--low {
  background: rgba(255, 68, 68, 0.2);
  color: var(--color-hostile, #FF4444);
}

.causal-panel__confidence--uncertain {
  background: rgba(136, 136, 136, 0.2);
  color: #888;
}

.causal-panel__summary {
  padding: 10px 12px;
  background: rgba(0, 209, 255, 0.05);
  border: 1px solid rgba(0, 209, 255, 0.1);
  border-radius: 4px;
  margin-bottom: 12px;
}

.summary-text {
  font-size: 11px;
  color: var(--text-secondary, #aaa);
  line-height: 1.4;
  margin: 0;
}

.causal-panel__graph {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.causal-svg {
  width: 100%;
  height: 100px;
}

.causal-node--selected rect {
  filter: drop-shadow(0 0 8px currentColor);
}

.causal-panel__legend {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 12px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  color: var(--text-muted, #666);
  text-transform: uppercase;
}

.legend-line {
  width: 16px;
  height: 2px;
  border-radius: 1px;
}

.causal-panel__factors {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.factors-header {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-muted, #666);
  margin-bottom: 8px;
  letter-spacing: 0.05em;
}

.factor-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.factor-row__name {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-primary, #fff);
}

.factor-role {
  font-size: 8px;
}

.factor-role--primary { color: var(--color-hostile, #FF4444); }
.factor-role--enabling { color: var(--color-accent, #00D1FF); }
.factor-role--contributing { color: var(--color-friendly, #00E676); }
.factor-role--aggravating { color: var(--color-warning, #FFAB00); }
.factor-role--mitigating { color: #888; }

.factor-row__bar {
  width: 60px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.factor-row__fill {
  height: 100%;
  background: var(--color-accent, #00D1FF);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.factor-row__value {
  width: 30px;
  text-align: right;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted, #666);
}

.causal-panel__whatif {
  padding: 12px;
  background: rgba(171, 71, 188, 0.1);
  border: 1px solid rgba(171, 71, 188, 0.3);
  border-radius: 6px;
}

.whatif-header {
  font-size: 9px;
  font-weight: 700;
  color: #AB47BC;
  margin-bottom: 8px;
  letter-spacing: 0.1em;
}

.whatif-scenario {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary, #fff);
  margin-bottom: 4px;
}

.whatif-consequence {
  font-size: 10px;
  color: var(--text-secondary, #aaa);
  margin-bottom: 8px;
}

.whatif-improvement {
  display: flex;
  align-items: center;
  gap: 8px;
}

.whatif-label {
  font-size: 9px;
  color: var(--text-muted, #666);
}

.whatif-value {
  font-size: 14px;
  font-weight: 700;
  color: #AB47BC;
}
`;
