TASK: Update the Run Manifest print template in the Project Map Tool module.

FILE TO EDIT:
src/modules/project-map/components/RunDetailPanel.jsx
(exact path may vary slightly — search for the file containing the string "Delivery Manifest")

CONTEXT:
This file contains a `handlePrint` (or similarly named) function that builds an
HTML string and writes it to a new print window (`printWindow.document.write(...)`).
This generates the "Run Record" manifest PDF/print sheet.

Per user feedback from the ops team (via Amador), three fields must be removed
from the printed manifest. Do NOT change the on-screen UI panel — only the
printed/print-window HTML template.

─────────────────────────────────────
CHANGE 1 — Remove "Dealer" from each Stop card
─────────────────────────────────────
Locate the per-stop HTML template (the `.map()` block that builds each stop's
card, containing the line with "Stop #${stopNum}: ${proj.client_name...").

Find this table row (3 columns: Client / Dealer / Building):

  <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
    <tr>
      <td style="padding: 1px 4px; width: 33%;"><span style="font-size: 8px; color: #94a3b8;">Client</span><br style="font-size: 0;">${proj.client_name || "—"}</td>
      <td style="padding: 1px 4px; width: 33%;"><span style="font-size: 8px; color: #94a3b8;">Dealer</span><br style="font-size: 0;">${proj.dealer || "—"}</td>
      <td style="padding: 1px 4px; width: 33%;"><span style="font-size: 8px; color: #94a3b8;">Building</span><br style="font-size: 0;">${proj.proj_s_building_categories?.building_category_name || "—"}</td>
    </tr>
  </table>

Remove the middle <td> (Dealer) entirely, and change the remaining two <td>
elements' width from 33% to 50% each, so the row reads Client | Building only:

  <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
    <tr>
      <td style="padding: 1px 4px; width: 50%;"><span style="font-size: 8px; color: #94a3b8;">Client</span><br style="font-size: 0;">${proj.client_name || "—"}</td>
      <td style="padding: 1px 4px; width: 50%;"><span style="font-size: 8px; color: #94a3b8;">Building</span><br style="font-size: 0;">${proj.proj_s_building_categories?.building_category_name || "—"}</td>
    </tr>
  </table>

─────────────────────────────────────
CHANGE 2 — Remove "Estimated Distance", "Estimated Mileage", and
"Estimated Travel Time" from the Run Information header block
─────────────────────────────────────
In the same file, locate the "Run Information" table inside the print HTML
(search for the string "Estimated Distance" within the `printWindow.document.write`
template). You will find this row:

  <tr>
    <td style="padding: 2px 4px;"><span style="font-size: 9px; color: #94a3b8;">Estimated Distance</span><br style="font-size: 0; font-weight: 600;">${totalDistance}</td>
    <td style="padding: 2px 4px;"><span style="font-size: 9px; color: #94a3b8;">Estimated Mileage</span><br style="font-size: 0; font-weight: 600;">${totalMileage}</td>
    <td style="padding: 2px 4px;"><span style="font-size: 9px; color: #94a3b8;">Estimated Travel Time</span><br style="font-size: 0; font-weight: 600;">${totalDuration}</td>
  </tr>

Delete this entire <tr> row. Do not touch any other row in this table
(Run Name / Origin Address / Run Date, Team Assigned / Vehicle Assigned /
Total Stops, and Total Revenue must remain unchanged).

IMPORTANT: Do NOT delete or modify the JavaScript variable declarations for
`totalDistance`, `totalMileage`, or `totalDuration` (found near the top of the
component, e.g. `const totalDistance = hasStops ? formatDistance(run.estimated_distance) : "—";`).
These variables are still used elsewhere in the on-screen (non-print) UI panel
and must remain intact. Only remove their usage inside the print HTML template
string.

─────────────────────────────────────
VERIFICATION
─────────────────────────────────────
After making changes:
1. Confirm the print template's "Run Information" box now shows only:
   Run Name, Origin Address, Run Date, Team Assigned, Vehicle Assigned,
   Total Stops, and Total Revenue.
2. Confirm each Stop card now shows only Client and Building (no Dealer).
3. Confirm the on-screen (non-print) RunDetailPanel UI is completely
   unaffected — Distance/Mileage/Duration should still display normally
   in the on-screen summary stats.
4. Do not change any other file.
5. Run the app locally and open a Run's print preview to visually confirm
   the manifest layout still looks correct (no broken table widths, no
   leftover empty cells).

Do not modify any database queries, server actions, or other components.
This is a presentational-only change scoped to the print template inside
RunDetailPanel.jsx.