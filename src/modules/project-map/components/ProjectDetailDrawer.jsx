"use client";

import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot, faCalendarDays, faBuilding, faDollarSign } from "@fortawesome/free-solid-svg-icons";

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

  const subtotal = project.project_subtotal != null
    ? `$${Number(project.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

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
      {/* Header */}
      <div style={{
        padding: "16px",
        borderBottom: "1px solid #e2e8f0",
      }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>
          {project.client_name || "Untitled"}
        </h2>
        <span style={{
          display: "inline-block",
          padding: "3px 12px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: 600,
          background: `${statusName ? getStatusColor(statusName, statuses) : "#6b7280"}20`,
          color: statusName ? getStatusColor(statusName, statuses) : "#6b7280",
          border: `1px solid ${statusName ? getStatusColor(statusName, statuses) : "#6b7280"}40`,
        }}>{statusName || "No Status"}</span>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
        {/* Project Value KPI Card */}
        {subtotal && (
          <div style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "20px",
          }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
              Project Value
            </div>
            <div style={{ fontSize: "26px", fontWeight: 700, color: "#14532d", lineHeight: 1.2 }}>
              {subtotal}
            </div>
          </div>
        )}

        {/* Project Address */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FontAwesomeIcon icon={faLocationDot} style={{ fontSize: "12px" }} />
            Project Address
          </div>
          <div style={{ fontSize: "14px", color: "#1e293b", lineHeight: "1.6" }}>
            {project.formatted_address || (
              <>
                {project.address_line_1}<br />
                {[project.city, project.state, project.postal_code].filter(Boolean).join(", ")}<br />
                {project.country || ""}
              </>
            ) || "—"}
          </div>
        </div>

        {/* Dealer */}
        {project.dealer && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
              <FontAwesomeIcon icon={faBuilding} style={{ fontSize: "12px" }} />
              Dealer
            </div>
            <div style={{ fontSize: "13px", color: "#1e293b" }}>{project.dealer}</div>
          </div>
        )}

        {/* Schedule */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FontAwesomeIcon icon={faCalendarDays} style={{ fontSize: "12px" }} />
            Schedule
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "5px 0", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Order Received</td>
                <td style={{ padding: "5px 0", fontSize: "13px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{project.order_received_date || "—"}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "5px 0", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Scheduled Project Date</td>
                <td style={{ padding: "5px 0", fontSize: "13px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{project.scheduled_project_date || "—"}</td>
              </tr>
              <tr>
                <td style={{ padding: "5px 0", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Install Date</td>
                <td style={{ padding: "5px 0", fontSize: "13px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{project.install_date || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {routeInfo && (
          <div style={{ marginBottom: "10px", padding: "10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>Route from Origin</div>
            <div style={{ fontSize: "12px", color: "#1e293b", marginBottom: "2px" }}><strong>Distance:</strong> {routeInfo.distance}</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}><strong>Duration:</strong> {routeInfo.duration}</div>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        gap: "8px",
        justifyContent: "flex-end",
        background: "#fff",
      }}>
        <button onClick={onEdit} style={{
          padding: "6px 14px",
          fontSize: "12px",
          fontWeight: 600,
          borderRadius: "4px",
          border: "1px solid #e2e8f0",
          background: "#fff",
          cursor: "pointer",
          color: "#1e293b",
        }}>Edit</button>
        <button onClick={onDelete} style={{
          padding: "6px 14px",
          fontSize: "12px",
          fontWeight: 600,
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
