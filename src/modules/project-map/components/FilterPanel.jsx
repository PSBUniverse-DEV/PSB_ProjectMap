"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSliders } from "@fortawesome/free-solid-svg-icons";

export default function FilterPanel({
  statuses = [],
  permitStatuses = [],
  welcomeCallStatuses = [],
  dealers = [],
  states = [],
  filters = {},
  onFilterChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const panelRef = useRef(null);

  useEffect(() => {
    setLocalFilters(filters);
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
    onFilterChange?.(localFilters);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    const cleared = {
      search: "",
      status: "",
      permitStatus: "",
      welcomeCallStatus: "",
      dealer: "",
      state: "",
      orderReceivedFrom: "",
      orderReceivedTo: "",
      scheduledFrom: "",
      scheduledTo: "",
      installFrom: "",
      installTo: "",
    };
    setLocalFilters(cleared);
    onFilterChange?.(cleared);
    setIsOpen(false);
  };

  // Count active filters (excluding empty values)
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((v) => v && v !== "").length;
  }, [filters]);

  const statusOptions = useMemo(() => {
    return statuses.map((s) => ({ label: s.status_name, value: String(s.status_id) }));
  }, [statuses]);

  const permitStatusOptions = useMemo(() => {
    return permitStatuses.map((p) => ({ label: p.status_name, value: String(p.id) }));
  }, [permitStatuses]);

  const welcomeCallStatusOptions = useMemo(() => {
    return welcomeCallStatuses.map((w) => ({ label: w.status_name, value: String(w.id) }));
  }, [welcomeCallStatuses]);

  const uniqueDealers = useMemo(() => {
    const set = new Set(dealers.filter(Boolean));
    return Array.from(set).sort().map((d) => ({ label: d, value: d }));
  }, [dealers]);

  const uniqueStates = useMemo(() => {
    const set = new Set(states.filter(Boolean));
    return Array.from(set).sort().map((s) => ({ label: s, value: s }));
  }, [states]);

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
            minWidth: "650px",
            marginTop: "4px",
            maxHeight: "600px",
            overflowY: "auto",
          }}
        >
          {/* WORKFLOW STATUS SECTION */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid #e2e8f0" }}>
              Workflow Status
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              {/* Project Status */}
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                  Project Status
                </label>
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
                  <option value="">All</option>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Permit Status */}
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                  Permit Status
                </label>
                <select
                  value={localFilters.permitStatus || ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, permitStatus: e.target.value })}
                  style={{
                    width: "100%",
                    border: "1px solid #e2e8f0",
                    borderRadius: "3px",
                    padding: "4px 6px",
                    fontSize: "11px",
                    outline: "none",
                  }}
                >
                  <option value="">All</option>
                  {permitStatusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Welcome Call Status */}
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                  Welcome Call Status
                </label>
                <select
                  value={localFilters.welcomeCallStatus || ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, welcomeCallStatus: e.target.value })}
                  style={{
                    width: "100%",
                    border: "1px solid #e2e8f0",
                    borderRadius: "3px",
                    padding: "4px 6px",
                    fontSize: "11px",
                    outline: "none",
                  }}
                >
                  <option value="">All</option>
                  {welcomeCallStatusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* PROJECT INFORMATION SECTION */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid #e2e8f0" }}>
              Project Information
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              {/* State */}
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                  State
                </label>
                <select
                  value={localFilters.state || ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, state: e.target.value })}
                  style={{
                    width: "100%",
                    border: "1px solid #e2e8f0",
                    borderRadius: "3px",
                    padding: "4px 6px",
                    fontSize: "11px",
                    outline: "none",
                  }}
                >
                  <option value="">All</option>
                  {uniqueStates.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Dealer */}
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                  Dealer
                </label>
                <select
                  value={localFilters.dealer || ""}
                  onChange={(e) => setLocalFilters({ ...localFilters, dealer: e.target.value })}
                  style={{
                    width: "100%",
                    border: "1px solid #e2e8f0",
                    borderRadius: "3px",
                    padding: "4px 6px",
                    fontSize: "11px",
                    outline: "none",
                  }}
                >
                  <option value="">All</option>
                  {uniqueDealers.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DATE FILTERS SECTION */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid #e2e8f0" }}>
              Date Filters
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              {/* Order Received */}
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                  Order Received
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="date"
                    placeholder="From"
                    value={localFilters.orderReceivedFrom || ""}
                    onChange={(e) => setLocalFilters({ ...localFilters, orderReceivedFrom: e.target.value })}
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
                    placeholder="To"
                    value={localFilters.orderReceivedTo || ""}
                    onChange={(e) => setLocalFilters({ ...localFilters, orderReceivedTo: e.target.value })}
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
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                  Scheduled
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="date"
                    placeholder="From"
                    value={localFilters.scheduledFrom || ""}
                    onChange={(e) => setLocalFilters({ ...localFilters, scheduledFrom: e.target.value })}
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
                    placeholder="To"
                    value={localFilters.scheduledTo || ""}
                    onChange={(e) => setLocalFilters({ ...localFilters, scheduledTo: e.target.value })}
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

              {/* Arrival */}
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#64748b", marginBottom: "3px" }}>
                  Arrival
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="date"
                    placeholder="From"
                    value={localFilters.installFrom || ""}
                    onChange={(e) => setLocalFilters({ ...localFilters, installFrom: e.target.value })}
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
                    placeholder="To"
                    value={localFilters.installTo || ""}
                    onChange={(e) => setLocalFilters({ ...localFilters, installTo: e.target.value })}
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
