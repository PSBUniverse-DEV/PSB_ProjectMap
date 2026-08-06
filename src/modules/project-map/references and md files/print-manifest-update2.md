<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Run Manifest — #3 — August 17, 2026</title>
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

  /* ---------- toolbar (screen only) ---------- */
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

  /* ---------- document header ---------- */
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

  /* ---------- info strip: single row, hairline-divided columns ---------- */
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

  /* ---------- stops ---------- */
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
    padding: 8px 0;
    border-bottom: 1px solid var(--line);
    page-break-inside: avoid;
  }
  .stop:last-child { border-bottom: none; }

  .stop-badge {
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--accent); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700;
  }

  .stop-main {
    display: grid;
    grid-template-columns: 1.5fr 1.1fr 0.85fr;
    gap: 10px;
    align-items: start;
  }

  .stop-primary .client-line {
    font-size: 12px; font-weight: 700; color: var(--ink);
  }
  .stop-primary .client-line .invoice {
    font-size: 9.5px; font-weight: 500; color: var(--muted); margin-left: 4px;
  }
  .stop-primary .building-pill {
    display: inline-block; margin-top: 3px;
    font-size: 8.5px; font-weight: 600; color: var(--accent);
    background: #eaf0f6; border-radius: 3px; padding: 1px 6px;
  }
  .stop-primary .address-line {
    font-size: 10px; color: var(--muted); margin-top: 4px; line-height: 1.3;
  }
  .stop-primary .address-line .state {
    color: var(--faint);
  }

  .stop-window .leg-label {
    font-size: 8.5px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
    color: var(--faint); margin-bottom: 2px;
  }
  .stop-window .window-value {
    font-size: 10.5px; font-weight: 600; color: var(--ink);
  }
  .stop-window .travel-value {
    font-size: 9.5px; color: var(--muted); margin-top: 3px;
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

  /* ---------- footer ---------- */
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
      <div class="doc-title">Run #3 — August 17, 2026</div>
    </div>
    <div class="doc-meta">
      <div class="run-date num">2026-08-17</div>
      <div>4 stops</div>
    </div>
  </div>

  <div class="info-strip">
    <div class="info-cell">
      <div class="info-label">Origin address</div>
      <div class="info-value small">1810 Troy Avenue, New Castle, IN 47362</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Team assigned</div>
      <div class="info-value small">&mdash;</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Total stops</div>
      <div class="info-value num">4</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Run date</div>
      <div class="info-value num">Aug 17, 2026</div>
    </div>
    <div class="info-cell revenue">
      <div class="info-label">Total revenue</div>
      <div class="info-value money num">$41,470.67</div>
    </div>
  </div>
  <div class="printed-line">Printed August 6, 2026 at 11:24 PM</div>

  <div class="stops-header">
    <span>Stop details</span>
  </div>

  <div class="stop">
    <div class="stop-badge">1</div>
    <div class="stop-main">
      <div class="stop-primary">
        <div class="client-line">Dalton Bryant<span class="invoice">Invoice #1570</span></div>
        <div class="building-pill">Garage</div>
        <div class="address-line">3364 McCluskey Drive, Hamburg Township, MI 48169 <span class="state">&middot; Michigan (MI)</span></div>
      </div>
      <div class="stop-window">
        <div class="leg-label">Origin &rarr; Stop 1</div>
        <div class="window-value num">Tue, Aug 18 &middot; 7:00&ndash;11:00 AM</div>
        <div class="travel-value">Travel &mdash;</div>
      </div>
      <div class="stop-money">
        <div class="subtotal-label">Subtotal</div>
        <div class="subtotal-value num">$15,059.54</div>
      </div>
    </div>
  </div>

  <div class="stop">
    <div class="stop-badge">2</div>
    <div class="stop-main">
      <div class="stop-primary">
        <div class="client-line">Nick Dambrose<span class="invoice">Invoice #1571</span></div>
        <div class="building-pill">Garage</div>
        <div class="address-line">24549 Woodland Drive, Flat Rock, MI 48134 <span class="state">&middot; Michigan (MI)</span></div>
      </div>
      <div class="stop-window">
        <div class="leg-label">Stop 1 &rarr; Stop 2</div>
        <div class="window-value num">Wed, Aug 19 &middot; 12:00&ndash;4:00 PM</div>
        <div class="travel-value">Travel &mdash;</div>
      </div>
      <div class="stop-money">
        <div class="subtotal-label">Subtotal</div>
        <div class="subtotal-value num">$14,296.35</div>
      </div>
    </div>
  </div>

  <div class="stop">
    <div class="stop-badge">3</div>
    <div class="stop-main">
      <div class="stop-primary">
        <div class="client-line">Dave Mikulski</div>
        <div class="building-pill">Garage</div>
        <div class="address-line">4735 Palms Road, Adair, MI 48064 <span class="state">&middot; Michigan (MI)</span></div>
      </div>
      <div class="stop-window">
        <div class="leg-label">Stop 2 &rarr; Stop 3</div>
        <div class="window-value num">Thu, Aug 20 &middot; 2:00&ndash;6:00 PM</div>
        <div class="travel-value">Travel &mdash;</div>
      </div>
      <div class="stop-money">
        <div class="subtotal-label">Subtotal</div>
        <div class="subtotal-value num">$4,612.72</div>
      </div>
    </div>
  </div>

  <div class="stop">
    <div class="stop-badge">4</div>
    <div class="stop-main">
      <div class="stop-primary">
        <div class="client-line">Mike Perry</div>
        <div class="building-pill">Garage</div>
        <div class="address-line">9334 East Atherton Road, Davison, MI 48423 <span class="state">&middot; Michigan (MI)</span></div>
      </div>
      <div class="stop-window">
        <div class="leg-label">Stop 3 &rarr; Stop 4</div>
        <div class="window-value num">Fri, Aug 21 &middot; 10:00 AM&ndash;2:00 PM</div>
        <div class="travel-value">Travel &mdash;</div>
      </div>
      <div class="stop-money">
        <div class="subtotal-label">Subtotal</div>
        <div class="subtotal-value num">$7,502.06</div>
      </div>
    </div>
  </div>

  <div class="signoff">
    <div class="sig-line">Prepared by</div>
    <div class="sig-line">Received by</div>
  </div>
  <div class="sig-date">Date</div>

  <div class="doc-footer">
    <span>PSBUniverse &middot; Project Map</span>
    <span>Run #3</span>
  </div>

</body>
</html>




--- 

this is be the new print manifest design/layout ui/ux.