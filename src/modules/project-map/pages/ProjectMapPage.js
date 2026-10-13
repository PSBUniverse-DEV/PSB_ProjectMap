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
  // Map projectStatuses to statuses for backward compatibility with view
  return <ProjectMapView {...setup} statuses={setup.projectStatuses || []} origins={setup.originAddresses || []} runs={runs} runStatuses={setup.runStatuses || []} statusTabAccess={statusTabAccess} />;
}
