"use client";

import { useEffect, useRef } from "react";
import { getProjectMapVersion } from "../data/projectMap.actions";

/**
 * useProjectMapPolling — safety net for the realtime live sync.
 *
 * Why this exists:
 * The realtime hook (useProjectMapRealtime) delivers cross-user updates in
 * ~1 second, but it can be unavailable — e.g. CHANNEL_ERROR while RLS SELECT
 * policies are pending (see realtime-handoff.md), or a network that blocks
 * websockets. Without a fallback, users would silently be back to stale data.
 *
 * How it works:
 * Every `intervalMs` (default 30 s) it asks the server for a cheap "data
 * version" signature of the three Project Map tables
 * (getProjectMapVersion in projectMap.actions.js). If the signature changed
 * since the last check, someone (this user, another user, or another tab)
 * changed data — so the caller's onSync re-fetches everything. Checks are
 * skipped while the tab is hidden, and an immediate check runs when the tab
 * becomes visible again so returning users catch up right away.
 *
 * Business rules:
 * - Never writes data; only signals "data changed somewhere, re-fetch".
 * - Runs alongside the realtime hook on purpose: when realtime is healthy it
 *   provides the instant updates and polling becomes a rare catch-up for
 *   anything missed (e.g. deletes during a brief disconnect).
 *
 * @param {Function} onSync — called when a change is detected. Latest
 *   identity always wins (same ref pattern as the realtime hook).
 * @param {number} intervalMs — poll interval; 30 s keeps DB load negligible
 *   (six head-only aggregate queries per user per interval).
 */
export function useProjectMapPolling(onSync, intervalMs = 30000) {
  const onSyncRef = useRef(onSync);

  // Keep the ref pointing at the latest callback (assigned in an effect, not
  // during render, per React's ref rules).
  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    let timer = null;
    let checking = false; // guard against overlapping async checks
    // null until the first (baseline) check completes — the baseline must not
    // fire a sync because the page just loaded fresh data.
    let lastVersion = null;

    const check = async () => {
      if (checking || document.hidden) return;
      checking = true;
      try {
        const version = await getProjectMapVersion();
        if (lastVersion !== null && version !== lastVersion) {
          console.info("[ProjectMapPolling] Change detected — syncing.");
          onSyncRef.current?.();
        }
        lastVersion = version;
      } catch (err) {
        console.error("[ProjectMapPolling] Version check failed:", err);
      } finally {
        checking = false;
      }
    };

    check(); // baseline
    timer = setInterval(check, intervalMs);

    // Catch up immediately when the user comes back to the tab.
    const handleVisibility = () => {
      if (!document.hidden) check();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs]);
}
