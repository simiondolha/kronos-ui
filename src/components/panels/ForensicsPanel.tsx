import { useState, useMemo, useCallback, type FC } from "react";
import { useAuditStore, type AuditEntry, type AuditEntryType } from "../../stores/auditStore";
import type { HashChainEntry } from "../../lib/hashChain";

/**
 * ForensicsPanel - Aviation black-box style forensic reconstruction viewer
 *
 * Features:
 * - Timeline visualization of all decisions
 * - Decision rationale display with factors
 * - IHL assessment breakdown
 * - Alternatives considered
 * - Export for post-incident review
 */

interface DecisionFactor {
  name: string;
  value: string;
  threshold?: string;
  met: boolean;
}

interface AlternativeAction {
  action: string;
  reason_not_selected?: string;
  was_selected: boolean;
}

interface DecisionRecord {
  request_id: string;
  decision: string;
  factors: DecisionFactor[];
  rationale: string;
  alternatives_considered: AlternativeAction[];
  human_override_available: boolean;
  ihl_assessment?: IhlAssessment;
}

interface IhlAssessment {
  distinction: {
    target_classification: string;
    confidence: number;
    threshold: number;
    passed: boolean;
    blocking_reason?: string;
  };
  proportionality: {
    military_advantage: string;
    collateral_level: string;
    proportionate: boolean;
    blocking_reason?: string;
  };
  necessity: {
    threat_level: string;
    alternatives_available: boolean;
    necessary: boolean;
    blocking_reason?: string;
  };
  overall_compliant: boolean;
  blocking_factors: string[];
}

type ViewMode = "timeline" | "decisions" | "ihl";

export const ForensicsPanel: FC = () => {
  const chain = useAuditStore((s) => s.chain);
  const chainValid = useAuditStore((s) => s.chainValid);
  const exportAuditLog = useAuditStore((s) => s.exportAuditLog);

  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [selectedEntry, setSelectedEntry] = useState<HashChainEntry<AuditEntry> | null>(null);
  const [timeFilter, setTimeFilter] = useState<"all" | "5min" | "1min">("all");

  // Filter entries by time
  const filteredEntries = useMemo(() => {
    if (timeFilter === "all") return chain;
    const now = Date.now();
    const cutoff = timeFilter === "5min" ? 5 * 60 * 1000 : 60 * 1000;
    return chain.filter((e) => {
      const entryTime = new Date(e.data.timestamp).getTime();
      return now - entryTime <= cutoff;
    });
  }, [chain, timeFilter]);

  // Extract decision records from entries
  const decisionRecords = useMemo(() => {
    return filteredEntries
      .filter((e) => e.data.entryType === "AUTH_DECISION_MADE")
      .map((e) => ({
        entry: e,
        record: e.data.details as unknown as DecisionRecord,
      }));
  }, [filteredEntries]);

  // Extract IHL assessments
  const ihlAssessments = useMemo(() => {
    return decisionRecords
      .filter((d) => d.record?.ihl_assessment)
      .map((d) => ({
        entry: d.entry,
        assessment: d.record.ihl_assessment!,
        decision: d.record.decision,
      }));
  }, [decisionRecords]);

  // Export handler
  const handleExport = useCallback(() => {
    const json = exportAuditLog();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronos-forensics-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportAuditLog]);

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>FORENSICS VIEWER</h2>
        <div style={styles.chainStatus}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: chainValid ? "var(--color-friendly)" : "var(--color-hostile)",
            }}
          />
          <span style={styles.statusText}>
            {chainValid ? "Chain Intact" : "TAMPERED"}
          </span>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(viewMode === "timeline" ? styles.tabActive : {}),
          }}
          onClick={() => setViewMode("timeline")}
        >
          Timeline
        </button>
        <button
          style={{
            ...styles.tab,
            ...(viewMode === "decisions" ? styles.tabActive : {}),
          }}
          onClick={() => setViewMode("decisions")}
        >
          Decisions ({decisionRecords.length})
        </button>
        <button
          style={{
            ...styles.tab,
            ...(viewMode === "ihl" ? styles.tabActive : {}),
          }}
          onClick={() => setViewMode("ihl")}
        >
          IHL ({ihlAssessments.length})
        </button>
      </div>

      {/* Time Filter */}
      <div style={styles.filterRow}>
        <span style={styles.filterLabel}>Show:</span>
        <select
          style={styles.filterSelect}
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
        >
          <option value="all">All Events</option>
          <option value="5min">Last 5 Minutes</option>
          <option value="1min">Last 1 Minute</option>
        </select>
        <button style={styles.exportButton} onClick={handleExport}>
          Export
        </button>
      </div>

      {/* Content Area */}
      <div style={styles.content}>
        {viewMode === "timeline" && (
          <TimelineView
            entries={filteredEntries}
            onSelect={setSelectedEntry}
            selected={selectedEntry}
          />
        )}
        {viewMode === "decisions" && (
          <DecisionsView records={decisionRecords} />
        )}
        {viewMode === "ihl" && (
          <IhlView assessments={ihlAssessments} />
        )}
      </div>

      {/* Detail Panel */}
      {selectedEntry && (
        <DetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
};

// Timeline View Component
const TimelineView: FC<{
  entries: HashChainEntry<AuditEntry>[];
  onSelect: (entry: HashChainEntry<AuditEntry>) => void;
  selected: HashChainEntry<AuditEntry> | null;
}> = ({ entries, onSelect, selected }) => {
  if (entries.length === 0) {
    return <div style={styles.empty}>No events recorded</div>;
  }

  return (
    <div style={styles.timeline}>
      {[...entries].reverse().map((entry, idx) => {
        const config = getEntryConfig(entry.data.entryType);
        const time = new Date(entry.data.timestamp).toLocaleTimeString();
        const isSelected = selected?.hash === entry.hash;

        return (
          <div
            key={entry.hash}
            style={{
              ...styles.timelineItem,
              ...(isSelected ? styles.timelineItemSelected : {}),
            }}
            onClick={() => onSelect(entry)}
          >
            <div style={styles.timelineMarker}>
              <div
                style={{
                  ...styles.timelineDot,
                  backgroundColor: config.color,
                }}
              />
              {idx < entries.length - 1 && <div style={styles.timelineLine} />}
            </div>
            <div style={styles.timelineContent}>
              <div style={styles.timelineHeader}>
                <span style={{ ...styles.timelineType, color: config.color }}>
                  {config.icon} {config.label}
                </span>
                <span style={styles.timelineTime}>{time}</span>
              </div>
              {entry.data.entityId && (
                <span style={styles.timelineEntity}>
                  Entity: {entry.data.entityId.slice(0, 12)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Decisions View Component
const DecisionsView: FC<{
  records: Array<{ entry: HashChainEntry<AuditEntry>; record: DecisionRecord }>;
}> = ({ records }) => {
  if (records.length === 0) {
    return <div style={styles.empty}>No authorization decisions recorded</div>;
  }

  return (
    <div style={styles.decisionsList}>
      {records.map(({ entry, record }) => {
        const time = new Date(entry.data.timestamp).toLocaleTimeString();
        const isApproved = record.decision === "APPROVED";
        const isDenied = record.decision === "DENIED";

        return (
          <div key={entry.hash} style={styles.decisionCard}>
            {/* Decision Header */}
            <div style={styles.decisionHeader}>
              <span
                style={{
                  ...styles.decisionBadge,
                  backgroundColor: isApproved
                    ? "var(--color-friendly)"
                    : isDenied
                    ? "var(--color-hostile)"
                    : "var(--color-warning)",
                }}
              >
                {record.decision}
              </span>
              <span style={styles.decisionTime}>{time}</span>
            </div>

            {/* Request ID */}
            <div style={styles.decisionMeta}>
              <span style={styles.metaLabel}>Request:</span>
              <span style={styles.metaValue}>{record.request_id?.slice(0, 16) || "N/A"}</span>
            </div>

            {/* Rationale */}
            {record.rationale && (
              <div style={styles.rationaleBox}>
                <span style={styles.rationaleLabel}>RATIONALE</span>
                <p style={styles.rationaleText}>{record.rationale}</p>
              </div>
            )}

            {/* Decision Factors */}
            {record.factors && record.factors.length > 0 && (
              <div style={styles.factorsSection}>
                <span style={styles.sectionLabel}>Decision Factors</span>
                {record.factors.map((factor, idx) => (
                  <div key={idx} style={styles.factorRow}>
                    <span
                      style={{
                        ...styles.factorIndicator,
                        backgroundColor: factor.met
                          ? "var(--color-friendly)"
                          : "var(--color-hostile)",
                      }}
                    />
                    <span style={styles.factorName}>{factor.name}</span>
                    <span style={styles.factorValue}>{factor.value}</span>
                    {factor.threshold && (
                      <span style={styles.factorThreshold}>
                        (threshold: {factor.threshold})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Alternatives Considered */}
            {record.alternatives_considered && record.alternatives_considered.length > 0 && (
              <div style={styles.alternativesSection}>
                <span style={styles.sectionLabel}>Alternatives Considered</span>
                {record.alternatives_considered.map((alt, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.alternativeRow,
                      ...(alt.was_selected ? styles.alternativeSelected : {}),
                    }}
                  >
                    <span style={styles.alternativeAction}>
                      {alt.was_selected ? "→ " : "  "}
                      {alt.action}
                    </span>
                    {alt.reason_not_selected && (
                      <span style={styles.alternativeReason}>
                        ({alt.reason_not_selected})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Human Override */}
            <div style={styles.overrideRow}>
              <span style={styles.overrideLabel}>Human Override:</span>
              <span
                style={{
                  ...styles.overrideValue,
                  color: record.human_override_available
                    ? "var(--color-friendly)"
                    : "var(--color-hostile)",
                }}
              >
                {record.human_override_available ? "Available" : "Blocked"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// IHL View Component
const IhlView: FC<{
  assessments: Array<{
    entry: HashChainEntry<AuditEntry>;
    assessment: IhlAssessment;
    decision: string;
  }>;
}> = ({ assessments }) => {
  if (assessments.length === 0) {
    return <div style={styles.empty}>No IHL assessments recorded</div>;
  }

  return (
    <div style={styles.ihlList}>
      {assessments.map(({ entry, assessment, decision }) => {
        const time = new Date(entry.data.timestamp).toLocaleTimeString();

        return (
          <div key={entry.hash} style={styles.ihlCard}>
            {/* IHL Header */}
            <div style={styles.ihlHeader}>
              <span style={styles.ihlTitle}>IHL COMPLIANCE ASSESSMENT</span>
              <span style={styles.ihlTime}>{time}</span>
            </div>

            {/* Overall Status */}
            <div style={styles.ihlOverall}>
              <span
                style={{
                  ...styles.ihlOverallBadge,
                  backgroundColor: assessment.overall_compliant
                    ? "var(--color-friendly)"
                    : "var(--color-hostile)",
                }}
              >
                {assessment.overall_compliant ? "COMPLIANT" : "NON-COMPLIANT"}
              </span>
              <span style={styles.ihlDecision}>Decision: {decision}</span>
            </div>

            {/* Blocking Factors */}
            {assessment.blocking_factors && assessment.blocking_factors.length > 0 && (
              <div style={styles.blockingFactors}>
                <span style={styles.blockingLabel}>Blocking Factors:</span>
                {assessment.blocking_factors.map((factor, idx) => (
                  <span key={idx} style={styles.blockingFactor}>
                    {factor}
                  </span>
                ))}
              </div>
            )}

            {/* Three Pillars */}
            <div style={styles.ihlPillars}>
              {/* Distinction */}
              <div style={styles.pillarCard}>
                <div style={styles.pillarHeader}>
                  <span
                    style={{
                      ...styles.pillarStatus,
                      backgroundColor: assessment.distinction.passed
                        ? "var(--color-friendly)"
                        : "var(--color-hostile)",
                    }}
                  />
                  <span style={styles.pillarTitle}>DISTINCTION</span>
                </div>
                <div style={styles.pillarContent}>
                  <div style={styles.pillarRow}>
                    <span style={styles.pillarLabel}>Target:</span>
                    <span style={styles.pillarValue}>
                      {assessment.distinction.target_classification}
                    </span>
                  </div>
                  <div style={styles.pillarRow}>
                    <span style={styles.pillarLabel}>Confidence:</span>
                    <span style={styles.pillarValue}>
                      {(assessment.distinction.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={styles.pillarRow}>
                    <span style={styles.pillarLabel}>Threshold:</span>
                    <span style={styles.pillarValue}>
                      {(assessment.distinction.threshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  {assessment.distinction.blocking_reason && (
                    <div style={styles.pillarBlocking}>
                      {assessment.distinction.blocking_reason}
                    </div>
                  )}
                </div>
              </div>

              {/* Proportionality */}
              <div style={styles.pillarCard}>
                <div style={styles.pillarHeader}>
                  <span
                    style={{
                      ...styles.pillarStatus,
                      backgroundColor: assessment.proportionality.proportionate
                        ? "var(--color-friendly)"
                        : "var(--color-hostile)",
                    }}
                  />
                  <span style={styles.pillarTitle}>PROPORTIONALITY</span>
                </div>
                <div style={styles.pillarContent}>
                  <div style={styles.pillarRow}>
                    <span style={styles.pillarLabel}>Advantage:</span>
                    <span style={styles.pillarValue}>
                      {assessment.proportionality.military_advantage}
                    </span>
                  </div>
                  <div style={styles.pillarRow}>
                    <span style={styles.pillarLabel}>Collateral:</span>
                    <span style={styles.pillarValue}>
                      {assessment.proportionality.collateral_level}
                    </span>
                  </div>
                  {assessment.proportionality.blocking_reason && (
                    <div style={styles.pillarBlocking}>
                      {assessment.proportionality.blocking_reason}
                    </div>
                  )}
                </div>
              </div>

              {/* Necessity */}
              <div style={styles.pillarCard}>
                <div style={styles.pillarHeader}>
                  <span
                    style={{
                      ...styles.pillarStatus,
                      backgroundColor: assessment.necessity.necessary
                        ? "var(--color-friendly)"
                        : "var(--color-hostile)",
                    }}
                  />
                  <span style={styles.pillarTitle}>NECESSITY</span>
                </div>
                <div style={styles.pillarContent}>
                  <div style={styles.pillarRow}>
                    <span style={styles.pillarLabel}>Threat:</span>
                    <span style={styles.pillarValue}>
                      {assessment.necessity.threat_level}
                    </span>
                  </div>
                  <div style={styles.pillarRow}>
                    <span style={styles.pillarLabel}>Alternatives:</span>
                    <span style={styles.pillarValue}>
                      {assessment.necessity.alternatives_available ? "Yes" : "No"}
                    </span>
                  </div>
                  {assessment.necessity.blocking_reason && (
                    <div style={styles.pillarBlocking}>
                      {assessment.necessity.blocking_reason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Detail Panel Component
const DetailPanel: FC<{
  entry: HashChainEntry<AuditEntry>;
  onClose: () => void;
}> = ({ entry, onClose }) => {
  return (
    <div style={styles.detailPanel}>
      <div style={styles.detailHeader}>
        <span style={styles.detailTitle}>Entry Details</span>
        <button style={styles.closeButton} onClick={onClose}>
          ×
        </button>
      </div>
      <div style={styles.detailContent}>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Timestamp:</span>
          <span style={styles.detailValue}>{entry.data.timestamp}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Type:</span>
          <span style={styles.detailValue}>{entry.data.entryType}</span>
        </div>
        {entry.data.entityId && (
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Entity:</span>
            <span style={styles.detailValue}>{entry.data.entityId}</span>
          </div>
        )}
        {entry.data.requestId && (
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Request:</span>
            <span style={styles.detailValue}>{entry.data.requestId}</span>
          </div>
        )}
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Hash:</span>
          <span style={styles.detailHash}>{entry.hash}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Prev Hash:</span>
          <span style={styles.detailHash}>{entry.previousHash || "GENESIS"}</span>
        </div>
        <div style={styles.detailJson}>
          <span style={styles.detailLabel}>Details:</span>
          <pre style={styles.jsonPre}>
            {JSON.stringify(entry.data.details, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

// Helper function for entry type configuration
function getEntryConfig(type: AuditEntryType): {
  label: string;
  color: string;
  icon: string;
} {
  switch (type) {
    case "SESSION_START":
      return { label: "Session Start", color: "var(--color-accent)", icon: "▶" };
    case "SESSION_END":
      return { label: "Session End", color: "var(--text-muted)", icon: "■" };
    case "AUTH_REQUEST_RECEIVED":
      return { label: "Auth Request", color: "var(--color-warning)", icon: "?" };
    case "AUTH_DECISION_MADE":
      return { label: "Decision", color: "var(--color-friendly)", icon: "✓" };
    case "AUTH_TIMEOUT":
      return { label: "Timeout", color: "var(--color-hostile)", icon: "⏱" };
    case "SAFE_MODE_ACTIVATED":
      return { label: "Safe Mode ON", color: "var(--color-hostile)", icon: "⚠" };
    case "SAFE_MODE_DEACTIVATED":
      return { label: "Safe Mode OFF", color: "var(--color-friendly)", icon: "✓" };
    case "INSTRUCTOR_COMMAND":
      return { label: "Instructor", color: "var(--color-accent)", icon: "⌘" };
    case "WEAPONS_STATE_CHANGE":
      return { label: "Weapons", color: "var(--color-warning)", icon: "◆" };
    case "LINK_STATUS_CHANGE":
      return { label: "Link", color: "var(--text-secondary)", icon: "◇" };
    case "ALERT_RECEIVED":
      return { label: "Alert", color: "var(--color-warning)", icon: "!" };
    default:
      return { label: "Event", color: "var(--text-muted)", icon: "•" };
  }
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "8px",
    border: "1px solid var(--border-default)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid var(--border-default)",
  },
  title: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--text-secondary)",
  },
  chainStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  statusText: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  tabs: {
    display: "flex",
    padding: "8px 12px",
    gap: "4px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  tab: {
    flex: 1,
    padding: "6px 10px",
    backgroundColor: "transparent",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    color: "var(--text-secondary)",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tabActive: {
    backgroundColor: "var(--color-accent)",
    borderColor: "var(--color-accent)",
    color: "var(--bg-primary)",
  },
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  filterLabel: {
    fontSize: "11px",
    color: "var(--text-muted)",
  },
  filterSelect: {
    flex: 1,
    padding: "4px 8px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    color: "var(--text-primary)",
    fontSize: "11px",
  },
  exportButton: {
    padding: "4px 12px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    color: "var(--text-primary)",
    fontSize: "10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: "8px",
  },
  empty: {
    textAlign: "center",
    padding: "40px 20px",
    color: "var(--text-muted)",
    fontSize: "12px",
  },

  // Timeline styles
  timeline: {
    display: "flex",
    flexDirection: "column",
  },
  timelineItem: {
    display: "flex",
    cursor: "pointer",
    padding: "4px 0",
    transition: "background-color 0.15s ease",
  },
  timelineItemSelected: {
    backgroundColor: "rgba(0, 188, 212, 0.1)",
    borderRadius: "4px",
  },
  timelineMarker: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "24px",
    flexShrink: 0,
  },
  timelineDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  timelineLine: {
    width: "2px",
    flex: 1,
    backgroundColor: "var(--border-default)",
    marginTop: "2px",
  },
  timelineContent: {
    flex: 1,
    paddingLeft: "8px",
    paddingBottom: "12px",
  },
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineType: {
    fontSize: "11px",
    fontWeight: 600,
  },
  timelineTime: {
    fontSize: "10px",
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-muted)",
  },
  timelineEntity: {
    fontSize: "10px",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-family-mono)",
  },

  // Decision styles
  decisionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  decisionCard: {
    backgroundColor: "var(--bg-tertiary)",
    borderRadius: "6px",
    padding: "12px",
    border: "1px solid var(--border-default)",
  },
  decisionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  decisionBadge: {
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--bg-primary)",
    letterSpacing: "0.05em",
  },
  decisionTime: {
    fontSize: "10px",
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-muted)",
  },
  decisionMeta: {
    display: "flex",
    gap: "8px",
    marginBottom: "8px",
    fontSize: "11px",
  },
  metaLabel: {
    color: "var(--text-muted)",
  },
  metaValue: {
    color: "var(--text-secondary)",
    fontFamily: "var(--font-family-mono)",
  },
  rationaleBox: {
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "4px",
    padding: "8px",
    marginBottom: "8px",
    borderLeft: "3px solid var(--color-accent)",
  },
  rationaleLabel: {
    display: "block",
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--color-accent)",
    letterSpacing: "0.1em",
    marginBottom: "4px",
  },
  rationaleText: {
    margin: 0,
    fontSize: "11px",
    color: "var(--text-primary)",
    lineHeight: 1.4,
  },
  factorsSection: {
    marginBottom: "8px",
  },
  sectionLabel: {
    display: "block",
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--text-muted)",
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  factorRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "2px 0",
    fontSize: "11px",
  },
  factorIndicator: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  factorName: {
    color: "var(--text-secondary)",
  },
  factorValue: {
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-primary)",
  },
  factorThreshold: {
    color: "var(--text-muted)",
    fontSize: "10px",
  },
  alternativesSection: {
    marginBottom: "8px",
  },
  alternativeRow: {
    padding: "2px 4px",
    fontSize: "11px",
    fontFamily: "var(--font-family-mono)",
  },
  alternativeSelected: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    borderRadius: "2px",
  },
  alternativeAction: {
    color: "var(--text-primary)",
  },
  alternativeReason: {
    color: "var(--text-muted)",
    fontSize: "10px",
    marginLeft: "8px",
  },
  overrideRow: {
    display: "flex",
    gap: "8px",
    paddingTop: "8px",
    borderTop: "1px solid var(--border-subtle)",
    fontSize: "11px",
  },
  overrideLabel: {
    color: "var(--text-muted)",
  },
  overrideValue: {
    fontWeight: 600,
  },

  // IHL styles
  ihlList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  ihlCard: {
    backgroundColor: "var(--bg-tertiary)",
    borderRadius: "6px",
    padding: "12px",
    border: "1px solid var(--border-default)",
  },
  ihlHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  ihlTitle: {
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--text-muted)",
    letterSpacing: "0.1em",
  },
  ihlTime: {
    fontSize: "10px",
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-muted)",
  },
  ihlOverall: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  },
  ihlOverallBadge: {
    padding: "4px 12px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--bg-primary)",
    letterSpacing: "0.05em",
  },
  ihlDecision: {
    fontSize: "11px",
    color: "var(--text-secondary)",
  },
  blockingFactors: {
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderRadius: "4px",
    padding: "8px",
    marginBottom: "8px",
  },
  blockingLabel: {
    display: "block",
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--color-hostile)",
    marginBottom: "4px",
  },
  blockingFactor: {
    display: "block",
    fontSize: "11px",
    color: "var(--text-primary)",
    padding: "2px 0",
  },
  ihlPillars: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
  },
  pillarCard: {
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "4px",
    padding: "8px",
    border: "1px solid var(--border-subtle)",
  },
  pillarHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "6px",
  },
  pillarStatus: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  pillarTitle: {
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--text-secondary)",
    letterSpacing: "0.05em",
  },
  pillarContent: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  pillarRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "10px",
  },
  pillarLabel: {
    color: "var(--text-muted)",
  },
  pillarValue: {
    color: "var(--text-primary)",
    fontFamily: "var(--font-family-mono)",
  },
  pillarBlocking: {
    marginTop: "4px",
    padding: "4px",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderRadius: "2px",
    fontSize: "9px",
    color: "var(--color-hostile)",
  },

  // Detail panel styles
  detailPanel: {
    borderTop: "1px solid var(--border-default)",
    backgroundColor: "var(--bg-tertiary)",
    maxHeight: "200px",
    overflow: "auto",
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  detailTitle: {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  closeButton: {
    padding: "2px 8px",
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "16px",
    cursor: "pointer",
  },
  detailContent: {
    padding: "8px 12px",
  },
  detailRow: {
    display: "flex",
    gap: "8px",
    padding: "2px 0",
    fontSize: "11px",
  },
  detailLabel: {
    color: "var(--text-muted)",
    minWidth: "70px",
  },
  detailValue: {
    color: "var(--text-primary)",
    fontFamily: "var(--font-family-mono)",
  },
  detailHash: {
    color: "var(--text-secondary)",
    fontFamily: "var(--font-family-mono)",
    fontSize: "10px",
    wordBreak: "break-all",
  },
  detailJson: {
    marginTop: "8px",
  },
  jsonPre: {
    margin: "4px 0 0 0",
    padding: "8px",
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "4px",
    fontSize: "10px",
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-primary)",
    overflow: "auto",
    maxHeight: "100px",
  },
};

export default ForensicsPanel;
