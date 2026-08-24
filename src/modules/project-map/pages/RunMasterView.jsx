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

import { useState, useMemo, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo, faCheckCircle, faPrint, faMoneyCheckDollar, faPen } from "@fortawesome/free-solid-svg-icons";
import { Button, Modal, toastError, TableZ } from "@/shared/components/ui";
import { resolveRunStatusOptions, getRunStatusColor, formatProjectDescriptionForDisplay, stripTownshipLabel, parseStateRoute } from "../data/projectMap.data";
import { loadRunDetails, loadRuns, loadPaidSheet } from "../data/projectMap.actions";
import { generateRunManifestPrint } from "../utils/printRunManifest";
import { generatePaidSheetPrint } from "../utils/printPaidSheet";
import { computeRunSegmentData } from "../utils/runSegments";
import RunForm from "../components/RunForm";
import PaidSheetForm from "../components/PaidSheetForm";
import "./run-master.css";

export default function RunMasterView({ runs = [], origins = [], statuses = [], runStatuses = [], paymentMethods = [], states = [] }) {
  const router = useRouter();

  // ---- State ----
  const [localRuns, setLocalRuns] = useState(runs);
  const [showRunForm, setShowRunForm] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPaidSheetForm, setShowPaidSheetForm] = useState(false);
  const [editingRunDetail, setEditingRunDetail] = useState(null);
  const [printingRunId, setPrintingRunId] = useState(null);
  const [expandedRunId, setExpandedRunId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState("run");

  // ---- Helpers ----
  const refreshRuns = useCallback(async () => {
    try {
      const fresh = await loadRuns();
      setLocalRuns(fresh);
    } catch (err) {
      console.error("[RunMasterView] Failed to refresh runs:", err);
    }
  }, []);

  const handleRowClick = useCallback(async (row) => {
    if (expandedRunId === row.id) {
      setExpandedRunId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedRunId(row.id);
    setExpandedDetail(null);
    setActiveDetailTab("run");
    setExpandedLoading(true);
    try {
      const detail = await loadRunDetails(row.id);
      setExpandedDetail(detail);
    } catch (err) {
      console.error("[RunMasterView] Failed to load run detail:", err);
      toastError(err?.message || "Failed to load run details.", "Run Master List");
    } finally {
      setExpandedLoading(false);
    }
  }, [expandedRunId]);

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

  // Status → pipeline position, driven by proj_s_run_status.display_order
  // (runStatuses is already sorted by display_order server-side).
  const statusOrder = useMemo(() => {
    const map = new Map();
    runStatuses.forEach((s, idx) => map.set(s.status_name, idx));
    return map;
  }, [runStatuses]);

  const installerOptions = useMemo(() => {
    const names = new Set();
    localRuns.forEach((run) => {
      const name = run.team_assigned ? String(run.team_assigned).trim() : "";
      if (name) names.add(name);
    });
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }));
  }, [localRuns]);

  // Preprocess runs so TableZ's internal search can match on
  // computed fields (origin display, stops count, revenue) via
  // getNestedValue — TableZ searches visible column keys, not render output.
  const tableData = useMemo(() => {
    return localRuns
      .map((run) => ({
        ...run,
        _originDisplay: getOriginName(run),
        _stopsCount: getRunStopsCount(run),
        _revenue: getRunRevenue(run),
      }))
      .sort((a, b) => {
        const orderA = statusOrder.get(a.status) ?? Number.MAX_SAFE_INTEGER;
        const orderB = statusOrder.get(b.status) ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.run_date || 0) - new Date(a.run_date || 0);
      });
  }, [localRuns, getOriginName, getRunStopsCount, getRunRevenue, statusOrder]);

  // ---- Actions ----
  const handleAddRun = useCallback(() => {
    setShowRunForm(true);
  }, []);

  const handleRunSaved = useCallback(() => {
    setShowRunForm(false);
    refreshRuns();
  }, [refreshRuns]);

  const handleCloseRunForm = useCallback(() => {
    setShowRunForm(false);
  }, []);

  const handleOpenPaidSheet = useCallback(async (run) => {
    try {
      const detail = await loadRunDetails(run.id);
      if (!detail?.run) {
        toastError("Unable to load run details.", "Paid Sheet");
        return;
      }
      setEditingRunDetail(detail);
      setShowPaidSheetForm(true);
    } catch (err) {
      toastError(err?.message || "Failed to load run.", "Paid Sheet");
    }
  }, []);

  const handlePaidSheetSaved = useCallback(() => {
    setShowPaidSheetForm(false);
    setEditingRunDetail(null);
    refreshRuns();
  }, [refreshRuns]);

  const handleClosePaidSheetForm = useCallback(() => {
    setShowPaidSheetForm(false);
    setEditingRunDetail(null);
  }, []);

  const handlePrintPaidSheet = useCallback(async (run) => {
    setPrintingRunId(run.id);
    try {
      const detail = await loadRunDetails(run.id);
      if (!detail?.run) {
        toastError("Unable to load run details for printing.", "Print");
        return;
      }
      const paidSheet = await loadPaidSheet(run.id); // returns null if never saved — that's fine
      generatePaidSheetPrint(detail.run, detail.projects || [], paidSheet);
    } catch (err) {
      console.error("[RunMasterView] Paid sheet print failed:", err);
      toastError(err?.message || "Failed to print paid sheet.", "Print");
    } finally {
      setPrintingRunId(null);
    }
  }, []);

  const canPrintPaidSheet = useCallback((run) => {
    const stops = run.proj_t_run_projects || [];
    if (!run.team_assigned || stops.length === 0) return false;
    return stops.every((rp) => rp.proj_t_projects?.payment_method_type != null);
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

  const formatDateTime = (val) => {
    if (!val) return "—";
    try {
      return new Date(val).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  const renderDetail = useCallback((row) => {
    const tabButtonStyle = (active) => ({
      padding: "6px 14px",
      fontSize: "12px",
      fontWeight: 600,
      border: "none",
      borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
      background: "transparent",
      color: active ? "#1e293b" : "#64748b",
      cursor: "pointer",
    });

    if (expandedLoading) {
      return (
        <div style={{ padding: "16px", fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
          Loading run details...
        </div>
      );
    }

    const detailRun = expandedDetail?.run || row;
    const detailProjects = expandedDetail?.projects || [];

    const fieldBox = (label, value, fullWidth = false) => (
      <div key={label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "8px 10px", gridColumn: fullWidth ? "1 / -1" : undefined }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "3px" }}>{label}</div>
        <div style={{ fontSize: "12px", color: "#1e293b", fontWeight: 600, whiteSpace: "pre-wrap" }}>{value}</div>
      </div>
    );

    const sectionLabel = (text) => (
      <div style={{ fontSize: "10px", fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px", marginTop: "14px" }}>{text}</div>
    );

    return (
      <div style={{ padding: "12px 16px", background: "#f8fafc" }}>
        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid #e2e8f0", marginBottom: "12px" }}>
          <button style={tabButtonStyle(activeDetailTab === "run")} onClick={() => setActiveDetailTab("run")}>
            Run Data
          </button>
          <button style={tabButtonStyle(activeDetailTab === "projects")} onClick={() => setActiveDetailTab("projects")}>
            Project Data ({detailProjects.length})
          </button>
        </div>

        {activeDetailTab === "run" ? (
          <div>
            <div style={{ marginTop: 0 }}>{sectionLabel("Identity")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {fieldBox("Run Name", detailRun.run_name || "—")}
              {fieldBox("Run Code", detailRun.run_code || "—")}
              {fieldBox("Status", detailRun.status || "Draft")}
            </div>

            {sectionLabel("Schedule & Origin")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {fieldBox("Run Date", formatDate(detailRun.run_date))}
              {fieldBox("Installer", detailRun.team_assigned || "—")}
              {fieldBox("Origin", getOriginName(detailRun))}
              {fieldBox("Origin Address", detailRun.proj_s_origin_addresses?.formatted_address || detailRun.proj_s_origin_addresses?.address_line_1 || "—", true)}
            </div>

            {sectionLabel("Estimates")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              {fieldBox("Est. Distance", detailRun.estimated_distance != null ? `${(detailRun.estimated_distance / 1609.344).toFixed(1)} mi` : "—")}
              {fieldBox("Est. Mileage", detailRun.estimated_mileage != null ? `${Number(detailRun.estimated_mileage).toFixed(1)} mi` : "—")}
              {fieldBox("Est. Duration", detailRun.estimated_duration != null ? `${Math.round(Number(detailRun.estimated_duration) / 60)} min` : "—")}
              {fieldBox("Est. Subtotal", formatCurrency(detailRun.estimated_subtotal))}
            </div>

            {sectionLabel("Record")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
              {fieldBox("Created At", formatDateTime(detailRun.created_at))}
              {fieldBox("Updated At", formatDateTime(detailRun.updated_at))}
            </div>

            {sectionLabel("Remarks")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
              {fieldBox("Remarks", detailRun.notes || "—", true)}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {detailProjects.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", padding: "8px" }}>No stops assigned to this run.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>Stop</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>Address</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>Status</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>Building / Dimensions</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>Order Received</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>Arrival Window</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>Invoice #</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>Payment</th>
                    <th style={{ textAlign: "right", padding: "6px 10px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {detailProjects.map((rp, idx) => {
                    const proj = rp.proj_t_projects || {};
                    const address = stripTownshipLabel(proj.formatted_address) || [proj.address_line_1, stripTownshipLabel(proj.city), proj.state, proj.postal_code].filter(Boolean).join(", ") || "—";
                    const paymentMethodDisplay = proj.proj_s_payment_method?.method_description || proj.proj_s_payment_method?.method_name || "—";
                    const hasNotes = proj.project_notes || proj.paid_sheet_notes;
                    const cellStyle = { padding: "8px 10px", fontSize: "11px", color: "#1e293b", verticalAlign: "top", borderBottom: hasNotes ? "none" : "1px solid #f1f5f9" };

                    return (
                      <Fragment key={proj.id || idx}>
                        <tr>
                          <td style={cellStyle}>
                            <div style={{ fontWeight: 700 }}>{idx + 1}</div>
                            <div style={{ color: "#64748b" }}>{proj.client_name || "Untitled"}</div>
                          </td>
                          <td style={{ ...cellStyle, maxWidth: "180px" }}>{address}</td>
                          <td style={cellStyle}>{proj.proj_s_project_status?.status_name || "—"}</td>
                          <td style={cellStyle}>
                            <div>{proj.proj_s_building_categories?.building_category_name || "—"}</div>
                            <div style={{ color: "#64748b" }}>{formatProjectDescriptionForDisplay(proj.dimension) || "—"}</div>
                          </td>
                          <td style={cellStyle}>{formatDate(proj.order_received_at)}</td>
                          <td style={cellStyle}>
                            <div>{formatDateTime(proj.install_start)}</div>
                            <div style={{ color: "#64748b" }}>to {formatDateTime(proj.install_end)}</div>
                          </td>
                          <td style={cellStyle}>{proj.invoice_number || "—"}</td>
                          <td style={cellStyle}>
                            <div>{paymentMethodDisplay}</div>
                            {proj.payment_method_number && <div style={{ color: "#64748b" }}>Ref #{proj.payment_method_number}</div>}
                          </td>
                          <td style={{ ...cellStyle, textAlign: "right", fontWeight: 700, color: "#16a34a" }}>{formatCurrency(proj.project_subtotal)}</td>
                        </tr>
                        {hasNotes && (
                          <tr key={`${proj.id || idx}-notes`}>
                            <td colSpan={9} style={{ padding: "0 10px 8px", fontSize: "11px", color: "#1e293b", borderBottom: "1px solid #f1f5f9" }}>
                              {proj.project_notes && <div style={{ whiteSpace: "pre-wrap" }}><strong>Notes:</strong> {proj.project_notes}</div>}
                              {proj.paid_sheet_notes && <div style={{ whiteSpace: "pre-wrap", marginTop: proj.project_notes ? "4px" : 0 }}><strong>Paid Sheet Notes:</strong> {proj.paid_sheet_notes}</div>}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    );
  }, [expandedLoading, expandedDetail, activeDetailTab, getOriginName, formatDate, formatCurrency]);

  // ---- TableZ config ----
  const columns = useMemo(
    () => [
      {
        key: "run_name",
        label: "Run Name",
        sortable: true,
        render: (row) => row.run_name,
      },
      {
        key: "run_code",
        label: "Run Code",
        sortable: true,
        render: (row) => row.run_code || "—",
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
        key: "dot_number",
        label: "DOT#",
        sortable: true,
        render: (row) => row.dot_number || "—",
      },
      {
        key: "state_route",
        label: "State",
        sortable: true,
        render: (row) => parseStateRoute(row.state_route).join(", ") || "—",
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
        multiple: true,
        options: resolveRunStatusOptions(runStatuses).map((s) => ({ label: s, value: s })),
      },
      {
        key: "origin_id",
        label: "Origin",
        type: "select",
        multiple: true,
        options: origins.map((o) => ({ label: o.origin_name, value: String(o.id) })),
      },
      {
        key: "team_assigned",
        label: "Installer",
        type: "select",
        multiple: true,
        options: installerOptions,
      },
      {
        key: "run_date",
        label: "Run Date",
        type: "daterange",
      },
    ],
    [runStatuses, origins, installerOptions]
  );

  const actions = useMemo(
    () => [
      {
        key: "edit-run",
        label: "Edit",
        icon: "pen",
        type: "secondary",
        onClick: (row) => handleOpenPaidSheet(row),
      },
      {
        key: "print-manifest",
        label: "Print Manifest",
        icon: "print",
        type: "primary",
        disabled: (row) => printingRunId === row.id,
        onClick: (row) => handlePrintManifest(row),
      },
      {
        key: "print-paid-sheet",
        label: "Print Paid Sheet",
        icon: "money-check-dollar",
        type: "primary",
        visible: (row) => canPrintPaidSheet(row),
        disabled: (row) => printingRunId === row.id,
        onClick: (row) => handlePrintPaidSheet(row),
      },
    ],
    [handleOpenPaidSheet, handlePrintManifest, handlePrintPaidSheet, canPrintPaidSheet, printingRunId]
  );

  // ---- Render ----
  return (
    <main className="container py-4 run-master-page">
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
        <button
          onClick={() => setShowInfoModal(true)}
          title="How this page works"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            border: "1px solid #e2e8f0",
            background: "#fff",
            color: "#3b82f6",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          <FontAwesomeIcon icon={faCircleInfo} />
        </button>
      </div>

      {/* TableZ replaces the hand-rolled filters + table */}
      <TableZ
        data={tableData}
        columns={columns}
        rowIdKey="id"
        actions={actions}
        filterConfig={filterConfig}
        searchPlaceholder="Search by run name, run code, origin, or installer..."
        emptyMessage="No runs found."
        selectedRowId={expandedRunId}
        onRowClick={handleRowClick}
        renderDetail={renderDetail}
      />

      {/* Run Form Modal — only used for creating a new run */}
      <RunForm
        show={showRunForm}
        mode="add"
        run={null}
        origins={origins}
        runStatuses={runStatuses}
        onClose={handleCloseRunForm}
        onSaved={handleRunSaved}
      />

      {/* Paid Sheet Modal — opens via the row Edit action */}
      <PaidSheetForm
        show={showPaidSheetForm}
        run={editingRunDetail?.run}
        projects={editingRunDetail?.projects || []}
        paymentMethods={paymentMethods}
        states={states}
        onClose={handleClosePaidSheetForm}
        onSaved={handlePaidSheetSaved}
      />

      <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)} title="How the Run Master List works">
        <div style={{ fontSize: "13px", color: "#1e293b", lineHeight: 1.6 }}>
          <p style={{ margin: "0 0 14px" }}>
            This page lists every run so you can search, filter, and print from one place.
          </p>

          <div style={{ display: "flex", gap: "10px", marginBottom: "10px", padding: "10px", background: "#eff6ff", borderRadius: "6px", border: "1px solid #2563EB" }}>
            <FontAwesomeIcon icon={faPen} style={{ color: "#2563eb", marginTop: "2px" }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: "2px" }}>Edit</div>
              <div style={{ color: "#64748b", marginBottom: "6px" }}>
                Opens the Paid Sheet form. It's where you record everything needed to pay the installer and print the Paid Sheet:
              </div>
              <div style={{ marginBottom: "5px" }}>
                <strong>Installer</strong> <span style={{ color: "#64748b" }}>— who's assigned to run this route.</span>
              </div>
              <div style={{ marginBottom: "5px" }}>
                <strong>Route Info</strong> <span style={{ color: "#64748b" }}>— phone number, DOT#, state, and extra notes.</span>
              </div>
              <div style={{ marginBottom: "5px" }}>
                <strong>Payment Status & Signatures</strong> <span style={{ color: "#64748b" }}>— mark the run as paid (reveals Paid Date and Reference #), plus PSB Representative name and signature dates.</span>
              </div>
              <div>
                <strong>Stop-by-stop table</strong> <span style={{ color: "#64748b" }}>— pick a Payment Method, add a Ref #, and leave notes per stop. Order #, Description, and Amount are shown for reference.</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "10px", padding: "10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #7C3AED" }}>
            <FontAwesomeIcon icon={faPrint} style={{ color: "#7c3aed", marginTop: "2px" }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: "2px" }}>Print Manifest</div>
              <div style={{ color: "#64748b" }}>Always available. Prints the route sheet for a run's stops.</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "6px", padding: "10px", background: "#f0fdfa", borderRadius: "6px", border: "1px solid #0D9488" }}>
            <FontAwesomeIcon icon={faMoneyCheckDollar} style={{ color: "#0d9488", marginTop: "2px" }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: "2px" }}>Print Paid Sheet</div>
              <div style={{ color: "#64748b", marginBottom: "6px" }}>
                This button only shows up once a run is ready. If you don't see it on a run, check:
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                <FontAwesomeIcon icon={faCheckCircle} style={{ color: "#0d9488", fontSize: "11px" }} />
                <span>An <strong>Installer</strong> has been assigned to the run</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <FontAwesomeIcon icon={faCheckCircle} style={{ color: "#0d9488", fontSize: "11px" }} />
                <span>Every stop on the run has a <strong>payment method</strong> set</span>
              </div>
              <div style={{ color: "#64748b", fontStyle: "italic" }}>
                Both are set from the same place — click <strong>Edit</strong> on a run to open its Paid Sheet.
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </main>
  );
}
