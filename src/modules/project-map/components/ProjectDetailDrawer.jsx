"use client";

import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot, faCalendarDays, faBuilding, faDollarSign } from "@fortawesome/free-solid-svg-icons";

export default function ProjectDetailDrawer({ project, statuses = [], buildingCategories = [], permitStatuses = [], welcomeCallStatuses = [], onClose, onEdit, onDelete, routeInfo = null }) {
  const statusName = useMemo(() => {
    if (!project) return "";
    return project.proj_s_project_status?.status_name || statuses.find((s) => s.status_id === project.status_id)?.status_name || "";
  }, [project, statuses]);

  const buildingCategoryName = useMemo(() => {
    if (!project) return "";
    const cat = project.proj_s_building_categories || buildingCategories.find((c) => c.id === project.building_category_id);
    return cat?.building_category_name || "";
  }, [project, buildingCategories]);

  const permitStatusName = useMemo(() => {
    if (!project) return "";
    const s = project.proj_s_permit_status || permitStatuses.find((p) => p.id === project.permit_status_id);
    return s?.status_name || "";
  }, [project, permitStatuses]);

  const welcomeCallStatusName = useMemo(() => {
    if (!project) return "";
    const s = project.proj_s_welcome_call_status || welcomeCallStatuses.find((w) => w.id === project.welcome_call_status_id);
    return s?.status_name || "";
  }, [project, welcomeCallStatuses]);

  function getStatusColor(statusName) {
    if (!statusName) return "#6b7280";
    const found = statuses.find((s) => s.status_name === statusName);
    return found?.display_color || "#6b7280";
  }

  function formatDateTime(val) {
    if (!val) return "—";
    try {
      const d = new Date(val);
      return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
    } catch { return val; }
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

        {/* Building Category */}
        {buildingCategoryName && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
              <FontAwesomeIcon icon={faBuilding} style={{ fontSize: "12px" }} />
              Building Category
            </div>
            <div style={{ fontSize: "13px", color: "#1e293b" }}>{buildingCategoryName}</div>
          </div>
        )}

        {/* Invoice Number */}
        {project.invoice_number && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
              <FontAwesomeIcon icon={faDollarSign} style={{ fontSize: "12px" }} />
              Invoice Number
            </div>
            <div style={{ fontSize: "13px", color: "#1e293b" }}>{project.invoice_number}</div>
          </div>
        )}

        {/* Workflow Status */}
        {(permitStatusName || welcomeCallStatusName) && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.5px" }}>Workflow Status</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {welcomeCallStatusName && (
                  <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td style={{ padding: "5px 0", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Welcome Call</td>
                    <td style={{ padding: "5px 0", fontSize: "13px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{welcomeCallStatusName}</td>
                  </tr>
                )}
                {permitStatusName && (
                  <tr>
                    <td style={{ padding: "5px 0", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Permit</td>
                    <td style={{ padding: "5px 0", fontSize: "13px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{permitStatusName}</td>
                  </tr>
                )}
              </tbody>
            </table>
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
                <td style={{ padding: "5px 0", fontSize: "13px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{formatDateTime(project.order_received_at)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "5px 0", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Scheduled Start</td>
                <td style={{ padding: "5px 0", fontSize: "13px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{formatDateTime(project.scheduled_project_start)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "5px 0", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Scheduled End</td>
                <td style={{ padding: "5px 0", fontSize: "13px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{formatDateTime(project.scheduled_project_end)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "5px 0", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Install Start</td>
                <td style={{ padding: "5px 0", fontSize: "13px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{formatDateTime(project.install_start)}</td>
              </tr>
              <tr>
                <td style={{ padding: "5px 0", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>Install End</td>
                <td style={{ padding: "5px 0", fontSize: "13px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{formatDateTime(project.install_end)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {project.notes && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px" }}>Notes</div>
            <div style={{ fontSize: "13px", color: "#1e293b", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{project.notes}</div>
          </div>
        )}

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
