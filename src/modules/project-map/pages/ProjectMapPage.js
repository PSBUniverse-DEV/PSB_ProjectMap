import { loadProjectMapSetup, loadRuns } from "../data/projectMap.server";
import ProjectMapView from "./ProjectMapView";

export const dynamic = "force-dynamic";

export default async function ProjectMapPage() {
  const [setup, runs] = await Promise.all([
    loadProjectMapSetup(),
    loadRuns(),
  ]);
  return <ProjectMapView {...setup} runs={runs} />;
}
