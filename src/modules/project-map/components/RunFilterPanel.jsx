"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSliders } from "@fortawesome/free-solid-svg-icons";

const RUN_STATUSES = ["Draft", "Planned", "Scheduled", "In Progress", "Completed", "Cancelled"];

export default function RunFilterPanel({
  runFilters = {},
  onFilterChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(runFilters);
  const panelRef = useRef(null);

  useEffect(() => {
    setLocalFilters(runFilters);
  }, [runFilters]);

  // Close panel when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscapeKey);
      };
    }
  }, [isOpen]);

  const handleApply = () => {
    onFilterChange?.(localFilters);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    const cleared = {
      status: "",
      runDateFrom: "",
      runDateTo: "",
    };
    setLocalFilters(cleared);
    onFilterChange?.(cleared);
    setIsOpen(false);
  };

  // Count active filters (excluding empty values)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (runFilters.status) count++;
    if (runFilters.runDateFrom || runFilters.runDateTo) count++;
    return count;
  }, [runFilters]);

  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 10px",
          fontSize: "12px",
          borderRadius: "3px",
          border: "1px solid #e2e8f0",
          background: "#fff",
          color: "#64748b",
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontWeight: 500,
        }}
      >
        <FontAwesomeIcon icon={faSliders} style={{ fontSize: "11px" }} />
        Filters
        {activeFilterCount > 0 && (
          <span
            style={{
              marginLeft: "4px",
              background: "#3b82f6",
              color: "#fff",
              borderRadius: "10px",
              padding: "0px 6px",
              fontSize: "10px",
              fontWeight: 600,
            }}
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
            zIndex: 1000,
            padding: "14px",
            minWidth: "320px",
            marginTop: "4px",
          }}
        >
          {/* RUN STATUS SECTION */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid #e2e8f0" }}>
              Run Status
            </div>
            <select
              value={localFilters.status || ""}
              onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
              style={{
                width: "100%",
                border: "1px solid #e2e8f0",
                borderRadius: "3px",
                padding: "4px 6px",
                fontSize: "11px",
                outline: "none",
              }}
            >
              <option value="">All Statuses</option>
              {RUN_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* RUN DATE SECTION */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid #e2e8f0" }}>
              Run Date
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={localFilters.runDateFrom || ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, runDateFrom: e.target.value })}
                  style={{
                    width: "100%",
                    border: "1px solid #e2e8f0",
                    borderRadius: "3px",
                    padding: "4px 6px",
                    fontSize: "11px",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={localFilters.runDateTo || ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, runDateTo: e.target.value })}
                  style={{
                    width: "100%",
                    border: "1px solid #e2e8f0",
                    borderRadius: "3px",
                    padding: "4px 6px",
                    fontSize: "11px",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "12px", marginTop: "12px" }}>
            <button
              onClick={handleClearAll}
              style={{
                padding: "4px 12px",
                fontSize: "11px",
                borderRadius: "3px",
                border: "1px solid #e2e8f0",
                background: "#f1f5f9",
                color: "#64748b",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Clear All
            </button>
            <button
              onClick={handleApply}
              style={{
                padding: "4px 12px",
                fontSize: "11px",
                borderRadius: "3px",
                border: "none",
                background: "#3b82f6",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}