import { loadProjectMapProjects } from "../data/projectMap.server";
import ProjectMapView from "./ProjectMapView";

export const dynamic = "force-dynamic";

export default async function ProjectMapPage() {
  const { projects, statuses, origins, states } = await loadProjectMapProjects();
  return <ProjectMapView projects={projects} statuses={statuses} origins={origins} states={states} />;
}
