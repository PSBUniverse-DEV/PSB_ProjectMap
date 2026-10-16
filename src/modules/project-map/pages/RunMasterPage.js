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
  // Every Project Map user sees every run; their roles decide which runs they may change.
  const access = await loadProjectStatusTabAccess();
  if (access.reason !== "ok") {
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
      editAccess={{ editableProjectStatusIds: access.editableProjectStatusIds, editableRunStatusNames: access.editableRunStatusNames }}
    />
  );
}
