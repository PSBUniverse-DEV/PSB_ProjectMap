import { loadDepartmentStatusMappings, loadProjectMapSetup } from "../data/projectMap.server";
import ProjectMapSetupView from "./setup/ProjectMapSetupView";
import "./setup/setup-workspace.css";

export const dynamic = "force-dynamic";

export default async function ProjectMapSetupPage() {
  const [setup, departmentTabs] = await Promise.all([
    loadProjectMapSetup(),
    loadDepartmentStatusMappings(),
  ]);
  return <ProjectMapSetupView setup={setup} departments={departmentTabs.departments} departmentStatusMappings={departmentTabs.mappings} />;
}