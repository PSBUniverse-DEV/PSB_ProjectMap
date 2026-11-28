"use server";

/**
 * Analytics server actions. The reports and the click-through lists are
 * worked out here and only the results go to the browser (a few KB), so the
 * page stays fast however many projects there are.
 * Same access as the page: a Project Map role and the Analytics page card.
 */
import { loadAnalyticsData, loadPageAccess, loadProjectStatusTabAccess } from "./projectMap.server";
import { PROJECT_MAP_PAGES } from "./projectMap.data";
import { buildAnalyticsList, buildAnalyticsReports } from "./projectMap.analytics";

async function requireAnalyticsAccess() {
  const access = await loadProjectStatusTabAccess();
  if (access.reason === "no-session") throw new Error("Your sign-in has expired. Please sign in again.");
  if (access.reason !== "ok") throw new Error("You do not have access to Project Map.");
  if (!(await loadPageAccess(PROJECT_MAP_PAGES.analytics))) throw new Error("You do not have access to the Analytics page.");
  return access;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Every Analytics report for these filters: { rangeKey, state, categoryId }. */
export async function loadAnalyticsReports(filters = {}) {
  const access = await requireAnalyticsAccess();
  const data = await loadAnalyticsData(access);
  return buildAnalyticsReports(data, filters, todayKey());
}

/** The projects or runs behind one clicked bar, cell or table row. */
export async function loadAnalyticsList(click = {}, filters = {}) {
  const access = await requireAnalyticsAccess();
  const data = await loadAnalyticsData(access);
  return buildAnalyticsList(data, click, filters, todayKey());
}