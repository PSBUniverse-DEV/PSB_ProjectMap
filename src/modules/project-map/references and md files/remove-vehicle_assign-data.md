TASK: Remove "Vehicle Assigned" from the Project Map Tool frontend/UI ONLY.
Do NOT remove or modify anything in the database, server actions, or data
layer. The `vehicle_assigned` field must remain fully functional in the
backend for future use — this is a display-only removal.

SCOPE: 3 files need changes. Do not touch any other file.

─────────────────────────────────────
FILE 1: src/modules/project-map/components/RunForm.jsx
─────────────────────────────────────
This is the Add/Edit Run modal form. It currently has a 2-column grid with
"Team Assigned" and "Vehicle Assigned" side by side:

  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
    <div>
      <label ...>Team Assigned</label>
      <input ... value={form.team_assigned} onChange={(e) => handleChange("team_assigned", e.target.value)} ... />
    </div>
    <div>
      <label ...>Vehicle Assigned</label>
      <input ... value={form.vehicle_assigned} onChange={(e) => handleChange("vehicle_assigned", e.target.value)} ... />
    </div>
  </div>

ACTION:
- Remove the entire "Vehicle Assigned" <div> block (the label + input for
  vehicle_assigned).
- Since Team Assigned is now the only field in this row, change the wrapping
  grid from `gridTemplateColumns: "1fr 1fr"` to a single-column layout —
  either remove the grid entirely (use a plain <div> wrapper) or set
  `gridTemplateColumns: "1fr"` so Team Assigned doesn't look stretched or
  awkward.

DO NOT TOUCH:
- The `vehicle_assigned` key in the `form` state object (`useState`
  initializer, ~line 17)
- The `vehicle_assigned: run.vehicle_assigned || ""` line in the `useEffect`
  that populates the form on edit (~line 39)
- The `vehicle_assigned: ""` reset line for new runs (~line 53)
- The `vehicle_assigned: form.vehicle_assigned || null` line in the save
  payload sent to `updateRun`/`createRun` (~line 82)
These all stay exactly as-is so the backend field keeps working — even
though there's no longer a UI input for it, this preserves any existing
data and keeps the field ready for future use.

─────────────────────────────────────
FILE 2: src/modules/project-map/components/RunDetailPanel.jsx
─────────────────────────────────────
This file has THREE separate places referencing vehicle_assigned. Remove
all three:

(a) On-screen summary stat — find this block:

  {(run.team_assigned || run.vehicle_assigned) && (
    <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
      {run.team_assigned && (
        <div style={{ flex: 1 }}>
          <div ...>👥 Team</div>
          <div ...>{run.team_assigned}</div>
        </div>
      )}
      {run.vehicle_assigned && (
        <div style={{ flex: 1 }}>
          <div ...>🚛 Vehicle</div>
          <div ...>{run.vehicle_assigned}</div>
        </div>
      )}
    </div>
  )}

  Remove the entire `{run.vehicle_assigned && (...)}` block (the Vehicle
  div). Change the outer condition from
  `{(run.team_assigned || run.vehicle_assigned) && (` to
  `{run.team_assigned && (` since Vehicle is no longer shown here.

(b) Print template — "Run Information" table row (this is the print/manifest
    HTML string built inside a `printWindow.document.write(...)` call).
    Find this row:

  <tr>
    <td style="padding: 2px 4px;"><span style="font-size: 9px; color: #94a3b8;">Team Assigned</span><br style="font-size: 0; font-weight: 600;">${run.team_assigned || "—"}</td>
    <td style="padding: 2px 4px;"><span style="font-size: 9px; color: #94a3b8;">Vehicle Assigned</span><br style="font-size: 0; font-weight: 600;">${run.vehicle_assigned || "—"}</td>
    <td style="padding: 2px 4px;"><span style="font-size: 9px; color: #94a3b8;">Total Stops</span><br style="font-size: 0; font-weight: 600;">${runProjects.length}</td>
  </tr>

  Remove the middle <td> (Vehicle Assigned) only. Keep Team Assigned and
  Total Stops in the row, and rebalance their widths (e.g. add
  `width: 50%;` to each of the two remaining <td> elements, matching the
  pattern used elsewhere in this file) so the row still looks intentional
  with two cells instead of three.

  NOTE: This file was already edited previously to remove Estimated
  Distance/Mileage/Travel Time and Dealer from the print template. Make
  sure this new edit doesn't conflict with those prior changes — search
  for "Vehicle Assigned" to locate this exact row, since surrounding rows
  may have already shifted.

DO NOT TOUCH:
- Any reference to `run.team_assigned` outside of what's specified above.
- Any other part of the print template.

─────────────────────────────────────
FILE 3: src/modules/project-map/pages/ProjectMapView.jsx
─────────────────────────────────────
Around line 311, there's a run search filter that builds a searchable
string including `run.vehicle_assigned`:

  const searchable = [
    run.run_name,
    run.proj_s_origin_addresses?.origin_name,
    run.team_assigned,
    run.vehicle_assigned,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

ACTION: Leave this as-is. This does not display vehicle_assigned anywhere
in the UI — it only makes runs searchable by vehicle name behind the
scenes. Do not remove it unless explicitly asked, since it's not a display
concern and removing it could quietly change search behavior.

─────────────────────────────────────
VERIFICATION
─────────────────────────────────────
After changes:
1. Open the Run form (Add/Edit) — confirm "Vehicle Assigned" input is gone
   and "Team Assigned" no longer looks squeezed into a half-width column.
2. Open a Run's detail panel on-screen — confirm the Team/Vehicle stat row
   only shows Team (when present), and doesn't render an empty gap when
   there's no team.
3. Print/preview a Run manifest — confirm "Vehicle Assigned" no longer
   appears in the Run Information box, and the row still looks
   well-formatted with just Team Assigned and Total Stops.
4. Confirm no console errors and that saving a Run still works normally
   (vehicle_assigned should still persist to the database on the backend
   even without a UI field, in case it's set programmatically or restored
   later).
5. Do not modify projectMap_actions.js, projectMap_server.js, or any
   database/schema files — the backend field stays fully intact.