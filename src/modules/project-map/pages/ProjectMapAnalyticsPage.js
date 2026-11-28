/**
 * Server Component — ProjectMapAnalyticsPage.js
 *
 * Runs on the server. Checks access like the other Project Map pages, then
 * works out the reports for the default filters (last 12 months) from fresh
 * data and sends only those results to the View. A grey placeholder shows
 * while that happens. Later filter changes and click-through lists come from
 * the server actions in projectMap.analytics.actions.js.
 *
 * RULES:
 *   - No useState, useEffect, or onClick here — those go in the View.
 *   - Do NOT wrap JSX in try/catch (causes a React lint error).
 */
import { Suspense } from "react";
import { loadAnalyticsDataCached, loadPageAccess, loadProjectStatusTabAccess } from "../data/projectMap.server";
import { PROJECT_MAP_PAGES } from "../data/projectMap.data";
import { DEFAULT_ANALYTICS_RANGE, buildAnalyticsReports } from "../data/projectMap.analytics";
import ProjectMapAccessBlocked from "../components/ProjectMapAccessBlocked";
import ProjectMapAnalyticsView from "./ProjectMapAnalyticsView";

export const dynamic = "force-dynamic";

// Shown straight away while the reports are worked out.
function AnalyticsSkeleton() {
  const block = (height, width = "100%") => ({ height, width, background: "#f1f5f9", borderRadius: "6px" });
  return (
    <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "10px" }} aria-busy="true" aria-label="Loading analytics">
      <div style={block("28px", "200px")} />
      <div style={block("34px")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px" }}>
        {Array.from({ length: 6 }, (_, i) => <div key={i} style={block("72px")} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "10px" }}>
        {Array.from({ length: 4 }, (_, i) => <div key={i} style={block("300px")} />)}
      </div>
    </div>
  );
}

export default function ProjectMapAnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}

async function AnalyticsContent() {
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

  // Opening the page always reads fresh data (and keeps it for quick filter changes).
  const data = await loadAnalyticsDataCached(access, { fresh: true });
  const initialReports = buildAnalyticsReports(data, { rangeKey: DEFAULT_ANALYTICS_RANGE }, new Date().toISOString().slice(0, 10));

  return (
    <ProjectMapAnalyticsView
      initialReports={initialReports}
      buildingCategories={data.buildingCategories}
      pageAccess={{ map: canOpenMap, runMaster: canOpenRunMaster, calendar: canOpenCalendar }}
    />
  );
}