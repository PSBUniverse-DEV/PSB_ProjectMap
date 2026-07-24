"use client";

import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot, faCalendarDays, faBuilding, faDollarSign, faTag } from "@fortawesome/free-solid-svg-icons";

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

  function getStatusColor(name) {
    if (!name) return "#6b7280";
    const found = statuses.find((s) => s.status_name === name);
    return found?.display_color || "#6b7280";
  }

  function formatDateTime(val) {
    if (!val) return "—";
    try {
      const d = new Date(val);
      return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
    } catch { return val; }
  }

  function StatusChip({ label, name }) {
    const display = name || "—";
    const color = name ? getStatusColor(name) : "#6b7280";
    return (
      <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
        <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>{label}</td>
        <td style={{ padding: "4px 0", textAlign: "right" }}>
          <span style={{
            display: "inline-block",
            padding: "1px 8px",
            borderRadius: "10px",
            fontSize: "10px",
            fontWeight: 600,
            background: `${color}20`,
            color: color,
            border: `1px solid ${color}40`,
          }}>{display}</span>
        </td>
      </tr>
    );
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
      {/* Scrollable Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
        {/* Customer Information */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#27374f", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}><u>Customer Information</u></div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Client Name</td>
                <td style={{ padding: "4px 0", fontSize: "12px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{project.client_name || "—"}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Dealer</td>
                <td style={{ padding: "4px 0", fontSize: "12px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{project.dealer || "—"}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Building Category</td>
                <td style={{ padding: "4px 0", fontSize: "12px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{buildingCategoryName || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Project Information */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#27374f", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}><u>Project Information</u></div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Address</td>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#1e293b", textAlign: "right", lineHeight: 1.4 }}>
                  {project.formatted_address || (
                    <>
                      {project.address_line_1}<br />
                      {[project.city, project.state, project.postal_code].filter(Boolean).join(", ")}
                    </>
                  ) || "—"}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>State</td>
                <td style={{ padding: "4px 0", fontSize: "12px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>
                  {project.state || project.state_code ? `${project.state || ""}${project.state_code ? ` (${project.state_code})` : ""}` : "—"}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Project Subtotal</td>
                <td style={{ padding: "4px 0", fontSize: "12px", color: "#16a34a", fontWeight: 700, textAlign: "right" }}>{subtotal || "—"}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Invoice #</td>
                <td style={{ padding: "4px 0", fontSize: "12px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{project.invoice_number || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Workflow Status */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#27374f", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}><u>Workflow Status</u></div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <StatusChip label="Project Status" name={statusName} />
              <StatusChip label="Welcome Call" name={welcomeCallStatusName} />
              <StatusChip label="Permit" name={permitStatusName} />
            </tbody>
          </table>
        </div>

        {/* Schedule */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#27374f", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}><u>Schedule</u></div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Order Received</td>
                <td style={{ padding: "4px 0", fontSize: "12px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{formatDateTime(project.order_received_at)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f2f2f2" }}>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Scheduled</td>
                <td style={{ padding: "4px 0", fontSize: "12px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>
                  {formatDateTime(project.scheduled_project_start)}{project.scheduled_project_end ? ` → ${formatDateTime(project.scheduled_project_end)}` : ""}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Install</td>
                <td style={{ padding: "4px 0", fontSize: "12px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>
                  {formatDateTime(project.install_start)}{project.install_end ? ` → ${formatDateTime(project.install_end)}` : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Remarks */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#27374f", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}><u>Remarks</u></div>
          <div style={{ fontSize: "12px", color: "#1e293b", lineHeight: 1.5, whiteSpace: "pre-wrap", background: "#f8fafc", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>{project.project_notes || "—"}</div>
        </div>

        {routeInfo && (
          <div style={{ marginBottom: "10px", padding: "8px", background: "#f8fafc", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#27374f", textTransform: "uppercase", marginBottom: "4px", letterSpacing: "0.5px" }}><u>Route from Origin</u></div>
            <div style={{ fontSize: "11px", color: "#1e293b" }}><strong>Distance:</strong> {routeInfo.distance} · <strong>Duration:</strong> {routeInfo.duration}</div>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div style={{
        padding: "10px 16px",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        gap: "8px",
        justifyContent: "flex-end",
        background: "#fff",
      }}>
        <button onClick={onEdit} style={{
          padding: "5px 12px",
          fontSize: "11px",
          fontWeight: 600,
          borderRadius: "4px",
          border: "1px solid #e2e8f0",
          background: "#fff",
          cursor: "pointer",
          color: "#1e293b",
        }}>Edit</button>
        <button onClick={onDelete} style={{
          padding: "5px 12px",
          fontSize: "11px",
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