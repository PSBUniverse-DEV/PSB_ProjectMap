"use client";

import { useMemo, useRef, useState, useEffect } from "react";

function toRgba(hex, alpha) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex || "")) return undefined;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * RunStatusTabs — A horizontally scrollable row of run-status tabs for the
 * Runs tab, mirroring ProjectStatusTabs.
 *
 * Replaces the "Status" dropdown inside RunFilterPanel by surfacing the same
 * `runFilters.status` selection as a set of clickable full-width tabs.
 *
 * Key difference from ProjectStatusTabs: `proj_t_runs.status` is free text
 * matched exactly (case-sensitive) against `proj_s_run_status.status_name` —
 * it is NOT an ID foreign key like projects use. So each tab's value is the
 * status *name* (string), and the selected style compares directly against the
 * `runFilters.status` string. Empty string means "All" (no status filter).
 *
 * Business rule: only active statuses are shown, ordered by display_order.
 */
export default function RunStatusTabs({
  runStatuses = [],
  selectedStatus = "",
  onSelectStatus,
}) {
  const trackRef = useRef(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  // Only show active statuses, kept in display_order (ascending). The server
  // loader already filters is_active and sorts by display_order, but filtering
  // here too keeps the tabs robust if a row is missing the flag.
  const activeStatuses = useMemo(() => {
    return runStatuses
      .filter((s) => s.is_active !== false)
      .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0));
  }, [runStatuses]);

  // A tab is selected when its value (status_name string) equals the active
  // filter. Falsy selectedStatus means "Any".
  const isSelected = (statusName) =>
    statusName ? String(selectedStatus) === statusName : !selectedStatus;

  const updateFadeState = () => {
    const el = trackRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 2);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    updateFadeState();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateFadeState);
    window.addEventListener("resize", updateFadeState);
    return () => {
      el.removeEventListener("scroll", updateFadeState);
      window.removeEventListener("resize", updateFadeState);
    };
  }, [activeStatuses]);

  const scrollByAmount = (amount) => {
    trackRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  const handleSelect = (value, el) => {
    onSelectStatus?.(value);
    el?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  };

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {showLeftFade && (
        <button
          type="button"
          aria-label="Scroll run status tabs left"
          onClick={() => scrollByAmount(-160)}
          style={{ border: "none", background: "#fff", padding: "4px 6px", flexShrink: 0, cursor: "pointer" }}
        >
          <span style={{ fontSize: "13px", color: "#64748b" }}>‹</span>
        </button>
      )}
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <div
          ref={trackRef}
          style={{
            display: "flex",
            gap: "4px",
            padding: "6px 8px",
            overflowX: "auto",
            whiteSpace: "nowrap",
            scrollbarWidth: "none",
          }}
          className="pm-run-status-tabs-track"
        >
          <RunStatusTab
            label="All"
            value=""
            color="#1e293b"
            selected={isSelected("")}
            onClick={handleSelect}
          />
          {activeStatuses.map((s) => (
            <RunStatusTab
              key={s.status_id ?? s.status_name}
              label={s.status_name}
              value={s.status_name}
              color={s.display_color || "#1e293b"}
              selected={isSelected(s.status_name)}
              onClick={handleSelect}
            />
          ))}
        </div>
        {showLeftFade && (
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "16px", background: "linear-gradient(to right, #fff, transparent)", pointerEvents: "none" }} />
        )}
        {showRightFade && (
          <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "16px", background: "linear-gradient(to left, #fff, transparent)", pointerEvents: "none" }} />
        )}
      </div>
      {showRightFade && (
        <button
          type="button"
          aria-label="Scroll run status tabs right"
          onClick={() => scrollByAmount(160)}
          style={{ border: "none", background: "#fff", padding: "4px 6px", flexShrink: 0, cursor: "pointer" }}
        >
          <span style={{ fontSize: "13px", color: "#64748b" }}>›</span>
        </button>
      )}
      <style jsx>{`
        .pm-run-status-tabs-track::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
/**
 * A single run status tab button. Visually distinct when selected via a 2px
 * underline (and background tint) in the status color.
 */
function RunStatusTab({ label, value, color, selected, onClick }) {
  const ref = useRef(null);
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onClick?.(value, ref.current)}
      style={{
        padding: "4px 10px",
        fontSize: "11px",
        borderRadius: "3px",
        border: "none",
        borderBottom: `2px solid ${selected ? color : "transparent"}`,
        background: selected ? toRgba(color, 0.12) || "#f1f5f9" : "#fff",
        color: selected ? "#1e293b" : "#64748b",
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}