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
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
          <span style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: getStatusColor(statusName),
            flexShrink: 0,
          }} />
          <h5 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>{project.client_name || "Untitled"}</h5>
        </div>
        {statusName && (
          <span style={{
            display: "inline-block",
            padding: "1px 8px",
            borderRadius: "10px",
            fontSize: "11px",
            fontWeight: 500,
            background: "#e0e7ff",
            color: "#3730a3",
            marginBottom: "10px",
          }}>{statusName}</span>
        )}

        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Location</div>
          <div style={{ fontSize: "12px", color: "#1e293b" }}>{project.formatted_address || project.address_line_1 || "—"}</div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>
            {project.city && project.state ? `${project.city}, ${project.state} ${project.postal_code || ""}` : ""}
          </div>
        </div>

        {project.dealer && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Dealer</div>
            <div style={{ fontSize: "12px", color: "#1e293b" }}>{project.dealer}</div>
          </div>
        )}

        {project.project_subtotal != null && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Subtotal</div>
            <div style={{ fontSize: "12px", color: "#1e293b" }}>${Number(project.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        )}

        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Order Received</div>
          <div style={{ fontSize: "12px", color: "#1e293b" }}>{project.order_received_date || "—"}</div>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Scheduled Project Date</div>
          <div style={{ fontSize: "12px", color: "#1e293b" }}>{project.scheduled_project_date || "—"}</div>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Install Date</div>
          <div style={{ fontSize: "12px", color: "#1e293b" }}>{project.install_date || "—"}</div>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Coordinates</div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>
            {project.site_latitude != null && project.site_longitude != null
              ? `Site: ${project.site_latitude.toFixed(6)}, ${project.site_longitude.toFixed(6)}`
              : project.address_latitude != null && project.address_longitude != null
                ? `Address: ${project.address_latitude.toFixed(6)}, ${project.address_longitude.toFixed(6)}`
                : "No coordinates"}
          </div>
        </div>

        {routeInfo && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "2px" }}>Route from Origin</div>
            <div style={{ fontSize: "12px", color: "#1e293b" }}>{routeInfo.distance}</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>{routeInfo.duration}</div>
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