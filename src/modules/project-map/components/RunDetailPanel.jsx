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

export default function RunDetailPanel({ run, runProjects = [], onClose, onEdit, onDelete, onAddProject, onRemoveProject, onReorderStops }) {
  if (!run) return null;

  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const originName = run.proj_s_origin_addresses?.origin_name || "No Origin";
  const totalDistance = run.estimated_distance != null ? `${(run.estimated_distance / 1000).toFixed(1)} km` : "—";
  const totalDuration = run.estimated_duration != null ? `${Math.round(run.estimated_duration / 60)} min` : "—";
  const totalSubtotal = run.estimated_subtotal != null
    ? `$${Number(run.estimated_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

  return (
    <div style={{
      position: "absolute",
      top: 0,
      right: 0,
      width: "320px",
      height: "100%",
      background: "#fff",
      borderLeft: "1px solid #e2e8f0",
      boxShadow: "-4px 0 12px rgba(0,0,0,0.08)",
      zIndex: 10,
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        padding: "8px 12px",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <h6 style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>Run Details</h6>
        <button onClick={onClose} style={{
          background: "none",
          border: "none",
          fontSize: "18px",
          cursor: "pointer",
          color: "#64748b",
          lineHeight: 1,
        }}>×</button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Run Name</div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{run.run_name || `Run #${run.run_number || "?"}`}</div>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Status</div>
          <StatusBadge tone={getStatusTone(run.status)}>{run.status || "Draft"}</StatusBadge>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Origin</div>
          <div style={{ fontSize: "12px", color: "#1e293b" }}>{originName}</div>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Run Date</div>
          <div style={{ fontSize: "12px", color: "#1e293b" }}>{run.run_date || "—"}</div>
        </div>

        {run.team_assigned && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Team Assigned</div>
            <div style={{ fontSize: "12px", color: "#1e293b" }}>{run.team_assigned}</div>
          </div>
        )}

        {run.vehicle_assigned && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Vehicle Assigned</div>
            <div style={{ fontSize: "12px", color: "#1e293b" }}>{run.vehicle_assigned}</div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Distance</div>
            <div style={{ fontSize: "12px", color: "#1e293b" }}>{totalDistance}</div>
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Duration</div>
            <div style={{ fontSize: "12px", color: "#1e293b" }}>{totalDuration}</div>
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Subtotal</div>
            <div style={{ fontSize: "12px", color: "#1e293b" }}>{totalSubtotal}</div>
          </div>
        </div>

        {run.notes && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Notes</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>{run.notes}</div>
          </div>
        )}

        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "8px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
            Projects ({runProjects.length})
          </div>
          {runProjects.length === 0 ? (
            <p style={{ fontSize: "11px", color: "#94a3b8" }}>No projects assigned.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {runProjects.map((rp, idx) => {
                const proj = rp.proj_t_projects || {};
                const statusName = proj.proj_s_project_status?.status_name || "";
                const isDragging = dragIndex === idx;
                const isDragOver = dragOverIndex === idx;
                return (
                  <div
                    key={rp.id}
                    draggable
                    onDragStart={() => setDragIndex(idx)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={() => {
                      if (dragIndex !== null && dragIndex !== idx) {
                        onReorderStops?.(dragIndex, idx);
                      }
                      setDragIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDragOverIndex(null);
                    }}
                    style={{
                      padding: "6px 8px",
                      background: isDragging ? "#fef3c7" : (isDragOver ? "#f0f9ff" : "#f8fafc"),
                      border: `1px solid ${isDragOver ? "#93c5fd" : "#e2e8f0"}`,
                      borderRadius: "3px",
                      fontSize: "11px",
                      cursor: "grab",
                      opacity: isDragging ? 0.7 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "4px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "1px" }}>
                          Stop {rp.stop_sequence + 1}: {proj.client_name || "Untitled"}
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {proj.city && proj.state ? `${proj.city}, ${proj.state}` : proj.formatted_address || "No address"}
                        </div>
                        {proj.project_subtotal != null && (
                          <div style={{ fontSize: "10px", color: "#16a34a", marginTop: "1px" }}>
                            ${Number(proj.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => onRemoveProject?.(rp.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#dc2626",
                          cursor: "pointer",
                          fontSize: "12px",
                          padding: "0",
                          lineHeight: 1,
                        }}
                        title="Remove from run"
                      >×</button>
                    </div>
                  </div>
                );
              })}
              {onAddProject && (
                <button
                  onClick={onAddProject}
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    borderRadius: "3px",
                    border: "1px dashed #94a3b8",
                    background: "#fff",
                    color: "#64748b",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  + Add Project
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{
        padding: "8px 12px",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        gap: "6px",
        justifyContent: "flex-end",
      }}>
        <button onClick={onEdit} style={{
          padding: "4px 10px",
          fontSize: "12px",
          borderRadius: "3px",
          border: "1px solid #e2e8f0",
          background: "#fff",
          cursor: "pointer",
        }}>Edit</button>
        <button onClick={onDelete} style={{
          padding: "4px 10px",
          fontSize: "12px",
          borderRadius: "3px",
          border: "1px solid #fecaca",
          background: "#fef2f2",
          color: "#dc2626",
          cursor: "pointer",
        }}>Delete</button>
      </div>
    </div>
  );
}