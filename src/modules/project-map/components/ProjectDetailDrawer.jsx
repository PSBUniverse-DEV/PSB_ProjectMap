"use client";

import { useMemo } from "react";

export default function ProjectDetailDrawer({ project, statuses = [], onClose, onEdit, onDelete }) {
  const statusName = useMemo(() => {
    if (!project) return "";
    return project.proj_s_project_status?.status_name || statuses.find((s) => s.status_id === project.status_id)?.status_name || "";
  }, [project, statuses]);

  if (!project) return null;

  return (
    <div style={{
      position: "absolute",
      top: 0,
      right: 0,
      width: "360px",
      height: "100%",
      background: "#fff",
      borderLeft: "1px solid #e2e8f0",
      boxShadow: "-4px 0 12px rgba(0,0,0,0.08)",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <h6 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>Project Details</h6>
        <button onClick={onClose} style={{
          background: "none",
          border: "none",
          fontSize: "20px",
          cursor: "pointer",
          color: "#64748b",
          lineHeight: 1,
        }}>×</button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
        <h5 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 600 }}>{project.client_name || "Untitled"}</h5>
        {statusName && (
          <span style={{
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 500,
            background: "#e0e7ff",
            color: "#3730a3",
            marginBottom: "16px",
          }}>{statusName}</span>
        )}

        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Location</div>
          <div style={{ fontSize: "13px", color: "#1e293b" }}>{project.formatted_address || project.address_line_1 || "—"}</div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {project.city && project.state ? `${project.city}, ${project.state} ${project.postal_code || ""}` : ""}
          </div>
        </div>

        {project.dealer && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Dealer</div>
            <div style={{ fontSize: "13px", color: "#1e293b" }}>{project.dealer}</div>
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Order Received</div>
          <div style={{ fontSize: "13px", color: "#1e293b" }}>{project.order_received_date || "—"}</div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Scheduled Project Date</div>
          <div style={{ fontSize: "13px", color: "#1e293b" }}>{project.scheduled_project_date || "—"}</div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Install Date</div>
          <div style={{ fontSize: "13px", color: "#1e293b" }}>{project.install_date || "—"}</div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Coordinates</div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {project.site_latitude != null && project.site_longitude != null
              ? `Site: ${project.site_latitude.toFixed(6)}, ${project.site_longitude.toFixed(6)}`
              : project.address_latitude != null && project.address_longitude != null
                ? `Address: ${project.address_latitude.toFixed(6)}, ${project.address_longitude.toFixed(6)}`
                : "No coordinates"}
          </div>
        </div>
      </div>

      <div style={{
        padding: "12px 20px",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        gap: "8px",
        justifyContent: "flex-end",
      }}>
        <button onClick={onEdit} style={{
          padding: "6px 14px",
          fontSize: "13px",
          borderRadius: "4px",
          border: "1px solid #e2e8f0",
          background: "#fff",
          cursor: "pointer",
        }}>Edit</button>
        <button onClick={onDelete} style={{
          padding: "6px 14px",
          fontSize: "13px",
          borderRadius: "4px",
          border: "1px solid #fecaca",
          background: "#fef2f2",
          color: "#dc2626",
          cursor: "pointer",
        }}>Delete</button>
      </div>
    </div>
  );
}