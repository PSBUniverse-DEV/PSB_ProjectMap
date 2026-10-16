/**
 * Server Component — RunMasterPage.js
 *
 * Runs on the server. Loads data, then passes it to the View.
 *
 * RULES:
 *   - No useState, useEffect, or onClick here — those go in the View.
 *   - Do NOT wrap JSX in try/catch (causes a React lint error).
 */
import { loadRuns, loadProjectMapSetup, loadProjectStatusTabAccess } from "../data/projectMap.server";
import ProjectMapAccessBlocked from "../components/ProjectMapAccessBlocked";
import RunMasterView from "./RunMasterView";

export const dynamic = "force-dynamic";

export default async function RunMasterPage() {
  // Runs are shown per Project Map role. Project tabs are not needed on this page,
  // so a user whose roles have run statuses but no project tabs ("no-mapping") gets in.
  const access = await loadProjectStatusTabAccess();
  if (access.reason !== "ok" && access.reason !== "no-mapping") {
    return <ProjectMapAccessBlocked access={access} page="Run Master List" />;
  }
  if (access.allowedRunStatusNames.length === 0) {
    return <ProjectMapAccessBlocked access={{ ...access, reason: "no-run-mapping" }} page="Run Master List" />;
  }

  const [runs, setup] = await Promise.all([
    loadRuns(access),
    loadProjectMapSetup(),
  ]);
  return (
    <RunMasterView
      runs={runs}
      origins={setup.originAddresses || []}
      statuses={setup.projectStatuses || []}
      runStatuses={setup.runStatuses || []}
      paymentMethods={setup.paymentMethods || []}
      states={setup.states || []}
    />
  );
}
