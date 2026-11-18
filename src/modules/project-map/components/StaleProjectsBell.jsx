"use client";

import { useEffect, useRef, useState } from "react";
import { stripTownshipLabel, STALE_AFTER_DAYS } from "../data/projectMap.data";

function formatShortDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// The project's latest History entry (proj_t_project_status_log rows embedded on
// the project), as one line: "Pending Permits since Oct 3, 2026 · from Welcome
// Email / Call · by Mark Coles", or for a starting row "Pending Permits · already
// in it when tracking started (Nov 18, 2026)". Empty when there is no history.
function latestHistoryText(project) {
  const rows = Array.isArray(project?.proj_t_project_status_log) ? project.proj_t_project_status_log : [];
  const latest = rows.reduce((best, row) => {
    if (!best) return row;
    const diff = new Date(row.changed_at) - new Date(best.changed_at);
    return diff > 0 || (diff === 0 && Number(row.log_id) > Number(best.log_id)) ? row : best;
  }, null);
  if (!latest) return "";
  const status = latest.to_status_name || "No status";
  const date = formatShortDate(latest.changed_at);
  if (latest.is_baseline) return `${status} · already in it when tracking started (${date})`;
  const user = latest.psb_s_user;
  const by = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "" : "";
  return [
    `${status} since ${date}`,
    latest.from_status_name ? `from ${latest.from_status_name}` : "",
    by ? `by ${by}` : "",
  ].filter(Boolean).join(" · ");
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/**
 * Bell next to "Show Labels": open projects nobody has updated for
 * STALE_AFTER_DAYS days or more. items = getStaleProjects(...) ([{ project, days }],
 * oldest first). Picking one closes the list and calls onOpenProject(projectId).
 */
export default function StaleProjectsBell({ items = [], statuses = [], onOpenProject }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKeyDown = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const count = items.length;
  const statusOf = (project) => project.proj_s_project_status
    || statuses.find((s) => s.status_id === project.status_id) || null;
  const label = count
    ? `${count} project${count === 1 ? "" : "s"} not updated for ${STALE_AFTER_DAYS}+ days`
    : `No projects waiting ${STALE_AFTER_DAYS}+ days`;

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="true" aria-expanded={open}
        aria-label={label} title={label}
        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", padding: 0, border: "1px solid #e2e8f0", borderRadius: "4px", background: open ? "#f1f5f9" : "#fff", color: "#1e293b", cursor: "pointer" }}>
        <BellIcon />
        {count > 0 && (
          <span style={{ position: "absolute", top: "-6px", right: "-7px", minWidth: "15px", height: "15px", padding: "0 3px", borderRadius: "8px", background: "#dc2626", color: "#fff", fontSize: "9px", fontWeight: 700, lineHeight: "15px", textAlign: "center" }}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Projects not updated"
          style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: "320px", maxHeight: "420px", display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.15)", zIndex: 2000 }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>Not updated for {STALE_AFTER_DAYS}+ days</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Open projects nobody has changed in a while. Oldest first.</div>
          </div>
          <div style={{ overflowY: "auto" }}>
            {count === 0 ? (
              <p style={{ margin: 0, padding: "12px 10px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
                Every open project was updated in the last {STALE_AFTER_DAYS} days.
              </p>
            ) : items.map(({ project, days }) => {
              const status = statusOf(project);
              const place = project.city && project.state
                ? `${stripTownshipLabel(project.city)}, ${project.state}`
                : stripTownshipLabel(project.formatted_address);
              return (
                <button key={project.id} type="button" onClick={() => { setOpen(false); onOpenProject?.(project.id); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", border: "none", borderBottom: "1px solid #f1f5f9", background: "#fff", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: status?.display_color || "#6b7280", flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: "11px", color: "#1e293b", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {project.client_name || "Untitled"}
                    </span>
                    <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: "10px", fontWeight: 600, color: "#dc2626" }}>
                      {days} days
                    </span>
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                    {[place, status?.status_name].filter(Boolean).join(" · ")}
                  </div>
                  {latestHistoryText(project) ? (
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>
                      Latest: {latestHistoryText(project)}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}