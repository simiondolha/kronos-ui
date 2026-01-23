import { useCallback, useState } from "react";
import { useAuditStore, type AuditEntry, type AuditEntryType } from "../../stores/auditStore";
import type { HashChainEntry } from "../../lib/hashChain";

/**
 * AuditPanel - Displays the tamper-evident audit log.
 *
 * Features:
 * - Hash chain integrity indicator
 * - Filterable entry list
 * - Export to JSON
 * - Entry count and time range
 */
export function AuditPanel() {
  const chain = useAuditStore((s) => s.chain);
  const chainValid = useAuditStore((s) => s.chainValid);
  const verifyIntegrity = useAuditStore((s) => s.verifyIntegrity);
  const exportAuditLog = useAuditStore((s) => s.exportAuditLog);
  const getSummary = useAuditStore((s) => s.getSummary);

  const [filter, setFilter] = useState<AuditEntryType | "ALL">("ALL");
  const [isVerifying, setIsVerifying] = useState(false);

  const summary = getSummary();

  // Filter entries
  const filteredEntries = chain.filter(
    (entry) => filter === "ALL" || entry.data.entryType === filter
  );

  // Verify chain integrity
  const handleVerify = useCallback(async () => {
    setIsVerifying(true);
    await verifyIntegrity();
    setIsVerifying(false);
  }, [verifyIntegrity]);

  // Export to JSON file
  const handleExport = useCallback(() => {
    const json = exportAuditLog();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronos-audit-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportAuditLog]);

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>AUDIT TRAIL</h2>

      {/* Chain Status */}
      <div style={styles.statusSection}>
        <div style={styles.statusRow}>
          <span style={styles.label}>Chain Status</span>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor: chainValid ? "var(--color-friendly)" : "var(--color-hostile)",
            }}
          >
            {chainValid ? "VALID" : "COMPROMISED"}
          </span>
        </div>
        <div style={styles.statusRow}>
          <span style={styles.label}>Entries</span>
          <span style={styles.value}>{summary.length}</span>
        </div>
        {summary.lastHash && (
          <div style={styles.hashRow}>
            <span style={styles.label}>Latest Hash</span>
            <span style={styles.hash}>{summary.lastHash.slice(0, 16)}...</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.actionRow}>
        <button
          style={styles.actionButton}
          onClick={handleVerify}
          disabled={isVerifying}
        >
          {isVerifying ? "Verifying..." : "✓ Verify Chain"}
        </button>
        <button style={styles.actionButton} onClick={handleExport}>
          ↓ Export JSON
        </button>
      </div>

      {/* Filter */}
      <div style={styles.filterSection}>
        <label style={styles.filterLabel}>Filter:</label>
        <select
          style={styles.filterSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value as AuditEntryType | "ALL")}
        >
          <option value="ALL">All Events</option>
          <option value="AUTH_REQUEST_RECEIVED">Auth Requests</option>
          <option value="AUTH_DECISION_MADE">Auth Decisions</option>
          <option value="AUTH_TIMEOUT">Auth Timeouts</option>
          <option value="SAFE_MODE_ACTIVATED">Safe Mode On</option>
          <option value="SAFE_MODE_DEACTIVATED">Safe Mode Off</option>
          <option value="INSTRUCTOR_COMMAND">Instructor Commands</option>
          <option value="WEAPONS_STATE_CHANGE">Weapons Changes</option>
          <option value="LINK_STATUS_CHANGE">Link Changes</option>
          <option value="ALERT_RECEIVED">Alerts</option>
        </select>
      </div>

      {/* Entry List */}
      <div style={styles.entryList}>
        {filteredEntries.length === 0 ? (
          <div style={styles.emptyState}>No entries match filter</div>
        ) : (
          [...filteredEntries].reverse().map((entry, index) => (
            <AuditEntryRow key={entry.hash} entry={entry} index={filteredEntries.length - 1 - index} />
          ))
        )}
      </div>
    </div>
  );
}

function AuditEntryRow({
  entry,
  index,
}: {
  entry: HashChainEntry<AuditEntry>;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const typeConfig = getEntryTypeConfig(entry.data.entryType);
  const time = new Date(entry.data.timestamp).toLocaleTimeString();

  return (
    <div
      style={{
        ...styles.entry,
        borderLeftColor: typeConfig.color,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={styles.entryHeader}>
        <span style={styles.entryIndex}>#{index}</span>
        <span style={{ ...styles.entryType, color: typeConfig.color }}>
          {typeConfig.label}
        </span>
        <span style={styles.entryTime}>{time}</span>
      </div>

      {expanded && (
        <div style={styles.entryDetails}>
          {entry.data.entityId && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Entity:</span>
              <span style={styles.detailValue}>{entry.data.entityId.slice(0, 8)}</span>
            </div>
          )}
          {entry.data.requestId && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Request:</span>
              <span style={styles.detailValue}>{entry.data.requestId.slice(0, 8)}</span>
            </div>
          )}
          {Object.entries(entry.data.details).map(([key, value]) => (
            <div key={key} style={styles.detailRow}>
              <span style={styles.detailLabel}>{key}:</span>
              <span style={styles.detailValue}>
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Hash:</span>
            <span style={styles.hashSmall}>{entry.hash.slice(0, 24)}...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getEntryTypeConfig(type: AuditEntryType): { label: string; color: string } {
  switch (type) {
    case "SESSION_START":
      return { label: "Session Start", color: "var(--color-accent)" };
    case "SESSION_END":
      return { label: "Session End", color: "var(--text-muted)" };
    case "AUTH_REQUEST_RECEIVED":
      return { label: "Auth Request", color: "var(--color-warning)" };
    case "AUTH_DECISION_MADE":
      return { label: "Auth Decision", color: "var(--color-friendly)" };
    case "AUTH_TIMEOUT":
      return { label: "Auth Timeout", color: "var(--color-hostile)" };
    case "SAFE_MODE_ACTIVATED":
      return { label: "Safe Mode ON", color: "var(--color-hostile)" };
    case "SAFE_MODE_DEACTIVATED":
      return { label: "Safe Mode OFF", color: "var(--color-friendly)" };
    case "INSTRUCTOR_COMMAND":
      return { label: "Instructor", color: "var(--color-accent)" };
    case "WEAPONS_STATE_CHANGE":
      return { label: "Weapons", color: "var(--color-warning)" };
    case "LINK_STATUS_CHANGE":
      return { label: "Link Status", color: "var(--text-secondary)" };
    case "ALERT_RECEIVED":
      return { label: "Alert", color: "var(--color-warning)" };
    case "CUSTOM":
    default:
      return { label: "Custom", color: "var(--text-muted)" };
  }
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "8px",
    border: "1px solid var(--border-default)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "100%",
    overflow: "hidden",
  },
  title: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--text-secondary)",
    paddingBottom: "8px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  statusSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "8px",
    backgroundColor: "var(--bg-tertiary)",
    borderRadius: "4px",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hashRow: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  label: {
    fontSize: "11px",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  value: {
    fontSize: "14px",
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-primary)",
  },
  hash: {
    fontSize: "11px",
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-secondary)",
    wordBreak: "break-all",
  },
  statusBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--bg-primary)",
    letterSpacing: "0.05em",
  },
  actionRow: {
    display: "flex",
    gap: "8px",
  },
  actionButton: {
    flex: 1,
    padding: "8px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    color: "var(--text-primary)",
    fontWeight: 600,
    fontSize: "11px",
    cursor: "pointer",
  },
  filterSection: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  filterLabel: {
    fontSize: "11px",
    color: "var(--text-muted)",
  },
  filterSelect: {
    flex: 1,
    padding: "6px 8px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-default)",
    borderRadius: "4px",
    color: "var(--text-primary)",
    fontSize: "11px",
  },
  entryList: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  emptyState: {
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: "12px",
    padding: "20px",
  },
  entry: {
    padding: "8px 10px",
    backgroundColor: "var(--bg-tertiary)",
    borderRadius: "4px",
    borderLeft: "3px solid",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  entryHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  entryIndex: {
    fontSize: "10px",
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-muted)",
    minWidth: "28px",
  },
  entryType: {
    flex: 1,
    fontSize: "11px",
    fontWeight: 600,
  },
  entryTime: {
    fontSize: "10px",
    fontFamily: "var(--font-family-mono)",
    color: "var(--text-muted)",
  },
  entryDetails: {
    marginTop: "8px",
    paddingTop: "8px",
    borderTop: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  detailRow: {
    display: "flex",
    gap: "8px",
    fontSize: "11px",
  },
  detailLabel: {
    color: "var(--text-muted)",
    minWidth: "60px",
  },
  detailValue: {
    color: "var(--text-primary)",
    fontFamily: "var(--font-family-mono)",
    wordBreak: "break-all",
  },
  hashSmall: {
    color: "var(--text-secondary)",
    fontFamily: "var(--font-family-mono)",
    fontSize: "10px",
  },
};
