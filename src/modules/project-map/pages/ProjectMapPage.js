import { loadProjectMapSetup, loadProjectStatusTabAccess, loadRuns } from "../data/projectMap.server";
import ProjectMapAccessBlocked from "../components/ProjectMapAccessBlocked";
import ProjectMapView from "./ProjectMapView";

export const dynamic = "force-dynamic";

export default async function ProjectMapPage() {
  // Access is decided first so a blocked user is sent no project or run data.
  const statusTabAccess = await loadProjectStatusTabAccess();
  if (statusTabAccess.reason !== "ok") {
    return <ProjectMapAccessBlocked access={statusTabAccess} />;
  }

  const [setup, runs] = await Promise.all([
    loadProjectMapSetup(),
    loadRuns(statusTabAccess),
  ]);
  // Project statuses limit the Projects tab only. The Runs tab is limited by
  // run statuses instead and needs every project (stop pins, add candidates),
  // so users who can see runs get the full list and the view narrows the
  // Projects tab itself. Users with no runs get only their own statuses.
  const canSeeRuns = statusTabAccess.allowedRunStatusNames.length > 0;
  const visibleStatusIds = new Set(statusTabAccess.visibleProjectStatusIds);
  const projects = canSeeRuns
    ? setup.projects || []
    : (setup.projects || []).filter((project) => visibleStatusIds.has(String(project.status_id)));
  // Map projectStatuses to statuses for backward compatibility with view
  return <ProjectMapView {...setup} projects={projects} statuses={setup.projectStatuses || []} origins={setup.originAddresses || []} runs={runs} runStatuses={setup.runStatuses || []} statusTabAccess={statusTabAccess} />;
}
