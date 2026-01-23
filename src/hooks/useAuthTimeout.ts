import { useState, useEffect, useRef } from "react";

interface UseAuthTimeoutOptions {
  expiresAt: number;
  onTimeout: () => void;
}

interface UseAuthTimeoutReturn {
  remainingSeconds: number;
  remainingPercent: number;
  isExpired: boolean;
}

/**
 * Hook for managing auth request countdown timer.
 *
 * Updates every 100ms for smooth countdown display.
 * Calls onTimeout when timer expires.
 */
export function useAuthTimeout({
  expiresAt,
  onTimeout,
}: UseAuthTimeoutOptions): UseAuthTimeoutReturn {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, expiresAt - Date.now())
  );
  const totalMs = useRef(expiresAt - Date.now());
  const hasExpiredRef = useRef(false);

  // Update countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Date.now());
      setRemainingMs(remaining);

      // Handle expiration
      if (remaining === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onTimeout();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [expiresAt, onTimeout]);

  // Reset expired flag when expiresAt changes
  useEffect(() => {
    hasExpiredRef.current = false;
    totalMs.current = Math.max(1, expiresAt - Date.now());
  }, [expiresAt]);

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const remainingPercent = Math.min(100, (remainingMs / totalMs.current) * 100);
  const isExpired = remainingMs === 0;

  return {
    remainingSeconds,
    remainingPercent,
    isExpired,
  };
}
