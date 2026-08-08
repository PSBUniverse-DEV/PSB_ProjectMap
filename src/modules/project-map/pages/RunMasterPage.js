/**
 * Server Component — RunMasterPage.js
 *
 * Runs on the server. Loads data, then passes it to the View.
 *
 * RULES:
 *   - No useState, useEffect, or onClick here — those go in the View.
 *   - Do NOT wrap JSX in try/catch (causes a React lint error).
 */
import { loadRuns, loadProjectMapSetup } from "../data/projectMap.server";
import RunMasterView from "./RunMasterView";

export const dynamic = "force-dynamic";

export default async function RunMasterPage() {
  const [runs, setup] = await Promise.all([
    loadRuns(),
    loadProjectMapSetup(),
  ]);
  return (
    <RunMasterView
      runs={runs}
      origins={setup.originAddresses || []}
      statuses={setup.projectStatuses || []}
      runStatuses={setup.runStatuses || []}
      paymentMethods={setup.paymentMethods || []}
    />
  );
}
