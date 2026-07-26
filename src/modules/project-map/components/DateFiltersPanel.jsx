"use client";

import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar } from "@fortawesome/free-solid-svg-icons";

export default function DateFiltersPanel({ filters = {}, onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    orderReceivedFrom: filters.orderReceivedFrom || "",
    orderReceivedTo: filters.orderReceivedTo || "",
    scheduledFrom: filters.scheduledFrom || "",
    scheduledTo: filters.scheduledTo || "",
    installFrom: filters.installFrom || "",
    installTo: filters.installTo || "",
  });
  const panelRef = useRef(null);

  useEffect(() => {
    setLocalFilters({
      orderReceivedFrom: filters.orderReceivedFrom || "",
      orderReceivedTo: filters.orderReceivedTo || "",
      scheduledFrom: filters.scheduledFrom || "",
      scheduledTo: filters.scheduledTo || "",
      installFrom: filters.installFrom || "",
      installTo: filters.installTo || "",
    });
  }, [filters]);

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
    onFilterChange?.({
      ...filters,
      orderReceivedFrom: localFilters.orderReceivedFrom,
      orderReceivedTo: localFilters.orderReceivedTo,
      scheduledFrom: localFilters.scheduledFrom,
      scheduledTo: localFilters.scheduledTo,
      installFrom: localFilters.installFrom,
      installTo: localFilters.installTo,
    });
    setIsOpen(false);
  };

  const handleClearAll = () => {
    setLocalFilters({
      orderReceivedFrom: "",
      orderReceivedTo: "",
      scheduledFrom: "",
      scheduledTo: "",
      installFrom: "",
      installTo: "",
    });
    onFilterChange?.({
      ...filters,
      orderReceivedFrom: "",
      orderReceivedTo: "",
      scheduledFrom: "",
      scheduledTo: "",
      installFrom: "",
      installTo: "",
    });
    setIsOpen(false);
  };

  const hasActiveFilters =
    filters.orderReceivedFrom ||
    filters.orderReceivedTo ||
    filters.scheduledFrom ||
    filters.scheduledTo ||
    filters.installFrom ||
    filters.installTo;

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
          border: hasActiveFilters ? "1px solid #3b82f6" : "1px solid #e2e8f0",
          background: hasActiveFilters ? "#eff6ff" : "#fff",
          color: hasActiveFilters ? "#1e40af" : "#64748b",
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontWeight: hasActiveFilters ? 600 : 400,
        }}
      >
        <FontAwesomeIcon icon={faCalendar} style={{ fontSize: "11px" }} />
        Date Filters
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
            padding: "12px",
            minWidth: "400px",
            marginTop: "4px",
          }}
        >
          {/* Order Received */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
              Order Received
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="date"
                value={localFilters.orderReceivedFrom}
                onChange={(e) => setLocalFilters({ ...localFilters, orderReceivedFrom: e.target.value })}
                placeholder="Start Date"
                style={{
                  flex: 1,
                  border: "1px solid #e2e8f0",
                  borderRadius: "3px",
                  padding: "4px 6px",
                  fontSize: "11px",
                  outline: "none",
                }}
              />
              <input
                type="date"
                value={localFilters.orderReceivedTo}
                onChange={(e) => setLocalFilters({ ...localFilters, orderReceivedTo: e.target.value })}
                placeholder="End Date"
                style={{
                  flex: 1,
                  border: "1px solid #e2e8f0",
                  borderRadius: "3px",
                  padding: "4px 6px",
                  fontSize: "11px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Scheduled */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
              Scheduled
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="date"
                value={localFilters.scheduledFrom}
                onChange={(e) => setLocalFilters({ ...localFilters, scheduledFrom: e.target.value })}
                placeholder="Start Date"
                style={{
                  flex: 1,
                  border: "1px solid #e2e8f0",
                  borderRadius: "3px",
                  padding: "4px 6px",
                  fontSize: "11px",
                  outline: "none",
                }}
              />
              <input
                type="date"
                value={localFilters.scheduledTo}
                onChange={(e) => setLocalFilters({ ...localFilters, scheduledTo: e.target.value })}
                placeholder="End Date"
                style={{
                  flex: 1,
                  border: "1px solid #e2e8f0",
                  borderRadius: "3px",
                  padding: "4px 6px",
                  fontSize: "11px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Install */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
              Install
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="date"
                value={localFilters.installFrom}
                onChange={(e) => setLocalFilters({ ...localFilters, installFrom: e.target.value })}
                placeholder="Start Date"
                style={{
                  flex: 1,
                  border: "1px solid #e2e8f0",
                  borderRadius: "3px",
                  padding: "4px 6px",
                  fontSize: "11px",
                  outline: "none",
                }}
              />
              <input
                type="date"
                value={localFilters.installTo}
                onChange={(e) => setLocalFilters({ ...localFilters, installTo: e.target.value })}
                placeholder="End Date"
                style={{
                  flex: 1,
                  border: "1px solid #e2e8f0",
                  borderRadius: "3px",
                  padding: "4px 6px",
                  fontSize: "11px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
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
