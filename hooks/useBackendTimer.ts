"use client";

import { useState, useEffect, useCallback } from "react";

interface TimerState {
  timeRemaining: number;
  duration: number;
  startTime: string;
  isDefused: boolean;
  isExploded: boolean;
  defusedAt?: string;
  explodedAt?: string;
  targetMarketCap: number;
  finalMarketCap?: number;
  distributionTx?: string;
}

interface UseBackendTimerOptions {
  pollInterval?: number; // ms, default 5000
  onDefused?: (data: any) => void;
  onExploded?: () => void;
}

export function useBackendTimer(options: UseBackendTimerOptions = {}) {
  const { pollInterval = 5000, onDefused, onExploded } = options;

  const [timer, setTimer] = useState<TimerState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Fetch timer state from backend
  const fetchTimer = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();

      if (data.success && data.timer) {
        const prevState = timer;
        setTimer(data.timer);
        setLastSync(new Date());
        setError(null);

        // Trigger callbacks on state changes
        if (!prevState?.isDefused && data.timer.isDefused && onDefused) {
          onDefused(data.timer);
        }
        if (!prevState?.isExploded && data.timer.isExploded && onExploded) {
          onExploded();
        }
      } else if (!data.timerExists) {
        // No timer initialized
        setTimer(null);
      } else {
        setError(data.error || "Failed to fetch timer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  }, [timer, onDefused, onExploded]);

  // Reset timer
  const resetTimer = useCallback(
    async (duration?: number, targetMarketCap?: number) => {
      try {
        const res = await fetch("/api/timer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reset",
            duration,
            targetMarketCap,
          }),
        });
        const data = await res.json();

        if (data.success) {
          await fetchTimer();
          return { success: true };
        }
        return { success: false, error: data.error };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Reset failed",
        };
      }
    },
    [fetchTimer]
  );

  // Trigger defuse (when market cap is reached)
  const triggerDefuse = useCallback(
    async (marketCap: number, webhookSecret?: string) => {
      try {
        const res = await fetch("/api/defuse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketCap,
            secret: webhookSecret,
            autoDistribute: true,
          }),
        });
        const data = await res.json();

        if (data.success) {
          await fetchTimer();
        }
        return data;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Defuse failed",
        };
      }
    },
    [fetchTimer]
  );

  // Initial fetch and polling
  useEffect(() => {
    fetchTimer();

    const interval = setInterval(fetchTimer, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]); // Note: don't include fetchTimer to avoid infinite re-renders

  // Local countdown between polls (for smooth display)
  const [displayTime, setDisplayTime] = useState<number>(0);

  useEffect(() => {
    if (timer?.timeRemaining !== undefined) {
      setDisplayTime(timer.timeRemaining);
    }
  }, [timer?.timeRemaining]);

  useEffect(() => {
    if (timer?.isDefused || timer?.isExploded) return;

    const tick = setInterval(() => {
      setDisplayTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(tick);
  }, [timer?.isDefused, timer?.isExploded]);

  return {
    // Timer state
    timeRemaining: displayTime,
    serverTimeRemaining: timer?.timeRemaining ?? 0,
    duration: timer?.duration ?? 0,
    isDefused: timer?.isDefused ?? false,
    isExploded: timer?.isExploded ?? false,
    targetMarketCap: timer?.targetMarketCap ?? 0,
    finalMarketCap: timer?.finalMarketCap,
    distributionTx: timer?.distributionTx,

    // Meta
    isLoading,
    error,
    lastSync,
    timerExists: timer !== null,

    // Actions
    fetchTimer,
    resetTimer,
    triggerDefuse,
  };
}

export default useBackendTimer;