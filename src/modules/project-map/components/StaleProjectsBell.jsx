"use client";

import { useEffect, useRef, useState } from "react";
import { stripTownshipLabel, DEFAULT_STALE_AFTER_DAYS, getRunStatusColor } from "../data/projectMap.data";

function formatShortDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function userName(user) {
  return user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "" : "";
}

function latestOf(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((best, row) => {
    if (!best) return row;
    const diff = new Date(row.changed_at) - new Date(best.changed_at);
    return diff > 0 || (diff === 0 && Number(row.log_id) > Number(best.log_id)) ? row : best;
  }, null);
}

// The latest History entry as one line: "Pending Permits since Oct 3, 2026 · from
// Welcome Email / Call · by Mark Coles", or for a starting row "Pending Permits ·
// already in it when tracking started (Nov 18, 2026)". Empty when there is no history.
function historyText(latest, toName, fromName) {
  if (!latest) return "";
  const status = toName || "No status";
  const date = formatShortDate(latest.changed_at);
  if (latest.is_baseline) return `${status} · already in it when tracking started (${date})`;
  const by = userName(latest.psb_s_user);
  return [`${status} since ${date}`, fromName ? `from ${fromName}` : "", by ? `by ${by}` : ""].filter(Boolean).join(" · ");
}

function latestProjectHistoryText(project) {
  const latest = latestOf(project?.proj_t_project_status_log);
  return historyText(latest, latest?.to_status_name, latest?.from_status_name);
}

function latestRunHistoryText(run) {
  const latest = latestOf(run?.proj_t_run_status_log);
  return historyText(latest, latest?.to_status, latest?.from_status);
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

const ROW_STYLE = { display: "block", width: "100%", textAlign: "left", padding: "7px 10px", border: "none", borderBottom: "1px solid #f1f5f9", background: "#fff", cursor: "pointer" };
const EMPTY_STYLE = { margin: 0, padding: "12px 10px", fontSize: "11px", color: "#94a3b8", textAlign: "center" };

/**
 * Bell next to "Show Labels": open projects and open runs nobody has updated
 * for staleAfterDays days or more, oldest first, in two tabs. Each time it is
 * opened it shows the tab of the page's current tab (`mode`); without run
 * access (`showRuns` false) there are no tabs, only projects.
 * items = getStaleProjects(...) ([{ project, days }]); runItems = getStaleRuns(...)
 * ([{ run, days }]). Picking one closes the list and calls onOpenProject(projectId)
 * or onOpenRun(runId).
 */
export default function StaleProjectsBell({
  items = [], statuses = [], onOpenProject,
  runItems = [], runStatuses = [], onOpenRun,
  mode = "projects", showRuns = false,
  staleAfterDays = DEFAULT_STALE_AFTER_DAYS,
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("projects");
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

  // Opening starts on the page's current tab.
  const toggleOpen = () => {
    if (!open) setTab(showRuns && mode === "runs" ? "runs" : "projects");
    setOpen((v) => !v);
  };

  const projectCount = items.length;
  const runCount = showRuns ? runItems.length : 0;
  const count = projectCount + runCount;
  const activeTab = showRuns ? tab : "projects";
  const statusOf = (project) => project.proj_s_project_status
    || statuses.find((s) => s.status_id === project.status_id) || null;
  const parts = [
    projectCount ? `${projectCount} project${projectCount === 1 ? "" : "s"}` : "",
    runCount ? `${runCount} run${runCount === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  const label = count
    ? `${parts.join(" and ")} not updated for ${staleAfterDays}+ days`
    : `Nothing waiting ${staleAfterDays}+ days`;

  const tabButton = (key, text, n) => {
    const on = activeTab === key;
    return (
      <button key={key} type="button" role="tab" aria-selected={on} onClick={() => setTab(key)}
        style={{ flex: 1, padding: "7px 8px", border: "none", borderBottom: on ? "2px solid #1e293b" : "2px solid transparent", background: on ? "#f8fafc" : "#fff", color: on ? "#1e293b" : "#64748b", fontSize: "11px", fontWeight: on ? 700 : 500, cursor: "pointer" }}>
        {text}
        <span style={{ marginLeft: "6px", padding: "0 6px", borderRadius: "8px", background: n ? "#fee2e2" : "#f1f5f9", color: n ? "#dc2626" : "#94a3b8", fontSize: "10px", fontWeight: 700 }}>{n}</span>
      </button>
    );
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button type="button" onClick={toggleOpen} aria-haspopup="true" aria-expanded={open}
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
        <div role="dialog" aria-label="Projects and runs not updated"
          style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: "340px", maxHeight: "460px", display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.15)", zIndex: 2000 }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>Not updated for {staleAfterDays}+ days</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Nobody has changed these in a while. Oldest first.</div>
          </div>

          {showRuns ? (
            <div role="tablist" aria-label="Show" style={{ display: "flex", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
              {tabButton("projects", "Projects", projectCount)}
              {tabButton("runs", "Runs", runCount)}
            </div>
          ) : null}

          <div role={showRuns ? "tabpanel" : undefined} style={{ overflowY: "auto" }}>
            {activeTab === "projects" ? (
              projectCount === 0 ? (
                <p style={EMPTY_STYLE}>Every open project was updated in the last {staleAfterDays} days.</p>
              ) : items.map(({ project, days }) => {
                const status = statusOf(project);
                const place = project.city && project.state
                  ? `${stripTownshipLabel(project.city)}, ${project.state}`
                  : stripTownshipLabel(project.formatted_address);
                const latest = latestProjectHistoryText(project);
                return (
                  <button key={`p-${project.id}`} type="button" onClick={() => { setOpen(false); onOpenProject?.(project.id); }} style={ROW_STYLE}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: status?.display_color || "#6b7280", flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: "11px", color: "#1e293b", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.client_name || "Untitled"}
                      </span>
                      <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: "10px", fontWeight: 600, color: "#dc2626" }}>{days} days</span>
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                      {[place, status?.status_name].filter(Boolean).join(" · ")}
                    </div>
                    {latest ? <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>Latest: {latest}</div> : null}
                  </button>
                );
              })
            ) : (
              runCount === 0 ? (
                <p style={EMPTY_STYLE}>Every open run was updated in the last {staleAfterDays} days.</p>
              ) : runItems.map(({ run, days }) => {
                const latest = latestRunHistoryText(run);
                const title = [run.run_code, run.run_name].filter(Boolean).join(" · ") || `Run #${run.run_number || run.id}`;
                return (
                  <button key={`r-${run.id}`} type="button" onClick={() => { setOpen(false); onOpenRun?.(run.id); }} style={ROW_STYLE}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: getRunStatusColor(run.status, runStatuses), flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: "11px", color: "#1e293b", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
                      <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: "10px", fontWeight: 600, color: "#dc2626" }}>{days} days</span>
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>
                      {[run.run_date ? formatShortDate(`${String(run.run_date).slice(0, 10)}T00:00:00`) : "No run date", run.status].filter(Boolean).join(" · ")}
                    </div>
                    {latest ? <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>Latest: {latest}</div> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}