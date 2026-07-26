"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import FilterPanel from "./FilterPanel";

export default function FilterBar({ statuses = [], permitStatuses = [], welcomeCallStatuses = [], dealers = [], states = [], filters = {}, onFilterChange, onAddClick }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 10px",
      borderBottom: "1px solid #e2e8f0",
      background: "#fff",
      flexWrap: "wrap",
    }}>
      <div style={{ position: "relative", flex: "1 1 180px", minWidth: "140px" }}>
        <FontAwesomeIcon icon={faMagnifyingGlass} style={{
          position: "absolute",
          left: "8px",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "11px",
          color: "#94a3b8",
          pointerEvents: "none",
        }} />
        <input
          type="text"
          placeholder="Search..."
          value={filters.search || ""}
          onChange={(e) => onFilterChange?.({ ...filters, search: e.target.value })}
          style={{
            width: "100%",
            border: "1px solid #e2e8f0",
            borderRadius: "3px",
            padding: "3px 8px 3px 24px",
            fontSize: "12px",
            outline: "none",
          }}
        />
      </div>

      <FilterPanel
        statuses={statuses}
        permitStatuses={permitStatuses}
        welcomeCallStatuses={welcomeCallStatuses}
        dealers={dealers}
        states={states}
        filters={filters}
        onFilterChange={onFilterChange}
      />

      <button
        onClick={onAddClick}
        style={{
          padding: "3px 10px",
          fontSize: "12px",
          borderRadius: "3px",
          border: "none",
          background: "#16a34a",
          color: "#fff",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        + Add
      </button>
    </div>
  );
}