import { loadAllRunStatuses, loadProjectMapSetup, loadRoleStatusMappings } from "../data/projectMap.server";
import ProjectMapSetupView from "./setup/ProjectMapSetupView";
import "./setup/setup-workspace.css";

export const dynamic = "force-dynamic";

export default async function ProjectMapSetupPage() {
  const [loadedSetup, roleTabs, allRunStatuses] = await Promise.all([
    loadProjectMapSetup(),
    loadRoleStatusMappings(),
    loadAllRunStatuses(),
  ]);
  // Setup shows switched-off run statuses too, so they can be switched back on.
  const setup = { ...loadedSetup, runStatuses: allRunStatuses };
  return <ProjectMapSetupView setup={setup} roles={roleTabs.roles} roleStatusMappings={roleTabs.mappings} roleRunStatusMappings={roleTabs.runMappings} />;
}