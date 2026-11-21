"use client";

import { useMemo, useState } from "react";
import { getFinishedRunStatusNames, getRunStatusColor } from "../data/projectMap.data";

// "3 d 4 h", "5 h 12 m", "12 m", "under 1 m"
function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return hours > 0 ? `${days} d ${hours} h` : `${days} d`;
  if (hours > 0) return minutes > 0 ? `${hours} h ${minutes} m` : `${hours} h`;
  if (minutes > 0) return `${minutes} m`;
  return "under 1 m";
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function secondsBetween(from, to) {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Number.isNaN(a) || Number.isNaN(b) ? null : Math.max(0, (b - a) / 1000);
}

/**
 * "History" section of the run panel: every run status change
 * (proj_t_run_status_log, written by the app on every status save, loaded with
 * the run list so it shows instantly), newest first (latest 3 until "Show all
 * changes"), with how long the run sat
 * in the previous status; how long it has been in its current status; and the
 * total time since it was created, which stops once the run reaches a status
 * with "Finished" ticked in Setup (isFinishedRunStatus).
 */
export default function RunStatusHistory({ run, runStatuses = [] }) {
  const rows = useMemo(() => (Array.isArray(run?.proj_t_run_status_log) ? run.proj_t_run_status_log : [])
    .map((row) => {
      const user = row.psb_s_user;
      const name = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "" : "";
      return {
        logId: row.log_id,
        fromStatus: row.from_status || "",
        toStatus: row.to_status || "",
        changedAt: row.changed_at,
        durationSeconds: row.duration_seconds,
        isBaseline: Boolean(row.is_baseline),
        changedByName: name,
      };
    })
    .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt) || Number(a.logId) - Number(b.logId)),
  [run?.proj_t_run_status_log]);

  const [showAll, setShowAll] = useState(false);
  const PREVIEW_COUNT = 3;

  const finishedNames = new Set(getFinishedRunStatusNames(runStatuses));
  const finished = finishedNames.has(run?.status);
  const last = rows.length ? rows[rows.length - 1] : null;
  const now = new Date();
  const inCurrentSeconds = last ? secondsBetween(last.changedAt, now) : null;
  const totalEnd = finished && last ? last.changedAt : now;
  const totalSeconds = run?.created_at ? secondsBetween(run.created_at, totalEnd) : null;
  const showCurrent = !finished && last && inCurrentSeconds != null;
  const currentColor = last ? getRunStatusColor(last.toStatus, runStatuses) : "#6b7280";
  // Newest first; only the latest few until "Show all changes" is clicked.
  const newestFirst = [...rows].reverse();
  const visibleRows = showAll ? newestFirst : newestFirst.slice(0, PREVIEW_COUNT);

  return (
    <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <h3 style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#475569", letterSpacing: "0.04em", textTransform: "uppercase" }}>History</h3>

      {rows.length === 0 ? (
        <div style={{ fontSize: "11px", color: "#94a3b8" }}>No status changes recorded yet.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "6px" }}>
            {showCurrent ? (
              <div style={{ padding: "6px 8px", background: `${currentColor}14`, borderRadius: "8px", minWidth: 0 }}>
                <div style={{ fontSize: "10px", fontWeight: 600, color: currentColor, overflowWrap: "anywhere" }}>In {last.toStatus || "this status"}</div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>{last.isBaseline ? `${formatDuration(inCurrentSeconds)}+` : formatDuration(inCurrentSeconds)}</div>
              </div>
            ) : null}
            {totalSeconds != null ? (
              <div style={{ padding: "6px 8px", background: "#f1f5f9", borderRadius: "8px", minWidth: 0 }}>
                <div style={{ fontSize: "10px", color: "#475569" }}>{finished ? "Total time (finished)" : "Total time so far"}</div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>{formatDuration(totalSeconds)}</div>
              </div>
            ) : null}
          </div>

          <ol style={{ listStyle: "none", margin: 0, padding: 0, borderLeft: "2px solid #e2e8f0" }}>
            {visibleRows.map((row) => (
              <li key={row.logId} style={{ position: "relative", padding: "0 0 8px 12px" }}>
                <span aria-hidden="true" style={{ position: "absolute", left: "-5px", top: "4px", width: "8px", height: "8px", borderRadius: "50%", background: getRunStatusColor(row.toStatus, runStatuses) }} />
                <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "baseline" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b" }}>{row.toStatus || "No status"}</span>
                  <span style={{ fontSize: "10px", color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(row.changedAt)}</span>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                  {row.isBaseline
                    ? "Already in this status when tracking started"
                    : row.fromStatus
                      ? `From ${row.fromStatus}${row.durationSeconds != null ? ` after ${formatDuration(row.durationSeconds)}` : ""}`
                      : "First status"}
                  {row.changedByName ? ` · by ${row.changedByName}` : ""}
                </div>
              </li>
            ))}
          </ol>

          {rows.length > PREVIEW_COUNT ? (
            <button type="button" onClick={() => setShowAll((value) => !value)} style={{ alignSelf: "flex-start", padding: 0, border: "none", background: "none", color: "#1d4ed8", fontFamily: "inherit", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
              {showAll ? "Show fewer" : `Show all changes (${rows.length})`}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}