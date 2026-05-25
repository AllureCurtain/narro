"use client";

import { useEffect, useRef } from "react";
import { refreshDueSourcesAction } from "@/app/actions";

interface AutoRefreshProps {
  enabled?: boolean;
  intervalMinutes?: number;
}

export function AutoRefresh({ enabled = true, intervalMinutes = 15 }: AutoRefreshProps) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const intervalMs = Math.max(5, intervalMinutes) * 60_000;

    timerRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshDueSourcesAction().catch(() => {});
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, intervalMinutes]);

  return null;
}
