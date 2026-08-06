TASK: Rename the visible label "Team Assigned" to "Installer" across the
Project Map Tool frontend. This is a display-only relabel — do NOT rename
the underlying `team_assigned` field, variable names, form state keys, or
database column. No migration needed. The word "Team Assigned" and
"Installer" refer to the same underlying data; we're only changing what
the user sees on screen and in print.

SCOPE: 2 files, 3 label locations total. Do not touch any other file, and
do not rename any JS variable, object key, prop, or database field.

─────────────────────────────────────
FILE 1: src/modules/project-map/components/RunForm.jsx
─────────────────────────────────────
Around line 195, find this label:

  <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Team Assigned</label>

Change the visible text only:

  <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Installer</label>

DO NOT TOUCH: `form.team_assigned`, `handleChange("team_assigned", ...)`,
the `team_assigned` key in the form state object, or the payload sent to
`createRun`/`updateRun`. These all stay exactly as-is — only the <label>
text changes.

Also update the placeholder text on the same input if it currently reads
something like "e.g. Team A" — change it to something installer-appropriate,
e.g. "e.g. John Smith" or "e.g. Installer Name" (use your best judgment to
match the style of other placeholders in this form).

─────────────────────────────────────
FILE 2: src/modules/project-map/components/RunDetailPanel.jsx
─────────────────────────────────────
This file has TWO separate visible instances to relabel:

(a) On-screen summary stat — find:

  <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "1px" }}>👥 Team</div>
  <div style={{ fontSize: "11px", color: "#1e293b" }}>{run.team_assigned}</div>

Change the label text only:

  <div style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "1px" }}>👥 Installer</div>
  <div style={{ fontSize: "11px", color: "#1e293b" }}>{run.team_assigned}</div>

(b) Print template — "Run Information" table (inside the
    `printWindow.document.write(...)` HTML string). Find:

  <td style="padding: 2px 4px;"><span style="font-size: 9px; color: #94a3b8;">Team Assigned</span><br style="font-size: 0; font-weight: 600;">${run.team_assigned || "—"}</td>

Change the label text only:

  <td style="padding: 2px 4px;"><span style="font-size: 9px; color: #94a3b8;">Installer</span><br style="font-size: 0; font-weight: 600;">${run.team_assigned || "—"}</td>

NOTE: This print template has been edited in prior tasks (Dealer, Estimated
Distance/Mileage/Travel Time, and Vehicle Assigned were removed; the stop
layout was restructured). Locate this exact row by searching for the string
"Team Assigned" — do not assume line numbers, since the file has changed.

DO NOT TOUCH: `run.team_assigned` anywhere it's referenced as data (the
`{(run.team_assigned || ...)}` conditional, the `${run.team_assigned || "—"}`
interpolation, etc.). Only the human-readable label strings change.

─────────────────────────────────────
DO NOT CHANGE
─────────────────────────────────────
- projectMap_actions.js — `team_assigned: runData.team_assigned...` stays
  exactly as-is (backend field name unchanged).
- Any database column, schema, or migration. This is purely a frontend
  label change.
- ProjectMapView.jsx line ~310 — `run.team_assigned` is used there only to
  build a search-matching string (not displayed as a label), so leave it
  untouched.

─────────────────────────────────────
VERIFICATION
─────────────────────────────────────
1. Open the Run form (Add/Edit) — confirm the field now reads "Installer"
   instead of "Team Assigned".
2. Open a Run's detail panel on-screen — confirm the stat now reads
   "Installer" instead of "Team".
3. Print/preview a Run manifest — confirm the Run Information box shows
   "Installer" instead of "Team Assigned".
4. Confirm saving a Run still works normally (data still writes to
   team_assigned in the database, unaffected).
5. Search the whole project-map module directory for any other
   user-visible occurrence of "Team Assigned" you may have missed (e.g.
   tooltips, empty states, column headers in grids) and relabel those to
   "Installer" too, following the same rule: text only, no field renames.