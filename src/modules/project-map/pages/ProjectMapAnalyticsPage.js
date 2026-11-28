/**
 * Server Component — ProjectMapAnalyticsPage.js
 *
 * Runs on the server. Checks access like the other Project Map pages, then
 * works out the reports for the default filters (last 12 months) and sends
 * only those results to the View. Later filter changes and click-through
 * lists come from the server actions in projectMap.analytics.actions.js, so
 * the page stays small however many projects there are.
 *
 * RULES:
 *   - No useState, useEffect, or onClick here — those go in the View.
 *   - Do NOT wrap JSX in try/catch (causes a React lint error).
 */
import { loadAnalyticsData, loadPageAccess, loadProjectStatusTabAccess } from "../data/projectMap.server";
import { PROJECT_MAP_PAGES } from "../data/projectMap.data";
import { DEFAULT_ANALYTICS_RANGE, buildAnalyticsReports } from "../data/projectMap.analytics";
import ProjectMapAccessBlocked from "../components/ProjectMapAccessBlocked";
import ProjectMapAnalyticsView from "./ProjectMapAnalyticsView";

export const dynamic = "force-dynamic";

export default async function ProjectMapAnalyticsPage() {
  // Every Project Map user sees every project and run (same rule as the other pages).
  const access = await loadProjectStatusTabAccess();
  if (access.reason !== "ok") {
    return <ProjectMapAccessBlocked access={access} page="Analytics" />;
  }
  // Only roles that have this page's card (also when the address is typed in).
  // The other pages' cards decide which page buttons the view shows.
  const [hasPageAccess, canOpenMap, canOpenRunMaster, canOpenCalendar] = await Promise.all([
    loadPageAccess(PROJECT_MAP_PAGES.analytics),
    loadPageAccess(PROJECT_MAP_PAGES.map),
    loadPageAccess(PROJECT_MAP_PAGES.runMaster),
    loadPageAccess(PROJECT_MAP_PAGES.calendar),
  ]);
  if (!hasPageAccess) {
    return <ProjectMapAccessBlocked access={{ ...access, reason: "no-page-access" }} page="Analytics" />;
  }

  const data = await loadAnalyticsData(access);
  const initialReports = buildAnalyticsReports(data, { rangeKey: DEFAULT_ANALYTICS_RANGE }, new Date().toISOString().slice(0, 10));

  return (
    <ProjectMapAnalyticsView
      initialReports={initialReports}
      buildingCategories={data.buildingCategories}
      pageAccess={{ map: canOpenMap, runMaster: canOpenRunMaster, calendar: canOpenCalendar }}
    />
  );
}