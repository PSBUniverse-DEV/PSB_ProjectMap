/**
 * generateRunManifestPrint — builds and opens the "Run Manifest" print window.
 *
 * This is a standalone, self-contained version of RunDetailPanel's handlePrint,
 * extracted so it can be reused from both the Run Detail Panel (map view) and
 * the Run Master List table. It takes the run and its stop/project rows as
 * parameters instead of closing over component state.
 *
 * The print template itself is intentionally copied verbatim from the original
 * handlePrint in RunDetailPanel.jsx so both entry points produce an identical
 * manifest.
 *
 * `runSegmentData` is optional (the per-stop distance/duration segments). When
 * omitted (e.g. the Run Master List, which does not load route segments), the
 * per-stop distance / travel-time fields simply render as "—".
 */
import { formatProjectDescriptionForDisplay, stripTownshipLabel } from "../data/projectMap.data";

// --- Formatting helpers (mirror the ones defined in RunDetailPanel.jsx) ---

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

export function generateRunManifestPrint(run, runProjects, runSegmentData = null) {
  // Recompute component-scoped values inline so the function is fully
  // self-contained (does not close over RunDetailPanel's state).
  const originName = run.proj_s_origin_addresses?.origin_name || "No Origin";
  const stopSubtotals = runProjects.map((rp) => {
    const proj = rp.proj_t_projects || {};
    return Number(proj.project_subtotal) || 0;
  });
  const totalRevenue = stopSubtotals.reduce((s, v) => s + v, 0);

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
  const originAddress = stripTownshipLabel(run.proj_s_origin_addresses?.formatted_address || run.proj_s_origin_addresses?.address_line_1 || originName);

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const stopsHtml = runProjects.map((rp, idx) => {
    const proj = rp.proj_t_projects || {};
    const projDimDisplay = formatProjectDescriptionForDisplay(proj.dimension);
    const stopNum = idx + 1;
    const segment = runSegmentData?.segments?.[idx];
    const segDistance = segment ? formatDistance(segment.distance) : "—";
    const segDuration = segment ? formatDuration(segment.duration) : "—";
    const sub = formatCurrency(stopSubtotals[idx]);
    const installDate = formatInstallDate(proj.install_start, proj.install_end);
    const address = stripTownshipLabel(proj.formatted_address) || (
      [proj.address_line_1, stripTownshipLabel(proj.city), proj.state, proj.postal_code].filter(Boolean).join(", ")
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
            ${projDimDisplay ? `<div class="address-line" style="margin-top: 2px;">Dimensions: ${projDimDisplay}</div>` : ""}
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
      <title>Run Manifest — ${run.run_name || "—"} — ${run.run_date || "Unscheduled"}</title>
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
          @page { size: A4 portrait; margin: 0; }
          @media print {
            body { padding: 12mm 14mm; }
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
          .doc-meta .run-code { font-size: 20px; font-weight: 800; color: var(--ink); letter-spacing: -0.2px; }
          .doc-meta .run-date { font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 4px; }
          .info-strip {
            display: grid;
            grid-template-columns: 1.1fr 1.4fr 0.8fr 0.8fr 0.8fr 1.0fr;
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
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="/images/psb-logo.png" alt="PSBUniverse" style="height: 48px; width: auto; display: block;" />
              <div>
                <div class="doc-title">Run Manifest</div>
              </div>
            </div>
            <div class="doc-meta">
              <div class="run-code">${run.run_name || "—"}</div>
              <div class="run-date">${run.run_date ? new Date(run.run_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unscheduled"}</div>
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
            <div class="info-cell">
              <div class="info-label">Status</div>
              <div class="info-value num">${run.status || "&mdash;"}</div>
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
            <span>${run.run_name || "—"}</span>
          </div>
    </html>
  `);
  printWindow.document.close();
}
