"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, FileAttachments, toastError, toastSuccess } from "@/shared/components/ui";
import AppIcon from "@/shared/components/ui/AppIcon";
import { startNavbarLoader } from "@/shared/utils/navbar-loader";
import { loadRunDetails, updateRun, loadPaidSheet, loadFiles, createFileUpload, saveUploadedFile, getFileUrl, deleteFile } from "../data/projectMap.actions";
import { formatRunCode, getRunStatusColor, getRunScheduleState, formatDisplayDate, splitRunAmounts, runStatusKeyByName, resolveRunStatusOptions, canEditRunStatusName, PROJECT_FILE_MAX_BYTES, PROJECT_FILE_TYPES } from "../data/projectMap.data";
import { computeRunSegmentData } from "../utils/runSegments";
import { generateRunManifestPrint } from "../utils/printRunManifest";
import { generatePaidSheetPrint } from "../utils/printPaidSheet";
import StopStatusPrompt from "../components/StopStatusPrompt";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Filter tabs. Labels are worked out by getRunScheduleState, never stored.
const FILTERS = [
  { key: "all", label: "All", color: "#1e293b" },
  { key: "onTrack", label: "On Track", color: "#16a34a" },
  { key: "behind", label: "Behind", color: "#dc2626" },
  { key: "rescheduled", label: "Rescheduled", color: "#d97706" },
  // Completed or cancelled runs: in "All" but neither on track nor behind.
  { key: "finished", label: "Completed / Cancelled", color: "#64748b" },
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

const money = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Run pop-up styles
const POPUP_CARD = { border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", background: "#fff" };
const POPUP_SECTION_TITLE = { fontSize: "12px", fontWeight: 600, color: "#0f172a", marginBottom: "8px" };
const POPUP_FIELD_LABEL = { display: "block", fontSize: "11px", color: "#64748b", marginBottom: "3px" };
const POPUP_INPUT = { flex: 1, minWidth: 0, border: "1px solid #e2e8f0", borderRadius: "6px", padding: "5px 8px", fontSize: "12px", background: "#fff" };

// Soft rounded pill in a status colour. Setup colours are hex; anything else shows grey.
function Pill({ color = "#64748b", children }) {
  const hex = /^#[0-9a-f]{6}$/i.test(String(color)) ? color : "#64748b";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: "11px", fontWeight: 600, lineHeight: "18px", color: hex, background: `${hex}1A`, border: `1px solid ${hex}33`, borderRadius: "999px", padding: "0 8px", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// One figure in the pop-up's stat row.
function StatCard({ label, value, valueColor = "#0f172a", sub = null, subColor = "#64748b" }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "8px", padding: "10px 12px" }}>
      <div style={{ fontSize: "11px", color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: 600, color: valueColor, lineHeight: 1.3 }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: subColor }}>{sub}</div>}
    </div>
  );
}

function formatDriveTime(seconds) {
  if (seconds == null || Number.isNaN(Number(seconds))) return "—";
  const mins = Math.round(Number(seconds) / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} hr ${mins % 60} min`;
}

/**
 * Totals for a set of calendar items: runs, behind, cancelled, stops, route
 * miles, revenue and repairs (same figures as the run list). Cancelled runs
 * are counted but left out of stops, miles and money.
 */
function summarize(list, runStatuses) {
  const totals = {
    runs: 0, behind: 0, onTrack: 0, rescheduled: 0, finished: 0, cancelled: 0,
    stops: 0, miles: 0, seconds: 0, revenue: 0, repairs: 0,
    byStatus: {}, byOrigin: {}, byDay: {},
  };
  list.forEach(({ run, state }) => {
    totals.runs += 1;
    if (state.behind) totals.behind += 1;
    if (state.onTrack) totals.onTrack += 1;
    if (state.rescheduled) totals.rescheduled += 1;
    if (state.finished) totals.finished += 1;
    const statusName = run.status || "No status";
    totals.byStatus[statusName] = (totals.byStatus[statusName] || 0) + 1;
    const dayKey = String(run.run_date || "").slice(0, 10);
    if (dayKey) totals.byDay[dayKey] = (totals.byDay[dayKey] || 0) + 1;
    if (runStatusKeyByName(runStatuses, run.status) === "cancelled") {
      totals.cancelled += 1;
      return;
    }
    const origin = run.proj_s_origin_addresses?.origin_name || "No origin";
    totals.byOrigin[origin] = (totals.byOrigin[origin] || 0) + 1;
    const stops = Array.isArray(run.proj_t_run_projects) ? run.proj_t_run_projects : null;
    totals.stops += stops ? stops.length : Number(run.stops) || 0;
    totals.miles += run.estimated_distance != null ? Number(run.estimated_distance) / 1609.344 : 0;
    totals.seconds += run.estimated_duration != null ? Number(run.estimated_duration) || 0 : 0;
    const amounts = stops ? splitRunAmounts(stops) : { revenue: Number(run.estimated_subtotal) || 0, repairs: 0 };
    totals.revenue += amounts.revenue;
    totals.repairs += amounts.repairs;
  });
  return totals;
}

// One line of totals; `compact` stacks them for the narrow week column.
function SummaryLine({ totals, compact = false }) {
  const parts = [
    [`${totals.runs} run${totals.runs === 1 ? "" : "s"}`, "#1e293b"],
    [`${totals.stops} stop${totals.stops === 1 ? "" : "s"}`, "#475569"],
    [`${totals.miles.toFixed(0)} mi`, "#475569"],
    [money(totals.revenue), "#16a34a"],
    ...(totals.repairs > 0 ? [[`Repairs ${money(totals.repairs)}`, "#dc2626"]] : []),
    ...(totals.behind > 0 ? [[`${totals.behind} behind`, "#dc2626"]] : []),
    ...(totals.cancelled > 0 ? [[`${totals.cancelled} cancelled`, "#64748b"]] : []),
  ];
  return (
    <span style={{ display: "flex", flexDirection: compact ? "column" : "row", flexWrap: "wrap", gap: compact ? "1px" : "10px", fontSize: compact ? "10px" : "12px" }}>
      {parts.map(([text, color]) => <span key={text} style={{ color, fontWeight: color === "#1e293b" ? 600 : 400 }}>{text}</span>)}
    </span>
  );
}

const SHORT_DATE = { month: "short", day: "numeric" };

// The week column: the week's dates and its figures, stacked for the narrow column.
function WeekSummary({ weekDays, totals }) {
  const first = weekDays[0];
  const last = weekDays[weekDays.length - 1];
  const range = first.getMonth() === last.getMonth()
    ? `${first.toLocaleDateString("en-US", SHORT_DATE)} – ${last.getDate()}`
    : `${first.toLocaleDateString("en-US", SHORT_DATE)} – ${last.toLocaleDateString("en-US", SHORT_DATE)}`;
  const line = (text, color = "#475569", bold = false) => (
    <span style={{ color, fontWeight: bold ? 600 : 400 }}>{text}</span>
  );
  const schedule = [
    totals.onTrack > 0 && [`${totals.onTrack} on track`, "#16a34a"],
    totals.behind > 0 && [`${totals.behind} behind`, "#dc2626"],
    totals.rescheduled > 0 && [`${totals.rescheduled} resched.`, "#d97706"],
  ].filter(Boolean);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px", fontSize: "10px", lineHeight: 1.45, width: "100%" }}>
      <span style={{ color: "#94a3b8", marginBottom: "2px" }}>{range}</span>
      {totals.runs === 0 ? (
        <span style={{ color: "#94a3b8" }}>No runs</span>
      ) : (
        <>
          {line(`${totals.runs} run${totals.runs === 1 ? "" : "s"}`, "#1e293b", true)}
          {schedule.length > 0 && (
            <span>
              {schedule.map(([text, color], i) => (
                <span key={text} style={{ color }}>{i > 0 ? " · " : ""}{text}</span>
              ))}
            </span>
          )}
          {line(`${totals.stops} stop${totals.stops === 1 ? "" : "s"} · ${Math.round(totals.miles).toLocaleString("en-US")} mi`)}
          {totals.seconds > 0 && line(`${formatDriveTime(totals.seconds)} driving`)}
          <span style={{ borderTop: "1px solid #e2e8f0", margin: "3px 0" }} />
          {line(money(totals.revenue), "#16a34a", true)}
          {totals.repairs > 0 && line(`Repairs ${money(totals.repairs)}`, "#dc2626")}

          {totals.cancelled > 0 && line(`${totals.cancelled} cancelled`, "#64748b")}
        </>
      )}
    </div>
  );
}

const MONTH_BIG = { fontSize: "20px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" };

// Section under the calendar: the shown month's runs, route and money (selected
// tab), its busiest day, and breakdowns by run status and origin.
function MonthSummary({ label, filterLabel, totals, runStatuses }) {
  const activeRuns = totals.runs - totals.cancelled;
  const busiest = Object.entries(totals.byDay).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const statusRows = Object.entries(totals.byStatus).sort((a, b) => b[1] - a[1]);
  const originRows = Object.entries(totals.byOrigin).sort((a, b) => b[1] - a[1]);
  const row = (name, value, color = "#1e293b") => (
    <div key={name} style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "12px", padding: "2px 0" }}>
      <span style={{ color: "#64748b" }}>{name}</span>
      <span style={{ color, fontWeight: 600, whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
  return (
    <section style={{ marginTop: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
        <strong style={{ fontSize: "14px", color: "#0f172a" }}>{label} summary</strong>
        <span style={{ fontSize: "11px", color: "#64748b" }}>{filterLabel} runs · cancelled runs are left out of stops, miles and money</span>
      </div>
      {totals.runs === 0 ? (
        <div style={{ fontSize: "12px", color: "#64748b" }}>No runs in {label}.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
            <div style={POPUP_CARD}>
              <div style={POPUP_SECTION_TITLE}>Runs</div>
              <div style={MONTH_BIG}>{totals.runs}</div>
              {row("On track", totals.onTrack, "#16a34a")}
              {row("Behind", totals.behind, totals.behind > 0 ? "#dc2626" : "#1e293b")}
              {row("Rescheduled", totals.rescheduled, totals.rescheduled > 0 ? "#d97706" : "#1e293b")}
              {row("Completed / cancelled", totals.finished, "#64748b")}
            </div>
            <div style={POPUP_CARD}>
              <div style={POPUP_SECTION_TITLE}>Route</div>
              <div style={MONTH_BIG}>{Math.round(totals.miles).toLocaleString("en-US")} mi</div>
              {row("Stops", totals.stops)}
              {row("Drive time", totals.seconds > 0 ? formatDriveTime(totals.seconds) : "—")}
              {row("Stops per run", activeRuns > 0 ? (totals.stops / activeRuns).toFixed(1) : "—")}
              {row("Miles per run", activeRuns > 0 ? Math.round(totals.miles / activeRuns).toLocaleString("en-US") : "—")}
            </div>
            <div style={POPUP_CARD}>
              <div style={POPUP_SECTION_TITLE}>Revenue</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Total revenue</div>
              <div style={{ ...MONTH_BIG, color: "#16a34a" }}>{money(totals.revenue)}</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Total repair cost</div>
              <div style={{ ...MONTH_BIG, color: totals.repairs > 0 ? "#dc2626" : "#0f172a", marginBottom: 0 }}>{money(totals.repairs)}</div>
            </div>
            <div style={POPUP_CARD}>
              <div style={POPUP_SECTION_TITLE}>Busiest day</div>
              <div style={MONTH_BIG}>{busiest ? formatDateKey(busiest[0]) : "—"}</div>
              {busiest && row("Runs that day", busiest[1])}
              {row("Days with runs", Object.keys(totals.byDay).length)}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px", marginTop: "10px" }}>
            <div style={POPUP_CARD}>
              <div style={POPUP_SECTION_TITLE}>By run status</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {statusRows.map(([name, count]) => (
                  <Pill key={name} color={getRunStatusColor(name, runStatuses)}>{name} · {count}</Pill>
                ))}
              </div>
            </div>
            <div style={POPUP_CARD}>
              <div style={POPUP_SECTION_TITLE}>By origin</div>
              {originRows.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#64748b" }}>Only cancelled runs this month.</div>
              ) : (
                originRows.map(([name, count]) => row(name, `${count} run${count === 1 ? "" : "s"}`))
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * RunCalendarView — the runs this user may see, on a month calendar by run
 * date, with On Track / Behind / Rescheduled filters and month / week / day
 * totals. Clicking a run opens its stops, status change (with the project
 * status cascade), reschedule, prints and files; changes follow the run's
 * status ticks.
 */
export default function RunCalendarView({ runs = [], runStatuses = [], statuses = [], paymentMethods = [], editAccess = null }) {
  const router = useRouter();
  const todayKey = toDateKey(new Date());
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [filter, setFilter] = useState("all");
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [printing, setPrinting] = useState(false);
  // The run picked in the list, outlined on the calendar until another is picked.
  const [focusedRunId, setFocusedRunId] = useState(null);
  // Left column (run list) open or folded away.
  const [listOpen, setListOpen] = useState(true);
  // Text typed in the run list's search box (narrows the list only).
  const [listSearch, setListSearch] = useState("");
  // "YYYY-MM-DD" of the day whose summary pop-up is open.
  const [summaryDayKey, setSummaryDayKey] = useState(null);
  // Run pop-up: its stops (loaded when opened), the status / date being edited, busy flags.
  const [runStops, setRunStops] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingDate, setPendingDate] = useState("");
  const [savingRun, setSavingRun] = useState(false);
  const [printingPaidSheet, setPrintingPaidSheet] = useState(false);
  // "Choose a status" pop-up after a run is cancelled here.
  const [stopPrompt, setStopPrompt] = useState(null);
  const calendarRef = useRef(null);

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
    finished: items.filter((item) => item.state.finished).length,
  }), [items]);

  // Runs with no run date cannot sit on the calendar; shown as a count only.
  const undatedCount = useMemo(() => runs.filter((run) => !run.run_date).length, [runs]);

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

  // Every run of the picked tab, any month, newest date first, so one in another month is not missed.
  const filteredList = useMemo(
    () => items.filter(matches).sort((a, b) =>
      String(b.run.run_date).localeCompare(String(a.run.run_date)) || (Number(b.run.run_number) || 0) - (Number(a.run.run_number) || 0)),
    [items, matches]
  );

  // The list after the search box: every typed word must appear in the run's
  // name, code, status, origin, team, vehicle, notes, date or stop names.
  const searchedList = useMemo(() => {
    const words = listSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return filteredList;
    return filteredList.filter(({ run }) => {
      const stopNames = (Array.isArray(run.proj_t_run_projects) ? run.proj_t_run_projects : [])
        .map((rp) => [rp?.proj_t_projects?.client_name, rp?.proj_t_projects?.city].filter(Boolean).join(" "));
      const text = [
        runTitle(run),
        run.run_code,
        formatRunCode(run.run_number),
        run.status,
        run.proj_s_origin_addresses?.origin_name,
        run.team_assigned,
        run.vehicle_assigned,
        run.notes,
        formatDateKey(run.run_date),
        String(run.run_date || "").slice(0, 10),
        ...stopNames,
      ].filter(Boolean).join(" ").toLowerCase();
      return words.every((word) => text.includes(word));
    });
  }, [filteredList, listSearch]);

  // A run picked in the list: open its month, outline it, and bring the calendar into view.
  const showOnCalendar = (run) => {
    const match = String(run.run_date || "").match(/^(\d{4})-(\d{2})/);
    if (match) setMonthStart(new Date(Number(match[1]), Number(match[2]) - 1, 1));
    setFocusedRunId(run.id);
    calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const days = useMemo(() => buildMonthDays(monthStart), [monthStart]);

  // Totals for the shown month (selected tab only).
  const monthTotals = useMemo(() => {
    const prefix = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
    return summarize(items.filter(matches).filter((item) => String(item.run.run_date).startsWith(prefix)), runStatuses);
  }, [items, matches, monthStart, runStatuses]);

  // The grid's six weeks, each with its days and totals (selected tab only).
  const weeks = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const weekDays = days.slice(index * 7, index * 7 + 7);
    const weekItems = weekDays.flatMap((day) => itemsByDay.get(toDateKey(day)) || []);
    return { weekDays, totals: summarize(weekItems, runStatuses) };
  }), [days, itemsByDay, runStatuses]);

  const summaryDayItems = summaryDayKey ? itemsByDay.get(summaryDayKey) || [] : [];
  const summaryDayTotals = useMemo(() => summarize(summaryDayItems, runStatuses), [summaryDayItems, runStatuses]);
  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selected = items.find((item) => item.run.id === selectedRunId) || null;

  const shiftMonth = (delta) => setMonthStart((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const goToToday = () => {
    const now = new Date();
    setMonthStart(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const selectedRun = selected?.run || null;
  // Changes follow the run's status ticks (the server checks them too).
  const canChangeSelectedRun = selectedRun ? canEditRunStatusName(editAccess, selectedRun.status) : false;

  // Stat cards of the run pop-up. Uses the loaded stops when ready, else the
  // stops that came with the run list. Repairs are never revenue.
  const selectedTotals = useMemo(() => {
    if (!selectedRun) return null;
    const listStops = Array.isArray(selectedRun.proj_t_run_projects) ? selectedRun.proj_t_run_projects : [];
    const stops = !stopsLoading && runStops.length > 0 ? runStops : listStops;
    const { revenue, repairs } = splitRunAmounts(stops, statuses);
    return {
      stops: stops.length,
      miles: selectedRun.estimated_distance != null ? Number(selectedRun.estimated_distance) / 1609.344 : null,
      seconds: selectedRun.estimated_duration != null ? Number(selectedRun.estimated_duration) : null,
      revenue,
      repairs,
    };
  }, [selectedRun, runStops, stopsLoading, statuses]);

  const loadSelectedStops = useCallback(async (runId) => {
    setStopsLoading(true);
    try {
      const detail = await loadRunDetails(runId);
      setRunStops(detail?.projects || []);
    } catch (err) {
      console.error("[RunCalendarView] Failed to load stops:", err);
      setRunStops([]);
    } finally {
      setStopsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedRunId) {
      setRunStops([]);
      return;
    }
    loadSelectedStops(selectedRunId);
  }, [selectedRunId, loadSelectedStops]);

  useEffect(() => {
    setPendingStatus(selectedRun?.status || "");
    setPendingDate(String(selectedRun?.run_date || "").slice(0, 10));
  }, [selectedRun?.id, selectedRun?.status, selectedRun?.run_date]);

  // Saves a run change (status or date), then reloads the calendar and the stops.
  const saveRunChange = async (updates, message) => {
    if (!selectedRun) return;
    setSavingRun(true);
    try {
      const result = await updateRun(selectedRun.id, updates);
      toastSuccess(message, "Runs");
      if (result?._releasedStops?.length) {
        setStopPrompt({
          title: "Run Cancelled",
          message: "This run was cancelled. Its projects keep their current statuses. Choose a new status for any of them, or keep them as they are.",
          stops: result._releasedStops,
          releaseToken: result._releaseToken,
        });
      }
      router.refresh();
      await loadSelectedStops(selectedRun.id);
    } catch (err) {
      toastError(err?.message || "Failed to update the run.", "Runs");
    } finally {
      setSavingRun(false);
    }
  };

  // Same print as the Run Master List.
  const handlePrintPaidSheet = async (run) => {
    setPrintingPaidSheet(true);
    try {
      const detail = await loadRunDetails(run.id);
      if (!detail?.run) {
        toastError("Unable to load run details for printing.", "Print");
        return;
      }
      const paidSheet = await loadPaidSheet(run.id); // null if never saved; that's fine
      generatePaidSheetPrint(detail.run, detail.projects || [], paidSheet, paymentMethods);
    } catch (err) {
      console.error("[RunCalendarView] Paid sheet print failed:", err);
      toastError(err?.message || "Failed to print paid sheet.", "Print");
    } finally {
      setPrintingPaidSheet(false);
    }
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
        // Outlined when picked in the list below.
        ...(run.id === focusedRunId ? { outline: "2px solid #2563eb", outlineOffset: "1px", background: "#eff6ff" } : {}),
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
          {/* Jump to any month. */}
          <input
            type="month"
            aria-label="Pick a month"
            value={`${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`}
            onChange={(e) => {
              const match = String(e.target.value || "").match(/^(\d{4})-(\d{2})$/);
              if (match) setMonthStart(new Date(Number(match[1]), Number(match[2]) - 1, 1));
            }}
            style={{ border: "1px solid #e2e8f0", borderRadius: "3px", padding: "2px 6px", fontSize: "12px", background: "#fff", color: "#1e293b" }}
          />
          <strong style={{ fontSize: "13px", color: "#1e293b", minWidth: "130px", textAlign: "right" }}>{monthLabel}</strong>
        </div>
      </div>
      {/* Two columns: run list on the left (~20%, can be folded), calendar on the right. */}
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        {listOpen ? (
          <aside style={{ flex: "0 0 20%", minWidth: "220px", maxHeight: "calc(100vh - 200px)", display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", padding: "6px 8px", borderBottom: "1px solid #e2e8f0" }}>
              <strong style={{ fontSize: "12px", color: "#1e293b" }}>
                {FILTERS.find((f) => f.key === filter)?.label}: {listSearch.trim() ? `${searchedList.length} of ${filteredList.length}` : filteredList.length} run{filteredList.length === 1 ? "" : "s"}
              </strong>
              <button type="button" onClick={() => setListOpen(false)} title="Hide the run list" aria-label="Hide the run list" style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: "3px", padding: "0 6px", fontSize: "12px", cursor: "pointer" }}>«</button>
            </div>
            <div style={{ padding: "4px 8px", fontSize: "11px", color: "#64748b" }}>
              Click a run to show it on the calendar.
              {filter === "all" && undatedCount > 0 && (
                <> {undatedCount} run{undatedCount === 1 ? " has" : "s have"} no date and {undatedCount === 1 ? "is" : "are"} not shown.</>
              )}
            </div>
            <div style={{ position: "relative", padding: "0 8px 6px" }}>
              <input
                type="text"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setListSearch(""); }}
                placeholder="Search runs, customers, team…"
                aria-label="Search runs"
                style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "5px 26px 5px 8px", fontSize: "12px", outline: "none", background: "#fff" }}
              />
              {listSearch && (
                <button
                  type="button"
                  onClick={() => setListSearch("")}
                  title="Clear search"
                  aria-label="Clear search"
                  style={{ position: "absolute", right: "12px", top: "3px", border: "none", background: "none", color: "#94a3b8", fontSize: "15px", lineHeight: 1, padding: "2px 4px", cursor: "pointer" }}
                >
                  ×
                </button>
              )}
            </div>
            <div style={{ overflowY: "auto", padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {searchedList.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {listSearch.trim() ? `No runs match "${listSearch.trim()}".` : "No runs."}
                </div>
              ) : (
                searchedList.map(({ run }) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => showOnCalendar(run)}
                    // The whole border is set every time: removing only borderColor turns it black.
                    style={{ display: "flex", flexDirection: "column", gap: "1px", textAlign: "left", background: run.id === focusedRunId ? "#eff6ff" : "#fff", border: `1px solid ${run.id === focusedRunId ? "#2563eb" : "#e2e8f0"}`, borderRadius: "3px", padding: "4px 6px", fontSize: "11px", cursor: "pointer" }}
                  >
                    <span style={{ display: "flex", justifyContent: "space-between", gap: "6px", width: "100%" }}>
                      <span style={{ color: "#64748b" }}>{formatDateKey(run.run_date)}</span>
                      <span style={{ color: getRunStatusColor(run.status, runStatuses) }}>{run.status}</span>
                    </span>
                    <strong style={{ color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{runTitle(run)}</strong>
                  </button>
                ))
              )}
            </div>
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setListOpen(true)}
            title="Show the run list"
            style={{ flex: "0 0 auto", writingMode: "vertical-rl", border: "1px solid #e2e8f0", background: "#fff", borderRadius: "4px", padding: "10px 4px", fontSize: "12px", color: "#1e293b", cursor: "pointer" }}
          >
            » Runs ({filteredList.length})
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
      {/* Month grid */}
      <div ref={calendarRef} style={{ overflowX: "auto", scrollMarginTop: "70px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(110px, 1fr)) 130px", background: "#e2e8f0", gap: "1px", border: "1px solid #e2e8f0", borderRadius: "4px", minWidth: "910px" }}>
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} style={{ background: "#f8fafc", padding: "4px 6px", fontSize: "11px", fontWeight: 600, color: "#64748b" }}>{weekday}</div>
          ))}
          <div style={{ background: "#f1f5f9", padding: "4px 6px", fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Week</div>
          {weeks.map(({ weekDays, totals }) => [
            ...weekDays.map((day) => {
              const key = toDateKey(day);
              const inMonth = day.getMonth() === monthStart.getMonth();
              const isToday = key === todayKey;
              const dayItems = itemsByDay.get(key) || [];
              return (
                <div key={key} style={{ background: inMonth ? "#fff" : "#f8fafc", minHeight: "96px", padding: "4px", display: "flex", flexDirection: "column", gap: "3px" }}>
                  {/* The day number opens that day's summary. */}
                  <button
                    type="button"
                    onClick={() => setSummaryDayKey(key)}
                    title="Day summary"
                    style={{
                      alignSelf: "flex-start",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "#fff" : inMonth ? "#1e293b" : "#94a3b8",
                      background: isToday ? "#2563eb" : "transparent",
                      borderRadius: "10px",
                      padding: "0 6px",
                    }}
                  >
                    {day.getDate()}
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "120px", overflowY: "auto" }}>
                    {dayItems.map(renderRunChip)}
                  </div>
                </div>
              );
            }),
            <div key={`week-${toDateKey(weekDays[0])}`} style={{ background: "#f8fafc", padding: "6px", display: "flex", alignItems: "flex-start" }}>
              <WeekSummary weekDays={weekDays} totals={totals} />
            </div>,
          ])}
        </div>
      </div>

      {/* Month summary (selected tab), its own section under the calendar. */}
      <MonthSummary
        label={monthLabel}
        filterLabel={FILTERS.find((f) => f.key === filter)?.label || "All"}
        totals={monthTotals}
        runStatuses={runStatuses}
      />

        </div>
      </div>
      {/* Day summary */}
      <Modal show={!!summaryDayKey} onHide={() => setSummaryDayKey(null)} title={summaryDayKey ? formatDateKey(summaryDayKey) : ""}>
        {summaryDayKey && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", color: "#1e293b" }}>
            <SummaryLine totals={summaryDayTotals} />
            {summaryDayItems.length === 0 ? (
              <div style={{ color: "#64748b" }}>No runs on this day{filter !== "all" ? " in this tab" : ""}.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {summaryDayItems.map(({ run }) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => { setSummaryDayKey(null); setSelectedRunId(run.id); }}
                    style={{ display: "flex", justifyContent: "space-between", gap: "8px", textAlign: "left", background: "#fff", border: "1px solid #e2e8f0", borderLeft: `3px solid ${getRunStatusColor(run.status, runStatuses)}`, borderRadius: "3px", padding: "5px 8px", fontSize: "12px", cursor: "pointer" }}
                  >
                    <strong>{runTitle(run)}</strong>
                    <span style={{ color: getRunStatusColor(run.status, runStatuses) }}>{run.status}</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setSummaryDayKey(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Run details: stops, status, reschedule, prints, files */}
      <Modal
        show={!!selected}
        onHide={() => setSelectedRunId(null)}
        size="lg"
        title={selected ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "18px", fontWeight: 600, color: "#0f172a" }}>{runTitle(selected.run)}</span>
              {selected.run.status && <Pill color={getRunStatusColor(selected.run.status, runStatuses)}>{selected.run.status}</Pill>}
              {selected.state.onTrack && <Pill color="#16a34a">On Track</Pill>}
              {selected.state.behind && <Pill color="#dc2626">Behind</Pill>}
              {selected.state.rescheduled && <Pill color="#d97706">Rescheduled</Pill>}
              {!canChangeSelectedRun && <Pill color="#64748b">View only</Pill>}
            </div>
            <div style={{ fontSize: "12px", fontWeight: 400, color: "#64748b", marginTop: "4px" }}>
              {[
                selected.run.run_code || formatRunCode(selected.run.run_number),
                selected.run.run_date ? formatDateKey(selected.run.run_date) : null,
                selected.run.proj_s_origin_addresses?.origin_name,
              ].filter(Boolean).join(" · ")}
            </div>
          </div>
        ) : ""}
        footer={selected ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", width: "100%" }}>
            <Button variant="secondary" onClick={() => setSelectedRunId(null)}>Close</Button>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Button variant="secondary" loading={printingPaidSheet} onClick={() => handlePrintPaidSheet(selected.run)}>
                <AppIcon icon="receipt" style={{ marginRight: "6px" }} />Print Paid Sheet
              </Button>
              <Button variant="primary" loading={printing} onClick={() => handlePrintManifest(selected.run)}>
                <AppIcon icon="print" style={{ marginRight: "6px" }} />Print Manifest
              </Button>
            </div>
          </div>
        ) : null}
      >
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "13px", color: "#1e293b" }}>
            {/* Key figures */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
              <StatCard label="Stops" value={stopsLoading ? "…" : String(selectedTotals?.stops ?? 0)} />
              <StatCard label="Distance" value={selectedTotals?.miles != null ? `${Math.round(selectedTotals.miles).toLocaleString("en-US")} mi` : "—"} />
              <StatCard label="Drive time" value={formatDriveTime(selectedTotals?.seconds)} />
              <StatCard
                label="Revenue"
                value={money(selectedTotals?.revenue)}
                valueColor="#16a34a"
                sub={selectedTotals?.repairs > 0 ? `Repairs ${money(selectedTotals.repairs)}` : null}
                subColor="#dc2626"
              />
            </div>
            {/* Details + update (run status ticks decide; the server checks too) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
              <div style={POPUP_CARD}>
                <div style={POPUP_SECTION_TITLE}>Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "80px minmax(0, 1fr)", rowGap: "6px", columnGap: "8px", fontSize: "12px" }}>
                  {[
                    ...(selected.state.rescheduled ? [["Originally", formatDateKey(selected.run.original_run_date)]] : []),
                    ["Team", selected.run.team_assigned],
                    ["Vehicle", selected.run.vehicle_assigned],
                    ["Notes", selected.run.notes],
                  ].flatMap(([label, value]) => [
                    <span key={`${label}-label`} style={{ color: "#64748b" }}>{label}</span>,
                    <span key={`${label}-value`} style={{ color: value ? "#1e293b" : "#94a3b8", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {value ? String(value) : label === "Notes" ? "No notes" : "Not set"}
                    </span>,
                  ])}
                </div>
              </div>

              <div style={POPUP_CARD}>
                <div style={POPUP_SECTION_TITLE}>Update run</div>
                {!canChangeSelectedRun && (
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px" }}>Your roles can&apos;t change this run.</div>
                )}
                <label style={POPUP_FIELD_LABEL} htmlFor="run-popup-status">Status</label>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "10px" }}>
                  <select
                    id="run-popup-status"
                    value={pendingStatus}
                    onChange={(e) => setPendingStatus(e.target.value)}
                    disabled={!canChangeSelectedRun || savingRun}
                    style={POPUP_INPUT}
                  >
                    {resolveRunStatusOptions(runStatuses).map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={savingRun}
                    disabled={!canChangeSelectedRun || !pendingStatus || pendingStatus === selected.run.status}
                    onClick={() => saveRunChange({ status: pendingStatus }, "Run status updated.")}
                  >
                    Set Status
                  </Button>
                </div>
                <label style={POPUP_FIELD_LABEL} htmlFor="run-popup-date">Run date</label>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <input
                    id="run-popup-date"
                    type="date"
                    value={pendingDate}
                    onChange={(e) => setPendingDate(e.target.value)}
                    disabled={!canChangeSelectedRun || savingRun}
                    style={POPUP_INPUT}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={savingRun}
                    disabled={!canChangeSelectedRun || !pendingDate || pendingDate === String(selected.run.run_date || "").slice(0, 10)}
                    onClick={() => saveRunChange({ run_date: pendingDate }, "Run rescheduled.")}
                  >
                    Reschedule
                  </Button>
                </div>
              </div>
            </div>

            {/* Stops */}
            <div>
              <div style={POPUP_SECTION_TITLE}>
                Stops <span style={{ fontWeight: 400, color: "#64748b" }}>{stopsLoading ? "…" : runStops.length}</span>
              </div>
              {stopsLoading ? (
                <div style={{ fontSize: "12px", color: "#64748b" }}>Loading stops…</div>
              ) : runStops.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#64748b" }}>No stops on this run.</div>
              ) : (
                <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                  {runStops.map((stop, index) => {
                    const project = stop.proj_t_projects || {};
                    const status = project.proj_s_project_status;
                    return (
                      <div key={stop.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderTop: index === 0 ? "none" : "1px solid #f1f5f9" }}>
                        <span style={{ flexShrink: 0, width: "22px", height: "22px", borderRadius: "50%", background: "#f1f5f9", color: "#475569", fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {index + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.client_name || "Untitled"}</div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{[project.city, project.state_code].filter(Boolean).join(", ") || "—"}</div>
                        </div>
                        {status?.status_name && <Pill color={status.display_color || "#64748b"}>{status.status_name}</Pill>}
                        <span style={{ flexShrink: 0, width: "90px", textAlign: "right", fontSize: "13px", whiteSpace: "nowrap" }}>
                          {project.project_subtotal != null ? money(project.project_subtotal) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Run files */}
            <FileAttachments
              key={selected.run.id}
              loadFiles={() => loadFiles("run", selected.run.id)}
              createUpload={(meta) => createFileUpload("run", selected.run.id, meta)}
              saveFile={(storagePath, meta) => saveUploadedFile("run", selected.run.id, storagePath, meta)}
              getFileUrl={(file) => getFileUrl(file.id)}
              deleteFile={(file) => deleteFile(file.id)}
              readOnly={!canChangeSelectedRun}
              maxBytes={PROJECT_FILE_MAX_BYTES}
              accept={PROJECT_FILE_TYPES.join(",")}
            />
          </div>
        )}
      </Modal>

      {/* After a run is cancelled here: choose its stops' statuses. */}
      <StopStatusPrompt
        prompt={stopPrompt}
        statuses={statuses}
        onClose={() => setStopPrompt(null)}
        onSaved={() => { setStopPrompt(null); router.refresh(); if (selectedRunId) loadSelectedStops(selectedRunId); }}
      />
    </div>
  );
}




