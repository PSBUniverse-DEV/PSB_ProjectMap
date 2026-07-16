"use client";

import { useMemo } from "react";
import { StatusBadge } from "@/shared/components/ui";

function getStatusTone(statusName) {
  if (!statusName) return "secondary";
  return "secondary";
}

function getStatusColor(statusName, statuses = []) {
  if (!statusName) return "#6b7280";
  const found = statuses.find((s) => s.status_name === statusName);
  return found?.display_color || "#6b7280";
}

export default function ProjectList({ projects = [], selectedProjectId, onSelectProject, filters = {}, statuses = [] }) {
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filters.status && String(p.status_id) !== String(filters.status)) return false;
      if (filters.dealer && p.dealer !== filters.dealer) return false;
      if (filters.state && p.state_code !== filters.state) return false;
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

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject?.(project.id)}
                style={{
                  padding: "6px 8px",
                  marginBottom: "3px",
                  background: isSelected ? "#dce8f2" : "#fff",
                  border: `1px solid ${isSelected ? "#93c5fd" : "#e2e8f0"}`,
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
                  <span style={{ fontWeight: 600, fontSize: "11px", color: "#1e293b" }}>
                    {project.client_name || "Untitled"}
                  </span>
                </div>
                <div style={{ marginBottom: "2px" }}>
                  <StatusBadge tone={getStatusTone(statusName)}>{statusName || "No Status"}</StatusBadge>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>
                  {project.city && project.state ? `${project.city}, ${project.state}` : project.formatted_address || "No location"}
                </div>
                {project.dealer && (
                  <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "1px" }}>
                    {project.dealer}
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