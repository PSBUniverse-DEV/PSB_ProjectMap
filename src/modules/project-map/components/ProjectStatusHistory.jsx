"use client";

import { useMemo } from "react";
import { isPastInstallProject } from "../data/projectMap.data";

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

// proj_t_project_status_log rows embedded on the project (project list query), oldest first.
function toHistoryRows(logRows) {
  return (Array.isArray(logRows) ? logRows : [])
    .map((row) => {
      const user = row.psb_s_user;
      const name = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "" : "";
      return {
        logId: row.log_id,
        fromStatusId: row.from_status_id,
        fromStatusName: row.from_status_name || "",
        toStatusId: row.to_status_id,
        toStatusName: row.to_status_name || "",
        changedAt: row.changed_at,
        durationSeconds: row.duration_seconds,
        isBaseline: Boolean(row.is_baseline),
        changedByName: name,
      };
    })
    .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt) || Number(a.logId) - Number(b.logId));
}

/**
 * "Status History" section of the project drawer: every status change
 * (proj_t_project_status_log, written by a database trigger, loaded with the
 * project list so it shows instantly), oldest first, with how long the project
 * sat in the previous status; how long it has been in its current status; and
 * the total time since it was created, which stops once the project reaches a
 * finished status (isPastInstallProject).
 */
export default function ProjectStatusHistory({ project, statuses = [] }) {
  const rows = useMemo(() => toHistoryRows(project?.proj_t_project_status_log), [project?.proj_t_project_status_log]);

  const colorOf = (statusId) => statuses.find((s) => s.status_id === statusId)?.display_color || "#6b7280";
  const last = rows.length ? rows[rows.length - 1] : null;
  const finished = isPastInstallProject(project, statuses);
  const now = new Date();
  const inCurrentSeconds = last ? secondsBetween(last.changedAt, now) : null;
  const totalEnd = finished && last ? last.changedAt : now;
  const totalSeconds = project?.created_at ? secondsBetween(project.created_at, totalEnd) : null;

  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: "#27374f", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}><u>Status History</u></div>

      {rows.length === 0 ? (
        <div style={{ fontSize: "11px", color: "#94a3b8" }}>No status changes recorded yet.</div>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, borderLeft: "2px solid #e2e8f0" }}>
          {rows.map((row) => {
            const color = colorOf(row.toStatusId);
            return (
              <li key={row.logId} style={{ position: "relative", padding: "0 0 8px 12px" }}>
                <span aria-hidden="true" style={{ position: "absolute", left: "-5px", top: "4px", width: "8px", height: "8px", borderRadius: "50%", background: color }} />
                <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "baseline" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b" }}>{row.toStatusName || "No status"}</span>
                  <span style={{ fontSize: "10px", color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(row.changedAt)}</span>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                  {row.isBaseline
                    ? "Already in this status when tracking started"
                    : row.fromStatusName || row.fromStatusId != null
                      ? `From ${row.fromStatusName || "a removed status"}${row.durationSeconds != null ? ` after ${formatDuration(row.durationSeconds)}` : ""}`
                      : "First status"}
                  {row.changedByName ? ` · by ${row.changedByName}` : ""}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {rows.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "4px" }}>
          <tbody>
            {!finished && last && inCurrentSeconds != null ? (
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>In {last.toStatusName || "this status"}</td>
                <td style={{ padding: "4px 0", fontSize: "12px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>
                  {last.isBaseline ? `${formatDuration(inCurrentSeconds)}+` : formatDuration(inCurrentSeconds)}
                </td>
              </tr>
            ) : null}
            {totalSeconds != null ? (
              <tr>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>{finished ? "Total time (finished)" : "Total time so far"}</td>
                <td style={{ padding: "4px 0", fontSize: "12px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{formatDuration(totalSeconds)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}