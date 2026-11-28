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
import { REPAIR_STATUS_KEYS, formatRunCode, getStaleAfterDays, getStaleProjects, isPastInstallProject, isRepairProject, runStatusKeyByName } from "./projectMap.data";

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
    const group = groups.get(key) || { key: key || "none", name: name || "(No dealer)", count: 0, value: 0, other: false };
    group.count += 1;
    group.value += amountOf(project);
    groups.set(key, group);
  }
  const sorted = [...groups.values()].sort((a, b) => b.value - a.value || b.count - a.count || a.name.localeCompare(b.name));
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  if (rest.length > 0) {
    top.push({
      key: "other",
      name: `All other dealers (${rest.length})`,
      count: rest.reduce((sum, group) => sum + group.count, 0),
      value: rest.reduce((sum, group) => sum + group.value, 0),
      other: true,
    });
  }
  return top;
}

// ─── Phase 2 reports ─────────────────────────────────────────────────────────

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const oneDecimal = (value) => (value == null ? null : Math.round(value * 10) / 10);

/** Real status changes (starting-point rows left out) dated inside the range. */
function changesInRange(projects, range) {
  return projects.flatMap((project) => (project.proj_t_project_status_log || [])
    .filter((row) => !row.is_baseline && inRange(dayKey(row.changed_at), range)));
}

/**
 * Days spent in each status before moving on, for moves made in the range
 * (Setup order): how many moves, average, median and longest. Only stays
 * that started after status history began are counted.
 */
export function timeInStatus({ projects = [], statuses = [], range }) {
  const days = new Map();
  for (const project of projects) {
    // Oldest first, so each move can see the history row before it.
    const history = [...(project.proj_t_project_status_log || [])]
      .sort((a, b) => String(a.changed_at).localeCompare(String(b.changed_at)));
    history.forEach((row, index) => {
      if (row.is_baseline || row.from_status_id == null || row.duration_seconds == null) return;
      if (!inRange(dayKey(row.changed_at), range)) return;
      // The stay started at the row before. When that is the starting point
      // (recorded when history began), the real time in the status is unknown.
      const previous = history[index - 1];
      if (!previous || previous.is_baseline) return;
      const key = String(row.from_status_id);
      if (!days.has(key)) days.set(key, []);
      days.get(key).push(Number(row.duration_seconds) / 86400);
    });
  }
  return statuses
    .filter((status) => days.has(String(status.status_id)))
    .map((status) => {
      const list = days.get(String(status.status_id));
      return {
        statusId: String(status.status_id),
        name: status.status_name,
        color: status.display_color || NEUTRAL_COLOR,
        moves: list.length,
        average: oneDecimal(average(list)),
        median: oneDecimal(median(list)),
        longest: oneDecimal(Math.max(...list)),
      };
    });
}

/**
 * Days from order (Order Received, or the day entered) to installed, for
 * projects installed in the range: per week or month, and overall.
 */
export function orderToInstall({ projects = [], statuses = [], range }) {
  const installIds = installStatusIds(statuses);
  const { weekly, buckets } = bucketsFor(range);
  const days = new Map(buckets.map((bucket) => [bucket.key, []]));
  const all = [];
  for (const project of projects) {
    const install = installDayOf(project, installIds);
    const order = orderDayOf(project);
    if (!install || !order || !inRange(install, range) || install < order) continue;
    const value = daysBetween(order, install);
    days.get(bucketOf(install, weekly))?.push(value);
    all.push(value);
  }
  return {
    weekly,
    overall: { count: all.length, average: oneDecimal(average(all)), median: oneDecimal(median(all)) },
    rows: buckets.map((bucket) => {
      const list = days.get(bucket.key) || [];
      return { ...bucket, count: list.length, average: oneDecimal(average(list)), median: oneDecimal(median(list)) };
    }),
  };
}

/**
 * Runs per week or month in the range, split by run status. Series keys are
 * "s0", "s1", ... (status names can hold characters a chart key can't).
 */
export function runsOverTime({ runs = [], runStatuses = [], range }) {
  const { weekly, buckets } = bucketsFor(range);
  const statusSeries = runStatuses.map((status, index) => ({ key: `s${index}`, name: status.status_name, color: status.display_color || NEUTRAL_COLOR }));
  const keyOfName = new Map(statusSeries.map((series) => [series.name, series.key]));
  const otherKey = "other";
  const rows = buckets.map((bucket) => ({
    ...bucket,
    total: 0,
    stops: 0,
    [otherKey]: 0,
    ...Object.fromEntries(statusSeries.map((series) => [series.key, 0])),
  }));
  const byKey = new Map(rows.map((row) => [row.key, row]));
  for (const run of runs) {
    const day = dayKey(run.run_date);
    if (!inRange(day, range)) continue;
    const row = byKey.get(bucketOf(day, weekly));
    if (!row) continue;
    row[keyOfName.get(run.status) || otherKey] += 1;
    row.total += 1;
    row.stops += Number(run.stops) || 0;
  }
  const series = statusSeries.filter((item) => rows.some((row) => row[item.key] > 0));
  if (rows.some((row) => row[otherKey] > 0)) series.push({ key: otherKey, name: "Other status", color: NEUTRAL_COLOR });
  return { weekly, rows, series };
}

/** Runs per week or month that kept their first date vs were rescheduled. */
export function runSchedule({ runs = [], range }) {
  const { weekly, buckets } = bucketsFor(range);
  const rows = buckets.map((bucket) => ({ ...bucket, kept: 0, rescheduled: 0 }));
  const byKey = new Map(rows.map((row) => [row.key, row]));
  for (const run of runs) {
    const day = dayKey(run.run_date);
    if (!inRange(day, range)) continue;
    const row = byKey.get(bucketOf(day, weekly));
    if (!row) continue;
    const original = dayKey(run.original_run_date);
    if (original && original !== day) row.rescheduled += 1;
    else row.kept += 1;
  }
  const kept = rows.reduce((sum, row) => sum + row.kept, 0);
  const rescheduled = rows.reduce((sum, row) => sum + row.rescheduled, 0);
  const total = kept + rescheduled;
  return { weekly, rows, kept, rescheduled, keptPercent: total ? Math.round((kept / total) * 100) : null };
}

/**
 * Repairs per week or month: opened = a project moved into a repair status
 * from a non-repair one; repaired = moved into a repair status with Finished
 * ticked. Real status changes only.
 */
export function repairsOverTime({ projects = [], statuses = [], range }) {
  const repairIds = new Set(statuses.filter((status) => REPAIR_STATUS_KEYS.includes(status?.system_key)).map((status) => String(status.status_id)));
  const doneIds = new Set(statuses
    .filter((status) => REPAIR_STATUS_KEYS.includes(status?.system_key) && status?.is_finished === true)
    .map((status) => String(status.status_id)));
  const { weekly, buckets } = bucketsFor(range);
  const rows = buckets.map((bucket) => ({ ...bucket, opened: 0, repaired: 0 }));
  const byKey = new Map(rows.map((row) => [row.key, row]));
  for (const row of changesInRange(projects, range)) {
    const bucket = byKey.get(bucketOf(dayKey(row.changed_at), weekly));
    if (!bucket) continue;
    const to = String(row.to_status_id);
    const from = row.from_status_id == null ? "" : String(row.from_status_id);
    if (repairIds.has(to) && !repairIds.has(from)) bucket.opened += 1;
    if (doneIds.has(to) && !doneIds.has(from)) bucket.repaired += 1;
  }
  return { weekly, rows };
}

// ─── More project reports ────────────────────────────────────────────────────

/** A typed name grouped ignoring capitals and extra spaces ({ key: "" } = none). */
function groupName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  return { key: name.toLowerCase(), name };
}

/** Keeps the first `limit` rows and folds the rest into one "All other …" row. */
function foldRest(sorted, limit, label, sumKeys) {
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  if (rest.length > 0) {
    const other = { key: "other", name: `${label} (${rest.length})`, other: true };
    for (const sumKey of sumKeys) other[sumKey] = rest.reduce((sum, row) => sum + (Number(row[sumKey]) || 0), 0);
    top.push(other);
  }
  return top;
}

/** Open projects' total subtotal per current status (Setup order), right now. */
export function openValueByStatus({ projects = [], statuses = [] }) {
  const open = projects.filter((project) => !isPastInstallProject(project, statuses));
  return projectsByStatus({ projects: open, statuses }).filter((row) => row.value > 0);
}

/** Orders in the range per building category: how many and their value, highest value first. */
export function categoriesReport({ projects = [], buildingCategories = [], range }) {
  const nameOf = new Map(buildingCategories.map((category) => [String(category.id), category.building_category_name]));
  const groups = new Map();
  for (const project of projects) {
    if (!inRange(orderDayOf(project), range)) continue;
    const id = project.building_category_id == null ? "" : String(project.building_category_id);
    const group = groups.get(id) || {
      key: id || "none",
      name: id ? nameOf.get(id) || "Unknown category" : "No category",
      count: 0,
      value: 0,
      other: !id,
    };
    group.count += 1;
    group.value += amountOf(project);
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => b.value - a.value || b.count - a.count || a.name.localeCompare(b.name));
}

/** Average and median order value per week or month (orders that have a subtotal). */
export function averageValue({ projects = [], range }) {
  const { weekly, buckets } = bucketsFor(range);
  const values = new Map(buckets.map((bucket) => [bucket.key, []]));
  for (const project of projects) {
    const day = orderDayOf(project);
    const amount = amountOf(project);
    if (!inRange(day, range) || amount <= 0) continue;
    values.get(bucketOf(day, weekly))?.push(amount);
  }
  const rows = buckets.map((bucket) => {
    const list = values.get(bucket.key) || [];
    return {
      ...bucket,
      count: list.length,
      average: list.length ? Math.round(average(list)) : null,
      median: list.length ? Math.round(median(list)) : null,
    };
  });
  return { weekly, rows };
}

/** Orders in the range per state: how many and their value; the top `limit`, then "All other states". */
export function projectsByState({ projects = [], range, limit = 15 }) {
  const groups = new Map();
  for (const project of projects) {
    if (!inRange(orderDayOf(project), range)) continue;
    const { key, name } = groupName(project.state);
    const group = groups.get(key) || { key: key || "none", name: name || "(No state)", count: 0, value: 0, other: !key };
    group.count += 1;
    group.value += amountOf(project);
    groups.set(key, group);
  }
  const sorted = [...groups.values()].sort((a, b) => b.count - a.count || b.value - a.value || a.name.localeCompare(b.name));
  return foldRest(sorted, limit, "All other states", ["count", "value"]);
}

/**
 * Open projects not updated for `staleAfterDays` days or more — the same rule
 * and day limit as the "not updated" bell (getStaleProjects). Returns the list
 * (oldest first) and the count per current status.
 */
export function staleProjects({ projects = [], statuses = [], staleAfterDays, now }) {
  const list = getStaleProjects(projects, statuses, staleAfterDays, now);
  const nameOf = new Map(statuses.map((status) => [String(status.status_id), status.status_name]));
  const rows = list.map(({ project, days }) => ({
    key: String(project.id),
    client: project.client_name || "Untitled",
    status: nameOf.get(String(project.status_id)) || "No status",
    days,
    updated: dayKey(project.updated_at) || dayKey(project.created_at),
  }));
  return { rows, byStatus: projectsByStatus({ projects: list.map((item) => item.project), statuses }) };
}

/**
 * Open projects per welcome call, confirmation and permit status (each list in
 * its Setup order), with "Not set" when none is picked.
 */
export function careProgress({ projects = [], statuses = [], welcomeCallStatuses = [], confirmationStatuses = [], permitStatuses = [] }) {
  const open = projects.filter((project) => !isPastInstallProject(project, statuses));
  const step = (label, field, list) => {
    const rows = list.map((item) => ({ key: `${field}-${item.id}`, id: String(item.id), label: `${label}: ${item.status_name}`, count: 0, other: false }));
    const byId = new Map(rows.map((row) => [row.id, row]));
    const none = { key: `${field}-none`, id: "", label: `${label}: Not set`, count: 0, other: true };
    for (const project of open) (byId.get(String(project[field] ?? "")) || none).count += 1;
    return [...rows, none].filter((row) => row.count > 0);
  };
  return [
    { label: "Welcome call", rows: step("Welcome call", "welcome_call_status_id", welcomeCallStatuses) },
    { label: "Confirmation", rows: step("Confirmation", "confirmation_status_id", confirmationStatuses) },
    { label: "Permit", rows: step("Permit", "permit_status_id", permitStatuses) },
  ];
}

// ─── More run reports ────────────────────────────────────────────────────────

/** Run rows per week or month in the range, with each run handed to `add`. */
function runsByBucket(runs, range, makeRow, add) {
  const { weekly, buckets } = bucketsFor(range);
  const rows = buckets.map((bucket) => ({ ...bucket, ...makeRow() }));
  const byKey = new Map(rows.map((row) => [row.key, row]));
  for (const run of runs) {
    const day = dayKey(run.run_date);
    if (!inRange(day, range)) continue;
    const row = byKey.get(bucketOf(day, weekly));
    if (row) add(row, run);
  }
  return { weekly, rows };
}

/** Per week or month: runs, average stops per run, and total planned run value. */
export function runSizeAndValue({ runs = [], range }) {
  const result = runsByBucket(runs, range, () => ({ runs: 0, stops: 0, value: 0 }), (row, run) => {
    row.runs += 1;
    row.stops += Number(run.stops) || 0;
    row.value += Number(run.estimated_subtotal) || 0;
  });
  result.rows.forEach((row) => {
    row.averageStops = row.runs ? Math.round((row.stops / row.runs) * 10) / 10 : null;
  });
  return result;
}

/** Per week or month: planned miles and drive hours (route estimates), and how many runs had miles. */
export function milesAndHours({ runs = [], range }) {
  const result = runsByBucket(runs, range, () => ({ runs: 0, runsWithMiles: 0, miles: 0, hours: 0 }), (row, run) => {
    row.runs += 1;
    if (run.estimated_mileage != null) {
      row.runsWithMiles += 1;
      row.miles += Number(run.estimated_mileage) || 0;
    }
    row.hours += (Number(run.estimated_duration) || 0) / 3600;
  });
  result.rows.forEach((row) => {
    row.miles = Math.round(row.miles);
    row.hours = Math.round(row.hours * 10) / 10;
  });
  result.runs = result.rows.reduce((sum, row) => sum + row.runs, 0);
  result.runsWithMiles = result.rows.reduce((sum, row) => sum + row.runsWithMiles, 0);
  return result;
}

/**
 * Runs in the range per team (the run's Team box, grouped ignoring capitals and
 * extra spaces): runs, stops, planned miles and hours. Most runs first; the top
 * `limit`, then "All other teams".
 */
export function teamWorkload({ runs = [], range, limit = 12 }) {
  const groups = new Map();
  for (const run of runs) {
    if (!inRange(dayKey(run.run_date), range)) continue;
    const { key, name } = groupName(run.team_assigned);
    const group = groups.get(key) || { key: key || "none", name: name || "(No team)", runs: 0, stops: 0, miles: 0, hours: 0, other: !key };
    group.runs += 1;
    group.stops += Number(run.stops) || 0;
    group.miles += Number(run.estimated_mileage) || 0;
    group.hours += (Number(run.estimated_duration) || 0) / 3600;
    groups.set(key, group);
  }
  const sorted = [...groups.values()]
    .map((group) => ({ ...group, miles: Math.round(group.miles), hours: Math.round(group.hours * 10) / 10 }))
    .sort((a, b) => b.runs - a.runs || b.stops - a.stops || a.name.localeCompare(b.name));
  return foldRest(sorted, limit, "All other teams", ["runs", "stops", "miles", "hours"]);
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Install days in the range: projects whose Arrival From date falls on each
 * weekday of each week (weeks start Monday). Returns the weeks (with a count
 * per weekday), the highest single-day count, and the total.
 */
export function installHeatmap({ projects = [], range }) {
  const weeks = [];
  const end = fromKey(range.to);
  const cursor = fromKey(bucketOf(range.from, true));
  while (cursor <= end) {
    weeks.push({
      key: toKey(cursor),
      label: `${MONTHS[cursor.getUTCMonth()]} ${cursor.getUTCDate()}`,
      // Day key of each weekday (Mon..Sun), for the click-through list.
      days: [0, 1, 2, 3, 4, 5, 6].map((offset) => toKey(new Date(cursor.getTime() + offset * DAY_MS))),
      counts: [0, 0, 0, 0, 0, 0, 0],
      total: 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  const byKey = new Map(weeks.map((week) => [week.key, week]));
  let max = 0;
  let total = 0;
  for (const project of projects) {
    const day = dayKey(project.install_start);
    if (!inRange(day, range)) continue;
    const week = byKey.get(bucketOf(day, true));
    if (!week) continue;
    const weekday = (fromKey(day).getUTCDay() + 6) % 7;
    week.counts[weekday] += 1;
    week.total += 1;
    total += 1;
    max = Math.max(max, week.counts[weekday]);
  }
  return { weeks, max, total };
}

// ─── Click-through lists ─────────────────────────────────────────────────────

const noneKey = (key) => key || "none";

/** A project row for the click-through list. */
function projectRow(project, statusOf, dateOf) {
  return {
    key: String(project.id),
    id: project.id,
    client: project.client_name || "Untitled",
    status: statusOf.get(String(project.status_id))?.status_name || "No status",
    state: String(project.state || "").trim(),
    dealer: String(project.dealer || "").trim(),
    value: amountOf(project),
    date: dateOf(project),
  };
}

/**
 * The projects behind one clicked bar, cell or table row, with the same
 * filters and period as the chart. pick = { report, key }: key is the clicked
 * row's key ("none" = the no-value row, "other" = the "All other …" row).
 * Returns { kind: "projects", rows, dateLabel }.
 */
export function drillProjects({ projects = [], statuses = [], range, pick, staleAfterDays, now }) {
  const statusOf = new Map(statuses.map((status) => [String(status.status_id), status]));
  const ordered = (project) => inRange(orderDayOf(project), range);
  const enteredDay = (project) => dayKey(project.created_at);
  const dealerKey = (project) => noneKey(String(project.dealer || "").trim().replace(/\s+/g, " ").toLowerCase());
  const stateKey = (project) => noneKey(groupName(project.state).key);
  const categoryKey = (project) => noneKey(project.building_category_id == null ? "" : String(project.building_category_id));
  const statusKey = (project) => String(project.status_id ?? "");
  let list = [];
  let dateLabel = "Order day";
  let dateOf = orderDayOf;
  let oldestFirst = false;

  switch (pick.report) {
    case "status":
      list = projects.filter((project) => statusKey(project) === pick.key);
      dateLabel = "Entered";
      dateOf = enteredDay;
      break;
    case "openStatus":
      list = projects.filter((project) => !isPastInstallProject(project, statuses) && statusKey(project) === pick.key);
      dateLabel = "Entered";
      dateOf = enteredDay;
      break;
    case "orders": {
      const { weekly } = bucketsFor(range);
      list = projects.filter((project) => ordered(project) && bucketOf(orderDayOf(project), weekly) === pick.key);
      break;
    }
    case "dealer": {
      // Rows shown on their own: every row except the folded "All other" one
      // (the no-value row is shown on its own too, only drawn grey).
      const top = new Set(topDealers({ projects, range }).filter((row) => row.key !== "other").map((row) => row.key));
      list = projects.filter((project) => ordered(project)
        && (pick.key === "other" ? !top.has(dealerKey(project)) : dealerKey(project) === pick.key));
      break;
    }
    case "category":
      list = projects.filter((project) => ordered(project) && categoryKey(project) === pick.key);
      break;
    case "state": {
      const top = new Set(projectsByState({ projects, range }).filter((row) => row.key !== "other").map((row) => row.key));
      list = projects.filter((project) => ordered(project)
        && (pick.key === "other" ? !top.has(stateKey(project)) : stateKey(project) === pick.key));
      break;
    }
    case "stale":
      list = getStaleProjects(projects, statuses, staleAfterDays, now)
        .map((item) => item.project)
        .filter((project) => statusKey(project) === pick.key);
      dateLabel = "Last updated";
      dateOf = (project) => dayKey(project.updated_at) || dayKey(project.created_at);
      oldestFirst = true;
      break;
    case "care": {
      const dash = pick.key.lastIndexOf("-");
      const field = pick.key.slice(0, dash);
      const id = pick.key.slice(dash + 1);
      const wanted = id === "none" ? "" : id;
      list = projects.filter((project) => !isPastInstallProject(project, statuses) && String(project[field] ?? "") === wanted);
      dateLabel = "Entered";
      dateOf = enteredDay;
      break;
    }
    case "installDay":
      list = projects.filter((project) => dayKey(project.install_start) === pick.key && inRange(pick.key, range));
      dateLabel = "Arrival";
      dateOf = (project) => dayKey(project.install_start);
      break;
    default:
      list = [];
  }

  const rows = list
    .map((project) => projectRow(project, statusOf, dateOf))
    .sort((a, b) => (oldestFirst ? String(a.date).localeCompare(String(b.date)) : String(b.date).localeCompare(String(a.date)))
      || a.client.localeCompare(b.client));
  return { kind: "projects", rows, dateLabel };
}

/**
 * The runs behind one clicked bar or table row, for the same period as the
 * chart. pick = { report, key, statusName?, otherStatus? }; key is the clicked
 * row's period key, or its team key for "team" ("none" / "other" as above).
 * Returns { kind: "runs", rows }.
 */
export function drillRuns({ runs = [], runStatuses = [], range, pick }) {
  const { weekly } = bucketsFor(range);
  const inBucket = (run) => {
    const day = dayKey(run.run_date);
    return inRange(day, range) && bucketOf(day, weekly) === pick.key;
  };
  const isRescheduled = (run) => {
    const original = dayKey(run.original_run_date);
    return Boolean(original) && original !== dayKey(run.run_date);
  };
  const knownNames = new Set(runStatuses.map((status) => status.status_name));
  const teamKey = (run) => noneKey(groupName(run.team_assigned).key);
  let list = [];

  switch (pick.report) {
    case "runsByStatus":
      list = runs.filter((run) => inBucket(run) && (pick.otherStatus ? !knownNames.has(run.status) : run.status === pick.statusName));
      break;
    case "kept":
      list = runs.filter((run) => inBucket(run) && !isRescheduled(run));
      break;
    case "rescheduled":
      list = runs.filter((run) => inBucket(run) && isRescheduled(run));
      break;
    case "period":
      list = runs.filter(inBucket);
      break;
    case "team": {
      const top = new Set(teamWorkload({ runs, range }).filter((row) => row.key !== "other").map((row) => row.key));
      list = runs.filter((run) => inRange(dayKey(run.run_date), range)
        && (pick.key === "other" ? !top.has(teamKey(run)) : teamKey(run) === pick.key));
      break;
    }
    default:
      list = [];
  }

  const rows = list
    .map((run) => ({
      key: String(run.id),
      code: run.run_code || formatRunCode(run.run_number) || "",
      name: run.run_name || "",
      date: dayKey(run.run_date),
      status: run.status || "",
      stops: Number(run.stops) || 0,
      value: Number(run.estimated_subtotal) || 0,
      miles: run.estimated_mileage != null ? Math.round(Number(run.estimated_mileage)) : null,
      hours: run.estimated_duration != null ? Math.round((Number(run.estimated_duration) / 3600) * 10) / 10 : null,
      team: String(run.team_assigned || "").trim(),
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.code.localeCompare(b.code));
  return { kind: "runs", rows };
}

// ─── Worked out on the server ────────────────────────────────────────────────

/** Filters from the browser made safe: a known period and plain text. */
export function normalizeAnalyticsFilters(filters = {}) {
  const rangeKey = ANALYTICS_RANGES.some((item) => item.key === filters?.rangeKey) ? filters.rangeKey : DEFAULT_ANALYTICS_RANGE;
  return { rangeKey, state: String(filters?.state || ""), categoryId: String(filters?.categoryId || "") };
}

/**
 * What every report needs for one set of filters: the period, the projects
 * that match the State / Building category filters, the runs without
 * cancelled ones (run status system key "cancelled", as on the Run Calendar),
 * the bell's day limit and "now".
 */
function analyticsContext(data, filters, todayKey) {
  const { projects = [], runs = [], runStatuses = [], settings = [] } = data;
  return {
    range: rangeDates(filters.rangeKey, todayKey, earliestDay(projects, runs)),
    shown: filterProjects(projects, filters),
    activeRuns: runs.filter((run) => runStatusKeyByName(runStatuses, run.status) !== "cancelled"),
    staleAfterDays: getStaleAfterDays(settings),
    now: new Date(`${todayKey}T23:59:59Z`),
  };
}

/**
 * Every Analytics report for one set of filters, so only the results go to the
 * browser. The names match the ones the page shows.
 * data = loadAnalyticsData(...) result; todayKey = "YYYY-MM-DD".
 */
export function buildAnalyticsReports(data, rawFilters, todayKey) {
  const filters = normalizeAnalyticsFilters(rawFilters);
  const {
    projects = [], runs = [], statuses = [], runStatuses = [], buildingCategories = [],
    welcomeCallStatuses = [], confirmationStatuses = [], permitStatuses = [],
  } = data;
  const { range, shown, activeRuns, staleAfterDays, now } = analyticsContext(data, filters, todayKey);
  return {
    filters,
    // When the data behind these numbers was read (ISO time).
    asOf: data.loadedAt || new Date().toISOString(),
    range,
    states: stateOptions(projects),
    historyStart: historySince(projects),
    staleAfterDays,
    numbers: keyNumbers({ projects: shown, runs: activeRuns, statuses, range }),
    byStatus: projectsByStatus({ projects: shown, statuses }),
    orders: ordersOverTime({ projects: shown, range }),
    dealers: topDealers({ projects: shown, range }),
    statusTimes: timeInStatus({ projects: shown, statuses, range }),
    installSpeed: orderToInstall({ projects: shown, statuses, range }),
    runsByPeriod: runsOverTime({ runs, runStatuses, range }),
    schedule: runSchedule({ runs: activeRuns, range }),
    repairs: repairsOverTime({ projects: shown, statuses, range }),
    openValue: openValueByStatus({ projects: shown, statuses }),
    categoryRows: categoriesReport({ projects: shown, buildingCategories, range }),
    valueTrend: averageValue({ projects: shown, range }),
    stateRows: projectsByState({ projects: shown, range }),
    stale: staleProjects({ projects: shown, statuses, staleAfterDays, now }),
    care: careProgress({ projects: shown, statuses, welcomeCallStatuses, confirmationStatuses, permitStatuses }),
    runSize: runSizeAndValue({ runs: activeRuns, range }),
    travel: milesAndHours({ runs: activeRuns, range }),
    teams: teamWorkload({ runs: activeRuns, range }),
    installDays: installHeatmap({ projects: shown, range }),
  };
}

/**
 * The list behind one click, for one set of filters.
 * click = { kind: "projects", pick } or { kind: "runs", runs: "all" | "active", pick }
 * ("all" = every run, as "Runs per week/month" counts; "active" = cancelled left out).
 */
export function buildAnalyticsList(data, click = {}, rawFilters, todayKey) {
  const filters = normalizeAnalyticsFilters(rawFilters);
  const { statuses = [], runs = [], runStatuses = [] } = data;
  const { range, shown, activeRuns, staleAfterDays, now } = analyticsContext(data, filters, todayKey);
  const pick = { ...(click?.pick || {}), report: String(click?.pick?.report || ""), key: String(click?.pick?.key ?? "") };
  if (click?.kind === "runs") {
    return drillRuns({ runs: click.runs === "all" ? runs : activeRuns, runStatuses, range, pick });
  }
  return drillProjects({ projects: shown, statuses, range, pick, staleAfterDays, now });
}