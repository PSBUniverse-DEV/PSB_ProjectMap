"use client";

import { useMemo } from "react";

function formatCurrency(value) {
  if (value == null) return "";
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatMileage(miles) {
  if (miles == null) return "";
  return `${Number(miles).toFixed(1)} mi`;
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

export default function RunList({ runs = [], selectedRunId, onSelectRun, isLoading = false }) {
  const sortedRuns = useMemo(() => {
    return [...runs].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
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
            const hasData = run.estimated_distance != null || run.estimated_mileage != null || run.estimated_subtotal != null;

            return (
              <div
                key={run.id}
                onClick={() => !isLoading && onSelectRun?.(run.id)}
                style={{
                  padding: "7px 8px",
                  marginBottom: "3px",
                  background: isSelected ? "#dce8f2" : "#fff",
                  border: `1px solid ${isSelected ? "#93c5fd" : "#e2e8f0"}`,
                  borderRadius: "4px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "11px", color: "#1e293b", marginBottom: "1px" }}>
                  🛻 {run.run_name || run.run_code || `Run #${run.run_number || "?"}`}
                </div>
                {run.run_code && (
                  <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "1px" }}>
                    {run.run_code}
                  </div>
                )}
                {isLoading && isSelected ? (
                  <div style={{ fontSize: "10px", color: "#3b82f6", fontStyle: "italic" }}>Loading...</div>
                ) : (
                  <div style={{ fontSize: "9px", color: "#94a3b8", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span>📍 {projectCount} stop{projectCount !== 1 ? "s" : ""}</span>
                    {hasData && (
                      <>
                        {run.estimated_distance != null && (
                          <span>📏 {(run.estimated_distance / 1609.344).toFixed(1)} mi</span>
                        )}
                        {run.estimated_mileage != null && (
                          <span>🛣️ {formatMileage(run.estimated_mileage)}</span>
                        )}
                        {run.estimated_subtotal != null && (
                          <span>💰 {formatCurrency(run.estimated_subtotal)}</span>
                        )}
                      </>
                    )}
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