"use client";

import { Modal } from "@/shared/components/ui";
import { PROJECT_MAP_PAGES, formatDisplayDate } from "../../data/projectMap.data";

const money = (value) => `$${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
const number = (value) => (Number(value) || 0).toLocaleString("en-US");
const dateText = (value) => (value ? formatDisplayDate(value) : "—");
const orDash = (value) => (value === "" || value == null ? "—" : value);
const HEAD = { padding: "4px 6px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 600, fontSize: "11px", position: "sticky", top: 0, background: "#fff", textAlign: "left", whiteSpace: "nowrap" };
const CELL = { padding: "4px 6px", borderBottom: "1px solid #f1f5f9", color: "#1e293b", fontSize: "12px", fontVariantNumeric: "tabular-nums" };

/**
 * The list behind a clicked bar, cell or table row on the Analytics page.
 * drill: { title, kind: "projects" | "runs", rows, dateLabel? } or null.
 * A project opens on the Project Map in a new tab, so the Analytics filters stay.
 */
export default function AnalyticsDrillModal({ drill, onClose, canOpenMap = true }) {
  const rows = drill?.rows || [];
  const isRuns = drill?.kind === "runs";
  const total = rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
  // The list is fetched from the server after the pop-up opens.
  const waiting = Boolean(drill?.loading || drill?.error);

  const columns = isRuns
    ? [
        { key: "code", label: "Run", render: (row) => orDash(row.code) },
        { key: "name", label: "Name", render: (row) => orDash(row.name) },
        { key: "date", label: "Run date", render: (row) => dateText(row.date) },
        { key: "status", label: "Status", render: (row) => orDash(row.status) },
        { key: "stops", label: "Stops", align: "right", render: (row) => number(row.stops) },
        { key: "value", label: "Planned value", align: "right", render: (row) => money(row.value) },
        { key: "miles", label: "Miles", align: "right", render: (row) => (row.miles == null ? "—" : number(row.miles)) },
        { key: "hours", label: "Hours", align: "right", render: (row) => (row.hours == null ? "—" : row.hours) },
        { key: "team", label: "Team", render: (row) => orDash(row.team) },
      ]
    : [
        { key: "client", label: "Project" },
        { key: "status", label: "Status" },
        { key: "state", label: "State", render: (row) => orDash(row.state) },
        { key: "dealer", label: "Dealer", render: (row) => orDash(row.dealer) },
        { key: "value", label: "Value", align: "right", render: (row) => money(row.value) },
        { key: "date", label: drill?.dateLabel || "Date", render: (row) => dateText(row.date) },
        ...(canOpenMap
          ? [{
              key: "open",
              label: "",
              render: (row) => (
                <a href={`${PROJECT_MAP_PAGES.map}?project=${encodeURIComponent(row.id)}`} target="_blank" rel="noopener noreferrer" style={{ whiteSpace: "nowrap" }}>
                  Open on map ↗
                </a>
              ),
            }]
          : []),
      ];

  return (
    <Modal show={Boolean(drill)} onHide={onClose} title={drill?.title || ""} size="xl">
      <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#64748b", visibility: waiting ? "hidden" : "visible" }}>
        {number(rows.length)} {isRuns ? (rows.length === 1 ? "run" : "runs") : rows.length === 1 ? "project" : "projects"}
        {" · "}
        {money(total)} {isRuns ? "planned value" : "total value"}
      </p>
      {rows.length === 0 ? (
        <p style={{ margin: 0, padding: "16px 0", textAlign: "center", fontSize: "12px", color: drill?.error ? "#991b1b" : "#94a3b8" }}>
          {drill?.loading ? "Loading…" : drill?.error ? `Could not load the list: ${drill.error}` : "Nothing to list."}
        </p>
      ) : (
        <div style={{ maxHeight: "60vh", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} style={{ ...HEAD, textAlign: column.align || "left" }}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  {columns.map((column) => (
                    <td key={column.key} style={{ ...CELL, textAlign: column.align || "left" }}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}