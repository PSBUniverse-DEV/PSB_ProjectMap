/**
 * Client Component — RunMasterView.jsx
 *
 * Runs in the browser. All UI, hooks, and interaction go here.
 *
 * Displays a table of all runs using the shared TableZ component, with
 * add/edit via the existing RunForm, and print-manifest support via the
 * shared generateRunManifestPrint utility.
 */
"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toastError, TableZ } from "@/shared/components/ui";
import { resolveRunStatusOptions, getRunStatusColor } from "../data/projectMap.data";
import { loadRunDetails, loadRuns } from "../data/projectMap.actions";
import { generateRunManifestPrint } from "../utils/printRunManifest";
import { computeRunSegmentData } from "../utils/runSegments";
import RunForm from "../components/RunForm";

export default function RunMasterView({ runs = [], origins = [], statuses = [], runStatuses = [] }) {
  const router = useRouter();

  // ---- State ----
  const [localRuns, setLocalRuns] = useState(runs);
  const [showRunForm, setShowRunForm] = useState(false);
  const [editingRun, setEditingRun] = useState(null);
  const [printingRunId, setPrintingRunId] = useState(null);

  // ---- Helpers ----
  const refreshRuns = useCallback(async () => {
    try {
      const fresh = await loadRuns();
      setLocalRuns(fresh);
    } catch (err) {
      console.error("[RunMasterView] Failed to refresh runs:", err);
    }
  }, []);

  const getOriginName = useCallback(
    (run) => {
      if (!run.proj_s_origin_addresses) return "—";
      return run.proj_s_origin_addresses.origin_name || run.proj_s_origin_addresses.address_line_1 || "—";
    },
    []
  );

  const getRunStopsCount = useCallback(
    (run) => run.stops ?? 0,
    []
  );

  const getRunRevenue = useCallback(
    (run) => {
      if (Array.isArray(run.runs_stops)) {
        return run.runs_stops.reduce((sum, rp) => {
          const proj = rp.proj_t_projects || {};
          return sum + (Number(proj.project_subtotal) || 0);
        }, 0);
      }
      return run.estimated_subtotal || 0;
    },
    []
  );

  // Preprocess runs so TableZ's internal search can match on
  // computed fields (origin display, stops count, revenue) via
  // getNestedValue — TableZ searches visible column keys, not render output.
  const tableData = useMemo(() => {
    return localRuns.map((run) => ({
      ...run,
      _originDisplay: getOriginName(run),
      _stopsCount: getRunStopsCount(run),
      _revenue: getRunRevenue(run),
    }));
  }, [localRuns, getOriginName, getRunStopsCount, getRunRevenue]);

  // ---- Actions ----
  const handleAddRun = useCallback(() => {
    setEditingRun(null);
    setShowRunForm(true);
  }, []);

  const handleEditRun = useCallback((run) => {
    setEditingRun(run);
    setShowRunForm(true);
  }, []);

  const handleRunSaved = useCallback(() => {
    setShowRunForm(false);
    setEditingRun(null);
    refreshRuns();
  }, [refreshRuns]);

  const handleCloseRunForm = useCallback(() => {
    setShowRunForm(false);
    setEditingRun(null);
  }, []);

  const handlePrintManifest = useCallback(async (run) => {
    setPrintingRunId(run.id);
    try {
      const detail = await loadRunDetails(run.id);
      if (!detail?.run) {
        toastError("Unable to load run details for printing.", "Print");
        return;
      }
      const projects = detail.projects || [];
      let runSegmentData = null;
      try {
        runSegmentData = await computeRunSegmentData(detail.run, projects);
      } catch (err) {
        console.error("[RunMasterView] Segment calculation failed:", err);
      }
      generateRunManifestPrint(detail.run, projects, runSegmentData);
    } catch (err) {
      console.error("[RunMasterView] Print failed:", err);
      toastError(err?.message || "Failed to print manifest.", "Print");
    } finally {
      setPrintingRunId(null);
    }
  }, []);

  const formatCurrency = (value) => {
    if (value == null) return "—";
    return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // ---- TableZ config ----
  const columns = useMemo(
    () => [
      {
        key: "run_name",
        label: "Run Code",
        sortable: true,
        render: (row) => row.run_name || `Run #${row.run_number || "?"}`,
      },
      {
        key: "_originDisplay",
        label: "Origin",
        sortable: false,
        render: (row) => getOriginName(row),
      },
      {
        key: "run_date",
        label: "Run Date",
        sortable: true,
        render: (row) => formatDate(row.run_date),
      },
      {
        key: "team_assigned",
        label: "Installer",
        sortable: true,
        render: (row) => row.team_assigned || "—",
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (row) => {
          const color = getRunStatusColor(row.status, runStatuses);
          return (
            <span
              style={{
                display: "inline-block",
                padding: "1px 8px",
                borderRadius: "10px",
                fontSize: "10px",
                fontWeight: 600,
                background: `${color}20`,
                color: color,
                border: `1px solid ${color}40`,
              }}
            >
              {row.status || "Draft"}
            </span>
          );
        },
      },
      {
        key: "_stopsCount",
        label: "Stops",
        sortable: false,
        align: "right",
        render: (row) => row._stopsCount,
      },
      {
        key: "_revenue",
        label: "Revenue",
        sortable: false,
        align: "right",
        render: (row) => formatCurrency(row._revenue),
      },
    ],
    [getOriginName, formatDate]
  );

  const filterConfig = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: resolveRunStatusOptions(runStatuses).map((s) => ({ label: s, value: s })),
      },
    ],
    [runStatuses]
  );

  const actions = useMemo(
    () => [
      {
        key: "edit-run",
        label: "Edit",
        icon: "pen",
        type: "secondary",
        onClick: (row) => handleEditRun(row),
      },
      {
        key: "print-manifest",
        label: "Print Manifest",
        icon: "print",
        type: "primary",
        disabled: (row) => printingRunId === row.id,
        onClick: (row) => handlePrintManifest(row),
      },
    ],
    [handleEditRun, handlePrintManifest, printingRunId]
  );

  // ---- Render ----
  return (
    <main className="container py-4">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
            Run Master List
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
            View, filter, and manage all runs.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => router.push("/project-map")}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              borderRadius: "3px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#334155",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            ← Back to Map
          </button>
          <button
            onClick={handleAddRun}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              borderRadius: "3px",
              border: "none",
              background: "#16a34a",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            + New Run
          </button>
        </div>
      </div>

      {/* TableZ replaces the hand-rolled filters + table */}
      <TableZ
        data={tableData}
        columns={columns}
        rowIdKey="id"
        actions={actions}
        filterConfig={filterConfig}
        searchPlaceholder="Search by run code, origin, or installer..."
        emptyMessage="No runs found."
      />

      {/* Run Form Modal */}
      <RunForm
        show={showRunForm}
        mode={editingRun ? "edit" : "add"}
        run={editingRun}
        origins={origins}
        runStatuses={runStatuses}
        onClose={handleCloseRunForm}
        onSaved={handleRunSaved}
      />
    </main>
  );
}
