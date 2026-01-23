import { type Scenario, formatTime } from "../../lib/scenarios";

interface MissionEvolutionProps {
  scenario: Scenario;
  onClose: () => void;
}

/**
 * MissionEvolution - Cinematic timeline of mission phases.
 *
 * Design Philosophy (Ackoff/Musk/Jobs):
 * - Visual storytelling, not data display
 * - Each moment is a learning opportunity
 * - PAUSE points are decision moments that matter
 * - Progressive tension building to climax
 */
export function MissionEvolution({ scenario, onClose }: MissionEvolutionProps) {
  const totalDuration = scenario.evolution[scenario.evolution.length - 1]?.time ?? 0;
  const pauseCount = scenario.evolution.filter((e) => e.isPause).length;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>MISSION EVOLUTION</h2>
            <p style={styles.subtitle}>{scenario.name}</p>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            x
          </button>
        </div>

        {/* Stats Bar */}
        <div style={styles.statsBar}>
          <div style={styles.stat}>
            <span style={styles.statValue}>{formatTime(totalDuration)}</span>
            <span style={styles.statLabel}>DURATION</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statValue}>{scenario.evolution.length}</span>
            <span style={styles.statLabel}>EVENTS</span>
          </div>
          <div style={styles.stat}>
            <span style={{ ...styles.statValue, color: "var(--color-warning)" }}>
              {pauseCount}
            </span>
            <span style={styles.statLabel}>DECISION POINTS</span>
          </div>
        </div>

        {/* Timeline */}
        <div style={styles.timeline}>
          {scenario.evolution.map((event, index) => {
            const isLast = index === scenario.evolution.length - 1;

            return (
              <div key={index} style={styles.eventRow}>
                {/* Time marker */}
                <div style={styles.timeColumn}>
                  <span style={styles.time}>{formatTime(event.time)}</span>
                </div>

                {/* Timeline dot and line */}
                <div style={styles.dotColumn}>
                  <div
                    style={{
                      ...styles.dot,
                      ...(event.isPause ? styles.dotPause : {}),
                    }}
                  >
                    {event.isPause && (
                      <span style={styles.dotIcon}>||</span>
                    )}
                  </div>
                  {!isLast && (
                    <div style={styles.line} />
                  )}
                </div>

                {/* Event description */}
                <div style={styles.eventColumn}>
                  <div
                    style={{
                      ...styles.eventCard,
                      ...(event.isPause ? styles.eventCardPause : {}),
                    }}
                  >
                    {event.isPause && (
                      <span style={styles.pauseLabel}>INSTRUCTOR PAUSE</span>
                    )}
                    <p style={styles.eventText}>{event.event}</p>
                    {event.isPause && (
                      <p style={styles.pauseHint}>
                        Discussion point - simulation pauses for teaching
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with learning objective */}
        <div style={styles.footer}>
          <div style={styles.learningBadge}>
            <span style={styles.learningIcon}>!</span>
            <span style={styles.learningText}>{scenario.learning}</span>
          </div>
          <button style={styles.closeButtonLarge} onClick={onClose}>
            GOT IT
          </button>
        </div>
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
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
  },
  container: {
    backgroundColor: "var(--bg-primary)",
    borderRadius: "12px",
    border: "1px solid var(--border-default)",
    maxWidth: "700px",
    width: "95%",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  title: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "var(--text-muted)",
  },
  subtitle: {
    margin: "4px 0 0 0",
    fontSize: "18px",
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  closeButton: {
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    border: "1px solid var(--border-subtle)",
    borderRadius: "4px",
    color: "var(--text-muted)",
    fontSize: "14px",
    cursor: "pointer",
  },
  statsBar: {
    display: "flex",
    justifyContent: "center",
    gap: "48px",
    padding: "16px 24px",
    backgroundColor: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: 700,
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-primary)",
  },
  statLabel: {
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.1em",
    color: "var(--text-muted)",
  },
  timeline: {
    flex: 1,
    overflow: "auto",
    padding: "24px",
  },
  eventRow: {
    display: "flex",
    marginBottom: "0",
  },
  timeColumn: {
    width: "60px",
    flexShrink: 0,
    paddingTop: "8px",
  },
  time: {
    fontSize: "12px",
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-muted)",
  },
  dotColumn: {
    width: "40px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  dot: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: "var(--bg-tertiary)",
    border: "2px solid var(--border-default)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "8px",
    position: "relative",
    zIndex: 1,
  },
  dotPause: {
    width: "24px",
    height: "24px",
    backgroundColor: "var(--color-warning)",
    borderColor: "var(--color-warning)",
    marginTop: "4px",
  },
  dotIcon: {
    fontSize: "8px",
    fontWeight: 700,
    color: "var(--bg-primary)",
  },
  line: {
    width: "2px",
    flex: 1,
    backgroundColor: "var(--border-subtle)",
    marginTop: "-4px",
    minHeight: "20px",
  },
  eventColumn: {
    flex: 1,
    paddingBottom: "16px",
  },
  eventCard: {
    padding: "12px 16px",
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "8px",
    borderLeft: "3px solid var(--border-default)",
  },
  eventCardPause: {
    backgroundColor: "rgba(255, 171, 0, 0.1)",
    borderLeftColor: "var(--color-warning)",
  },
  pauseLabel: {
    display: "block",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--color-warning)",
    marginBottom: "4px",
  },
  eventText: {
    margin: 0,
    fontSize: "14px",
    color: "var(--text-primary)",
    lineHeight: 1.4,
  },
  pauseHint: {
    margin: "8px 0 0 0",
    fontSize: "12px",
    color: "var(--text-muted)",
    fontStyle: "italic",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderTop: "1px solid var(--border-subtle)",
    backgroundColor: "var(--bg-secondary)",
  },
  learningBadge: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1,
    marginRight: "16px",
  },
  learningIcon: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "var(--color-friendly)",
    color: "var(--bg-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 700,
    flexShrink: 0,
  },
  learningText: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  closeButtonLarge: {
    padding: "10px 24px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-default)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
