/**
 * Server Component — RunCalendarPage.js
 *
 * Runs on the server. Loads the runs this user may see, then passes them to the View.
 *
 * RULES:
 *   - No useState, useEffect, or onClick here — those go in the View.
 *   - Do NOT wrap JSX in try/catch (causes a React lint error).
 */
import { loadPageAccess, loadRuns, loadProjectMapSetup, loadProjectStatusTabAccess } from "../data/projectMap.server";
import { PROJECT_MAP_PAGES } from "../data/projectMap.data";
import ProjectMapAccessBlocked from "../components/ProjectMapAccessBlocked";
import RunCalendarView from "./RunCalendarView";

export const dynamic = "force-dynamic";

export default async function RunCalendarPage() {
  // Same rule as the Run Master List: every Project Map user sees every run.
  const access = await loadProjectStatusTabAccess();
  if (access.reason !== "ok") {
    return <ProjectMapAccessBlocked access={access} page="Run Calendar" />;
  }
  // Only roles that have this page's card (also when the address is typed in).
  if (!(await loadPageAccess(PROJECT_MAP_PAGES.calendar))) {
    return <ProjectMapAccessBlocked access={{ ...access, reason: "no-page-access" }} page="Run Calendar" />;
  }
  if (access.allowedRunStatusNames.length === 0) {
    return <ProjectMapAccessBlocked access={{ ...access, reason: "no-run-mapping" }} page="Run Calendar" />;
  }

  const [runs, setup] = await Promise.all([
    loadRuns(access),
    loadProjectMapSetup(),
  ]);
  return <RunCalendarView runs={runs} runStatuses={setup.runStatuses || []} />;
}
