TASK: Build out the Building Dimensions feature end-to-end. The
database column (proj_t_projects.dimension, text, nullable) already
exists — do NOT attempt to add it again. This task covers: form input,
and four display locations (map marker labels, marker hover popup,
Project Detail Drawer, and the print manifest).

Format convention for the stored string: "20' x 30' x 12'" — Width x
Length x Height in feet, "—" for any missing segment. All five
locations below must use this exact same formatting, via one shared
helper function, so it never looks inconsistent between screens.

─────────────────────────────────────
STEP 0 — Add shared format/parse helpers (if not already present)
─────────────────────────────────────
FILE: src/modules/project-map/data/projectMap.data.js

Check whether these already exist from a prior task. If not, add them:

  export function formatDimension(width, length, height) {
    const hasAny = [width, length, height].some((v) => v !== "" && v != null);
    if (!hasAny) return null;

    const fmt = (v) => {
      if (v === "" || v == null) return "—";
      const n = Number(v);
      if (!Number.isFinite(n)) return "—";
      return `${n % 1 === 0 ? n.toFixed(0) : n}'`;
    };

    return `${fmt(width)} x ${fmt(length)} x ${fmt(height)}`;
  }

  export function parseDimension(dimensionStr) {
    if (!dimensionStr) return { width: "", length: "", height: "" };
    const parts = dimensionStr.split(" x ").map((p) => p.trim());
    const parseOne = (p) => {
      if (!p || p === "—") return "";
      const n = parseFloat(p.replace("'", ""));
      return Number.isFinite(n) ? String(n) : "";
    };
    return {
      width: parseOne(parts[0]),
      length: parseOne(parts[1]),
      height: parseOne(parts[2]),
    };
  }

Every location below reads the already-stored `project.dimension`
string directly for DISPLAY (no need to re-parse for display — it's
already formatted). Only the edit form needs parseDimension(), to
split the stored string back into three editable fields.

─────────────────────────────────────
STEP 1 — Add 3 input fields to the Add/Edit Project form
─────────────────────────────────────
FILE: src/modules/project-map/components/AddProjectForm.jsx

(a) Add three transient UI-only fields to local form state (these do
    NOT map to real columns — only `dimension` does):

  dimension_width: "",
  dimension_length: "",
  dimension_height: "",

(b) When loading an existing project for edit, parse its stored
    dimension string using parseDimension() and populate the three
    fields, following whatever pattern this file already uses to
    initialize form state from the `project` prop.

(c) Add three number inputs (step 0.5, min 0) labeled "Width (ft)",
    "Length (ft)", "Height (ft)" in a 3-column grid, positioned near
    the Building Category field since they're related building specs.
    Match this file's existing input styling and handleChange pattern
    exactly.

(d) On save, build the combined string via formatDimension() and
    include ONLY `dimension` in the payload sent to
    createProject/updateProject. Explicitly exclude
    dimension_width/length/height from that payload — they are not
    real columns.

─────────────────────────────────────
STEP 2 — Confirm dimension is fetched from the database
─────────────────────────────────────
FILE: src/modules/project-map/data/projectMap.server.js

In loadProjectMapSetup() and loadProjectMapProjects(), find the
explicit projects column-select string (search for "project_subtotal,
project_notes"). Add "dimension, " to that same list in BOTH functions
if it is not already there. Confirm loadRunDetails() does not need
this change (it already uses a wildcard proj_t_projects(*) join).

─────────────────────────────────────
STEP 3 — Display on map marker labels
─────────────────────────────────────
FILE: src/modules/project-map/components/ProjectMap.jsx

Locate the marker label rendering logic (the compact text shown under
each pin when "Show Labels" is toggled on — this currently shows
something like the client name, subtotal, and run assignment, e.g.
"Cleo house / $1,000.00 / charles psb - martin - cleo (1st stop)").

Add the project's dimension as an additional line in this label,
shown only when `project.dimension` is present (skip the line entirely
if null — do not show "— x — x —" on markers with no dimension set, to
avoid cluttering markers where it hasn't been filled in yet). Match the
existing label's font size/styling for consistency — this is a small,
dense map annotation, not a card, so keep it compact (e.g. just the
raw string "20' x 30' x 12'" with no extra label prefix, matching how
the other label lines are already unlabeled/self-evident).

─────────────────────────────────────
STEP 4 — Display in the marker hover/click popup
─────────────────────────────────────
FILE: src/modules/project-map/components/ProjectMap.jsx

Locate the popup card rendering logic (the larger card shown when a
marker is clicked/hovered — it currently has sections titled "CUSTOMER
INFORMATION" [Dealer, Building Category], "PROJECT INFORMATION"
[Address, State, Project Subtotal, Invoice #], "WORKFLOW STATUS",
"SCHEDULE", and "REMARKS" — search for these exact heading strings to
find the right block).

Add a "Dimensions" row in the "PROJECT INFORMATION" section, right
after "Building Category" or as its own row near Address — match
whatever row structure/styling the existing rows in that section use
(label + value pair). Show `project.dimension || "—"`.

─────────────────────────────────────
STEP 5 — Display in the Project Detail Drawer
─────────────────────────────────────
FILE: src/modules/project-map/components/ProjectDetailDrawer.jsx

In the "Customer Information" table (the one currently showing Client
Name, Dealer, Building Category), add a new row for Dimensions
immediately after the Building Category row, following the exact same
`<tr>`/`<td>` structure used by the other rows in that table:

  <tr>
    <td style={{ padding: "4px 0", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>Dimensions</td>
    <td style={{ padding: "4px 0", fontSize: "12px", color: "#1e293b", fontWeight: 600, textAlign: "right" }}>{project.dimension || "—"}</td>
  </tr>

─────────────────────────────────────
STEP 6 — Display on the print manifest
─────────────────────────────────────
FILE: src/modules/project-map/components/RunDetailPanel.jsx
(the print template inside printWindow.document.write(...))

Locate the per-stop template's `.stop-primary` block — it currently
renders the client/invoice/building title line
(`{Client} — Invoice #{n} — {Building}`) followed by the
`.address-line` div showing the full address and state.

Add the dimension as a new line directly below the address line, only
when present (skip entirely if null/empty — do not print "—" as its
own line):

  ${proj.dimension ? `<div class="address-line" style="margin-top: 2px;">Dimensions: ${proj.dimension}</div>` : ""}

Use the existing `.address-line` styling class for visual consistency
with the address text directly above it, just add a small top margin
so it doesn't crowd the line above.

─────────────────────────────────────
DO NOT
─────────────────────────────────────
- Do not add or alter the database column — it already exists.
- Do not add dimension_width/length/height as real database columns —
  only the combined `dimension` string is persisted.
- Do not change the dimension format convention established in Step 0
  — every location must use the exact same string so it looks
  identical everywhere it appears.
- Do not show empty/placeholder dimension text ("— x — x —" or similar)
  anywhere dimension is null — omit the field/line entirely in that
  case, across all 5 display locations.

─────────────────────────────────────
VERIFICATION
─────────────────────────────────────
1. Create a new project with Width 20, Length 30, Height 12 — confirm
   it saves as "20' x 30' x 12'" in the database.
2. Reopen that project for edit — confirm the three fields repopulate
   correctly (20, 30, 12).
3. Confirm the dimension now appears on: the map marker label (when
   Show Labels is on), the marker's click/hover popup, the Project
   Detail Drawer, and a printed manifest for a run containing that
   project.
4. Create or view a project with no dimension set — confirm none of
   the 5 locations show an empty/placeholder dimension line; it should
   simply be absent.
5. Confirm no existing functionality broke — other fields in the form,
   popup, drawer, and print manifest should all be unaffected.