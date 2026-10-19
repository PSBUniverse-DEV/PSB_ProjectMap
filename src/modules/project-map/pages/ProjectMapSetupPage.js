import { loadAllRunStatuses, loadPageAccess, loadProjectMapSetup, loadProjectStatusTabAccess, loadRoleStatusMappings } from "../data/projectMap.server";
import { PROJECT_MAP_PAGES } from "../data/projectMap.data";
import ProjectMapAccessBlocked from "../components/ProjectMapAccessBlocked";
import ProjectMapSetupView from "./setup/ProjectMapSetupView";
import "./setup/setup-workspace.css";

export const dynamic = "force-dynamic";

export default async function ProjectMapSetupPage() {
  // Only roles that have the setup card (also when the address is typed in).
  if (!(await loadPageAccess(PROJECT_MAP_PAGES.setup))) {
    const access = await loadProjectStatusTabAccess();
    return <ProjectMapAccessBlocked access={{ ...access, reason: "no-page-access" }} page="Project Map Setup" />;
  }
  const [loadedSetup, roleTabs, allRunStatuses] = await Promise.all([
    loadProjectMapSetup(),
    loadRoleStatusMappings(),
    loadAllRunStatuses(),
  ]);
  // Setup shows switched-off run statuses too, so they can be switched back on.
  const setup = { ...loadedSetup, runStatuses: allRunStatuses };
  return <ProjectMapSetupView setup={setup} roles={roleTabs.roles} roleStatusMappings={roleTabs.mappings} roleRunStatusMappings={roleTabs.runMappings} />;
}