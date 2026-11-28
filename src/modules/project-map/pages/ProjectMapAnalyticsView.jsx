"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { startNavbarLoader } from "@/shared/utils/navbar-loader";
import { PROJECT_MAP_PAGES, formatDisplayDate } from "../data/projectMap.data";
import { ANALYTICS_RANGES, DEFAULT_ANALYTICS_RANGE, NEUTRAL_COLOR, WEEKDAYS } from "../data/projectMap.analytics";
import { loadAnalyticsList, loadAnalyticsReports } from "../data/projectMap.analytics.actions";
import AnalyticsDrillModal from "../components/analytics/AnalyticsDrillModal";
import AnalyticsChartCard from "../components/analytics/AnalyticsChartCard";
import AnalyticsHeatmap from "../components/analytics/AnalyticsHeatmap";

// Chart colours. One series uses slot 1; two series use slots 1 and 2 (checked
// for colour-blind separation on a white background). Project and run status
// bars use each status's own Setup colour, so a status looks the same here as
// on every other page.
const SERIES = ["#2a78d6", "#eb6834"];
const GRID = "#e2e8f0";
const TICK = { fontSize: 11, fill: "#64748b" };
const TOOLTIP_STYLE = { fontSize: 11, borderRadius: 4, border: "1px solid #e2e8f0" };
const CURSOR = { fill: "#f1f5f9" };

const number = (value) => (Number(value) || 0).toLocaleString("en-US");
const money = (value) => `$${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
function compactMoney(value) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (Math.abs(amount) >= 1e3) return `$${Math.round(amount / 1e3)}k`;
  return `$${Math.round(amount)}`;
}

/** "▲ 12% vs previous period (40)" for a { now, before } pair. */
function changeNote({ now, before }) {
  if (!before) return now ? "None in the previous period" : "Same as the previous period";
  const percent = Math.round(((now - before) / before) * 100);
  if (percent === 0) return `Same as the previous period (${number(before)})`;
  return `${percent > 0 ? "▲" : "▼"} ${Math.abs(percent)}% vs previous period (${number(before)})`;
}

function StatTile({ label, value, note }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "10px 12px", minWidth: 0 }}>
      <div style={{ fontSize: "11px", color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a", fontVariantNumeric: "tabular-nums", marginTop: "2px" }}>{value}</div>
      {note && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{note}</div>}
    </div>
  );
}

const navButtonStyle = { border: "1px solid #e2e8f0", background: "#fff", borderRadius: "3px", padding: "3px 10px", fontSize: "12px", cursor: "pointer" };
const selectStyle = { border: "1px solid #e2e8f0", borderRadius: "3px", padding: "3px 6px", fontSize: "12px", background: "#fff", color: "#1e293b" };
const labelStyle = { display: "flex", alignItems: "center", gap: "4px" };

// The filters as one text key, to remember the results per filter set.
const filterKey = (filters) => `${filters.rangeKey}|${filters.state}|${filters.categoryId}`;

export default function ProjectMapAnalyticsView({ initialReports, buildingCategories = [], pageAccess = null }) {
  const router = useRouter();
  const [rangeKey, setRangeKey] = useState(initialReports?.filters?.rangeKey || DEFAULT_ANALYTICS_RANGE);
  const [state, setState] = useState(initialReports?.filters?.state || "");
  const [categoryId, setCategoryId] = useState(initialReports?.filters?.categoryId || "");
  // Click-through: the list shown in the pop-up, or null.
  const [drill, setDrill] = useState(null);
  // Reports for the current filters. The server works them out and only the
  // results come to the browser. Results already fetched are remembered per
  // filter set, so going back to an earlier filter is instant.
  const [reports, setReports] = useState(initialReports);
  const [updating, setUpdating] = useState(false);
  const [loadError, setLoadError] = useState("");
  const savedReports = useRef(new Map(initialReports ? [[filterKey(initialReports.filters), initialReports]] : []));
  const reportRequest = useRef(0);
  const listRequest = useRef(0);
  const canOpenPage = (key) => !pageAccess || pageAccess[key] === true;
  const openPage = (path) => { startNavbarLoader(); router.push(path); };

  // Changes one or more filters and shows the reports for them. Only the
  // newest request may update the page.
  const applyFilters = async (changes) => {
    const filters = { rangeKey, state, categoryId, ...changes };
    setRangeKey(filters.rangeKey);
    setState(filters.state);
    setCategoryId(filters.categoryId);
    setLoadError("");
    reportRequest.current += 1;
    const request = reportRequest.current;
    const key = filterKey(filters);
    const saved = savedReports.current.get(key);
    if (saved) {
      setUpdating(false);
      setReports(saved);
      return;
    }
    setUpdating(true);
    try {
      const next = await loadAnalyticsReports(filters);
      savedReports.current.set(key, next);
      if (request === reportRequest.current) setReports(next);
    } catch (err) {
      if (request === reportRequest.current) setLoadError(err?.message || "Could not load the reports.");
    } finally {
      if (request === reportRequest.current) setUpdating(false);
    }
  };

  const {
    range, states, historyStart, staleAfterDays, numbers, byStatus, orders, dealers, statusTimes, installSpeed,
    runsByPeriod, schedule, repairs, openValue, categoryRows, valueTrend, stateRows, stale, care, runSize, travel, teams, installDays,
  } = reports;
  const categories = useMemo(() => buildingCategories.filter((category) => category?.is_active !== false), [buildingCategories]);
  const legendStyle = { fontSize: 11, color: "#334155" };
  const hasAny = (rows, keys) => rows.some((row) => keys.some((key) => Number(row[key]) > 0));
  const careRows = useMemo(() => care.flatMap((group) => group.rows), [care]);
  const installWeeks = useMemo(
    () => installDays.weeks.map((week) => ({ key: week.key, label: week.label, total: week.total, ...Object.fromEntries(week.counts.map((count, index) => [`d${index}`, count])) })),
    [installDays],
  );
  const runPeriod = runSize.weekly ? "week" : "month";

  // Click-through: the server lists what is behind a clicked bar, cell or table
  // row, for the current filters. The pop-up opens at once and fills in.
  const openList = async (click, title) => {
    listRequest.current += 1;
    const request = listRequest.current;
    setDrill({ title, kind: click.kind, rows: [], loading: true });
    try {
      const result = await loadAnalyticsList(click, { rangeKey, state, categoryId });
      if (request === listRequest.current) setDrill({ title, ...result });
    } catch (err) {
      if (request === listRequest.current) setDrill({ title, kind: click.kind, rows: [], error: err?.message || "Could not load the list." });
    }
  };
  const openDrill = ({ title, ...pick }) => openList({ kind: "projects", pick }, title);
  // Recharts hands a bar's click its row as `payload`.
  const pickBar = (entry, toPick) => {
    if (entry?.payload) openDrill(toPick(entry.payload));
  };
  const pickStatus = (row) => ({ report: "status", key: row.statusId, title: `Projects in ${row.name}` });
  const pickOpenStatus = (row) => ({ report: "openStatus", key: row.statusId, title: `Open projects in ${row.name}` });
  const pickOrders = (row) => ({ report: "orders", key: row.key, title: `Orders ${orders.weekly ? "in the week of" : "in"} ${row.label}` });
  const pickDealer = (row) => ({ report: "dealer", key: row.key, title: `Orders: ${row.name}` });
  const pickCategory = (row) => ({ report: "category", key: row.key, title: `Orders: ${row.name}` });
  const pickState = (row) => ({ report: "state", key: row.key, title: `Orders: ${row.name}` });
  const pickStale = (row) => ({ report: "stale", key: row.statusId, title: `Not updated for ${staleAfterDays}+ days: ${row.name}` });
  const pickCare = (row) => ({ report: "care", key: row.key, title: row.label });
  // "Projects not updated" table rows are projects: open one on the map (new tab).
  const openOnMap = (row) => {
    if (canOpenPage("map")) window.open(`${PROJECT_MAP_PAGES.map}?project=${encodeURIComponent(row.key)}`, "_blank", "noopener");
  };

  // Click-through for run charts. `list` tells the server which runs the chart
  // counted: "all" for "Runs per week/month", "active" (cancelled runs left
  // out) for the others.
  const runs = "all";
  const activeRuns = "active";
  const openRunDrill = ({ title, list, ...pick }) => openList({ kind: "runs", runs: list, pick }, title);
  const runPeriodLabel = (row) => `${runSize.weekly ? "week of " : ""}${row.label}`;
  const pickRunPeriod = (list) => (row) => ({ report: "period", key: row.key, list, title: `Runs, ${runPeriodLabel(row)}` });
  const pickRunStatus = (series) => (row) => ({
    report: "runsByStatus",
    key: row.key,
    statusName: series.name,
    otherStatus: series.key === "other",
    list: runs,
    title: `${series.name} runs, ${runPeriodLabel(row)}`,
  });
  const pickKept = (row) => ({ report: "kept", key: row.key, list: activeRuns, title: `Runs that kept their first date, ${runPeriodLabel(row)}` });
  const pickRescheduled = (row) => ({ report: "rescheduled", key: row.key, list: activeRuns, title: `Rescheduled runs, ${runPeriodLabel(row)}` });
  const pickTeam = (row) => ({ report: "team", key: row.key, list: activeRuns, title: `Runs: ${row.name}` });
  const pickRunBar = (entry, toPick) => {
    if (entry?.payload) openRunDrill(toPick(entry.payload));
  };
  const sectionTitleStyle = { gridColumn: "1 / -1", margin: "8px 0 0", fontSize: "13px", fontWeight: 600, color: "#475569" };
  const period = orders.weekly ? "week" : "month";
  const filtersChanged = state || categoryId || rangeKey !== DEFAULT_ANALYTICS_RANGE;

  return (
    <div style={{ padding: "10px", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#1e293b" }}>Analytics</h2>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>Reports on projects and runs. Every number follows the filters below.</p>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {canOpenPage("map") && (
            <button type="button" style={navButtonStyle} onClick={() => openPage(PROJECT_MAP_PAGES.map)}>🗺️ Project Map</button>
          )}
          {canOpenPage("runMaster") && (
            <button type="button" style={navButtonStyle} onClick={() => openPage(PROJECT_MAP_PAGES.runMaster)}>📋 Run Master List</button>
          )}
          {canOpenPage("calendar") && (
            <button type="button" style={navButtonStyle} onClick={() => openPage(PROJECT_MAP_PAGES.calendar)}>📅 Run Calendar</button>
          )}
        </div>
      </div>

      {/* Filters: one row above every report */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "6px 8px", marginBottom: "10px", fontSize: "12px", color: "#334155" }}>
        <label style={labelStyle}>
          Period
          <select value={rangeKey} onChange={(event) => applyFilters({ rangeKey: event.target.value })} style={selectStyle}>
            {ANALYTICS_RANGES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          State
          <select value={state} onChange={(event) => applyFilters({ state: event.target.value })} style={selectStyle}>
            <option value="">All states</option>
            {states.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Building category
          <select value={categoryId} onChange={(event) => applyFilters({ categoryId: event.target.value })} style={selectStyle}>
            <option value="">All categories</option>
            {categories.map((item) => <option key={item.id} value={String(item.id)}>{item.building_category_name}</option>)}
          </select>
        </label>
        {filtersChanged && (
          <button type="button" style={navButtonStyle} onClick={() => applyFilters({ rangeKey: DEFAULT_ANALYTICS_RANGE, state: "", categoryId: "" })}>Reset</button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "11px", color: "#64748b" }} aria-live="polite">
          {updating ? "Updating… " : ""}{formatDisplayDate(range.from)} – {formatDisplayDate(range.to)}
        </span>
      </div>
      {loadError && (
        <div role="alert" style={{ marginBottom: "10px", padding: "6px 8px", border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", borderRadius: "4px", fontSize: "12px" }}>
          Could not update the reports: {loadError}. The numbers below are from the last successful update.
        </div>
      )}

      {/* Key numbers */}
      <div aria-busy={updating} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px", opacity: updating ? 0.55 : 1, transition: "opacity 0.15s" }}>
        <StatTile label="Open projects" value={number(numbers.openProjects)} note="Right now: status not finished" />
        <StatTile label="Open project value" value={money(numbers.openValue)} note="Subtotal of open projects, repairs left out" />
        <StatTile label="New orders" value={number(numbers.newOrders.now)} note={changeNote(numbers.newOrders)} />
        <StatTile label="Installed" value={number(numbers.installed.now)} note={changeNote(numbers.installed)} />
        <StatTile label="Runs" value={number(numbers.runs.now)} note={changeNote(numbers.runs)} />
        <StatTile label="Open repairs" value={number(numbers.openRepairs)} note="Right now" />
      </div>
      <p style={{ margin: "6px 0 10px", fontSize: "11px", color: "#94a3b8" }}>
        Orders count by Order Received, or by the day the project was entered when that is blank.
        Installed counts projects that reached a finished status{historyStart ? `; status history starts ${formatDisplayDate(historyStart)}` : ""}.
        Runs leave out cancelled runs (the State and Building category filters apply to projects only).
        Click a bar, or a row in a Table, to list what is behind it.
      </p>

      {/* Reports */}
      <div aria-busy={updating} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "10px", opacity: updating ? 0.55 : 1, transition: "opacity 0.15s" }}>
        <AnalyticsChartCard
          title="Projects by status"
          onRowClick={(row) => openDrill(pickStatus(row))}
          note="Right now, in Setup order. Hover a bar for its value."
          rows={byStatus}
          height={Math.max(220, byStatus.length * 26 + 30)}
          columns={[
            { key: "name", label: "Status" },
            { key: "count", label: "Projects", align: "right", format: number },
            { key: "value", label: "Value", align: "right", format: money },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStatus} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={4}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={160} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={CURSOR}
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, _name, item) => [`${number(value)} projects · ${money(item?.payload?.value)}`, "Projects"]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickBar(entry, pickStatus)}>
                {byStatus.map((row) => <Cell key={row.statusId || "none"} fill={row.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={`Orders received per ${period}`}
          onRowClick={(row) => openDrill(pickOrders(row))}
          note="How many orders came in."
          rows={orders.rows.filter((row) => row.orders > 0).length ? orders.rows : []}
          columns={[
            { key: "label", label: orders.weekly ? "Week of" : "Month" },
            { key: "orders", label: "Orders", align: "right", format: number },
            { key: "value", label: "Value", align: "right", format: money },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={orders.rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value) => [number(value), "Orders"]} />
              <Bar dataKey="orders" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickBar(entry, pickOrders)} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={`Order value per ${period}`}
          onRowClick={(row) => openDrill(pickOrders(row))}
          note="Total subtotal of the orders that came in."
          rows={orders.rows.filter((row) => row.orders > 0).length ? orders.rows : []}
          columns={[
            { key: "label", label: orders.weekly ? "Week of" : "Month" },
            { key: "value", label: "Value", align: "right", format: money },
            { key: "orders", label: "Orders", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={orders.rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={compactMoney} tick={TICK} axisLine={false} tickLine={false} width={52} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value) => [money(value), "Order value"]} />
              <Bar dataKey="value" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickBar(entry, pickOrders)} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Top dealers"
          onRowClick={(row) => openDrill(pickDealer(row))}
          note="By value of orders in the period (the project's Dealer box)."
          rows={dealers}
          height={Math.max(220, dealers.length * 26 + 30)}
          columns={[
            { key: "name", label: "Dealer" },
            { key: "count", label: "Orders", align: "right", format: number },
            { key: "value", label: "Value", align: "right", format: money },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dealers} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={4}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" tickFormatter={compactMoney} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={160} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={CURSOR}
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, _name, item) => [`${money(value)} · ${number(item?.payload?.count)} orders`, "Value"]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickBar(entry, pickDealer)}>
                {dealers.map((row) => <Cell key={row.name} fill={row.other ? NEUTRAL_COLOR : SERIES[0]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Time spent in each status"
          note="Average days a project stayed in a status before moving on, for moves in the period. Only stays that started after status history began are counted."
          rows={statusTimes}
          height={Math.max(220, statusTimes.length * 26 + 30)}
          empty="No status changes in this period yet."
          columns={[
            { key: "name", label: "Status" },
            { key: "average", label: "Average days", align: "right" },
            { key: "median", label: "Median days", align: "right" },
            { key: "longest", label: "Longest", align: "right" },
            { key: "moves", label: "Moves", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusTimes} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={4}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={160} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={CURSOR}
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, _name, item) => [`${value} days average · ${item?.payload?.median} median · ${number(item?.payload?.moves)} moves`, "Time in status"]}
              />
              <Bar dataKey="average" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                {statusTimes.map((row) => <Cell key={row.statusId} fill={row.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={`Order to install, per ${period}`}
          note={installSpeed.overall.count
            ? `Days from order to installed. Overall: ${installSpeed.overall.average} average, ${installSpeed.overall.median} median (${number(installSpeed.overall.count)} projects).`
            : "Days from order to installed."}
          rows={installSpeed.overall.count ? installSpeed.rows : []}
          empty="No projects installed in this period yet."
          columns={[
            { key: "label", label: installSpeed.weekly ? "Week of" : "Month" },
            { key: "average", label: "Average days", align: "right", format: (value) => (value == null ? "—" : value) },
            { key: "median", label: "Median days", align: "right", format: (value) => (value == null ? "—" : value) },
            { key: "count", label: "Installed", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={installSpeed.rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [value == null ? "—" : `${value} days`, name]} />
              <Legend wrapperStyle={legendStyle} iconType="plainline" />
              <Line type="monotone" dataKey="average" name="Average" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 4 }} connectNulls isAnimationActive={false} />
              <Line type="monotone" dataKey="median" name="Median" stroke={SERIES[1]} strokeWidth={2} dot={{ r: 4 }} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={`Runs per ${runsByPeriod.weekly ? "week" : "month"}`}
          onRowClick={(row) => openRunDrill(pickRunPeriod(runs)(row))}
          note="By run status, in each status's Setup colour. All runs."
          rows={hasAny(runsByPeriod.rows, ["total"]) ? runsByPeriod.rows : []}
          empty="No runs in this period."
          columns={[
            { key: "label", label: runsByPeriod.weekly ? "Week of" : "Month" },
            ...runsByPeriod.series.map((series) => ({ key: series.key, label: series.name, align: "right", format: number })),
            { key: "total", label: "Runs", align: "right", format: number },
            { key: "stops", label: "Stops", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={runsByPeriod.rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [number(value), name]} />
              <Legend wrapperStyle={legendStyle} />
              {runsByPeriod.series.map((series, index) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.name}
                  stackId="runs"
                  cursor="pointer"
                  onClick={(entry) => pickRunBar(entry, pickRunStatus(series))}
                  fill={series.color}
                  stroke="#fff"
                  strokeWidth={1}
                  radius={index === runsByPeriod.series.length - 1 ? [4, 4, 0, 0] : 0}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Runs that kept their first date"
          onRowClick={(row) => openRunDrill(pickRunPeriod(activeRuns)(row))}
          note={schedule.keptPercent == null
            ? "Runs whose date was never moved vs runs that were rescheduled. Cancelled runs are left out."
            : `${schedule.keptPercent}% kept their first date (${number(schedule.kept)} of ${number(schedule.kept + schedule.rescheduled)} runs, cancelled runs left out).`}
          rows={hasAny(schedule.rows, ["kept", "rescheduled"]) ? schedule.rows : []}
          empty="No runs in this period."
          columns={[
            { key: "label", label: schedule.weekly ? "Week of" : "Month" },
            { key: "kept", label: "Kept first date", align: "right", format: number },
            { key: "rescheduled", label: "Rescheduled", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={schedule.rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [number(value), name]} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="kept" name="Kept first date" stackId="schedule" fill={SERIES[0]} stroke="#fff" strokeWidth={1} maxBarSize={28} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickRunBar(entry, pickKept)} />
              <Bar dataKey="rescheduled" name="Rescheduled" stackId="schedule" fill={SERIES[1]} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickRunBar(entry, pickRescheduled)} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={`Repairs per ${repairs.weekly ? "week" : "month"}`}
          note="Opened = moved into a repair status. Repaired = moved into a finished repair status."
          rows={hasAny(repairs.rows, ["opened", "repaired"]) ? repairs.rows : []}
          empty="No repair changes in this period yet."
          columns={[
            { key: "label", label: repairs.weekly ? "Week of" : "Month" },
            { key: "opened", label: "Opened", align: "right", format: number },
            { key: "repaired", label: "Repaired", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={repairs.rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [number(value), name]} />
              <Legend wrapperStyle={legendStyle} iconType="plainline" />
              <Line type="monotone" dataKey="opened" name="Opened" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="repaired" name="Repaired" stroke={SERIES[1]} strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <h3 style={sectionTitleStyle}>More on projects</h3>

        <AnalyticsChartCard
          title="Open value by status"
          onRowClick={(row) => openDrill(pickOpenStatus(row))}
          note="Total subtotal of open projects in each status, right now."
          rows={openValue}
          height={Math.max(200, openValue.length * 26 + 30)}
          columns={[
            { key: "name", label: "Status" },
            { key: "value", label: "Value", align: "right", format: money },
            { key: "count", label: "Projects", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={openValue} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={4}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" tickFormatter={compactMoney} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={160} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value, _name, item) => [`${money(value)} · ${number(item?.payload?.count)} projects`, "Open value"]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickBar(entry, pickOpenStatus)}>
                {openValue.map((row) => <Cell key={row.statusId || "none"} fill={row.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Building categories"
          onRowClick={(row) => openDrill(pickCategory(row))}
          note="Orders in the period by building category, highest value first."
          rows={categoryRows}
          height={Math.max(200, categoryRows.length * 26 + 30)}
          columns={[
            { key: "name", label: "Category" },
            { key: "count", label: "Orders", align: "right", format: number },
            { key: "value", label: "Value", align: "right", format: money },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryRows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={4}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" tickFormatter={compactMoney} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={160} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value, _name, item) => [`${money(value)} · ${number(item?.payload?.count)} orders`, "Value"]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickBar(entry, pickCategory)}>
                {categoryRows.map((row) => <Cell key={row.key} fill={row.other ? NEUTRAL_COLOR : SERIES[0]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={`Average order value per ${valueTrend.weekly ? "week" : "month"}`}
          note="Average and median subtotal of the orders that came in (orders with a subtotal)."
          rows={hasAny(valueTrend.rows, ["count"]) ? valueTrend.rows : []}
          columns={[
            { key: "label", label: valueTrend.weekly ? "Week of" : "Month" },
            { key: "average", label: "Average", align: "right", format: (value) => (value == null ? "—" : money(value)) },
            { key: "median", label: "Median", align: "right", format: (value) => (value == null ? "—" : money(value)) },
            { key: "count", label: "Orders", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={valueTrend.rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={compactMoney} tick={TICK} axisLine={false} tickLine={false} width={52} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [value == null ? "—" : money(value), name]} />
              <Legend wrapperStyle={legendStyle} iconType="plainline" />
              <Line type="monotone" dataKey="average" name="Average" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 4 }} connectNulls isAnimationActive={false} />
              <Line type="monotone" dataKey="median" name="Median" stroke={SERIES[1]} strokeWidth={2} dot={{ r: 4 }} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Orders by state"
          onRowClick={(row) => openDrill(pickState(row))}
          note="Orders in the period per state, most orders first."
          rows={stateRows}
          height={Math.max(200, stateRows.length * 26 + 30)}
          columns={[
            { key: "name", label: "State" },
            { key: "count", label: "Orders", align: "right", format: number },
            { key: "value", label: "Value", align: "right", format: money },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stateRows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={4}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={160} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value, _name, item) => [`${number(value)} orders · ${money(item?.payload?.value)}`, "Orders"]} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickBar(entry, pickState)}>
                {stateRows.map((row) => <Cell key={row.key} fill={row.other ? NEUTRAL_COLOR : SERIES[0]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Projects not updated"
          onRowClick={canOpenPage("map") ? openOnMap : null}
          note={`${number(stale.rows.length)} open projects not updated for ${staleAfterDays} days or more (same rule as the bell), per status. Table lists them, oldest first.`}
          rows={stale.rows}
          height={Math.max(200, stale.byStatus.length * 26 + 30)}
          empty={`Every open project was updated in the last ${staleAfterDays} days.`}
          columns={[
            { key: "client", label: "Project" },
            { key: "status", label: "Status" },
            { key: "days", label: "Days not updated", align: "right", format: number },
            { key: "updated", label: "Last updated", format: (value) => formatDisplayDate(value) },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stale.byStatus} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={4}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={160} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${number(value)} projects`, "Not updated"]} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickBar(entry, pickStale)}>
                {stale.byStatus.map((row) => <Cell key={row.statusId || "none"} fill={row.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Customer care progress"
          onRowClick={(row) => openDrill(pickCare(row))}
          note="Open projects per welcome call, confirmation and permit status, right now."
          rows={careRows}
          height={Math.max(220, careRows.length * 24 + 30)}
          columns={[
            { key: "label", label: "Step and status" },
            { key: "count", label: "Open projects", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={careRows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={3}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={210} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${number(value)} open projects`, "Projects"]} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickBar(entry, pickCare)}>
                {careRows.map((row) => <Cell key={row.key} fill={row.other ? NEUTRAL_COLOR : SERIES[0]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <h3 style={sectionTitleStyle}>More on runs</h3>

        <AnalyticsChartCard
          title={`Average stops per run, per ${runPeriod}`}
          onRowClick={(row) => openRunDrill(pickRunPeriod(activeRuns)(row))}
          note="How many stops a run had on average. Cancelled runs are left out."
          rows={hasAny(runSize.rows, ["runs"]) ? runSize.rows : []}
          empty="No runs in this period."
          columns={[
            { key: "label", label: runSize.weekly ? "Week of" : "Month" },
            { key: "averageStops", label: "Stops per run", align: "right", format: (value) => (value == null ? "—" : value) },
            { key: "runs", label: "Runs", align: "right", format: number },
            { key: "stops", label: "Stops", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={runSize.rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [value == null ? "—" : `${value} stops`, "Per run"]} />
              <Line type="monotone" dataKey="averageStops" name="Stops per run" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 4 }} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={`Run value per ${runPeriod}`}
          onRowClick={(row) => openRunDrill(pickRunPeriod(activeRuns)(row))}
          note="Total planned value of the runs (from each run's route estimate). Cancelled runs are left out."
          rows={hasAny(runSize.rows, ["runs"]) ? runSize.rows : []}
          empty="No runs in this period."
          columns={[
            { key: "label", label: runSize.weekly ? "Week of" : "Month" },
            { key: "value", label: "Planned value", align: "right", format: money },
            { key: "runs", label: "Runs", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={runSize.rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={compactMoney} tick={TICK} axisLine={false} tickLine={false} width={52} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value) => [money(value), "Planned value"]} />
              <Bar dataKey="value" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickRunBar(entry, pickRunPeriod(activeRuns))} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={`Planned miles per ${runPeriod}`}
          onRowClick={(row) => openRunDrill(pickRunPeriod(activeRuns)(row))}
          note={`From each run's route estimate. ${number(travel.runsWithMiles)} of ${number(travel.runs)} runs in the period have miles.`}
          rows={hasAny(travel.rows, ["runs"]) ? travel.rows : []}
          empty="No runs in this period."
          columns={[
            { key: "label", label: travel.weekly ? "Week of" : "Month" },
            { key: "miles", label: "Miles", align: "right", format: number },
            { key: "runsWithMiles", label: "Runs with miles", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={travel.rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} width={44} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${number(value)} miles`, "Planned miles"]} />
              <Bar dataKey="miles" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickRunBar(entry, pickRunPeriod(activeRuns))} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={`Planned drive hours per ${runPeriod}`}
          onRowClick={(row) => openRunDrill(pickRunPeriod(activeRuns)(row))}
          note="From each run's route estimate. Cancelled runs are left out."
          rows={hasAny(travel.rows, ["runs"]) ? travel.rows : []}
          empty="No runs in this period."
          columns={[
            { key: "label", label: travel.weekly ? "Week of" : "Month" },
            { key: "hours", label: "Hours", align: "right" },
            { key: "runs", label: "Runs", align: "right", format: number },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={travel.rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={40} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${value} hours`, "Planned drive time"]} />
              <Bar dataKey="hours" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickRunBar(entry, pickRunPeriod(activeRuns))} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Team workload"
          onRowClick={(row) => openRunDrill(pickTeam(row))}
          note="Runs in the period per team (the run's Team box), most runs first. Cancelled runs are left out."
          rows={teams}
          height={Math.max(220, teams.length * 26 + 30)}
          empty="No runs in this period."
          columns={[
            { key: "name", label: "Team" },
            { key: "runs", label: "Runs", align: "right", format: number },
            { key: "stops", label: "Stops", align: "right", format: number },
            { key: "miles", label: "Miles", align: "right", format: number },
            { key: "hours", label: "Hours", align: "right" },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teams} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={4}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={160} tick={TICK} axisLine={false} tickLine={false} />
              <Tooltip cursor={CURSOR} contentStyle={TOOLTIP_STYLE} formatter={(value, _name, item) => [`${number(value)} runs · ${number(item?.payload?.stops)} stops`, "Runs"]} />
              <Bar dataKey="runs" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} cursor="pointer" onClick={(entry) => pickRunBar(entry, pickTeam)}>
                {teams.map((row) => <Cell key={row.key} fill={row.other ? NEUTRAL_COLOR : SERIES[0]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Install days"
          note={`Projects by the weekday and week of their Arrival From date (${number(installDays.total)} in the period). Darker = more. Point at a day for its count.`}
          rows={installDays.total > 0 ? installWeeks : []}
          height={210}
          empty="No Arrival From dates in this period."
          columns={[
            { key: "label", label: "Week of" },
            ...WEEKDAYS.map((weekday, index) => ({ key: `d${index}`, label: weekday, align: "right", format: number })),
            { key: "total", label: "Total", align: "right", format: number },
          ]}
        >
          <AnalyticsHeatmap
            weeks={installDays.weeks}
            max={installDays.max}
            unit="installs"
            onPick={(day) => openDrill({ report: "installDay", key: day, title: `Installs on ${formatDisplayDate(day)}` })}
          />
        </AnalyticsChartCard>
      </div>

      <AnalyticsDrillModal drill={drill} onClose={() => setDrill(null)} canOpenMap={canOpenPage("map")} />
    </div>
  );
}