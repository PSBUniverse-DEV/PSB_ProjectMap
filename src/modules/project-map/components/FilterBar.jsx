"use client";

import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

export default function FilterBar({ statuses = [], dealers = [], states = [], filters = {}, onFilterChange, onAddClick }) {
  const uniqueDealers = useMemo(() => {
    const set = new Set(dealers.filter(Boolean));
    return Array.from(set).sort().map((d) => ({ label: d, value: d }));
  }, [dealers]);

  const uniqueStates = useMemo(() => {
    const set = new Set(states.filter(Boolean));
    return Array.from(set).sort().map((s) => ({ label: s, value: s }));
  }, [states]);

  const statusOptions = useMemo(() => {
    return statuses.map((s) => ({ label: s.status_name, value: String(s.status_id) }));
  }, [statuses]);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      borderBottom: "1px solid #e2e8f0",
      background: "#fff",
      flexWrap: "wrap",
    }}>
      <div style={{ position: "relative", flex: "1 1 220px", minWidth: "180px" }}>
        <FontAwesomeIcon icon={faMagnifyingGlass} style={{
          position: "absolute",
          left: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "12px",
          color: "#94a3b8",
          pointerEvents: "none",
        }} />
        <input
          type="text"
          placeholder="Search projects..."
          value={filters.search || ""}
          onChange={(e) => onFilterChange?.({ ...filters, search: e.target.value })}
          style={{
            width: "100%",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            padding: "5px 10px 5px 28px",
            fontSize: "13px",
            outline: "none",
          }}
        />
      </div>

      <select
        value={filters.status || ""}
        onChange={(e) => onFilterChange?.({ ...filters, status: e.target.value })}
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          padding: "5px 10px",
          fontSize: "13px",
          background: "#fff",
          minWidth: "140px",
        }}
      >
        <option value="">All Statuses</option>
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        value={filters.dealer || ""}
        onChange={(e) => onFilterChange?.({ ...filters, dealer: e.target.value })}
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          padding: "5px 10px",
          fontSize: "13px",
          background: "#fff",
          minWidth: "140px",
        }}
      >
        <option value="">All Dealers</option>
        {uniqueDealers.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        value={filters.state || ""}
        onChange={(e) => onFilterChange?.({ ...filters, state: e.target.value })}
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          padding: "5px 10px",
          fontSize: "13px",
          background: "#fff",
          minWidth: "140px",
        }}
      >
        <option value="">All States</option>
        {uniqueStates.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <button
        onClick={onAddClick}
        style={{
          padding: "5px 14px",
          fontSize: "13px",
          borderRadius: "4px",
          border: "none",
          background: "#16a34a",
          color: "#fff",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        + Add Project
      </button>
    </div>
  );
}