import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary - Catches React errors and displays fallback UI.
 *
 * CRITICAL: Ensures the UI doesn't crash completely during demo.
 * Logs errors for debugging while showing recovery options.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <h1 style={styles.title}>System Error</h1>
            <p style={styles.message}>
              A component has encountered an error. The system remains
              operational.
            </p>
            {this.state.error && (
              <pre style={styles.errorDetail}>
                {this.state.error.message}
              </pre>
            )}
            <button style={styles.button} onClick={this.handleReset}>
              Retry Component
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Tactical Map specific error boundary with military-style fallback.
 */
export function TacticalMapErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div style={styles.tacticalFallback}>
          <div style={styles.tacticalContent}>
            <span style={styles.tacticalIcon}>⚠</span>
            <h2 style={styles.tacticalTitle}>TACTICAL DISPLAY OFFLINE</h2>
            <p style={styles.tacticalMessage}>
              Map rendering error. Safety systems remain active.
            </p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    backgroundColor: "var(--bg-primary)",
    padding: "24px",
  },
  content: {
    maxWidth: "400px",
    textAlign: "center",
    padding: "32px",
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "8px",
    border: "1px solid var(--color-hostile)",
  },
  title: {
    margin: "0 0 12px 0",
    fontSize: "18px",
    fontWeight: 700,
    color: "var(--color-hostile)",
  },
  message: {
    margin: "0 0 16px 0",
    fontSize: "14px",
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  errorDetail: {
    margin: "0 0 16px 0",
    padding: "12px",
    backgroundColor: "var(--bg-tertiary)",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: "var(--font-family-mono)",
    color: "var(--color-hostile)",
    textAlign: "left",
    overflow: "auto",
    maxHeight: "100px",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "var(--color-accent)",
    border: "none",
    borderRadius: "4px",
    color: "var(--bg-primary)",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
  },
  tacticalFallback: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    backgroundColor: "var(--bg-primary)",
  },
  tacticalContent: {
    textAlign: "center",
    padding: "48px",
  },
  tacticalIcon: {
    fontSize: "48px",
    display: "block",
    marginBottom: "16px",
  },
  tacticalTitle: {
    margin: "0 0 8px 0",
    fontSize: "16px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--color-warning)",
  },
  tacticalMessage: {
    margin: 0,
    fontSize: "14px",
    color: "var(--text-muted)",
  },
};
