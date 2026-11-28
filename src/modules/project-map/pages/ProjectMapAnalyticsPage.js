/**
 * Server Component — ProjectMapAnalyticsPage.js
 *
 * Runs on the server. Checks access like the other Project Map pages, loads
 * projects (with their status history) and runs, keeps only the fields the
 * reports use, then passes them to the View, which works out every report in
 * the browser so the filters change instantly.
 *
 * RULES:
 *   - No useState, useEffect, or onClick here — those go in the View.
 *   - Do NOT wrap JSX in try/catch (causes a React lint error).
 */
import { loadPageAccess, loadProjectMapSetup, loadProjectStatusTabAccess, loadRuns } from "../data/projectMap.server";
import { PROJECT_MAP_PAGES } from "../data/projectMap.data";
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

  const [setup, runs] = await Promise.all([loadProjectMapSetup(), loadRuns(access)]);

  // Only what the reports read is sent to the browser.
  const projects = (setup.projects || []).map((project) => ({
    id: project.id,
    status_id: project.status_id,
    state: project.state,
    building_category_id: project.building_category_id,
    dealer: project.dealer,
    project_subtotal: project.project_subtotal,
    order_received_at: project.order_received_at,
    created_at: project.created_at,
    client_name: project.client_name,
    updated_at: project.updated_at,
    welcome_call_status_id: project.welcome_call_status_id,
    confirmation_status_id: project.confirmation_status_id,
    permit_status_id: project.permit_status_id,
    proj_t_project_status_log: (project.proj_t_project_status_log || []).map((row) => ({
      from_status_id: row.from_status_id,
      to_status_id: row.to_status_id,
      changed_at: row.changed_at,
      duration_seconds: row.duration_seconds,
      is_baseline: row.is_baseline,
    })),
  }));
  const runRows = (runs || []).map((run) => ({
    id: run.id,
    run_date: run.run_date,
    original_run_date: run.original_run_date,
    status: run.status,
    stops: (run.proj_t_run_projects || []).length,
  }));

  return (
    <ProjectMapAnalyticsView
      projects={projects}
      runs={runRows}
      statuses={setup.projectStatuses || []}
      runStatuses={setup.runStatuses || []}
      buildingCategories={setup.buildingCategories || []}
      permitStatuses={setup.permitStatuses || []}
      welcomeCallStatuses={setup.welcomeCallStatuses || []}
      confirmationStatuses={setup.confirmationStatuses || []}
      settings={setup.settings || []}
      todayKey={new Date().toISOString().slice(0, 10)}
      pageAccess={{ map: canOpenMap, runMaster: canOpenRunMaster, calendar: canOpenCalendar }}
    />
  );
}