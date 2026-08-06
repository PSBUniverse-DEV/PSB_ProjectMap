"use client";


import { useMemo, useState, useRef } from "react";
import { StatusBadge } from "@/shared/components/ui";

function formatDistance(meters) {
  if (meters == null) return "—";
  return `${(meters / 1609.344).toFixed(1)} mi`;
}

function formatDuration(seconds) {
  if (seconds == null) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs} hr ${rem} min`;
}

function formatCurrency(value) {
  if (value == null) return "—";
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMileage(miles) {
  if (miles == null) return "—";
  return `${Number(miles).toFixed(1)} mi`;
}

export default function RunDetailPanel({ run, runProjects = [], runSegmentData = null, onClose, onEdit, onDelete, onRemoveProject, onReorderStops, onRecalculate, recalculating = false, onEditStopNote, isLoading = false }) {
  if (!run) return null;

  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const runSegmentDataRef = useRef(runSegmentData);
  runSegmentDataRef.current = runSegmentData;

  const originName = run.proj_s_origin_addresses?.origin_name || "No Origin";
  const hasStops = runProjects.length > 0;
  const totalDistance = hasStops ? formatDistance(run.estimated_distance) : "—";
  const totalMileage = hasStops ? formatMileage(run.estimated_mileage) : "—";
  const totalDuration = hasStops ? formatDuration(run.estimated_duration) : "—";
  const totalSubtotal = hasStops ? formatCurrency(run.estimated_subtotal) : "$0.00";

  const stopSubtotals = useMemo(() => {
    return runProjects.map((rp) => {
      const proj = rp.proj_t_projects || {};
      return Number(proj.project_subtotal) || 0;
    });
  }, [runProjects]);

  const totalRevenue = useMemo(() => stopSubtotals.reduce((s, v) => s + v, 0), [stopSubtotals]);

  const routeStats = useMemo(() => {
    if (!runSegmentData?.segments || runSegmentData.segments.length === 0) return null;
    const segs = runSegmentData.segments;
    const distances = segs.map((s) => s.distance);
    return {
      totalStops: runProjects.length,
      avgDuration: segs.reduce((s, seg) => s + seg.duration, 0) / segs.length,
      longestLeg: Math.max(...distances),
      shortestLeg: Math.min(...distances),
    };
  }, [runSegmentData, runProjects]);

  const handlePrint = () => {
    const now = new Date();
    const printDate = now.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

    const formatInstallDate = (start, end) => {
      if (!start && !end) return "—";
      try {
        const s = start ? new Date(start) : null;
        const e = end ? new Date(end) : null;
        const fmt = (d) => d ? d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";
        if (s && e) return `${fmt(s)} – ${fmt(e)}`;
        if (s) return fmt(s);
        return fmt(e);
      } catch { return "—"; }
    };

    const getProjectStatusName = (proj) => proj.proj_s_project_status?.status_name || "—";
    const originAddress = run.proj_s_origin_addresses?.formatted_address || run.proj_s_origin_addresses?.address_line_1 || originName;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const stopsHtml = runProjects.map((rp, idx) => {
      const proj = rp.proj_t_projects || {};
      const stopNum = idx + 1;
      const segment = runSegmentDataRef.current?.segments?.[idx];
      const segDistance = segment ? formatDistance(segment.distance) : "—";
      const segDuration = segment ? formatDuration(segment.duration) : "—";
      const sub = formatCurrency(stopSubtotals[idx]);
      const installDate = formatInstallDate(proj.install_start, proj.install_end);
      const address = proj.formatted_address || (
        [proj.address_line_1, proj.city, proj.state, proj.postal_code].filter(Boolean).join(", ")
      ) || "No address";
      const notes = proj.project_notes || "";
      const statusName = getProjectStatusName(proj);
      const distanceLabel = idx === 0 ? `Origin → Stop #${stopNum}` : `Stop #${idx} → Stop #${stopNum}`;

      const installStartFormatted = proj.install_start ? (() => {
        try {
          const d = new Date(proj.install_start);
          const date = d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const day = d.toLocaleString("en-US", { weekday: "short" });
          const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
          return `${date} | ${day} | ${time}`;
        } catch { return "—"; }
      })() : "—";

      const installEndFormatted = proj.install_end ? (() => {
        try {
          const d = new Date(proj.install_end);
          const date = d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const day = d.toLocaleString("en-US", { weekday: "short" });
          const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
          return `${date} | ${day} | ${time}`;
        } catch { return "—"; }
      })() : "—";

      return `
        <div class="stop">
          <div class="stop-badge">${stopNum}</div>
          <div class="stop-main">
            <div class="stop-primary">
              <div class="client-line">${proj.client_name || "Untitled"} ${proj.invoice_number ? `&mdash; Invoice #${proj.invoice_number}` : ""} ${proj.proj_s_building_categories?.building_category_name ? `&mdash; ${proj.proj_s_building_categories.building_category_name}` : ""}</div>
              <div class="address-line">${address} <span class="state">${proj.state || proj.state_code ? `· ${proj.state || ""}${proj.state_code ? " (" + proj.state_code + ")" : ""}` : ""}</span></div>
            </div>
            <div class="stop-window">
              <div class="field">
                <div class="field-label">${distanceLabel}</div>
                <div class="field-value num">${segDistance}</div>
              </div>
              <div class="field">
                <div class="field-label">Travel time</div>
                <div class="field-value num">${segDuration}</div>
              </div>
              <div class="field">
                <div class="field-label">Arrival from</div>
                <div class="field-value num">${installStartFormatted}</div>
              </div>
              <div class="field">
                <div class="field-label">Arrival by</div>
                <div class="field-value num">${installEndFormatted}</div>
              </div>
            </div>
            <div class="stop-money">
              <div class="subtotal-label">Subtotal</div>
              <div class="subtotal-value num">${sub}</div>
            </div>
          </div>
          ${notes ? `
          <div class="stop-notes">${notes}</div>
          ` : ""}
        </div>
      `;
    }).join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Run Manifest — #${run.run_number || "?"} — ${run.run_date || "Unscheduled"}</title>
        <style>
          :root {
            --ink: #0f1720;
            --body: #1e293b;
            --muted: #64748b;
            --faint: #94a3b8;
            --line: #e2e8f0;
            --line-strong: #cbd5e1;
            --accent: #1e3a5f;
            --money: #15803d;
            --money-bg: #f0fdf4;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: var(--body);
            background: #fff;
            font-size: 11px;
            line-height: 1.35;
            -webkit-font-smoothing: antialiased;
          }
          body { padding: 20px; max-width: 210mm; margin: 0 auto; }
          @page { size: A4 portrait; margin: 12mm 14mm; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
          .num { font-variant-numeric: tabular-nums; }
          .toolbar {
            display: flex; justify-content: center; gap: 8px;
            margin-bottom: 16px; padding: 8px;
            background: #f0f9ff; border: 1px solid #93c5fd; border-radius: 6px;
          }
          .toolbar button {
            padding: 6px 18px; font-size: 12px; font-weight: 600; border-radius: 4px; cursor: pointer;
          }
          .btn-primary { border: none; background: var(--ink); color: #fff; }
          .btn-secondary { border: 1px solid var(--line); background: #fff; color: var(--ink); }
          .doc-header {
            display: flex; align-items: flex-end; justify-content: space-between;
            padding-bottom: 10px; margin-bottom: 10px;
            border-bottom: 2px solid var(--ink);
          }
          .doc-kicker {
            font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
            color: var(--muted); margin-bottom: 3px;
          }
          .doc-title { font-size: 20px; font-weight: 800; color: var(--ink); letter-spacing: -0.3px; }
          .doc-meta { text-align: right; font-size: 10px; color: var(--muted); }
          .doc-meta .run-date { font-size: 13px; font-weight: 700; color: var(--ink); }
          .info-strip {
            display: grid;
            grid-template-columns: 1.3fr 1.6fr 0.9fr 0.9fr 1.1fr;
            border: 1px solid var(--line);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 4px;
          }
          .info-cell {
            padding: 7px 10px;
            border-right: 1px solid var(--line);
          }
          .info-cell:last-child { border-right: none; }
          .info-cell.revenue { background: var(--money-bg); }
          .info-label {
            font-size: 8.5px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase;
            color: var(--faint); margin-bottom: 2px;
          }
          .info-value { font-size: 11.5px; font-weight: 600; color: var(--ink); }
          .info-value.small { font-size: 10px; font-weight: 500; line-height: 1.3; }
          .info-value.money { font-size: 14px; font-weight: 800; color: var(--money); }
          .printed-line {
            font-size: 8.5px; color: var(--faint); text-align: right; margin-bottom: 14px;
          }
          .stops-header {
            display: flex; align-items: center; justify-content: space-between;
            font-size: 9px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
            color: var(--muted); padding-bottom: 4px; margin-bottom: 6px;
            border-bottom: 1px solid var(--line-strong);
          }
          .stop {
            display: grid;
            grid-template-columns: 26px 1fr;
            gap: 10px;
            padding: 11px 0;
            border-bottom: 1px solid var(--line);
            page-break-inside: avoid;
            align-items: center;
          }
          .stop:last-child { border-bottom: none; }
          .stop-badge {
            width: 22px; height: 22px; border-radius: 50%;
            background: var(--accent); color: #fff;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700;
            align-self: start;
          }
          .stop-main {
            display: grid;
            grid-template-columns: 1.05fr 1.55fr 0.55fr;
            gap: 12px;
            align-items: center;
          }
          .stop-primary .client-line {
            font-size: 12.5px; font-weight: 700; color: var(--ink);
          }
          .stop-primary .client-line .invoice {
            font-size: 10px; font-weight: 500; color: var(--muted); margin-left: 4px;
          }
          .stop-primary .building-pill {
            display: inline-block; margin-top: 3px;
            font-size: 8.5px; font-weight: 600; color: var(--accent);
            background: #eaf0f6; border-radius: 3px; padding: 1px 6px;
          }
          .stop-primary .address-line {
            font-size: 10.5px; color: var(--muted); margin-top: 5px; line-height: 1.45;
          }
          .stop-primary .address-line .state {
            color: var(--faint);
          }
          .stop-window {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 12px;
            row-gap: 6px;
          }
          .stop-window .field-label {
            font-size: 8px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
            color: var(--faint); margin-bottom: 1px;
          }
          .stop-window .field-value {
            white-space: nowrap;
            font-size: 10.5px; font-weight: 600; color: var(--ink);
          }
          .stop-window .field-value.muted-val {
            color: var(--faint); font-weight: 500;
          }
          .stop-money { text-align: right; }
          .stop-money .subtotal-label {
            font-size: 8.5px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
            color: var(--faint); margin-bottom: 2px;
          }
          .stop-money .subtotal-value {
            font-size: 13px; font-weight: 800; color: var(--money);
          }
          .stop-notes {
            grid-column: 2 / 3;
            margin-top: 5px;
            font-size: 9.5px; color: var(--body);
            background: #f8fafc; border: 1px solid var(--line); border-radius: 3px;
            padding: 4px 7px; white-space: pre-wrap; line-height: 1.35;
          }
          .signoff {
            margin-top: 26px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .sig-line {
            border-top: 1px solid var(--ink);
            padding-top: 5px;
            text-align: center;
            font-size: 8.5px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
            color: var(--muted);
          }
          .sig-date {
            margin: 18px auto 0; max-width: 220px;
            border-top: 1px solid var(--ink);
            padding-top: 5px; text-align: center;
            font-size: 8.5px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
            color: var(--muted);
          }
          .doc-footer {
            margin-top: 18px; padding-top: 6px; border-top: 1px solid var(--line);
            display: flex; justify-content: space-between;
            font-size: 8px; color: var(--faint);
          }
        </style>
      </head>
      <body>
        <div class="no-print toolbar">
          <button class="btn-primary" onclick="window.print()">Print manifest</button>
          <button class="btn-secondary" onclick="window.close()">Close</button>
        </div>

        <div class="doc-header">
          <div>
            <div class="doc-kicker">Delivery manifest</div>
            <div class="doc-title">Run #${run.run_number || "?"} &mdash; ${run.run_date ? new Date(run.run_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Unscheduled"}</div>
          </div>
          <div class="doc-meta">
            <div class="run-date num">${run.run_date || "—"}</div>
            <div>${runProjects.length} stop${runProjects.length !== 1 ? "s" : ""}</div>
          </div>
        </div>

        <div class="info-strip">
          <div class="info-cell">
            <div class="info-label">Origin address</div>
            <div class="info-value small">${originAddress}</div>
          </div>
          <div class="info-cell">
            <div class="info-label">Installer</div>
            <div class="info-value small">${run.team_assigned || "&mdash;"}</div>
          </div>
          <div class="info-cell">
            <div class="info-label">Total stops</div>
            <div class="info-value num">${runProjects.length}</div>
          </div>
          <div class="info-cell">
            <div class="info-label">Run date</div>
            <div class="info-value num">${run.run_date ? new Date(run.run_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "&mdash;"}</div>
          </div>
          <div class="info-cell revenue">
            <div class="info-label">Total revenue</div>
            <div class="info-value money num">${formatCurrency(totalRevenue)}</div>
          </div>
        </div>
        <div class="printed-line">Printed ${printDate}</div>

        <div class="stops-header">
          <span>Stop details</span>
        </div>

        ${stopsHtml || '<div style="color: var(--muted); font-style: italic;">No stops assigned to this run.</div>'}

        <div class="signoff">
          <div class="sig-line">Prepared by</div>
          <div class="sig-line">Received by</div>
        </div>
        <div class="sig-date">Date</div>

        <div class="doc-footer">
          <span>PSBUniverse &middot; Project Map</span>
          <span>Run #${run.run_number || "?"}</span>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const status = run.status || "Draft";
  const actionButtons = useMemo(() => {
    const btns = [{ label: "Edit", onClick: onEdit, variant: "secondary" }];
    if (status === "Draft") {
      btns.push({ label: "Print Record", onClick: handlePrint, variant: "primary" });
    } else if (status === "Planned") {
      btns.push({ label: "Print Record", onClick: handlePrint, variant: "primary" });
    } else if (status === "In Progress") {
      btns.push({ label: "Print Record", onClick: handlePrint, variant: "secondary" });
    } else if (status === "Completed") {
      btns.push({ label: "Print Record", onClick: handlePrint, variant: "primary" });
      btns.push({ label: "Duplicate", onClick: () => {}, variant: "secondary" });
    } else {
      btns.push({ label: "Print Record", onClick: handlePrint, variant: "primary" });
    }
    return btns;
  }, [status, onEdit]);

  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: "320px", height: "100%", background: "#fff", borderLeft: "1px solid #e2e8f0", boxShadow: "-4px 0 12px rgba(0,0,0,0.08)", zIndex: 10, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              <span style={{ fontSize: "13px" }}>🛻</span>
              <h6 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{run.run_name || `Run #${run.run_number || "?"}`}</h6>
            </div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>{run.run_date || "No date"}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b", lineHeight: 1, padding: "0" }}>×</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "10px 12px" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px", animation: "recalcSpin 0.8s linear infinite" }}>⟳</div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>Loading Run Details...</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Please wait while we fetch the run data.</div>
          </div>
        ) : (
          <>
            {/* Run Status — centered, full width, above Route Summary */}
            <div style={{ textAlign: "center", marginBottom: "10px" }}>
              <StatusBadge status={status} />
            </div>

            <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", borderRadius: "6px", padding: "10px 12px", marginBottom: "10px", color: "#fff" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "6px", letterSpacing: "0.5px" }}>Route Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <div><div style={{ fontSize: "9px", color: "#94a3b8" }}>Distance</div><div style={{ fontSize: "16px", fontWeight: 700 }}>{totalDistance}</div></div>
                <div><div style={{ fontSize: "9px", color: "#94a3b8" }}>Mileage</div><div style={{ fontSize: "16px", fontWeight: 700 }}>{totalMileage}</div></div>
                <div><div style={{ fontSize: "9px", color: "#94a3b8" }}>Duration</div><div style={{ fontSize: "16px", fontWeight: 700 }}>{totalDuration}</div></div>
                <div><div style={{ fontSize: "9px", color: "#94a3b8" }}>Revenue</div><div style={{ fontSize: "16px", fontWeight: 700 }}>{totalSubtotal}</div></div>
              </div>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "1px" }}>📍 Origin</div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>{originName}</div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px", lineHeight: 1.4 }}>{run.proj_s_origin_addresses?.formatted_address || run.proj_s_origin_addresses?.address_line_1 || ""}</div>
            </div>

            {run.team_assigned && (
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "1px" }}>👥 Installer</div>
                  <div style={{ fontSize: "11px", color: "#1e293b" }}>{run.team_assigned}</div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>🛣 Route Timeline ({runProjects.length} stops)</span>
              </div>

              {runProjects.length === 0 ? (
                <div style={{ background: "#f8fafc", border: "1px dashed #e2e8f0", borderRadius: "6px", padding: "16px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>🗺️</div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>No Route Created</div>
                  <p style={{ fontSize: "11px", color: "#475569", margin: "0 0 8px", lineHeight: 1.5 }}>No projects have been assigned to this run.</p>
                  <p style={{ fontSize: "10px", color: "#64748b", margin: "0", lineHeight: 1.5 }}>Right-click a project marker and choose<br /><strong>"Add to Run"</strong> to begin building this route.</p>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "2px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px", flexShrink: 0, marginRight: "8px" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#1e293b", border: "2px solid #1e293b" }} />
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#1e293b", paddingTop: "0" }}>Origin: {originName}</div>
                  </div>

                  {runProjects.map((rp, idx) => {
                    const proj = rp.proj_t_projects || {};
                    const segment = runSegmentData?.segments?.[idx];
                    const hasError = segment?.error;
                    const segDistance = hasError ? "Route unavailable" : formatDistance(segment?.distance);
                    const segDuration = hasError ? "" : formatDuration(segment?.duration);
                    const sub = formatCurrency(stopSubtotals[idx]);
                    const isDragging = dragIndex === idx;
                    const isDragOver = dragOverIndex === idx;

                    return (
                      <div key={rp.id} style={{ marginBottom: "2px" }}>
                        <div style={{ display: "flex", alignItems: "stretch" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px", flexShrink: 0, marginRight: "8px" }}>
                            <div style={{ width: "2px", flex: 1, background: "#cbd5e1", minHeight: "12px" }} />
                            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6", border: "2px solid #fff", boxShadow: "0 0 0 2px #3b82f6" }} />
                          </div>
                          <div style={{ flex: 1, paddingTop: "2px" }}>
                            {(segment || idx === 0) && (
                              <div style={{ fontSize: "9px", color: hasError ? "#dc2626" : "#64748b", marginBottom: "4px", fontStyle: "italic" }}>{segDistance}{segDuration ? ` · ${segDuration}` : ""}</div>
                            )}
                            <div draggable onDragStart={() => setDragIndex(idx)} onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }} onDragLeave={() => setDragOverIndex(null)} onDrop={() => { if (dragIndex !== null && dragIndex !== idx) { onReorderStops?.(dragIndex, idx); } setDragIndex(null); setDragOverIndex(null); }} onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }} style={{ padding: "5px 8px", background: isDragging ? "#fef3c7" : (isDragOver ? "#f0f9ff" : "#f8fafc"), border: `1px solid ${isDragOver ? "#93c5fd" : "#e2e8f0"}`, borderRadius: "3px", cursor: "grab", opacity: isDragging ? 0.7 : 1, transition: "all 0.15s", marginBottom: "6px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "4px" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: "11px", color: "#1e293b", marginBottom: "1px" }}>{idx + 1}. {proj.client_name || "Untitled"}</div>
                                  <div style={{ fontSize: "9px", color: "#64748b" }}>{proj.city && proj.state ? `${proj.city}, ${proj.state}` : proj.formatted_address || "No address"}</div>
                                  <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 500, marginTop: "2px" }}>{sub}</div>
                                  <div style={{ marginTop: "3px" }}>
                                    <button onClick={() => onEditStopNote?.(rp)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", padding: "0", color: rp.notes ? "#6366f1" : "#94a3b8", fontWeight: rp.notes ? 600 : 400 }} title={rp.notes ? "Edit note" : "Add note"}>{rp.notes ? "📝 Note" : "📄 Note"}</button>
                                  </div>
                                </div>
                                <button onClick={() => onRemoveProject?.(rp.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "12px", padding: "0", lineHeight: 1 }} title="Remove from run">×</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px", flexShrink: 0, marginRight: "8px" }}>
                      <div style={{ width: "2px", height: "12px", background: "#cbd5e1" }} />
                      <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: "#dc2626", transform: "rotate(45deg)" }} />
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: 600, color: "#dc2626", paddingTop: "2px" }}>End</div>
                  </div>
                </div>
              )}
            </div>

            {run.notes && (
              <div style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "1px" }}>📝 Remarks</div>
                <div style={{ fontSize: "11px", color: "#475569", background: "#f8fafc", padding: "6px 8px", borderRadius: "3px", border: "1px solid #e2e8f0" }}>{run.notes}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ padding: "8px 12px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "6px", justifyContent: "flex-start", flexWrap: "wrap", flexShrink: 0, background: "#fff" }}>
        {actionButtons.map((btn, i) => (
          <button key={i} disabled={recalculating} onClick={btn.onClick} style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "3px", border: "none", cursor: recalculating ? "not-allowed" : "pointer", fontWeight: 500, opacity: recalculating ? 0.5 : 1, background: btn.variant === "danger" ? "#fef2f2" : btn.variant === "primary" ? "#1e293b" : btn.variant === "success" ? "#16a34a" : "#fff", color: btn.variant === "danger" ? "#dc2626" : btn.variant === "primary" ? "#fff" : btn.variant === "success" ? "#fff" : "#1e293b", border: btn.variant === "secondary" || btn.variant === "danger" ? "1px solid #e2e8f0" : "none" }}>{btn.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onRecalculate} disabled={recalculating} style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "3px", border: "1px solid #6366f1", cursor: recalculating ? "not-allowed" : "pointer", fontWeight: 500, background: recalculating ? "#eef2ff" : "#eef2ff", color: recalculating ? "#94a3b8" : "#6366f1", opacity: recalculating ? 0.7 : 1 }}>{recalculating ? "⟳ Recalculating..." : "⟳ Recalculate Run"}</button>
      </div>

      {recalculating && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(30,41,59,0.75)", zIndex: 20,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px",
          pointerEvents: "all",
        }}>
          <div style={{ fontSize: "28px", color: "#fff", animation: "recalcSpin 0.8s linear infinite", display: "inline-block" }}>⟳</div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#e2e8f0" }}>Recalculating route...</div>
          <div style={{ fontSize: "9px", color: "#94a3b8" }}>Please wait while the run details are updated.</div>
        </div>
      )}
    </div>
  );
}