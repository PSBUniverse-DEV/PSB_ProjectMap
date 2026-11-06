"use client";

import { useMemo } from "react";
import { StatusBadge } from "@/shared/components/ui";
import { stripTownshipLabel, getProjectAmountDisplay } from "../data/projectMap.data";

function getStatusTone(statusName) {
  if (!statusName) return "secondary";
  return "secondary";
}

function getStatusColor(statusName, statuses = []) {
  if (!statusName) return "#6b7280";
  const found = statuses.find((s) => s.status_name === statusName);
  return found?.display_color || "#6b7280";
}

// Age flag (requested by Scheduling): how long a project has been on the map,
// counted from when it was entered (created_at), so old orders aren't missed.
// Under 14 days green, 14–20 orange, 21+ red.
const AGE_DAY_MS = 24 * 60 * 60 * 1000;
const AGE_BANDS = [
  { maxDays: 13, color: "#16a34a" },
  { maxDays: 20, color: "#d97706" },
  { maxDays: Infinity, color: "#dc2626" },
];
// Done or past installation: no age flag. Fully Installed / Repaired have
// system keys; Completed, Pending Payment and Collections have none, so
// they are matched by name.
const AGE_EXEMPT_STATUS_KEYS = ["fully_installed", "repaired"];
const AGE_EXEMPT_STATUS_NAMES = ["completed", "pending payment", "collections"];

// { days, color, label } or null when the project gets no age flag.
function getProjectAge(project, statuses, now) {
  if (!project?.created_at) return null;
  const status = project.proj_s_project_status || statuses.find((s) => s.status_id === project.status_id);
  if (AGE_EXEMPT_STATUS_KEYS.includes(status?.system_key)) return null;
  if (AGE_EXEMPT_STATUS_NAMES.includes(String(status?.status_name || "").trim().toLowerCase())) return null;
  const created = new Date(project.created_at);
  if (Number.isNaN(created.getTime())) return null;
  const days = Math.max(0, Math.floor((now.getTime() - created.getTime()) / AGE_DAY_MS));
  const band = AGE_BANDS.find((b) => days <= b.maxDays);
  return { days, color: band.color, label: days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}` };
}

export default function ProjectList({ projects = [], selectedProjectId, onSelectProject, filters = {}, statuses = [] }) {
  // Helper to extract calendar date (YYYY-MM-DD) from any date value
  const toDateString = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      // If it's already a string, extract just the date part (YYYY-MM-DD)
      return value.split('T')[0];
    }
    const d = new Date(value);
    return d.toISOString().split('T')[0];
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (Array.isArray(filters.status) && filters.status.length > 0 && !filters.status.includes(String(p.status_id))) return false;
      if (Array.isArray(filters.permitStatus) && filters.permitStatus.length > 0 && !filters.permitStatus.includes(String(p.permit_status_id))) return false;
      if (Array.isArray(filters.welcomeCallStatus) && filters.welcomeCallStatus.length > 0 && !filters.welcomeCallStatus.includes(String(p.welcome_call_status_id))) return false;
      if (Array.isArray(filters.confirmationStatus) && filters.confirmationStatus.length > 0 && !filters.confirmationStatus.includes(String(p.confirmation_status_id))) return false;
      if (Array.isArray(filters.dealer) && filters.dealer.length > 0 && !filters.dealer.includes(p.dealer)) return false;
      if (Array.isArray(filters.state) && filters.state.length > 0 && !filters.state.includes(p.state_code)) return false;
      
      // Order Received date filter (compare calendar dates only)
      if (filters.orderReceivedFrom || filters.orderReceivedTo) {
        const projectDate = toDateString(p.order_received_at);
        if (projectDate) {
          if (filters.orderReceivedFrom && projectDate < filters.orderReceivedFrom) return false;
          if (filters.orderReceivedTo && projectDate > filters.orderReceivedTo) return false;
        } else if (filters.orderReceivedFrom || filters.orderReceivedTo) {
          return false;
        }
      }
      
      // Scheduled date filter (compare calendar dates only)
      if (filters.scheduledFrom || filters.scheduledTo) {
        const projectDate = toDateString(p.scheduled_project_start);
        if (projectDate) {
          if (filters.scheduledFrom && projectDate < filters.scheduledFrom) return false;
          if (filters.scheduledTo && projectDate > filters.scheduledTo) return false;
        } else if (filters.scheduledFrom || filters.scheduledTo) {
          return false;
        }
      }
      
      // Install date filter (compare calendar dates only)
      if (filters.installFrom || filters.installTo) {
        const projectDate = toDateString(p.install_start);
        if (projectDate) {
          if (filters.installFrom && projectDate < filters.installFrom) return false;
          if (filters.installTo && projectDate > filters.installTo) return false;
          return false;
        }
      }
      
      if (filters.search) {

        const q = filters.search.toLowerCase();
        const match =
          (p.client_name && p.client_name.toLowerCase().includes(q)) ||
          (p.formatted_address && p.formatted_address.toLowerCase().includes(q)) ||
          (p.city && p.city.toLowerCase().includes(q)) ||
          (p.state && p.state.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [projects, filters]);

  const now = new Date();

  return (
    <div style={{ height: "100%", minHeight: 0, overflow: "auto", background: "#f8fafc", borderRight: "1px solid #e2e8f0" }}>
      <div style={{ padding: "6px 10px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        <h6 style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
          {filteredProjects.length} Project{filteredProjects.length !== 1 ? "s" : ""}
        </h6>
      </div>
      <div style={{ padding: "4px" }}>
        {filteredProjects.length === 0 ? (
          <p style={{ padding: "10px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
            No projects found.
          </p>
        ) : (
          filteredProjects.map((project) => {
            const statusName = project.proj_s_project_status?.status_name || "";
            const isSelected = project.id === selectedProjectId;
            const amount = getProjectAmountDisplay(project, statuses);
            const age = getProjectAge(project, statuses, now);

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject?.(project.id)}
                style={{
                  padding: "6px 8px",
                  marginBottom: "3px",
                  background: isSelected ? "#dce8f2" : "#fff",
                  border: `1px solid ${isSelected ? "#93c5fd" : "#e2e8f0"}`,
                  borderLeft: `3px solid ${age ? age.color : (isSelected ? "#93c5fd" : "#e2e8f0")}`,
                  borderRadius: "4px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "1px" }}>
                  <span style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: getStatusColor(statusName, statuses),
                    flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 600, fontSize: "11px", color: "#1e293b", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {project.client_name || "Untitled"}
                  </span>
                  {age && (
                    <span title="Days since this project was entered on the map" style={{ marginLeft: "auto", flexShrink: 0, fontSize: "9px", fontWeight: 600, color: age.color }}>
                      {age.label}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>
                  {project.city && project.state ? `${stripTownshipLabel(project.city)}, ${project.state}` : stripTownshipLabel(project.formatted_address) || "No location"}
                </div>
                {project.dealer && (
                  <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "1px" }}>
                    {project.dealer}
                  </div>
                )}
                {project.project_subtotal != null && (
                  <div style={{ fontSize: "10px", color: amount.color, fontWeight: 600, marginTop: "2px" }}>
                    {amount.prefix}${Number(project.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}