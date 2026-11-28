"use client";

import { WEEKDAYS } from "../../data/projectMap.analytics";

// One hue (blue), light to dark = fewer to more. Days with none stay pale grey.
const STEPS = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95"];
const EMPTY = "#f1f5f9";

function stepFor(value, max) {
  if (!value || !max) return -1;
  return Math.min(STEPS.length - 1, Math.ceil((value / max) * STEPS.length) - 1);
}

/**
 * Weekday × week heat map: one row per weekday, one column per week. Each cell
 * names its day and count on hover and to screen readers; numbers are printed
 * in the cells when the weeks are few enough to fit them.
 */
export default function AnalyticsHeatmap({ weeks = [], max = 0, unit = "installs" }) {
  const showNumbers = weeks.length <= 16;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", height: "100%" }}>
      <div
        role="grid"
        aria-label={`${unit} by weekday and week`}
        style={{ display: "grid", gridTemplateColumns: `34px repeat(${Math.max(weeks.length, 1)}, minmax(0, 1fr))`, gridAutoRows: "1fr", gap: "2px", flex: 1, minHeight: 0 }}
      >
        {WEEKDAYS.map((weekday, dayIndex) => (
          <div key={weekday} role="row" style={{ display: "contents" }}>
            <div role="rowheader" style={{ fontSize: "11px", color: "#64748b", alignSelf: "center" }}>{weekday}</div>
            {weeks.map((week) => {
              const value = week.counts[dayIndex];
              const step = stepFor(value, max);
              const label = `${weekday}, week of ${week.label}: ${value} ${unit}`;
              return (
                <div
                  key={week.key}
                  role="gridcell"
                  title={label}
                  aria-label={label}
                  style={{
                    background: step < 0 ? EMPTY : STEPS[step],
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    color: step >= 3 ? "#fff" : "#0f172a",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {showNumbers && value > 0 ? value : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#64748b" }}>
        <span>Fewer</span>
        {[EMPTY, ...STEPS].map((color) => (
          <span key={color} style={{ width: "14px", height: "10px", background: color, borderRadius: "2px", display: "inline-block" }} />
        ))}
        <span>More</span>
        {weeks.length > 0 && <span style={{ marginLeft: "auto" }}>Weeks of {weeks[0].label} – {weeks[weeks.length - 1].label}</span>}
      </div>
    </div>
  );
}