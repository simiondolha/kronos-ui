import { useState, useEffect, useCallback } from "react";
import { SCENARIOS, type Scenario } from "../../lib/scenarios";
import { MissionEvolution } from "./MissionEvolution";

interface ScenarioSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenario: Scenario) => void;
  currentScenarioId?: string;
}

/**
 * ScenarioSelector - Modal for selecting training scenarios.
 *
 * Features:
 * - 6 scenario cards with hero stories
 * - Mission evolution timeline view
 * - Keyboard shortcuts (1-6)
 * - Dramatic presentation for board demo
 */
export function ScenarioSelector({
  isOpen,
  onClose,
  onSelectScenario,
  currentScenarioId,
}: ScenarioSelectorProps) {
  // SCENARIOS is a constant array with 6 elements, so [0] is always defined
  const firstScenario = SCENARIOS[0]!;
  const [selectedId, setSelectedId] = useState(currentScenarioId ?? firstScenario.id);
  const [showEvolution, setShowEvolution] = useState(false);

  // Always have a valid scenario - default to first if not found
  const selectedScenario: Scenario = SCENARIOS.find((s) => s.id === selectedId) ?? firstScenario;

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1-6 to select scenarios
      if (e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const scenario = SCENARIOS[index];
        if (scenario) {
          setSelectedId(scenario.id);
        }
      }
      // Enter to start
      if (e.key === "Enter") {
        e.preventDefault();
        onSelectScenario(selectedScenario);
        onClose();
      }
      // Escape to close
      if (e.key === "Escape") {
        e.preventDefault();
        if (showEvolution) {
          setShowEvolution(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedScenario, showEvolution, onSelectScenario, onClose]);

  const handleStart = useCallback(() => {
    onSelectScenario(selectedScenario);
    onClose();
  }, [selectedScenario, onSelectScenario, onClose]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>KRONOS TRAINING SCENARIOS</h1>
          <button style={styles.closeButton} onClick={onClose}>
            x
          </button>
        </div>

        {/* Scenario Cards */}
        <div style={styles.cardsContainer}>
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              style={{
                ...styles.card,
                ...(selectedId === scenario.id ? styles.cardSelected : {}),
              }}
              onClick={() => setSelectedId(scenario.id)}
            >
              <span style={styles.cardKey}>{scenario.key}</span>
              <span style={styles.cardName}>{scenario.name}</span>
            </button>
          ))}
        </div>

        {/* Selected Scenario Details */}
        <div style={styles.detailsContainer}>
          <div style={styles.detailsHeader}>
            <div>
              <span style={styles.demoLabel}>
                {selectedScenario.key}: {selectedScenario.name}
              </span>
              <span style={styles.duration}>{selectedScenario.duration}</span>
            </div>
            <span style={styles.shortName}>{selectedScenario.shortName}</span>
          </div>

          {/* Hero Story */}
          <div style={styles.heroStory}>
            {selectedScenario.heroStory.split("\n\n").map((paragraph, i) => (
              <p key={i} style={styles.heroParagraph}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* Mission Info */}
          <div style={styles.missionInfo}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>ASSETS</span>
              <span style={styles.infoValue}>
                {selectedScenario.assets
                  .map((a) => `${a.count}x ${a.type} (${a.callsign})`)
                  .join(", ")}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>THREATS</span>
              <span style={styles.infoValue}>{selectedScenario.threats}</span>
            </div>
            <div style={styles.learningBox}>
              <span style={styles.learningLabel}>LEARNING OBJECTIVE</span>
              <span style={styles.learningText}>{selectedScenario.learning}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button
            style={styles.evolutionButton}
            onClick={() => setShowEvolution(true)}
          >
            VIEW MISSION EVOLUTION
          </button>
          <button style={styles.startButton} onClick={handleStart}>
            START SCENARIO
          </button>
        </div>

        {/* Keyboard hint */}
        <div style={styles.keyboardHint}>
          Press 1-6 to select | ENTER to start | ESC to close
        </div>

        {/* Mission Evolution Modal */}
        {showEvolution && (
          <MissionEvolution
            scenario={selectedScenario}
            onClose={() => setShowEvolution(false)}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "var(--bg-primary)",
    borderRadius: "12px",
    border: "1px solid var(--border-default)",
    maxWidth: "900px",
    width: "95%",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid var(--border-subtle)",
    backgroundColor: "var(--bg-secondary)",
  },
  title: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--color-accent)",
  },
  closeButton: {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "var(--text-muted)",
    fontSize: "18px",
    cursor: "pointer",
  },
  cardsContainer: {
    display: "flex",
    gap: "8px",
    padding: "16px 24px",
    borderBottom: "1px solid var(--border-subtle)",
    overflowX: "auto",
  },
  card: {
    flex: "0 0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    padding: "12px 16px",
    backgroundColor: "var(--bg-tertiary)",
    border: "2px solid transparent",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    minWidth: "100px",
  },
  cardSelected: {
    borderColor: "var(--color-accent)",
    backgroundColor: "rgba(0, 122, 255, 0.15)",
  },
  cardKey: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--color-accent)",
    fontFamily: "var(--font-family-mono)",
  },
  cardName: {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-primary)",
    textAlign: "center",
    lineHeight: 1.2,
  },
  detailsContainer: {
    flex: 1,
    overflow: "auto",
    padding: "24px",
  },
  detailsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  demoLabel: {
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginRight: "12px",
  },
  duration: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-muted)",
    backgroundColor: "var(--bg-tertiary)",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  shortName: {
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  heroStory: {
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px",
    borderLeft: "4px solid var(--color-accent)",
  },
  heroParagraph: {
    margin: "0 0 16px 0",
    fontSize: "14px",
    lineHeight: 1.7,
    color: "var(--text-secondary)",
    fontStyle: "italic",
  },
  missionInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  infoRow: {
    display: "flex",
    gap: "12px",
  },
  infoLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--text-muted)",
    letterSpacing: "0.05em",
    minWidth: "80px",
  },
  infoValue: {
    fontSize: "13px",
    color: "var(--text-primary)",
  },
  learningBox: {
    marginTop: "8px",
    padding: "12px 16px",
    backgroundColor: "rgba(52, 199, 89, 0.1)",
    borderRadius: "6px",
    border: "1px solid var(--color-friendly)",
  },
  learningLabel: {
    display: "block",
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--color-friendly)",
    letterSpacing: "0.1em",
    marginBottom: "4px",
  },
  learningText: {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderTop: "1px solid var(--border-subtle)",
    backgroundColor: "var(--bg-secondary)",
  },
  evolutionButton: {
    padding: "12px 20px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-default)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  startButton: {
    padding: "12px 32px",
    backgroundColor: "var(--color-accent)",
    border: "none",
    borderRadius: "6px",
    color: "white",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.05em",
    transition: "all 0.15s ease",
  },
  keyboardHint: {
    textAlign: "center",
    padding: "8px",
    fontSize: "11px",
    color: "var(--text-muted)",
    fontFamily: "var(--font-family-mono)",
    backgroundColor: "var(--bg-tertiary)",
  },
};
