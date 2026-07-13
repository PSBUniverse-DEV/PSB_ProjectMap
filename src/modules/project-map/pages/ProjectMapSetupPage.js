import { loadProjectMapSetup } from "../data/projectMap.server";
import ProjectMapSetupView from "./setup/ProjectMapSetupView";
import "./setup/setup-workspace.css";

export const dynamic = "force-dynamic";

export default async function ProjectMapSetupPage() {
  const setup = await loadProjectMapSetup();
  return <ProjectMapSetupView setup={setup} />;
}