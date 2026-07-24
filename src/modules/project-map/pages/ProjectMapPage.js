import { loadProjectMapSetup, loadRuns } from "../data/projectMap.server";
import ProjectMapView from "./ProjectMapView";

export const dynamic = "force-dynamic";

export default async function ProjectMapPage() {
  const [setup, runs] = await Promise.all([
    loadProjectMapSetup(),
    loadRuns(),
  ]);
  // Map projectStatuses to statuses for backward compatibility with view
  return <ProjectMapView {...setup} statuses={setup.projectStatuses || []} origins={setup.originAddresses || []} runs={runs} />;
}
