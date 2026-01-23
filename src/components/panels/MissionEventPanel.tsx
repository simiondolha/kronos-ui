import { useRef, useEffect } from "react";
import { useEntityStore, type MissionEvent } from "../../stores/entityStore";

/**
 * MissionEventPanel - Military brevity narration log.
 *
 * Displays mission events with professional military formatting.
 * Auto-scrolls to latest event.
 */
export function MissionEventPanel() {
  const events = useEntityStore((s) => s.events);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const getEventColor = (event: MissionEvent): string => {
    switch (event.type) {
      case "ALERT":
        return event.priority === "CRITICAL"
          ? "var(--color-hostile)"
          : "var(--color-warning)";
      case "COMBAT":
        return "var(--color-hostile)";
      case "AUTH":
        return "var(--color-accent)";
      case "NARRATION":
        return "var(--text-primary)";
      default:
        return "var(--text-secondary)";
    }
  };

  const getEventPrefix = (event: MissionEvent): string => {
    switch (event.type) {
      case "ALERT":
        return "ALERT";
      case "COMBAT":
        return "ENGAGE";
      case "AUTH":
        return "AUTH";
      case "NARRATION":
        return "KRONOS";
      default:
        return "SYS";
    }
  };

  return (
    <div className="mission-event-panel">
      <div className="mission-event-panel__header">
        <h3 className="mission-event-panel__title">MISSION LOG</h3>
        <span className="mission-event-panel__count">{events.length}</span>
      </div>

      <div className="mission-event-panel__content" ref={scrollRef}>
        {events.length === 0 ? (
          <div className="mission-event-panel__empty">
            Awaiting mission events...
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={`mission-event-panel__event mission-event-panel__event--${event.type.toLowerCase()}`}
            >
              <span
                className="mission-event-panel__prefix"
                style={{ color: getEventColor(event) }}
              >
                [{getEventPrefix(event)}]
              </span>
              <span className="mission-event-panel__text">{event.text}</span>
            </div>
          ))
        )}
      </div>

      <style>{`
        .mission-event-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: var(--bg-primary);
          border: 1px solid var(--border-default);
          border-radius: 4px;
          overflow: hidden;
        }

        .mission-event-panel__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background-color: var(--bg-secondary);
          border-bottom: 1px solid var(--border-default);
        }

        .mission-event-panel__title {
          font-size: var(--font-size-sm);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          margin: 0;
        }

        .mission-event-panel__count {
          font-size: var(--font-size-xs);
          font-family: var(--font-family-mono);
          color: var(--text-muted);
          background-color: var(--bg-tertiary);
          padding: 2px 6px;
          border-radius: 3px;
        }

        .mission-event-panel__content {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          font-family: var(--font-family-mono);
          font-size: 12px;
          line-height: 1.6;
        }

        .mission-event-panel__empty {
          color: var(--text-muted);
          text-align: center;
          padding: 20px;
          font-style: italic;
        }

        .mission-event-panel__event {
          padding: 4px 0;
          display: flex;
          gap: 8px;
        }

        .mission-event-panel__event--alert {
          background-color: rgba(255, 171, 0, 0.1);
          padding: 4px 8px;
          margin: 2px -8px;
          border-left: 2px solid var(--color-warning);
        }

        .mission-event-panel__event--combat {
          color: var(--color-hostile);
        }

        .mission-event-panel__prefix {
          font-weight: 700;
          white-space: nowrap;
        }

        .mission-event-panel__text {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
