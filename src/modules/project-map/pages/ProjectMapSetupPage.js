import { loadDepartmentStatusMappings, loadProjectMapSetup } from "../data/projectMap.server";
import ProjectMapSetupView from "./setup/ProjectMapSetupView";
import "./setup/setup-workspace.css";

export const dynamic = "force-dynamic";

export default async function ProjectMapSetupPage() {
  const [loadedSetup, departmentTabs, allRunStatuses] = await Promise.all([
    loadProjectMapSetup(),
    loadDepartmentStatusMappings(),
    loadAllRunStatuses(),
  ]);
  // Setup shows switched-off run statuses too, so they can be switched back on.
  const setup = { ...loadedSetup, runStatuses: allRunStatuses };
  return <ProjectMapSetupView setup={setup} departments={departmentTabs.departments} departmentStatusMappings={departmentTabs.mappings} departmentRunStatusMappings={departmentTabs.runMappings} />;
}