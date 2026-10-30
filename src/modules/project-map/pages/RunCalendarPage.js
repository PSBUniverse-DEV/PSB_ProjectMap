/**
 * Server Component — RunCalendarPage.js
 *
 * Runs on the server. Loads the runs this user may see, then passes them to the View.
 *
 * RULES:
 *   - No useState, useEffect, or onClick here — those go in the View.
 *   - Do NOT wrap JSX in try/catch (causes a React lint error).
 */
import { Suspense } from "react";
import { loadPageAccess, loadRuns, loadRunCalendarSetup, loadProjectStatusTabAccess } from "../data/projectMap.server";
import { PROJECT_MAP_PAGES } from "../data/projectMap.data";
import ProjectMapAccessBlocked from "../components/ProjectMapAccessBlocked";
import RunCalendarView from "./RunCalendarView";

export const dynamic = "force-dynamic";

// Shown straight away while the calendar's data loads.
function RunCalendarSkeleton() {
  const block = (height, width = "100%") => ({ height, width, background: "#f1f5f9", borderRadius: "6px" });
  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }} aria-busy="true" aria-label="Loading run calendar">
      <div style={block("28px", "240px")} />
      <div style={{ display: "flex", gap: "8px" }}>
        {[90, 80, 70, 100, 150].map((w) => <div key={w} style={block("26px", `${w}px`)} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "20% 1fr", gap: "12px" }}>
        <div style={block("480px")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "4px" }}>
          {Array.from({ length: 48 }, (_, i) => <div key={i} style={block("76px")} />)}
        </div>
      </div>
    </div>
  );
}

// First day ("YYYY-MM-DD") from which completed / cancelled runs are loaded:
// the 1st of the month two months before this one ("recent", the default),
// or 1 January for "year" (whichever is earlier, so "year" never loads less
// than "recent" in January or February).
function finishedRunsFrom(range) {
  const now = new Date();
  const recent = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const from = range === "year" && yearStart < recent ? yearStart : recent;
  return from.toISOString().slice(0, 10);
}

export default function RunCalendarPage({ searchParams }) {
  return (
    <Suspense fallback={<RunCalendarSkeleton />}>
      <RunCalendarContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RunCalendarContent({ searchParams }) {
  // Access, page lock and lookup tables don't depend on each other: load them together.
  // Same rule as the Run Master List: every Project Map user sees every run.
  // The other pages' cards decide which page buttons the view shows.
  const [access, hasPageAccess, setup, canOpenMap, canOpenRunMaster] = await Promise.all([
    loadProjectStatusTabAccess(),
    loadPageAccess(PROJECT_MAP_PAGES.calendar),
    loadRunCalendarSetup(),
    loadPageAccess(PROJECT_MAP_PAGES.map),
    loadPageAccess(PROJECT_MAP_PAGES.runMaster),
  ]);
  if (access.reason !== "ok") {
    return <ProjectMapAccessBlocked access={access} page="Run Calendar" />;
  }
  // Only roles that have this page's card (also when the address is typed in).
  if (!hasPageAccess) {
    return <ProjectMapAccessBlocked access={{ ...access, reason: "no-page-access" }} page="Run Calendar" />;
  }
  if (access.allowedRunStatusNames.length === 0) {
    return <ProjectMapAccessBlocked access={{ ...access, reason: "no-run-mapping" }} page="Run Calendar" />;
  }

  // Open runs: every one (Behind / On Track and the list need them all).
  // Completed / cancelled runs: only from finishedFrom on — this month and the
  // two before it, or this whole year with ?range=year. Both load together.
  const finishedRange = (await searchParams)?.range === "year" ? "year" : "recent";
  const finishedFrom = finishedRunsFrom(finishedRange);
  const [openRuns, finishedRuns] = await Promise.all([
    loadRuns(access, { statusScope: "open" }),
    loadRuns(access, { statusScope: "finished", runDateFrom: finishedFrom }),
  ]);
  const runs = [...openRuns, ...finishedRuns];
  return (
    <RunCalendarView
      runs={runs}
      runStatuses={setup.runStatuses || []}
      statuses={setup.projectStatuses || []}
      paymentMethods={setup.paymentMethods || []}
      states={setup.states || []}
      editAccess={{ editableRunStatusNames: access.editableRunStatusNames, canCommentAndAttach: access.canCommentAndAttach, user: { userId: access.user?.userId } }}
      pageAccess={{ map: canOpenMap, runMaster: canOpenRunMaster }}
      finishedRange={finishedRange}
      finishedFrom={finishedFrom}
    />
  );
}
