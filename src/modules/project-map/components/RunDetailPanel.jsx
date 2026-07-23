"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/shared/components/ui";

function getStatusTone(status) {
  if (!status) return "secondary";
  const map = {
    "Draft": "secondary",
    "Planned": "info",
    "Scheduled": "warning",
    "In Progress": "primary",
    "Completed": "success",
    "Cancelled": "danger",
  };
  return map[status] || "secondary";
}

function formatDistance(meters) {
  if (meters == null) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
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

export default function RunDetailPanel({ run, runProjects = [], runSegmentData = null, onClose, onEdit, onDelete, onRemoveProject, onReorderStops, onRecalculate, recalculating = false, onEditStopNote }) {
  if (!run) return null;

  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const originName = run.proj_s_origin_addresses?.origin_name || "No Origin";
  const hasStops = runProjects.length > 0;
  const totalDistance = hasStops ? formatDistance(run.estimated_distance) : "—";
  const totalMileage = hasStops ? formatMileage(run.estimated_mileage) : "—";
  const totalDuration = hasStops ? formatDuration(run.estimated_duration) : "—";
  const totalSubtotal = hasStops ? formatCurrency(run.estimated_subtotal) : "$0.00";

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

  const handlePrint = () => { window.print(); };

  const status = run.status || "Draft";
  const actionButtons = useMemo(() => {
    const btns = [{ label: "Edit", onClick: onEdit, variant: "secondary" }];
    if (status === "Draft") {
      btns.push({ label: "Print Record", onClick: handlePrint, variant: "primary" });
    } else if (status === "Planned") {
      btns.push({ label: "Print Record", onClick: handlePrint, variant: "primary" });
    } else if (status === "In Progress") {
      btns.push({ label: "Print Record", onClick: handlePrint, variant: "secondary" });
    } else if (status === "Completed") {
      btns.push({ label: "Print Record", onClick: handlePrint, variant: "primary" });
      btns.push({ label: "Duplicate", onClick: () => {}, variant: "secondary" });
    } else {
      btns.push({ label: "Print Record", onClick: handlePrint, variant: "primary" });
    }
    return btns;
  }, [status, onEdit]);

  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: "320px", height: "100%", background: "#fff", borderLeft: "1px solid #e2e8f0", boxShadow: "-4px 0 12px rgba(0,0,0,0.08)", zIndex: 10, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <span style={{ fontSize: "13px" }}>🛻</span>
              <h6 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{run.run_name || `Run #${run.run_number || "?"}`}</h6>
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "3px" }}>{run.run_date || "No date"}</div>
            <StatusBadge tone={getStatusTone(status)}>{status}</StatusBadge>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b", lineHeight: 1, padding: "0" }}>×</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "10px 12px" }}>
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
        </div>

        {(run.team_assigned || run.vehicle_assigned) && (
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            {run.team_assigned && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "1px" }}>👥 Team</div>
                <div style={{ fontSize: "11px", color: "#1e293b" }}>{run.team_assigned}</div>
              </div>
            )}
            {run.vehicle_assigned && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "1px" }}>🚛 Vehicle</div>
                <div style={{ fontSize: "11px", color: "#1e293b" }}>{run.vehicle_assigned}</div>
              </div>
            )}
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
              <p style={{ fontSize: "10px", color: "#64748b", margin: "0", lineHeight: 1.5 }}>Right-click a project marker and choose<br /><strong>"Add to Run"</strong> to begin building this route.</p>
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
                              <div style={{ fontSize: "9px", color: "#64748b" }}>{proj.city && proj.state ? `${proj.city}, ${proj.state}` : proj.formatted_address || "No address"}</div>
                              <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 500, marginTop: "2px" }}>{sub}</div>
                              <div style={{ marginTop: "3px" }}>
                                <button onClick={() => onEditStopNote?.(rp)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", padding: "0", color: rp.notes ? "#6366f1" : "#94a3b8", fontWeight: rp.notes ? 600 : 400 }} title={rp.notes ? "Edit note" : "Add note"}>{rp.notes ? "📝 Note" : "📄 Note"}</button>
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

        {routeStats && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "8px 10px", marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>📊 Route Statistics</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 10px" }}>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Total Stops</div>
              <div style={{ fontSize: "11px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{routeStats.totalStops}</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Avg Stop Time</div>
              <div style={{ fontSize: "11px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{formatDuration(routeStats.avgDuration)}</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Longest Leg</div>
              <div style={{ fontSize: "11px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{formatDistance(routeStats.longestLeg)}</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Shortest Leg</div>
              <div style={{ fontSize: "11px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{formatDistance(routeStats.shortestLeg)}</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>Total Revenue</div>
              <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600, textAlign: "right" }}>{formatCurrency(totalRevenue)}</div>
            </div>
          </div>
        )}

        {run.notes && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "1px" }}>📝 Notes</div>
            <div style={{ fontSize: "11px", color: "#475569", background: "#f8fafc", padding: "6px 8px", borderRadius: "3px", border: "1px solid #e2e8f0" }}>{run.notes}</div>
          </div>
        )}
      </div>

      <div style={{ padding: "8px 12px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "6px", justifyContent: "flex-start", flexWrap: "wrap", flexShrink: 0, background: "#fff" }}>
        {actionButtons.map((btn, i) => (
          <button key={i} onClick={btn.onClick} style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "3px", border: "none", cursor: "pointer", fontWeight: 500, background: btn.variant === "danger" ? "#fef2f2" : btn.variant === "primary" ? "#1e293b" : btn.variant === "success" ? "#16a34a" : "#fff", color: btn.variant === "danger" ? "#dc2626" : btn.variant === "primary" ? "#fff" : btn.variant === "success" ? "#fff" : "#1e293b", border: btn.variant === "secondary" || btn.variant === "danger" ? "1px solid #e2e8f0" : "none" }}>{btn.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onRecalculate} disabled={recalculating} style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "3px", border: "1px solid #6366f1", cursor: recalculating ? "not-allowed" : "pointer", fontWeight: 500, background: recalculating ? "#eef2ff" : "#eef2ff", color: recalculating ? "#94a3b8" : "#6366f1", opacity: recalculating ? 0.7 : 1 }}>{recalculating ? "⟳ Recalculating..." : "⟳ Recalculate Run"}</button>
      </div>
    </div>
  );
}