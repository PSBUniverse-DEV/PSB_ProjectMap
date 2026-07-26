"use client";

import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

export default function RunFilterChips({
  runFilters = {},
  onRemoveFilter,
}) {
  // Build readable filter labels
  const filterLabels = useMemo(() => {
    const labels = [];

    if (runFilters.status) {
      labels.push({
        key: "status",
        label: `Run Status: ${runFilters.status}`,
      });
    }

    if (runFilters.runDateFrom || runFilters.runDateTo) {
      const from = runFilters.runDateFrom || "—";
      const to = runFilters.runDateTo || "—";
      labels.push({
        key: "runDate",
        label: `Run Date: ${from} – ${to}`,
      });
    }

    return labels;
  }, [runFilters]);

  if (filterLabels.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        padding: "6px 10px",
        background: "#f0f9ff",
        borderBottom: "1px solid #bfdbfe",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {filterLabels.map((item) => (
        <div
          key={item.key}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 8px",
            background: "#fff",
            border: "1px solid #93c5fd",
            borderRadius: "3px",
            fontSize: "11px",
            color: "#1e40af",
          }}
        >
          <span>{item.label}</span>
          <button
            onClick={() => onRemoveFilter?.(item.key)}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              fontSize: "10px",
            }}
            title="Remove filter"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      ))}
    </div>
  );
}