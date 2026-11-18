"use client";


import { useMemo, useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faChevronDown, faGripVertical, faRotate } from "@fortawesome/free-solid-svg-icons";
import { StatusBadge, FileAttachments } from "@/shared/components/ui";
import { formatProjectDescriptionForDisplay, getRunStatusColor, resolveRunStatusOptions, stripTownshipLabel, PROJECT_FILE_MAX_BYTES, PROJECT_FILE_TYPES, getProjectAmountDisplay, splitRunAmounts, runStatusKeyByName, formatDisplayDate, formatArrivalWindow } from "../data/projectMap.data";
import { generateRunManifestPrint } from "../utils/printRunManifest";
import RunStatusHistory from "./RunStatusHistory";
import { loadFiles, createFileUpload, saveUploadedFile, getFileUrl, deleteFile } from "../data/projectMap.actions";

function formatDistance(meters) {
  if (meters == null) return "—";
  return `${(meters / 1609.344).toFixed(1)} mi`;
}

function formatDuration(seconds) {
  if (seconds == null) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs} hr ${rem} min`;
}

function formatCurrency(value) {
  if (value == null) return "—";
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMileage(miles) {
  if (miles == null) return "—";
  return `${Number(miles).toFixed(1)} mi`;
}

// Colours for the Confirmation chip when it has a value.
const CONFIRMATION_CHIP_TONE = { background: "#fffbeb", border: "#fde68a", color: "#92400e" };

// Small chip on a stop card. With a value it reads "Label value"; empty, it
// reads "+ Label" for editors and is hidden for view-only users. With onClick
// it is a button that opens that field's editor. Values wrap instead of being cut off.
function StopChip({ label, value, onClick, title, tone = null }) {
  const empty = value == null || value === "";
  if (empty && !onClick) return null;
  const style = {
    padding: "2px 7px",
    borderRadius: "6px",
    fontFamily: "inherit",
    fontSize: "10px",
    lineHeight: 1.5,
    textAlign: "left",
    overflowWrap: "anywhere",
    cursor: onClick ? "pointer" : "default",
    border: empty ? "1px dashed #cbd5e1" : `1px solid ${tone ? tone.border : "#e2e8f0"}`,
    background: empty ? "#fff" : (tone ? tone.background : "#f8fafc"),
    color: empty ? "#475569" : (tone ? tone.color : "#0f172a"),
  };
  const content = empty ? `+ ${label}` : <>{label} <strong>{value}</strong></>;
  if (!onClick) return <span title={title} style={style}>{content}</span>;
  return <button type="button" onClick={onClick} title={title} style={style}>{content}</button>;
}

export default function RunDetailPanel({ run, runProjects = [], runSegmentData = null, onClose, onEdit, onDelete, onRemoveProject, onReorderStops, onRecalculate, recalculating = false, onEditStopNote, onEditStopDate, onEditStopInvoice, onEditStopConfirmation, onEditProjectPrice, onProjectUpdated, isLoading = false, runStatuses = [], onStatusChange, readOnly = false, filesReadOnly = false, canDeleteFile = null, routeStale = false }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(run?.status || "");
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    setIsEditingStatus(false);
    setPendingStatus(run?.status || "");
  }, [run?.id]);

  const originName = run?.proj_s_origin_addresses?.origin_name || "No Origin";
  const hasStops = runProjects.length > 0;
  // After a manual reorder the saved distance/time belong to the old order:
  // show "—" until Recalculate Run (routeStale). Revenue/repairs don't depend on order.
  const totalDistance = hasStops && !routeStale ? formatDistance(run?.estimated_distance) : "—";
  const totalMileage = hasStops && !routeStale ? formatMileage(run?.estimated_mileage) : "—";
  const totalDuration = hasStops && !routeStale ? formatDuration(run?.estimated_duration) : "—";
  // Revenue excludes repairs; repairs are totalled on their own (never revenue).
  // Computed from the stops so it is right even before the saved estimate refreshes.
  const runAmounts = useMemo(() => splitRunAmounts(runProjects), [runProjects]);
  const totalSubtotal = hasStops ? formatCurrency(runAmounts.revenue) : "$0.00";
  const totalRepairs = runAmounts.repairs > 0 ? formatCurrency(runAmounts.repairs) : null;
  const stopSubtotals = useMemo(() => {
    return runProjects.map((rp) => {
      const proj = rp.proj_t_projects || {};
      return Number(proj.project_subtotal) || 0;
    });
  }, [runProjects]);

  const totalRevenue = useMemo(() => stopSubtotals.reduce((s, v) => s + v, 0), [stopSubtotals]);

  const routeStats = useMemo(() => {
    if (!runSegmentData?.segments || runSegmentData.segments.length === 0) return null;
    const segs = runSegmentData.segments;
    const distances = segs.map((s) => s.distance);
    return {
      totalStops: runProjects.length,
      avgDuration: segs.reduce((s, seg) => s + seg.duration, 0) / segs.length,
      longestLeg: Math.max(...distances),
      shortestLeg: Math.min(...distances),
    };
  }, [runSegmentData, runProjects]);

  const status = run?.status || "";

  const handleSaveStatus = async () => {
    if (pendingStatus === status) {
      setIsEditingStatus(false);
      return;
    }
    setSavingStatus(true);
    try {
      await onStatusChange?.(pendingStatus);
      setIsEditingStatus(false);
    } catch (err) {
      // Stay in editing state on failure so the user can retry — parent
      // surfaces the actual error via toast.
    } finally {
      setSavingStatus(false);
    }
  };

  const actionButtons = useMemo(() => {
    const print = () => generateRunManifestPrint(run, runProjects, routeStale ? null : runSegmentData);
    const btns = readOnly ? [] : [{ label: "Edit run", onClick: onEdit, variant: "secondary" }];
    // Same print for every status; a run in progress gets the quieter button style.
    const inProgress = runStatusKeyByName(runStatuses, status) === "in_progress";
    btns.push({ label: "Print record", onClick: print, variant: inProgress ? "secondary" : "primary" });
    return btns;
  }, [status, onEdit, run, runProjects, runSegmentData, runStatuses, readOnly, routeStale]);
  if (!run) return null;

  // Shared looks for the cards in this panel (approved drawer mockup).
  const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px" };
  const cardTitle = { margin: 0, fontSize: "11px", fontWeight: 700, color: "#475569", letterSpacing: "0.04em", textTransform: "uppercase" };
  const infoRow = { display: "flex", justifyContent: "space-between", gap: "12px" };
  const infoLabel = { color: "#64748b", flexShrink: 0 };
  const infoValue = { fontWeight: 600, color: "#0f172a", textAlign: "right", overflowWrap: "anywhere" };
  const statusColor = getRunStatusColor(status, runStatuses);
  // original_run_date is the first date the run was given; the chip shows only when the run was moved.
  const wasMoved = Boolean(run.run_date && run.original_run_date && String(run.run_date).slice(0, 10) !== String(run.original_run_date).slice(0, 10));
  const originAddress = stripTownshipLabel(run.proj_s_origin_addresses?.formatted_address || run.proj_s_origin_addresses?.address_line_1 || "");
  const subtitle = [run.run_code, formatDisplayDate(run.run_date, "No date")].filter(Boolean).join(" · ");
  // Key numbers. Distance / drive time / mileage read "—" while the route is stale.
  const kpis = [
    { label: "Stops", value: String(runProjects.length) },
    { label: "Distance", value: totalDistance },
    { label: "Drive time", value: totalDuration },
    { label: "Mileage", value: totalMileage },
    { label: "Revenue", value: totalSubtotal, tone: { background: "#f0fdf4", border: "#bbf7d0", label: "#166534", value: "#15803d" } },
    ...(totalRepairs ? [{ label: "Repairs", value: totalRepairs, tone: { background: "#fef2f2", border: "#fecaca", label: "#991b1b", value: "#b91c1c" } }] : []),
  ];

  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: "360px", height: "100%", background: "#f8fafc", borderLeft: "1px solid #cbd5e1", boxShadow: "-4px 0 12px rgba(0,0,0,0.08)", zIndex: 10, display: "flex", flexDirection: "column", fontSize: "12px", color: "#0f172a" }}>
      {/* Header: status, which run, when */}
      <div style={{ padding: "14px 16px 12px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {isEditingStatus ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748b" }}>Set as:</span>
              <select
                value={pendingStatus}
                onChange={(e) => setPendingStatus(e.target.value)}
                disabled={savingStatus}
                style={{ fontSize: "11px", fontWeight: 600, padding: "2px 6px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a" }}
              >
                {resolveRunStatusOptions(runStatuses).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={savingStatus || pendingStatus === status}
                style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", border: "none", background: savingStatus || pendingStatus === status ? "#cbd5e1" : "#16a34a", color: "#fff", cursor: savingStatus || pendingStatus === status ? "not-allowed" : "pointer" }}
              >
                {savingStatus ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => { setIsEditingStatus(false); setPendingStatus(status); }}
                disabled={savingStatus}
                style={{ fontSize: "11px", fontWeight: 600, padding: "2px 6px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", color: "#64748b", cursor: savingStatus ? "not-allowed" : "pointer" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={readOnly ? undefined : () => { setPendingStatus(status); setIsEditingStatus(true); }}
              disabled={readOnly}
              title={readOnly ? "View only" : "Click to change status"}
              aria-label={readOnly ? `Status: ${status}` : `Status: ${status}. Click to change`}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "2px 9px", borderRadius: "999px", background: `${statusColor}1a`, color: statusColor, border: `1px solid ${statusColor}55`, fontFamily: "inherit", fontSize: "11px", fontWeight: 600, cursor: readOnly ? "default" : "pointer" }}
            >
              <span aria-hidden="true" style={{ width: "7px", height: "7px", borderRadius: "50%", background: statusColor }} />
              {status || "No status"}
              {!readOnly && <FontAwesomeIcon icon={faChevronDown} aria-hidden="true" style={{ fontSize: "9px" }} />}
            </button>
          )}
          {wasMoved && (
            <span title="This run was moved to a new date." style={{ padding: "2px 8px", borderRadius: "999px", background: "#fef3c7", color: "#92400e", fontSize: "11px", fontWeight: 600 }}>
              Moved from {formatDisplayDate(run.original_run_date)}
            </span>
          )}
          {readOnly && (
            <span
              title="Your Project Map roles cannot change runs in this status."
              style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1px 8px" }}
            >
              View only
            </span>
          )}
          <button type="button" onClick={onClose} aria-label="Close run details" title="Close" style={{ marginLeft: "auto", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: "6px", background: "transparent", color: "#64748b", cursor: "pointer" }}>
            <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
          </button>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, lineHeight: 1.2, color: "#0f172a", overflowWrap: "anywhere" }}>{run.run_name || run.run_code || `Run #${run.run_number || "?"}`}</h2>
          <div style={{ marginTop: "2px", color: "#64748b" }}>{subtitle}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px", animation: "recalcSpin 0.8s linear infinite" }}>⟳</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>Loading Run Data...</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Fetching stops and calculating the route.</div>
          </div>
        ) : (
          <>
            {/* Key numbers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px" }}>
              {kpis.map((kpi) => (
                <div key={kpi.label} style={{ padding: "7px 8px", background: kpi.tone ? kpi.tone.background : "#fff", border: `1px solid ${kpi.tone ? kpi.tone.border : "#e2e8f0"}`, borderRadius: "8px", minWidth: 0 }}>
                  <div style={{ fontSize: "10px", color: kpi.tone ? kpi.tone.label : "#64748b" }}>{kpi.label}</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: kpi.tone ? kpi.tone.value : "#0f172a", overflowWrap: "anywhere" }}>{kpi.value}</div>
                </div>
              ))}
            </div>
            {routeStale && (
              <div style={{ padding: "8px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "11px", color: "#92400e", lineHeight: 1.4 }}>
                Stop order changed. Click <strong>Recalculate</strong> when you&apos;re done to redraw the route and update distance and time.
              </div>
            )}

            {/* Crew & origin */}
            <section style={card}>
              <h3 style={cardTitle}>Crew &amp; origin</h3>
              <div style={infoRow}>
                <span style={infoLabel}>Origin</span>
                <div style={{ textAlign: "right", minWidth: 0 }}>
                  <div style={infoValue}>{originName}</div>
                  {originAddress && <div style={{ fontSize: "10px", color: "#64748b", lineHeight: 1.4, overflowWrap: "anywhere" }}>{originAddress}</div>}
                </div>
              </div>
              {run.team_assigned && (
                <div style={infoRow}>
                  <span style={infoLabel}>Installer</span>
                  <span style={infoValue}>{run.team_assigned}</span>
                </div>
              )}
              {run.vehicle_assigned && (
                <div style={infoRow}>
                  <span style={infoLabel}>Vehicle</span>
                  <span style={infoValue}>{run.vehicle_assigned}</span>
                </div>
              )}
            </section>

            {/* Stops */}
            <section style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={cardTitle}>Stops · {runProjects.length}</h3>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={onRecalculate}
                    disabled={recalculating}
                    title="Redraw the route and update distance and time"
                    style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", color: recalculating ? "#94a3b8" : "#334155", fontFamily: "inherit", fontSize: "11px", fontWeight: 600, cursor: recalculating ? "not-allowed" : "pointer" }}
                  >
                    <FontAwesomeIcon icon={faRotate} aria-hidden="true" />
                    {recalculating ? "Recalculating..." : "Recalculate"}
                  </button>
                )}
              </div>
              {!readOnly && runProjects.length > 1 && (
                <div style={{ fontSize: "10px", color: "#64748b" }}>Drag a stop to change the order.</div>
              )}

              {runProjects.length === 0 ? (
                <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "8px", padding: "16px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>No Route Created</div>
                  <p style={{ fontSize: "11px", color: "#475569", margin: "0 0 8px", lineHeight: 1.5 }}>No projects have been assigned to this run.</p>
                  <p style={{ fontSize: "10px", color: "#64748b", margin: "0", lineHeight: 1.5 }}>Right-click a project marker and choose<br /><strong>{"\u201CAdd to Run\u201D"}</strong> to begin building this route.</p>
                </div>
              ) : (
                runProjects.map((rp, idx) => {
                  const proj = rp.proj_t_projects || {};
                  const segment = routeStale ? undefined : runSegmentData?.segments?.[idx];
                  const currentProjectStatus = proj.proj_s_project_status?.status_name || "—";
                  const previousProjectStatus = proj.previous_project_status?.status_name || null;
                  const projectStatusLabel = runStatusKeyByName(runStatuses, run.status) === "completed" && previousProjectStatus && currentProjectStatus !== previousProjectStatus
                    ? `${previousProjectStatus} -> ${currentProjectStatus}`
                    : currentProjectStatus;
                  const hasError = segment?.error;
                  const segDistance = hasError ? "Route unavailable" : formatDistance(segment?.distance);
                  const segDuration = hasError ? "" : formatDuration(segment?.duration);
                  const sub = formatCurrency(stopSubtotals[idx]);
                  const amount = getProjectAmountDisplay(proj);
                  const isRepair = amount.isRepair;
                  const isDragging = dragIndex === idx;
                  const isDragOver = dragOverIndex === idx;
                  // Date / invoice / confirmation / price are Runs-tab edits: only the run's status decides.
                  const canEditStop = !readOnly;
                  const arrivalText = formatArrivalWindow(proj.install_start, proj.install_end);
                  const confirmationName = proj.proj_s_confirmation_status?.status_name || (proj.confirmation_status_id != null ? "Set" : "");
                  const hasPrice = proj.project_subtotal != null;
                  const location = proj.city && proj.state ? `${stripTownshipLabel(proj.city)}, ${proj.state}` : stripTownshipLabel(proj.formatted_address) || "No address";
                  const priceStyle = { marginLeft: "auto", flexShrink: 0, padding: 0, border: "none", background: "none", fontFamily: "inherit", fontSize: "12px", fontWeight: 700, color: hasPrice ? amount.color : "#475569", whiteSpace: "nowrap", cursor: canEditStop ? "pointer" : "default" };
                  const noteStyle = { padding: 0, border: "none", background: "none", fontFamily: "inherit", textAlign: "left", fontSize: "10px", color: "#475569", fontStyle: "italic", whiteSpace: "pre-wrap", overflowWrap: "anywhere", cursor: canEditStop ? "pointer" : "default" };

                  return (
                    <div key={rp.id}>
                      {(segment || (idx === 0 && !routeStale)) && (
                        <div style={{ margin: "0 0 4px 30px", fontSize: "10px", color: hasError ? "#dc2626" : "#64748b", fontStyle: "italic" }}>{segDistance}{segDuration ? ` · ${segDuration}` : ""}</div>
                      )}
                      {/* Chromium cancels a drag when the dragged element changes during
                          dragstart, so the "dragging" highlight is applied one frame later.
                          The stop's index travels in the drag data; drop reads it from there. */}
                      <div
                        draggable={!readOnly}
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(idx)); requestAnimationFrame(() => setDragIndex(idx)); }}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOverIndex !== idx) setDragOverIndex(idx); }}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={(e) => { e.preventDefault(); const raw = e.dataTransfer.getData("text/plain"); const fromIndex = raw !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : dragIndex; if (fromIndex !== null && fromIndex !== idx) { onReorderStops?.(fromIndex, idx); } setDragIndex(null); setDragOverIndex(null); }}
                        onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                        style={{ display: "flex", gap: "8px", padding: "8px", background: isDragging ? "#fef3c7" : (isDragOver ? "#f0f9ff" : (isRepair ? "#fffafa" : "#fff")), border: `1px solid ${isDragOver ? "#93c5fd" : (isRepair ? "#fecaca" : "#e2e8f0")}`, borderRadius: "8px", cursor: readOnly ? "default" : "grab", opacity: isDragging ? 0.7 : 1, transition: "all 0.15s" }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                          <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: isRepair ? "#b91c1c" : "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>{idx + 1}</span>
                          {!readOnly && <FontAwesomeIcon icon={faGripVertical} aria-hidden="true" style={{ color: "#94a3b8", fontSize: "11px" }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                            <span title={proj.client_name || "Untitled"} style={{ minWidth: 0, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.client_name || "Untitled"}</span>
                            {canEditStop ? (
                              <button type="button" onClick={() => onEditProjectPrice?.(rp)} title="Edit price" style={priceStyle}>{hasPrice ? sub : "+ Price"}</button>
                            ) : hasPrice ? (
                              <span style={priceStyle}>{sub}</span>
                            ) : null}
                            {!readOnly && (
                              <button type="button" onClick={() => onRemoveProject?.(rp.id)} title="Remove from run" aria-label="Remove stop from run" style={{ flexShrink: 0, padding: 0, border: "none", background: "none", color: "#dc2626", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}>×</button>
                            )}
                          </div>
                          <div style={{ fontSize: "10px", color: "#64748b", overflowWrap: "anywhere" }}>
                            {location} · {projectStatusLabel}
                            {isRepair && <> · <span style={{ color: "#b91c1c", fontWeight: 600 }}>Repair</span></>}
                          </div>
                          {/* Stop details as chips. Each chip opens its editor; empty ones read "+ Label". */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            <StopChip
                              label="Arrival"
                              value={arrivalText}
                              onClick={canEditStop ? () => onEditStopDate?.(rp) : null}
                              title={canEditStop ? "Edit arrival window" : "Arrival window"}
                            />
                            <StopChip
                              label="Confirmation"
                              value={confirmationName}
                              tone={CONFIRMATION_CHIP_TONE}
                              onClick={canEditStop ? () => onEditStopConfirmation?.(rp) : null}
                              title={canEditStop ? "Edit confirmation" : "Confirmation"}
                            />
                            <StopChip
                              label="Invoice"
                              value={proj.invoice_number}
                              onClick={canEditStop ? () => onEditStopInvoice?.(rp) : null}
                              title={canEditStop ? "Edit invoice #" : "Invoice #"}
                            />
                            {!rp.notes && (
                              <StopChip
                                label="Note"
                                value=""
                                onClick={canEditStop ? () => onEditStopNote?.(rp) : null}
                                title="Add note"
                              />
                            )}
                          </div>
                          {rp.notes && (canEditStop ? (
                            <button type="button" onClick={() => onEditStopNote?.(rp)} title="Edit note" style={noteStyle}>{rp.notes}</button>
                          ) : (
                            <div style={noteStyle}>{rp.notes}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </section>

            {/* History: every run status change with dates, durations and who made it. */}
            <RunStatusHistory key={`run-history-${run.id}`} run={run} runStatuses={runStatuses} />

            {/* Remarks & files */}
            <section style={card}>
              <h3 style={cardTitle}>Remarks &amp; files</h3>
              {run.notes ? (
                <div style={{ color: "#334155", lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{run.notes}</div>
              ) : (
                <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No remarks.</div>
              )}
              <FileAttachments
                key={run.id}
                loadFiles={() => loadFiles("run", run.id)}
                createUpload={(meta) => createFileUpload("run", run.id, meta)}
                saveFile={(storagePath, meta) => saveUploadedFile("run", run.id, storagePath, meta)}
                getFileUrl={(file) => getFileUrl(file.id)}
                deleteFile={(file) => deleteFile(file.id)}
                // Add file: editors and anyone who may comment and attach. Delete: editors, or your own file.
                readOnly={filesReadOnly}
                canDeleteFile={canDeleteFile}
                maxBytes={PROJECT_FILE_MAX_BYTES}
                accept={PROJECT_FILE_TYPES.join(",")}
              />
            </section>
          </>
        )}
      </div>

      {/* Sticky footer: Edit left, Print right */}
      <div style={{ padding: "10px 12px", background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {actionButtons.map((btn, i) => {
          const primary = btn.variant === "primary";
          return (
            <button
              key={i}
              type="button"
              disabled={recalculating}
              onClick={btn.onClick}
              style={{ marginLeft: i === actionButtons.length - 1 ? "auto" : 0, padding: primary ? "8px 18px" : "8px 12px", border: primary ? "none" : "1px solid #cbd5e1", borderRadius: "8px", background: primary ? "#0f172a" : "#fff", color: primary ? "#fff" : "#334155", fontFamily: "inherit", fontSize: "12px", fontWeight: 600, cursor: recalculating ? "not-allowed" : "pointer", opacity: recalculating ? 0.5 : 1 }}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {recalculating && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(30,41,59,0.75)", zIndex: 20,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px",
          pointerEvents: "all",
        }}>
          <div style={{ fontSize: "28px", color: "#fff", animation: "recalcSpin 0.8s linear infinite", display: "inline-block" }}>⟳</div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#e2e8f0" }}>Recalculating route...</div>
          <div style={{ fontSize: "9px", color: "#94a3b8" }}>Please wait while the run details are updated.</div>
        </div>
      )}
    </div>
  );
}
