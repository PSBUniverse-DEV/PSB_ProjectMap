"use client";

import { useState } from "react";

/**
 * One report on the Analytics page: title, a short note, the chart, and a
 * "Table" switch that shows the same numbers as a table, so every value can
 * be read without hovering.
 * columns: [{ key, label, align?, format?(value, row) }]; rows: the table rows.
 */
export default function AnalyticsChartCard({ title, note, columns = [], rows = [], height = 260, empty = "No data for these filters.", children }) {
  const [showTable, setShowTable] = useState(false);
  const hasRows = rows.length > 0;

  return (
    <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{title}</h3>
          {note && <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>{note}</p>}
        </div>
        {hasRows && (
          <button
            type="button"
            onClick={() => setShowTable((value) => !value)}
            aria-pressed={showTable}
            style={{ flexShrink: 0, border: "1px solid #e2e8f0", background: showTable ? "#f1f5f9" : "#fff", borderRadius: "3px", padding: "2px 8px", fontSize: "11px", color: "#334155", cursor: "pointer" }}
          >
            {showTable ? "Chart" : "Table"}
          </button>
        )}
      </div>

      {!hasRows ? (
        <p style={{ margin: 0, padding: "24px 0", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>{empty}</p>
      ) : showTable ? (
        <div style={{ overflow: "auto", maxHeight: `${Math.max(height, 200)}px` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} style={{ textAlign: column.align || "left", padding: "4px 6px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 600, position: "sticky", top: 0, background: "#fff" }}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.key || row.statusId || row.name || index}>
                  {columns.map((column) => (
                    <td key={column.key} style={{ textAlign: column.align || "left", padding: "4px 6px", borderBottom: "1px solid #f1f5f9", color: "#1e293b", fontVariantNumeric: "tabular-nums" }}>
                      {column.format ? column.format(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ width: "100%", height: `${height}px` }}>{children}</div>
      )}
    </section>
  );
}