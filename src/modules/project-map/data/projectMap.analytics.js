/**
 * Project Map Analytics: turns the loaded projects and runs into report rows.
 *
 * Plain functions with no database access: the Analytics page loads the data
 * once and works every report out in the browser, so a filter change is
 * instant. Statuses are recognised by their Setup flags (is_finished,
 * system_key), never by id or name. Dates are "YYYY-MM-DD" day keys.
 *
 * Order day: "Order Received", or the day the project was entered when that
 * is blank. Installed: the first time a project entered a status with
 * Finished ticked that is not a repair status (from status history, which
 * only covers changes since history recording started).
 */
import { REPAIR_STATUS_KEYS, isPastInstallProject, isRepairProject } from "./projectMap.data";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Bars for "no status" / "other" rows.
export const NEUTRAL_COLOR = "#94a3b8";

export const ANALYTICS_RANGES = [
  { key: "30d", label: "Last 30 days" },
  { key: "3m", label: "Last 3 months" },
  { key: "6m", label: "Last 6 months" },
  { key: "12m", label: "Last 12 months" },
  { key: "ytd", label: "This year" },
  { key: "all", label: "All time" },
];
export const DEFAULT_ANALYTICS_RANGE = "12m";

/** "YYYY-MM-DD" of a date or timestamp value, or "" when there is none. */
export function dayKey(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "";
}

function toKey(date) {
  return date.toISOString().slice(0, 10);
}

function fromKey(key) {
  return new Date(`${key}T00:00:00Z`);
}

function inRange(key, range) {
  return Boolean(key) && key >= range.from && key <= range.to;
}

/** Whole days from day key a to day key b. */
export function daysBetween(a, b) {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / DAY_MS);
}

/** { from, to } day keys for a range key; "all" starts at the earliest day in the data. */
export function rangeDates(rangeKey, todayKey, earliestKey) {
  const today = fromKey(todayKey);
  const monthsBack = (months) =>
    toKey(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - months, today.getUTCDate() + 1)));
  switch (rangeKey) {
    case "30d":
      return { from: toKey(new Date(today.getTime() - 29 * DAY_MS)), to: todayKey };
    case "3m":
      return { from: monthsBack(3), to: todayKey };
    case "6m":
      return { from: monthsBack(6), to: todayKey };
    case "ytd":
      return { from: `${todayKey.slice(0, 4)}-01-01`, to: todayKey };
    case "all":
      return { from: earliestKey && earliestKey < todayKey ? earliestKey : todayKey, to: todayKey };
    default:
      return { from: monthsBack(12), to: todayKey };
  }
}

/** The period just before a range, of the same length (for "vs previous period"). */
export function previousRange(range) {
  const days = daysBetween(range.from, range.to) + 1;
  const start = fromKey(range.from).getTime();
  return { from: toKey(new Date(start - days * DAY_MS)), to: toKey(new Date(start - DAY_MS)) };
}

/** The bucket a day falls in: its month (1st), or its week (Monday) when weekly. */
export function bucketOf(key, weekly) {
  if (!weekly) return `${key.slice(0, 7)}-01`;
  const date = fromKey(key);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return toKey(date);
}

/** Time buckets for a range: weekly up to about 3 months, monthly beyond. */
export function bucketsFor(range) {
  const weekly = daysBetween(range.from, range.to) + 1 <= 92;
  const end = fromKey(range.to);
  const cursor = fromKey(bucketOf(range.from, weekly));
  const buckets = [];
  while (cursor <= end) {
    buckets.push({
      key: toKey(cursor),
      label: weekly
        ? `${MONTHS[cursor.getUTCMonth()]} ${cursor.getUTCDate()}`
        : `${MONTHS[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`,
    });
    if (weekly) cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return { weekly, buckets };
}

const amountOf = (project) => Number(project?.project_subtotal) || 0;

/** The day an order came in: Order Received, or the day the project was entered. */
export function orderDayOf(project) {
  return dayKey(project?.order_received_at) || dayKey(project?.created_at);
}

/** Projects that match the State and Building category filters ("" = all). */
export function filterProjects(projects = [], { state = "", categoryId = "" } = {}) {
  return projects.filter((project) =>
    (!state || String(project.state || "").trim() === state)
    && (!categoryId || String(project.building_category_id ?? "") === String(categoryId)));
}

/** The State filter's choices: every state a project has, A to Z. */
export function stateOptions(projects = []) {
  return [...new Set(projects.map((project) => String(project.state || "").trim()).filter(Boolean))].sort();
}

/** The earliest order day or run day in the data (start of "All time"). */
export function earliestDay(projects = [], runs = []) {
  const days = [...projects.map(orderDayOf), ...runs.map((run) => dayKey(run.run_date))].filter(Boolean).sort();
  return days[0] || "";
}

/** The first day in the status history (when recording started). */
export function historySince(projects = []) {
  const days = projects
    .flatMap((project) => (project.proj_t_project_status_log || []).map((row) => dayKey(row.changed_at)))
    .filter(Boolean)
    .sort();
  return days[0] || "";
}

/** Ids of statuses that count as installed: Finished ticked and not a repair status. */
export function installStatusIds(statuses = []) {
  return new Set(statuses
    .filter((status) => status?.is_finished === true && !REPAIR_STATUS_KEYS.includes(status?.system_key))
    .map((status) => String(status.status_id)));
}

/** The first day a project entered an installed status (real changes only), or "". */
export function installDayOf(project, installIds) {
  const days = (project?.proj_t_project_status_log || [])
    .filter((row) => !row.is_baseline && installIds.has(String(row.to_status_id)))
    .map((row) => dayKey(row.changed_at))
    .filter(Boolean)
    .sort();
  return days[0] || "";
}

/** The six key numbers; the dated ones also for the previous period. */
export function keyNumbers({ projects = [], runs = [], statuses = [], range }) {
  const installIds = installStatusIds(statuses);
  const previous = previousRange(range);
  const count = (list, dayOf, period) => list.filter((item) => inRange(dayOf(item), period)).length;
  const pair = (list, dayOf) => ({ now: count(list, dayOf, range), before: count(list, dayOf, previous) });
  const open = projects.filter((project) => !isPastInstallProject(project, statuses));
  return {
    openProjects: open.length,
    openValue: open.filter((project) => !isRepairProject(project, statuses)).reduce((sum, project) => sum + amountOf(project), 0),
    openRepairs: open.filter((project) => isRepairProject(project, statuses)).length,
    newOrders: pair(projects, orderDayOf),
    installed: pair(projects, (project) => installDayOf(project, installIds)),
    runs: pair(runs, (run) => dayKey(run.run_date)),
  };
}

/** Projects per current status (Setup order), with their total subtotal. */
export function projectsByStatus({ projects = [], statuses = [] }) {
  const rows = statuses.map((status) => ({
    statusId: String(status.status_id),
    name: status.status_name,
    color: status.display_color || NEUTRAL_COLOR,
    count: 0,
    value: 0,
  }));
  const byId = new Map(rows.map((row) => [row.statusId, row]));
  const none = { statusId: "", name: "No status", color: NEUTRAL_COLOR, count: 0, value: 0 };
  for (const project of projects) {
    const row = byId.get(String(project.status_id)) || none;
    row.count += 1;
    row.value += amountOf(project);
  }
  return [...rows, none].filter((row) => row.count > 0);
}

/** Orders per week or month in the range: how many and their total subtotal. */
export function ordersOverTime({ projects = [], range }) {
  const { weekly, buckets } = bucketsFor(range);
  const rows = buckets.map((bucket) => ({ ...bucket, orders: 0, value: 0 }));
  const byKey = new Map(rows.map((row) => [row.key, row]));
  for (const project of projects) {
    const day = orderDayOf(project);
    if (!inRange(day, range)) continue;
    const row = byKey.get(bucketOf(day, weekly));
    if (!row) continue;
    row.orders += 1;
    row.value += amountOf(project);
  }
  return { weekly, rows };
}

/**
 * Dealers by order value in the range (the project's Dealer box, grouped
 * ignoring capitals and extra spaces). The top ones by value, then one
 * "All other dealers" row.
 */
export function topDealers({ projects = [], range, limit = 10 }) {
  const groups = new Map();
  for (const project of projects) {
    if (!inRange(orderDayOf(project), range)) continue;
    const name = String(project.dealer || "").trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    const group = groups.get(key) || { name: name || "(No dealer)", count: 0, value: 0, other: false };
    group.count += 1;
    group.value += amountOf(project);
    groups.set(key, group);
  }
  const sorted = [...groups.values()].sort((a, b) => b.value - a.value || b.count - a.count || a.name.localeCompare(b.name));
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  if (rest.length > 0) {
    top.push({
      name: `All other dealers (${rest.length})`,
      count: rest.reduce((sum, group) => sum + group.count, 0),
      value: rest.reduce((sum, group) => sum + group.value, 0),
      other: true,
    });
  }
  return top;
}