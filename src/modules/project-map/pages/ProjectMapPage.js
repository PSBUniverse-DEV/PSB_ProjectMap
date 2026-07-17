import { loadProjectMapProjects, loadRuns } from "../data/projectMap.server";
import ProjectMapView from "./ProjectMapView";

export const dynamic = "force-dynamic";

export default async function ProjectMapPage() {
  const [projectsData, runs] = await Promise.all([
    loadProjectMapProjects(),
    loadRuns(),
  ]);
  return <ProjectMapView {...projectsData} runs={runs} />;
}
