"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toastError } from "@/shared/components/ui";
import { startNavbarLoader } from "@/shared/utils/navbar-loader";
import { loadRunDetails } from "../data/projectMap.actions";
import { formatRunCode, getRunStatusColor, getRunScheduleState, formatDisplayDate } from "../data/projectMap.data";
import { computeRunSegmentData } from "../utils/runSegments";
import { generateRunManifestPrint } from "../utils/printRunManifest";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Filter tabs. Labels are worked out by getRunScheduleState, never stored.
const FILTERS = [
  { key: "all", label: "All", color: "#1e293b" },
  { key: "onTrack", label: "On Track", color: "#16a34a" },
  { key: "behind", label: "Behind", color: "#dc2626" },
  { key: "rescheduled", label: "Rescheduled", color: "#d97706" },
];

// "YYYY-MM-DD" for a date, in the viewer's own time zone.
function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Same date format as the rest of Project Map ("Oct 16, 2026").
function formatDateKey(key) {
  return formatDisplayDate(key);
}

// The 42 days (6 weeks) shown for a month, starting on the Sunday on or before the 1st.
function buildMonthDays(monthStart) {
  const gridStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function runTitle(run) {
  return run.run_name || run.run_code || formatRunCode(run.run_number) || `Run #${run.id}`;
}

function Tag({ color, children }) {
  return (
    <span style={{ fontSize: "9px", fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: "3px", padding: "0 3px", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}
/**
 * RunCalendarView — the runs this user may see, on a month calendar by run
 * date, with On Track / Behind / Rescheduled filters. View only: dates are
 * changed in Edit Run. Clicking a run shows its details and Print Manifest.
 */
export default function RunCalendarView({ runs = [], runStatuses = [] }) {
  const router = useRouter();
  const todayKey = toDateKey(new Date());
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [filter, setFilter] = useState("all");
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [printing, setPrinting] = useState(false);

  // Every dated run with its worked-out labels.
  const items = useMemo(
    () => runs
      .filter((run) => run.run_date)
      .map((run) => ({ run, state: getRunScheduleState(run, runStatuses, todayKey) })),
    [runs, runStatuses, todayKey]
  );

  const matches = useCallback((item) => filter === "all" || item.state[filter], [filter]);

  const counts = useMemo(() => ({
    all: items.length,
    onTrack: items.filter((item) => item.state.onTrack).length,
    behind: items.filter((item) => item.state.behind).length,
    rescheduled: items.filter((item) => item.state.rescheduled).length,
  }), [items]);

  // "YYYY-MM-DD" → runs on that day (after the filter).
  const itemsByDay = useMemo(() => {
    const lookup = new Map();
    items.filter(matches).forEach((item) => {
      const key = String(item.run.run_date).slice(0, 10);
      if (!lookup.has(key)) lookup.set(key, []);
      lookup.get(key).push(item);
    });
    return lookup;
  }, [items, matches]);

  // With a label picked, every matching run is also listed, so one in another month is not missed.
  const filteredList = useMemo(
    () => (filter === "all"
      ? []
      : items.filter(matches).sort((a, b) => String(a.run.run_date).localeCompare(String(b.run.run_date)))),
    [items, matches, filter]
  );

  const days = useMemo(() => buildMonthDays(monthStart), [monthStart]);
  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selected = items.find((item) => item.run.id === selectedRunId) || null;

  const shiftMonth = (delta) => setMonthStart((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const goToToday = () => {
    const now = new Date();
    setMonthStart(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Same print as the Run Master List.
  const handlePrintManifest = async (run) => {
    setPrinting(true);
    try {
      const detail = await loadRunDetails(run.id);
      if (!detail?.run) {
        toastError("Unable to load run details for printing.", "Print");
        return;
      }
      const projects = detail.projects || [];
      let runSegmentData = null;
      try {
        runSegmentData = await computeRunSegmentData(detail.run, projects);
      } catch (err) {
        console.error("[RunCalendarView] Segment calculation failed:", err);
      }
      generateRunManifestPrint(detail.run, projects, runSegmentData);
    } catch (err) {
      console.error("[RunCalendarView] Print failed:", err);
      toastError(err?.message || "Failed to print manifest.", "Print");
    } finally {
      setPrinting(false);
    }
  };
  const renderRunChip = ({ run, state }) => (
    <button
      key={run.id}
      type="button"
      onClick={() => setSelectedRunId(run.id)}
      title={`${runTitle(run)} — ${run.status || ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "2px",
        width: "100%",
        textAlign: "left",
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderLeft: `3px solid ${getRunStatusColor(run.status, runStatuses)}`,
        borderRadius: "3px",
        padding: "2px 4px",
        fontSize: "10px",
        color: "#1e293b",
        cursor: "pointer",
      }}
    >
      <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{runTitle(run)}</span>
      <span style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
        {state.behind && <Tag color="#dc2626">Behind</Tag>}
        {state.rescheduled && <Tag color="#d97706">Rescheduled</Tag>}
      </span>
    </button>
  );

  const navButtonStyle = { border: "1px solid #e2e8f0", background: "#fff", borderRadius: "3px", padding: "3px 10px", fontSize: "12px", cursor: "pointer" };

  return (
    <div style={{ padding: "10px", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#1e293b" }}>Run Calendar</h2>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>Runs by date. On Track, Behind and Rescheduled are worked out automatically.</p>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button type="button" style={navButtonStyle} onClick={() => { startNavbarLoader(); router.push("/project-map"); }}>🗺️ Project Map</button>
          <button type="button" style={navButtonStyle} onClick={() => { startNavbarLoader(); router.push("/project-map/run-master"); }}>📋 Run Master List</button>
        </div>
      </div>

      {/* Filters and month navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "6px 8px", marginBottom: "8px" }}>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                border: "none",
                borderBottom: `2px solid ${filter === f.key ? f.color : "transparent"}`,
                background: filter === f.key ? "#f1f5f9" : "#fff",
                color: filter === f.key ? "#1e293b" : "#64748b",
                fontWeight: filter === f.key ? 600 : 400,
                fontSize: "12px",
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button type="button" style={navButtonStyle} onClick={() => shiftMonth(-1)}>‹ Prev</button>
          <button type="button" style={navButtonStyle} onClick={goToToday}>Today</button>
          <button type="button" style={navButtonStyle} onClick={() => shiftMonth(1)}>Next ›</button>
          <strong style={{ fontSize: "13px", color: "#1e293b", minWidth: "130px", textAlign: "right" }}>{monthLabel}</strong>
        </div>
      </div>
      {/* Month grid */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(110px, 1fr))", background: "#e2e8f0", gap: "1px", border: "1px solid #e2e8f0", borderRadius: "4px", minWidth: "780px" }}>
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} style={{ background: "#f8fafc", padding: "4px 6px", fontSize: "11px", fontWeight: 600, color: "#64748b" }}>{weekday}</div>
          ))}
          {days.map((day) => {
            const key = toDateKey(day);
            const inMonth = day.getMonth() === monthStart.getMonth();
            const isToday = key === todayKey;
            const dayItems = itemsByDay.get(key) || [];
            return (
              <div key={key} style={{ background: inMonth ? "#fff" : "#f8fafc", minHeight: "96px", padding: "4px", display: "flex", flexDirection: "column", gap: "3px" }}>
                <span style={{
                  alignSelf: "flex-start",
                  fontSize: "11px",
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? "#fff" : inMonth ? "#1e293b" : "#94a3b8",
                  background: isToday ? "#2563eb" : "transparent",
                  borderRadius: "10px",
                  padding: "0 6px",
                }}>
                  {day.getDate()}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "120px", overflowY: "auto" }}>
                  {dayItems.map(renderRunChip)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Every run matching the picked label, any month */}
      {filter !== "all" && (
        <div style={{ marginTop: "10px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "8px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
            {FILTERS.find((f) => f.key === filter)?.label}: {filteredList.length} run{filteredList.length === 1 ? "" : "s"}
          </div>
          {filteredList.length === 0 ? (
            <div style={{ fontSize: "12px", color: "#64748b" }}>No runs.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {filteredList.map(({ run }) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setSelectedRunId(run.id)}
                  style={{ display: "flex", gap: "10px", alignItems: "center", textAlign: "left", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}
                >
                  <span style={{ minWidth: "95px", color: "#64748b" }}>{formatDateKey(run.run_date)}</span>
                  <strong style={{ color: "#1e293b" }}>{runTitle(run)}</strong>
                  <span style={{ color: getRunStatusColor(run.status, runStatuses) }}>{run.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Run details */}
      <Modal show={!!selected} onHide={() => setSelectedRunId(null)} title={selected ? runTitle(selected.run) : ""}>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "#1e293b" }}>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {selected.state.onTrack && <Tag color="#16a34a">On Track</Tag>}
              {selected.state.behind && <Tag color="#dc2626">Behind</Tag>}
              {selected.state.rescheduled && <Tag color="#d97706">Rescheduled</Tag>}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Run code", selected.run.run_code || formatRunCode(selected.run.run_number) || "—"],
                  ["Status", selected.run.status || "—"],
                  ["Run date", formatDateKey(selected.run.run_date)],
                  ...(selected.state.rescheduled ? [["Originally", formatDateKey(selected.run.original_run_date)]] : []),
                  ["Origin", selected.run.proj_s_origin_addresses?.origin_name || "—"],
                  ["Stops", selected.run.proj_t_run_projects?.length ?? selected.run.stops ?? 0],
                  ["Team", selected.run.team_assigned || "—"],
                  ["Vehicle", selected.run.vehicle_assigned || "—"],
                  ["Notes", selected.run.notes || "—"],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ padding: "4px 8px 4px 0", fontSize: "11px", fontWeight: 600, color: "#64748b", width: "110px", verticalAlign: "top" }}>{label}</td>
                    <td style={{ padding: "4px 0", fontSize: "12px" }}>{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setSelectedRunId(null)}>Close</Button>
              <Button variant="primary" loading={printing} onClick={() => handlePrintManifest(selected.run)}>Print Manifest</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}




