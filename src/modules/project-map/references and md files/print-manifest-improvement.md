TASK: Clean up the Run Manifest print output — remove two elements from
our own header, and suppress the browser's default print header/footer
(date + page title) that Edge/Chrome auto-insert.

FILE: src/modules/project-map/components/RunDetailPanel.jsx
(the print template inside `printWindow.document.write(...)`)

─────────────────────────────────────
CHANGE 1 — Remove "Delivery Manifest" kicker label
─────────────────────────────────────
In the print header block (the one with the logo added in the previous
task), find the small uppercase kicker line above the "Run #X — Date"
title, e.g.:

  <div style="font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #64748b; margin-bottom: 3px;">Delivery Manifest</div>

Remove this line entirely. The "Run #X — Date" title becomes the top
line of that block. Adjust/remove the `margin-bottom` spacing that was
separating the kicker from the title if it leaves an odd gap.

─────────────────────────────────────
CHANGE 2 — Remove the "N stop(s)" line from the top-right meta block
─────────────────────────────────────
In the same header, find the right-aligned meta block, e.g.:

  <div style="text-align: right; font-size: 10px; color: #64748b;">
    <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${run.run_date || "—"}</div>
    <div>${runProjects.length} stop${runProjects.length !== 1 ? "s" : ""}</div>
  </div>

Remove only the second `<div>` (the stop count line). Keep the run date
line. Result:

  <div style="text-align: right; font-size: 10px; color: #64748b;">
    <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${run.run_date || "—"}</div>
  </div>

(Total Stops is already shown in the Run Information strip below the
header, so this isn't losing any data — just removing a duplicate.)

─────────────────────────────────────
CHANGE 3 — Suppress the browser's default print header/footer
─────────────────────────────────────
The date/time in the top-left and the document title in the top-right
of the printed page are NOT part of our HTML — they're Edge/Chrome's
built-in print header and footer (the "Headers and footers" option in
the browser's print dialog). They draw inside the page's margin area.

Find the `<style>` block's `@page` rule, currently something like:

  @page { size: A4 portrait; margin: 12mm 14mm; }

And the print-specific body rule, currently something like:

  @media print { body { padding: 0; } .no-print { display: none; } }

Change these so the page itself has NO margin (removing the space the
browser uses to draw its header/footer), and move that same visual
spacing onto the body element instead, only at print time:

  @page { size: A4 portrait; margin: 0; }

  @media print {
    body { padding: 12mm 14mm; }
    .no-print { display: none; }
  }

This keeps the exact same visual spacing around the printed content,
but because `@page` now has zero margin, Chromium browsers have no room
left to draw their own header/footer text, so it disappears.

IMPORTANT CAVEAT: This is a Chromium-specific behavior (works in Edge
and Chrome, which is this team's environment). It is not a fully
standardized cross-browser guarantee — Firefox/Safari may behave
differently. If manifests are ever printed from a non-Chromium browser,
this may not suppress the header/footer there. Do not remove the
`<title>` tag itself — it's still needed for the browser tab name and
as the suggested filename when printing to PDF; we're only hiding it
from the physical printed page.

─────────────────────────────────────
DO NOT
─────────────────────────────────────
- Do not change the `<title>` tag content.
- Do not change anything in the Run Information strip, Stop Details,
  or signature section.
- Do not change the logo or its placement (added in the prior task).

─────────────────────────────────────
VERIFICATION
─────────────────────────────────────
1. Open a Run's print preview in Edge/Chrome — confirm "Delivery
   Manifest" text and the "N stop(s)" line are gone from our header.
2. In the actual print preview pane (not just the HTML), confirm the
   browser's own date/time and page-title header/footer no longer
   appear at the top/bottom of the page.
3. Confirm the run date still shows correctly on the right side of our
   header, and the overall page margins still look the same as before
   (content shouldn't shift or touch the page edges).
4. Confirm the logo and title are still aligned correctly with the
   kicker line removed.