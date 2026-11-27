"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { startNavbarLoader } from "@/shared/utils/navbar-loader";
import { PROJECT_MAP_PAGES, formatDisplayDate } from "../data/projectMap.data";
import {
  ANALYTICS_RANGES,
  DEFAULT_ANALYTICS_RANGE,
  NEUTRAL_COLOR,
  earliestDay,
  filterProjects,
  historySince,
  keyNumbers,
  ordersOverTime,
  projectsByStatus,
  rangeDates,
  stateOptions,
  topDealers,
} from "../data/projectMap.analytics";
import AnalyticsChartCard from "../components/analytics/AnalyticsChartCard";

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

export default function ProjectMapAnalyticsView({ projects = [], runs = [], statuses = [], runStatuses = [], buildingCategories = [], todayKey, pageAccess = null }) {
  const router = useRouter();
  const [rangeKey, setRangeKey] = useState(DEFAULT_ANALYTICS_RANGE);
  const [state, setState] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const canOpenPage = (key) => !pageAccess || pageAccess[key] === true;
  const openPage = (path) => { startNavbarLoader(); router.push(path); };

  const range = useMemo(() => rangeDates(rangeKey, todayKey, earliestDay(projects, runs)), [rangeKey, todayKey, projects, runs]);
  const shown = useMemo(() => filterProjects(projects, { state, categoryId }), [projects, state, categoryId]);
  const states = useMemo(() => stateOptions(projects), [projects]);
  const categories = useMemo(() => buildingCategories.filter((category) => category?.is_active !== false), [buildingCategories]);
  const historyStart = useMemo(() => historySince(projects), [projects]);

  const numbers = useMemo(() => keyNumbers({ projects: shown, runs, statuses, range }), [shown, runs, statuses, range]);
  const byStatus = useMemo(() => projectsByStatus({ projects: shown, statuses }), [shown, statuses]);
  const orders = useMemo(() => ordersOverTime({ projects: shown, range }), [shown, range]);
  const dealers = useMemo(() => topDealers({ projects: shown, range }), [shown, range]);
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
          <select value={rangeKey} onChange={(event) => setRangeKey(event.target.value)} style={selectStyle}>
            {ANALYTICS_RANGES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          State
          <select value={state} onChange={(event) => setState(event.target.value)} style={selectStyle}>
            <option value="">All states</option>
            {states.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Building category
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} style={selectStyle}>
            <option value="">All categories</option>
            {categories.map((item) => <option key={item.id} value={String(item.id)}>{item.building_category_name}</option>)}
          </select>
        </label>
        {filtersChanged && (
          <button type="button" style={navButtonStyle} onClick={() => { setRangeKey(DEFAULT_ANALYTICS_RANGE); setState(""); setCategoryId(""); }}>Reset</button>
        )}
        <span style={{ marginLeft: "auto", fontSize: "11px", color: "#64748b" }}>
          {formatDisplayDate(range.from)} – {formatDisplayDate(range.to)}
        </span>
      </div>

      {/* Key numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px" }}>
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
        Runs are all runs (the State and Building category filters apply to projects only).
      </p>

      {/* Reports */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "10px" }}>
        <AnalyticsChartCard
          title="Projects by status"
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
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                {byStatus.map((row) => <Cell key={row.statusId || "none"} fill={row.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={`Orders received per ${period}`}
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
              <Bar dataKey="orders" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={`Order value per ${period}`}
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
              <Bar dataKey="value" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Top dealers"
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
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                {dealers.map((row) => <Cell key={row.name} fill={row.other ? NEUTRAL_COLOR : SERIES[0]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>
      </div>
    </div>
  );
}