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
    loadRuns(),
  ]);
  // Only projects in statuses this user's department may see leave the server.
  const visibleStatusIds = new Set(statusTabAccess.visibleProjectStatusIds);
  const projects = (setup.projects || []).filter((project) => visibleStatusIds.has(String(project.status_id)));
  // Map projectStatuses to statuses for backward compatibility with view
  return <ProjectMapView {...setup} projects={projects} statuses={setup.projectStatuses || []} origins={setup.originAddresses || []} runs={runs} runStatuses={setup.runStatuses || []} statusTabAccess={statusTabAccess} />;
}
