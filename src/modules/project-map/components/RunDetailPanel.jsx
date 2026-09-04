"use client";


import { useMemo, useState, useEffect } from "react";
import { StatusBadge } from "@/shared/components/ui";
import { formatProjectDescriptionForDisplay, getRunStatusColor, resolveRunStatusOptions, stripTownshipLabel } from "../data/projectMap.data";
import { generateRunManifestPrint } from "../utils/printRunManifest";

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

export default function RunDetailPanel({ run, runProjects = [], runSegmentData = null, onClose, onEdit, onDelete, onRemoveProject, onReorderStops, onRecalculate, recalculating = false, onEditStopNote, onEditStopDate, onEditStopInvoice, onEditProjectPrice, onProjectUpdated, isLoading = false, runStatuses = [], onStatusChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(run?.status || "Draft");
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    setIsEditingStatus(false);
    setPendingStatus(run?.status || "Draft");
  }, [run?.id]);

  const originName = run?.proj_s_origin_addresses?.origin_name || "No Origin";
  const hasStops = runProjects.length > 0;
  const totalDistance = hasStops ? formatDistance(run?.estimated_distance) : "—";
  const totalMileage = hasStops ? formatMileage(run?.estimated_mileage) : "—";
  const totalDuration = hasStops ? formatDuration(run?.estimated_duration) : "—";
  const totalSubtotal = hasStops ? formatCurrency(run?.estimated_subtotal) : "$0.00";

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

  const status = run?.status || "Draft";

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
    const print = () => generateRunManifestPrint(run, runProjects, runSegmentData);
    const btns = [{ label: "Edit", onClick: onEdit, variant: "secondary" }];
    if (status === "Draft") {
      btns.push({ label: "Print Record", onClick: print, variant: "primary" });
    } else if (status === "Planned") {
      btns.push({ label: "Print Record", onClick: print, variant: "primary" });
    } else if (status === "In Progress") {
      btns.push({ label: "Print Record", onClick: print, variant: "secondary" });
    } else if (status === "Completed") {
      btns.push({ label: "Print Record", onClick: print, variant: "primary" });
    } else {
      btns.push({ label: "Print Record", onClick: print, variant: "primary" });
    }
    return btns;
  }, [status, onEdit, run, runProjects, runSegmentData]);

  if (!run) return null;

  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: "320px", height: "100%", background: "#fff", borderLeft: "1px solid #e2e8f0", boxShadow: "-4px 0 12px rgba(0,0,0,0.08)", zIndex: 10, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <span style={{ fontSize: "13px" }}>🛻</span>
              <h6 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{run.run_name || run.run_code || `Run #${run.run_number || "?"}`}</h6>
            </div>
            {run.run_code && (
              <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "2px" }}>{run.run_code}</div>
            )}
            <div style={{ fontSize: "10px", color: "#64748b" }}>{run.run_date || "No date"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b", lineHeight: 1, padding: "0" }}>×</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "10px 12px" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px", animation: "recalcSpin 0.8s linear infinite" }}>⟳</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>Loading Run Data...</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Fetching stops and calculating the route.</div>
          </div>
        ) : (
          <>
            {/* Run Status — centered, full width, above Route Summary */}
            <div style={{ textAlign: "center", marginBottom: "10px" }}>
              {isEditingStatus ? (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748b" }}>Set as:</span>
                  <select
                    value={pendingStatus}
                    onChange={(e) => setPendingStatus(e.target.value)}
                    disabled={savingStatus}
                    style={{ fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", border: "1px solid #e2e8f0", background: "#fff", color: "#1e293b" }}
                  >
                    {resolveRunStatusOptions(runStatuses).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveStatus}
                    disabled={savingStatus || pendingStatus === status}
                    style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", border: "none", background: savingStatus || pendingStatus === status ? "#cbd5e1" : "#16a34a", color: "#fff", cursor: savingStatus || pendingStatus === status ? "not-allowed" : "pointer" }}
                  >
                    {savingStatus ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => { setIsEditingStatus(false); setPendingStatus(status); }}
                    disabled={savingStatus}
                    style={{ fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: savingStatus ? "not-allowed" : "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                (() => {
                  const color = getRunStatusColor(status, runStatuses);
                  return (
                    <button
                      onClick={() => { setPendingStatus(status); setIsEditingStatus(true); }}
                      title="Click to change status"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "1px 8px",
                        borderRadius: "10px",
                        fontSize: "10px",
                        fontWeight: 600,
                        background: `${color}20`,
                        color: color,
                        border: `1px solid ${color}40`,
                        cursor: "pointer",
                      }}
                    >
                      Set as: {status}
                    </button>
                  );
                })()
              )}
            </div>

            <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", borderRadius: "6px", padding: "10px 12px", marginBottom: "10px", color: "#fff" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "6px", letterSpacing: "0.5px" }}>Route Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <div><div style={{ fontSize: "9px", color: "#94a3b8" }}>Distance</div><div style={{ fontSize: "16px", fontWeight: 700 }}>{totalDistance}</div></div>
                <div><div style={{ fontSize: "9px", color: "#94a3b8" }}>Mileage</div><div style={{ fontSize: "16px", fontWeight: 700 }}>{totalMileage}</div></div>
                <div><div style={{ fontSize: "9px", color: "#94a3b8" }}>Duration</div><div style={{ fontSize: "16px", fontWeight: 700 }}>{totalDuration}</div></div>
                <div><div style={{ fontSize: "9px", color: "#94a3b8" }}>Revenue</div><div style={{ fontSize: "16px", fontWeight: 700 }}>{totalSubtotal}</div></div>
              </div>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "1px" }}>📍 Origin</div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>{originName}</div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px", lineHeight: 1.4 }}>{stripTownshipLabel(run.proj_s_origin_addresses?.formatted_address || run.proj_s_origin_addresses?.address_line_1 || "")}</div>
            </div>

            {run.team_assigned && (
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "1px" }}>👥 Installer</div>
                  <div style={{ fontSize: "11px", color: "#1e293b" }}>{run.team_assigned}</div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>🛣 Route Timeline ({runProjects.length} stops)</span>
              </div>

              {runProjects.length === 0 ? (
                <div style={{ background: "#f8fafc", border: "1px dashed #e2e8f0", borderRadius: "6px", padding: "16px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>🗺️</div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>No Route Created</div>
                  <p style={{ fontSize: "11px", color: "#475569", margin: "0 0 8px", lineHeight: 1.5 }}>No projects have been assigned to this run.</p>
                  <p style={{ fontSize: "10px", color: "#64748b", margin: "0", lineHeight: 1.5 }}>Right-click a project marker and choose<br /><strong>{"\u201CAdd to Run\u201D"}</strong> to begin building this route.</p>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "2px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px", flexShrink: 0, marginRight: "8px" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#1e293b", border: "2px solid #1e293b" }} />
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#1e293b", paddingTop: "0" }}>Origin: {originName}</div>
                  </div>

                  {runProjects.map((rp, idx) => {
                    const proj = rp.proj_t_projects || {};
                    const segment = runSegmentData?.segments?.[idx];
                    const currentProjectStatus = proj.proj_s_project_status?.status_name || "—";
                    const previousProjectStatus = proj.previous_project_status?.status_name || null;
                    const projectStatusLabel = run.status === "Completed" && previousProjectStatus && currentProjectStatus !== previousProjectStatus
                      ? `${previousProjectStatus} -> ${currentProjectStatus}`
                      : currentProjectStatus;
                    const hasError = segment?.error;
                    const segDistance = hasError ? "Route unavailable" : formatDistance(segment?.distance);
                    const segDuration = hasError ? "" : formatDuration(segment?.duration);
                    const sub = formatCurrency(stopSubtotals[idx]);
                    const isDragging = dragIndex === idx;
                    const isDragOver = dragOverIndex === idx;

                    return (
                      <div key={rp.id} style={{ marginBottom: "2px" }}>
                        <div style={{ display: "flex", alignItems: "stretch" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px", flexShrink: 0, marginRight: "8px" }}>
                            <div style={{ width: "2px", flex: 1, background: "#cbd5e1", minHeight: "12px" }} />
                            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6", border: "2px solid #fff", boxShadow: "0 0 0 2px #3b82f6" }} />
                          </div>
                          <div style={{ flex: 1, paddingTop: "2px" }}>
                            {(segment || idx === 0) && (
                              <div style={{ fontSize: "9px", color: hasError ? "#dc2626" : "#64748b", marginBottom: "4px", fontStyle: "italic" }}>{segDistance}{segDuration ? ` · ${segDuration}` : ""}</div>
                            )}
                            <div draggable onDragStart={() => setDragIndex(idx)} onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }} onDragLeave={() => setDragOverIndex(null)} onDrop={() => { if (dragIndex !== null && dragIndex !== idx) { onReorderStops?.(dragIndex, idx); } setDragIndex(null); setDragOverIndex(null); }} onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }} style={{ padding: "5px 8px", background: isDragging ? "#fef3c7" : (isDragOver ? "#f0f9ff" : "#f8fafc"), border: `1px solid ${isDragOver ? "#93c5fd" : "#e2e8f0"}`, borderRadius: "3px", cursor: "grab", opacity: isDragging ? 0.7 : 1, transition: "all 0.15s", marginBottom: "6px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "4px" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: "11px", color: "#1e293b", marginBottom: "1px" }}>{idx + 1}. {proj.client_name || "Untitled"}</div>
                                  <div style={{ fontSize: "9px", color: "#64748b" }}>{proj.city && proj.state ? `${stripTownshipLabel(proj.city)}, ${proj.state}` : stripTownshipLabel(proj.formatted_address) || "No address"}</div>
                                  <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>Status: {projectStatusLabel}</div>
                                  <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 500, marginTop: "2px" }}>{sub}</div>
                                  <div style={{ marginTop: "3px", display: "flex", gap: "8px", alignItems: "center" }}>
                                    <button onClick={() => onEditStopNote?.(rp)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", padding: "0", color: rp.notes ? "#6366f1" : "#94a3b8", fontWeight: rp.notes ? 600 : 400 }} title={rp.notes ? "Edit note" : "Add note"}>{rp.notes ? "📝 Note" : "📄 Note"}</button>
                                    <button
                                      onClick={() => onEditStopDate?.(rp)}
                                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", padding: "0", color: (rp.proj_t_projects?.install_start || rp.proj_t_projects?.install_end) ? "#6366f1" : "#94a3b8", fontWeight: (rp.proj_t_projects?.install_start || rp.proj_t_projects?.install_end) ? 600 : 400 }}
                                      title={(rp.proj_t_projects?.install_start || rp.proj_t_projects?.install_end) ? "Edit arrival window" : "Add arrival window"}
                                    >
                                      {(rp.proj_t_projects?.install_start || rp.proj_t_projects?.install_end) ? "📅 Date" : "🗓️ Date"}
                                    </button>
                                    <button
                                      onClick={() => onEditStopInvoice?.(rp)}
                                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", padding: "0", color: rp.proj_t_projects?.invoice_number ? "#6366f1" : "#94a3b8", fontWeight: rp.proj_t_projects?.invoice_number ? 600 : 400 }}
                                      title={rp.proj_t_projects?.invoice_number ? "Edit invoice #" : "Add invoice #"}
                                    >
                                      🧾 Invoice
                                    </button>
                                    <button
                                      onClick={() => onEditProjectPrice?.(rp)}
                                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", padding: "0", color: rp.proj_t_projects?.project_subtotal != null ? "#16a34a" : "#94a3b8", fontWeight: rp.proj_t_projects?.project_subtotal != null ? 600 : 400 }}
                                      title={rp.proj_t_projects?.project_subtotal != null ? "Edit price" : "Add price"}
                                    >
                                      💰 Price
                                    </button>
                                  </div>
                                </div>
                                <button onClick={() => onRemoveProject?.(rp.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "12px", padding: "0", lineHeight: 1 }} title="Remove from run">×</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px", flexShrink: 0, marginRight: "8px" }}>
                      <div style={{ width: "2px", height: "12px", background: "#cbd5e1" }} />
                      <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: "#dc2626", transform: "rotate(45deg)" }} />
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: 600, color: "#dc2626", paddingTop: "2px" }}>End</div>
                  </div>
                </div>
              )}
            </div>

            {run.notes && (
              <div style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "1px" }}>📝 Remarks</div>
                <div style={{ fontSize: "11px", color: "#475569", background: "#f8fafc", padding: "6px 8px", borderRadius: "3px", border: "1px solid #e2e8f0" }}>{run.notes}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ padding: "8px 12px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "6px", justifyContent: "flex-start", flexWrap: "wrap", flexShrink: 0, background: "#fff" }}>
        {actionButtons.map((btn, i) => (
          <button key={i} disabled={recalculating} onClick={btn.onClick} style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "3px", border: "none", cursor: recalculating ? "not-allowed" : "pointer", fontWeight: 500, opacity: recalculating ? 0.5 : 1, background: btn.variant === "danger" ? "#fef2f2" : btn.variant === "primary" ? "#1e293b" : btn.variant === "success" ? "#16a34a" : "#fff", color: btn.variant === "danger" ? "#dc2626" : btn.variant === "primary" ? "#fff" : btn.variant === "success" ? "#fff" : "#1e293b", border: btn.variant === "secondary" || btn.variant === "danger" ? "1px solid #e2e8f0" : "none" }}>{btn.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onRecalculate} disabled={recalculating} style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "3px", border: "1px solid #6366f1", cursor: recalculating ? "not-allowed" : "pointer", fontWeight: 500, background: recalculating ? "#eef2ff" : "#eef2ff", color: recalculating ? "#94a3b8" : "#6366f1", opacity: recalculating ? 0.7 : 1 }}>{recalculating ? "⟳ Recalculating..." : "⟳ Recalculate Run"}</button>
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
