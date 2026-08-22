/**
 * generatePaidSheetPrint — builds and opens the "Paid Sheet" print window.
 *
 * Mirrors printRunManifest.js's print conventions (toolbar, @page /
 * @media print rules, PSBUniverse header/logo) but renders a read-only,
 * payment-focused ledger. Called from the Run Master List's "Print
 * Paid Sheet" row action with the exact { run, runProjects } shape
 * loadRunDetails() returns — plus an optional paidSheet header record
 * from proj_t_paid_sheet (null when the run has never been saved).
 *
 * The output is deliberately plain text / read-only: no <input>,
 * <textarea>, <select>, or <input type="radio"> anywhere — only the
 * Print/Close toolbar buttons, mirroring printRunManifest.js. All
 * editable UI lives in PaidSheetForm.jsx; printing always reflects what
 * was already saved.
 */
import { formatProjectDescriptionForDisplay } from "../data/projectMap.data";
export function generatePaidSheetPrint(run, runProjects, paidSheet = null) {
  const now = new Date();
  const printDate = now.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

  const formatDate = (val) => {
    if (!val) return "Unscheduled";
    try {
      return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return val;
    }
  };

  const formatCurrency = (value) => {
    if (value == null) return "—";
    return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalAmount = runProjects.reduce((sum, rp) => sum + (Number(rp.proj_t_projects?.project_subtotal) || 0), 0);

  const isPaid = Boolean(paidSheet?.is_paid);
  const paidDateDisplay = paidSheet?.paid_date ? formatDate(paidSheet.paid_date) : null;
  const paidRefDisplay = paidSheet?.paid_reference || null;

  const rowsHtml = runProjects.map((rp, idx) => {
    const proj = rp.proj_t_projects || {};
    const orderNo = proj.invoice_number || "—";
    const description = proj.client_name || `Stop #${idx + 1}`;
    const dimensionDisplay = formatProjectDescriptionForDisplay(proj.dimension) || "—";
    const paymentMethod = proj.proj_s_payment_method?.method_description
      || proj.proj_s_payment_method?.method_name
      || "—";
    const refNo = proj.payment_method_number || "—";
    const notes = proj.paid_sheet_notes || "—";

    return `
      <tr>
        <td class="cell"><span class="order-no">${orderNo}</span></td>
        <td class="cell desc">
          <div class="client">${description}</div>
          <div class="addr">${dimensionDisplay}</div>
        </td>
        <td class="cell"><span class="pm">${paymentMethod}</span></td>
        <td class="cell ref">${refNo}</td>
        <td class="cell num">${formatCurrency(proj.project_subtotal)}</td>
        <td class="cell notes">${notes}</td>
      </tr>`;
  }).join("\n");

  const psbRepName = paidSheet?.psb_representative_name || null;
  const psbRepDate = paidSheet?.psb_representative_date ? formatDate(paidSheet.psb_representative_date) : null;

  const extraNotesHtml = paidSheet?.extra_notes
    ? `<div class="en-content">${paidSheet.extra_notes}</div>`
    : `<div class="en-line"></div><div class="en-line"></div><div class="en-line"></div>`;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Paid Sheet — ${run.run_name || "—"}</title>
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
    --paid-bg: #f0fdf4;
    --paid-border: #86efac;
    --paid-ink: #15803d;
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
  .toolbar button { padding: 6px 18px; font-size: 12px; font-weight: 600; border-radius: 4px; cursor: pointer; }
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

  .status-badge {
    font-size: 11px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase;
    padding: 5px 14px; border-radius: 4px; border: 1.5px solid;
  }
  .status-badge.paid { background: var(--paid-bg); border-color: var(--paid-border); color: var(--paid-ink); }
  .status-badge.unpaid { background: #fff; border-color: var(--line-strong); color: var(--faint); }
  .status-meta { text-align: right; margin-top: 5px; font-size: 9.5px; color: var(--muted); }
  .status-meta .val { font-weight: 700; color: var(--ink); }

  .info-strip {
    display: grid;
    grid-template-columns: 1.6fr 1fr 0.9fr 1fr 0.7fr 0.9fr;
    border: 1px solid var(--line);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 4px;
  }
  .info-cell { padding: 7px 10px; border-right: 1px solid var(--line); }
  .info-cell:last-child { border-right: none; }
  .info-label {
    font-size: 8.5px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase;
    color: var(--faint); margin-bottom: 3px;
  }
  .info-value { font-size: 12px; font-weight: 600; color: var(--ink); }
  .info-value.blank { color: var(--faint); font-weight: 400; }

  .printed-line { font-size: 8.5px; color: var(--faint); text-align: right; margin: 4px 0 10px; }

  table.ledger { width: 100%; border-collapse: collapse; border: 1px solid var(--line); }
  th {
    background: #f8fafc;
    font-size: 8.5px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase;
    color: var(--muted); text-align: left;
    padding: 7px 8px; border-bottom: 1px solid var(--line-strong);
  }
  td.cell { padding: 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:last-child td.cell { border-bottom: none; }
  td.cell .client { font-size: 12px; font-weight: 700; color: var(--ink); }
  td.cell .addr { font-size: 10px; color: var(--muted); margin-top: 2px; }
  td.cell .order-no { font-weight: 700; color: var(--ink); font-size: 12px; }
  td.cell .pm { font-size: 11px; font-weight: 600; color: var(--ink); }
  td.num { font-variant-numeric: tabular-nums; font-weight: 700; color: var(--money); font-size: 12px; white-space: nowrap; }
  td.notes { font-size: 10.5px; color: var(--body); white-space: pre-wrap; }
  td.ref { font-size: 10.5px; color: var(--muted); }

  .total-row td { border-top: 2px solid var(--ink); border-bottom: none; font-size: 12.5px; font-weight: 800; color: var(--ink); padding: 9px 8px; }
  .total-row .total-amount { color: var(--money); }

  .extra-notes { margin-top: 14px; border: 1px solid var(--line); border-radius: 4px; }
  .extra-notes .en-label {
    font-size: 8.5px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase;
    color: var(--faint); padding: 6px 10px; border-bottom: 1px solid var(--line);
    background: #f8fafc;
  }
  .extra-notes .en-content { padding: 10px; font-size: 11px; color: var(--body); white-space: pre-wrap; min-height: 20px; }
  .extra-notes .en-line { height: 20px; border-bottom: 1px solid var(--line); }
  .extra-notes .en-line:last-child { border-bottom: none; }

  .signoff {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 1fr 0.6fr;
    border: 1px solid var(--line);
    border-radius: 4px;
    overflow: hidden;
  }
  .signoff-row { display: contents; }
  .signoff-cell {
    padding: 10px 12px;
    border-top: 1px solid var(--line);
    border-right: 1px solid var(--line);
    display: flex; align-items: flex-end; gap: 8px;
  }
  .signoff-cell:nth-child(2n) { border-right: none; }
  .signoff-row:first-child .signoff-cell { border-top: none; }
  .signoff-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
    color: var(--faint); white-space: nowrap;
  }
  .signoff-line { flex: 1; border-bottom: 1px solid var(--line-strong); height: 16px; }
  .signoff-value { flex: 1; font-size: 12px; font-weight: 700; color: var(--ink); border-bottom: 1px solid var(--line-strong); padding-bottom: 2px; }

  .doc-footer {
    margin-top: 14px; padding-top: 6px; border-top: 1px solid var(--line);
    display: flex; justify-content: space-between;
    font-size: 8px; color: var(--faint);
  }
</style>
</head>
<body>

  <div class="no-print toolbar">
    <button class="btn-primary" onclick="window.print()">Print paid sheet</button>
    <button class="btn-secondary" onclick="window.close()">Close</button>
  </div>

  <div class="doc-header">
    <div style="display: flex; align-items: center; gap: 10px;">
      <img src="/images/psb-logo.png" alt="PSBUniverse" style="height: 44px; width: auto; display: block;" />
      <div>
        <div class="doc-kicker">Payment sheet</div>
        <div class="doc-title">Paid Sheet</div>
      </div>
    </div>
    <div>
      <div class="status-badge ${isPaid ? "paid" : "unpaid"}">${isPaid ? "&#10003; Paid" : "Unpaid"}</div>
      ${isPaid ? `<div class="status-meta">Paid <span class="val">${paidDateDisplay || "—"}</span>${paidRefDisplay ? ` &middot; Ref <span class="val">${paidRefDisplay}</span>` : ""}</div>` : ""}
    </div>
  </div>

  <div class="info-strip">
    <div class="info-cell">
      <div class="info-label">Run Code</div>
      <div class="info-value">${run.run_name || "—"}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Installer</div>
      <div class="info-value">${run.team_assigned || "—"}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Date</div>
      <div class="info-value num">${formatDate(run.run_date)}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Phone Number</div>
      <div class="info-value ${paidSheet?.phone_number ? "" : "blank"}">${paidSheet?.phone_number || "—"}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">DOT#</div>
      <div class="info-value ${paidSheet?.dot_number ? "" : "blank"}">${paidSheet?.dot_number || "—"}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">State</div>
      <div class="info-value ${paidSheet?.state_route ? "" : "blank"}">${paidSheet?.state_route || "—"}</div>
    </div>
  </div>
  <div class="printed-line">Printed ${printDate}</div>

  <table class="ledger">
    <thead>
      <tr>
        <th style="width: 8%;">Order #</th>
        <th style="width: 25%;">Description</th>
        <th style="width: 16%;">Payment Method</th>
        <th style="width: 12%;"></th>
        <th style="width: 12%; text-align: right;">Amount</th>
        <th style="width: 27%;">Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="6" class="cell" style="color: var(--muted); font-style: italic;">No stops assigned to this run.</td></tr>'}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4">Total Amount Run</td>
        <td class="num total-amount" colspan="2">${formatCurrency(totalAmount)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="extra-notes">
    <div class="en-label">Extra Notes</div>
    ${extraNotesHtml}
  </div>

  <div class="signoff">
    <div class="signoff-row">
      <div class="signoff-cell">
        <span class="signoff-label">Installer Signature</span>
        <span class="signoff-line"></span>
      </div>
      <div class="signoff-cell">
        <span class="signoff-label">Date</span>
        <span class="signoff-line"></span>
      </div>
    </div>
    <div class="signoff-row">
      <div class="signoff-cell">
        <span class="signoff-label">PSB Representative</span>
        ${psbRepName ? `<span class="signoff-value">${psbRepName}</span>` : `<span class="signoff-line"></span>`}
      </div>
      <div class="signoff-cell">
        <span class="signoff-label">Date</span>
        ${psbRepDate ? `<span class="signoff-value num">${psbRepDate}</span>` : `<span class="signoff-line"></span>`}
      </div>
    </div>
  </div>

  <div class="doc-footer">
    <span>PSBUniverse &middot; Project Map</span>
  </div>

</body>
</html>`);
  printWindow.document.close();
}
