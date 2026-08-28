"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "@/core/supabase/client";

/**
 * useProjectMapRealtime — keeps the Project Map in sync with other users.
 *
 * Why this exists:
 * The map page loads all of its data once (projects, runs, run assignments)
 * and afterwards only refreshed in response to the current user's own
 * actions. With two or three users working at the same time, pins, lists and
 * detail panels went stale until someone manually reloaded the page — which
 * caused duplicated data entry and out-of-date run assignments.
 *
 * How it works:
 * Subscribes to Supabase Realtime (postgres_changes) for the three tables
 * that drive every screen in this module — proj_t_projects, proj_t_runs and
 * proj_t_run_projects (added to the supabase_realtime publication by
 * migration 003_enable_realtime_publication.sql). Any INSERT / UPDATE /
 * DELETE from ANY user schedules one debounced sync pass (800 ms), which the
 * caller uses to re-fetch data through the existing refresh helpers.
 * Debouncing matters because a single user action can touch several rows
 * (e.g. adding a stop writes the run AND the assignment row) and we want one
 * refresh per burst, not one per row.
 *
 * Business rules:
 * - This hook never writes data and never changes filtering — it only
 *   signals "something changed somewhere, re-fetch".
 * - If the realtime connection cannot be established (client not
 *   initialized, network blocked, tables missing from the publication, or
 *   RLS blocking reads), the app keeps working exactly as before — the worst
 *   case is the old behavior (manual refresh needed). Connection status is
 *   logged to the console so a silent "no events arriving" situation can be
 *   diagnosed quickly.
 *
 * @param {Function} onSync — called (debounced) whenever any of the three
 *   tables changes. Its identity may change between renders; the latest
 *   version is always the one invoked, so callers can close over current
 *   state (e.g. the selected run) without re-subscribing.
 */
export function useProjectMapRealtime(onSync) {
  const onSyncRef = useRef(onSync);

  // Keep the ref pointing at the latest callback. Assigned in an effect (not
  // during render) per React's ref rules; the one-render delay is irrelevant
  // here because syncs are debounced anyway.
  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabase();
    } catch (err) {
      // Core client not initialized (should not happen on this page —
      // AuthProvider initializes it at the app root). Degrade gracefully:
      // the page simply falls back to manual-refresh behavior.
      console.warn("[ProjectMapRealtime] Supabase client not available, live sync disabled:", err?.message);
      return;
    }

    let debounceTimer = null;
    // One console error per failure streak, reset when the channel recovers.
    let errorLogged = false;
    const scheduleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => onSyncRef.current?.(), 800);
    };

    const channel = supabase
      .channel("project-map-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "proj_t_projects" }, scheduleSync)
      .on("postgres_changes", { event: "*", schema: "public", table: "proj_t_runs" }, scheduleSync)
      .on("postgres_changes", { event: "*", schema: "public", table: "proj_t_run_projects" }, scheduleSync)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          errorLogged = false;
          console.info("[ProjectMapRealtime] Live sync connected.");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Log ONCE per failure streak (supabase-js retries with backoff, so
          // this would otherwise spam the console on every attempt).
          if (!errorLogged) {
            errorLogged = true;
            console.error(
              `[ProjectMapRealtime] Realtime channel unavailable (${status}). ` +
              "Cross-user push updates are OFF; the 30-second polling fallback " +
              "(useProjectMapPolling) keeps data fresh meanwhile. Most common " +
              "cause: RLS enabled on the proj_t_* tables without SELECT policies " +
              "for the browser's role — run section 1a, and if needed section 3, " +
              "of migration/003_enable_realtime_publication.sql. Also check the " +
              "Network tab's WS entry for .../realtime/v1/websocket (status 101 = connected)."
            );
          }
        }
      });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);
}
