"use client";

import { useMemo } from "react";
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

function formatCurrency(value) {
  if (value == null) return "";
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function RunList({ runs = [], selectedRunId, onSelectRun }) {
  const sortedRuns = useMemo(() => {
    return [...runs].sort((a, b) => {
      const dateA = a.run_date ? new Date(a.run_date) : new Date(0);
      const dateB = b.run_date ? new Date(b.run_date) : new Date(0);
      return dateB - dateA;
    });
  }, [runs]);

  return (
    <div style={{ height: "100%", minHeight: 0, overflow: "auto", background: "#f8fafc", borderRight: "1px solid #e2e8f0" }}>
      <div style={{ padding: "6px 10px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        <h6 style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
          🛻 {sortedRuns.length} Run{sortedRuns.length !== 1 ? "s" : ""}
        </h6>
      </div>
      <div style={{ padding: "4px" }}>
        {sortedRuns.length === 0 ? (
          <p style={{ padding: "10px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
            No runs found.
          </p>
        ) : (
          sortedRuns.map((run) => {
            const isSelected = run.id === selectedRunId;
            const originName = run.proj_s_origin_addresses?.origin_name || "No Origin";
            const projectCount = run.stops ?? 0;
            const hasData = run.estimated_distance != null || run.estimated_subtotal != null;

            return (
              <div
                key={run.id}
                onClick={() => onSelectRun?.(run.id)}
                style={{
                  padding: "7px 8px",
                  marginBottom: "3px",
                  background: isSelected ? "#dce8f2" : "#fff",
                  border: `1px solid ${isSelected ? "#93c5fd" : "#e2e8f0"}`,
                  borderRadius: "4px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "11px", color: "#1e293b", marginBottom: "1px" }}>
                  🛻 {run.run_name || `Run #${run.run_number || "?"}`}
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>
                  {formatDate(run.run_date) || "No date"} · {originName}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
                  <StatusBadge tone={getStatusTone(run.status)}>{run.status || "Draft"}</StatusBadge>
                </div>
                <div style={{ fontSize: "9px", color: "#94a3b8", display: "flex", gap: "8px" }}>
                  <span>📍 {projectCount} stop{projectCount !== 1 ? "s" : ""}</span>
                  {hasData && (
                    <>
                      {run.estimated_distance != null && (
                        <span>📏 {(run.estimated_distance / 1000).toFixed(1)} km</span>
                      )}
                      {run.estimated_subtotal != null && (
                        <span>💰 {formatCurrency(run.estimated_subtotal)}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}