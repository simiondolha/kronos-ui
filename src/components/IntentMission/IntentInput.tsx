import { type FC, useState, useCallback } from "react";

interface IntentInputProps {
  onSubmit: (intentText: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

/**
 * IntentInput - Free text input for mission intent
 *
 * Operator describes their mission in natural language.
 * Examples:
 * - "3 hostile fighters near Constanta, 2 bombers at Galati. Patrol and neutralize. Weapons free."
 * - "Reconnaissance mission over Black Sea. 2 SAM sites reported near Galati. Weapons hold."
 */
export const IntentInput: FC<IntentInputProps> = ({
  onSubmit,
  isLoading,
  disabled = false,
}) => {
  const [intentText, setIntentText] = useState("");

  const handleSubmit = useCallback(() => {
    if (intentText.trim() && !isLoading && !disabled) {
      onSubmit(intentText.trim());
    }
  }, [intentText, isLoading, disabled, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const placeholderText = `Describe your mission...

Example: "3 hostile fighters near Constanta, 2 bombers at Galati. Patrol and neutralize. Weapons free."`;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>MISSION INTENT</span>
        {isLoading && <span style={styles.loading}>Analyzing...</span>}
      </div>

      <div style={styles.inputWrapper}>
        <textarea
          style={styles.textarea}
          value={intentText}
          onChange={(e) => setIntentText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          disabled={isLoading || disabled}
          rows={4}
        />
      </div>

      <div style={styles.footer}>
        <div style={styles.hints}>
          <span style={styles.hint}>Include: threats, locations, objectives, ROE</span>
          <span style={styles.hint}>Max 5 threats | Air-only</span>
        </div>
        <button
          style={{
            ...styles.submitButton,
            opacity: !intentText.trim() || isLoading || disabled ? 0.5 : 1,
            cursor: !intentText.trim() || isLoading || disabled ? "not-allowed" : "pointer",
          }}
          onClick={handleSubmit}
          disabled={!intentText.trim() || isLoading || disabled}
        >
          {isLoading ? "ANALYZING..." : "ANALYZE INTENT"}
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-default)",
    borderRadius: "8px",
    fontFamily: "var(--font-family-mono)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--text-muted)",
  },
  loading: {
    fontSize: "10px",
    color: "var(--color-accent)",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  inputWrapper: {
    position: "relative",
  },
  textarea: {
    width: "100%",
    minHeight: "100px",
    padding: "12px",
    backgroundColor: "var(--bg-primary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontFamily: "var(--font-family-mono)",
    fontSize: "12px",
    lineHeight: 1.5,
    resize: "vertical",
    outline: "none",
    transition: "border-color 0.2s ease",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  hints: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  hint: {
    fontSize: "9px",
    color: "var(--text-muted)",
    opacity: 0.7,
  },
  submitButton: {
    padding: "8px 16px",
    backgroundColor: "var(--color-accent)",
    border: "none",
    borderRadius: "4px",
    color: "var(--bg-primary)",
    fontFamily: "var(--font-family-mono)",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    transition: "all 0.2s ease",
  },
};

export default IntentInput;
