"use client";

import { useMemo } from "react";

export default function ProjectDetailDrawer({ project, statuses = [], onClose, onEdit, onDelete, routeInfo = null }) {
  const statusName = useMemo(() => {
    if (!project) return "";
    return project.proj_s_project_status?.status_name || statuses.find((s) => s.status_id === project.status_id)?.status_name || "";
  }, [project, statuses]);

  function getStatusColor(statusName) {
    if (!statusName) return "#6b7280";
    const found = statuses.find((s) => s.status_name === statusName);
    return found?.display_color || "#6b7280";
  }

  if (!project) return null;

  return (
    <div style={{
      position: "absolute",
      top: 0,
      right: 0,
      width: "300px",
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
        <h6 style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>Project Details</h6>
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
        {/* General */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>General</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Client Name:</strong> {project.client_name || "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Status:</strong> {statusName || "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Dealer:</strong> {project.dealer || "—"}</div>
        </div>

        {/* Address */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>Address</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Formatted Address:</strong> {project.formatted_address || "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Address Line 1:</strong> {project.address_line_1 || "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>City:</strong> {project.city || "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>State:</strong> {project.state || "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>State Code:</strong> {project.state_code || "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Postal Code:</strong> {project.postal_code || "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Country:</strong> {project.country || "—"}</div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>Location</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Latitude:</strong> {project.address_latitude != null ? project.address_latitude.toFixed(6) : "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Longitude:</strong> {project.address_longitude != null ? project.address_longitude.toFixed(6) : "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Location Source:</strong> {project.location_source || "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Location Confirmed:</strong> {project.location_confirmed ? "Yes" : "No"}</div>
        </div>

        {/* Financial */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>Financial</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Project Subtotal:</strong> {project.project_subtotal != null ? `$${Number(project.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</div>
        </div>

        {/* Schedule */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>Schedule</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Order Received:</strong> {project.order_received_date || "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Scheduled Project Date:</strong> {project.scheduled_project_date || "—"}</div>
          <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Install Date:</strong> {project.install_date || "—"}</div>
        </div>

        {/* System Information */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>System Information</div>
          <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}><strong>Created At:</strong> {project.created_at ? new Date(project.created_at).toLocaleString() : "—"}</div>
          <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}><strong>Updated At:</strong> {project.updated_at ? new Date(project.updated_at).toLocaleString() : "—"}</div>
        </div>

        {routeInfo && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>Route from Origin</div>
            <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "4px" }}><strong>Distance:</strong> {routeInfo.distance}</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}><strong>Duration:</strong> {routeInfo.duration}</div>
          </div>
        )}
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