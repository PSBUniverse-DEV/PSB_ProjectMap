
# add-detail-pane-on-cluster-row-hover.md

## Task
Extract the single-project detail card into a reusable function, and add a two-pane layout to the cluster marker's hover list: the row list stays on the left, and hovering a specific row now fills a detail pane on the right with the same full detail card (Customer Information, Project Information with address + coordinates, Workflow Status, Schedule, Remarks) that a normal single-project pin already shows on hover.

All changes are in `src/modules/project-map/components/ProjectMap.jsx`.

## 1. Extract the shared detail-card builder
Find:
```js
function getOrdinalStop(sequence) {
```
Add immediately before it:
```js
// Builds the full project detail card HTML — Customer Information, Project
// Information (address + coordinates), Workflow Status, Schedule, Remarks.
// Shared by both the individual marker's hover tooltip and the cluster
// marker's row-hover detail pane, so the two stay visually identical
// instead of maintaining two copies of the same large block.
function buildProjectTooltipHTML(project, { statuses = [], buildingCategories = [], permitStatuses = [], welcomeCallStatuses = [], assignedRunLabel = null } = {}) {
  const statusName = project.proj_s_project_status?.status_name || "";

  const subtotalStr = project.project_subtotal != null
    ? `$${Number(project.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "";

  let addressDisplay = "";
  if (project.formatted_address) {
    addressDisplay = stripTownshipLabel(project.formatted_address);
  } else if (project.address_line_1 || project.city) {
    const parts = [project.address_line_1, stripTownshipLabel(project.city), project.state].filter(Boolean);
    addressDisplay = parts.join(", ");
  } else {
    addressDisplay = "No address";
  }

  const coordLat = project.site_latitude ?? project.address_latitude;
  const coordLng = project.site_longitude ?? project.address_longitude;
  const coordsLine = coordLat != null && coordLng != null
    ? `<br/><span style="font-size: 8px; color: #94a3b8; font-weight: 400;">${Number(coordLat).toFixed(6)}, ${Number(coordLng).toFixed(6)}</span>`
    : "";

  const buildingCategoryName = buildingCategories.find((c) => c.id === project.building_category_id)?.building_category_name || "";
  const permitStatusNameVal = permitStatuses.find((s) => s.id === project.permit_status_id)?.status_name || "";
  const welcomeCallStatusNameVal = welcomeCallStatuses.find((s) => s.id === project.welcome_call_status_id)?.status_name || "";

  const formatDate = (val) => {
    if (!val) return "—";
    try {
      const d = new Date(val);
      return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
    } catch { return val; }
  };

  const projectNotes = project.project_notes || "";
  const truncatedNotes = projectNotes.length > 120 ? projectNotes.substring(0, 120) + "…" : projectNotes;

  return `
    <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: ${assignedRunLabel ? "4px" : "8px"}; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">${project.client_name || "Untitled"}</div>
    ${assignedRunLabel ? `<div style="font-size: 10px; color: #6366f1; font-weight: 500; margin-bottom: 8px;">📦 Run: ${assignedRunLabel}</div>` : ""}

    <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px;">Customer Information</div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Dealer</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${project.dealer || "—"}</td></tr>
      <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Building Category</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${buildingCategoryName || "—"}</td></tr>
    </table>

    <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px;">Project Information</div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Address</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${addressDisplay || "—"}${coordsLine}</td></tr>
      <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Dimensions</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${formatProjectDescriptionForDisplay(project.dimension) || "—"}</td></tr>
      <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">State</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${project.state || project.state_code ? `${project.state || ""}${project.state_code ? " (" + project.state_code + ")" : ""}` : "—"}</td></tr>
      <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Project Subtotal</td><td style="font-size: 10px; color: #16a34a; font-weight: 700; text-align: right; padding-bottom: 2px;">${subtotalStr || "—"}</td></tr>
      <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Invoice #</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${project.invoice_number || "—"}</td></tr>
    </table>

    <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px;">Workflow Status</div>
    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
      <span style="font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 600; background: ${getStatusColor(statusName, statuses)}20; color: ${getStatusColor(statusName, statuses)}; border: 1px solid ${getStatusColor(statusName, statuses)}40;">${statusName || "—"}</span>
      <span style="font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 600; background: ${permitStatusNameVal ? "#6366f120" : "#6b728020"}; color: ${permitStatusNameVal ? "#6366f1" : "#6b7280"}; border: 1px solid ${permitStatusNameVal ? "#6366f140" : "#6b728040"};">${permitStatusNameVal || "—"}</span>
      <span style="font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 600; background: ${welcomeCallStatusNameVal ? "#0891b220" : "#6b728020"}; color: ${welcomeCallStatusNameVal ? "#0891b2" : "#6b7280"}; border: 1px solid ${welcomeCallStatusNameVal ? "#0891b240" : "#6b728040"};">${welcomeCallStatusNameVal || "—"}</span>
    </div>

    <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px;">Schedule</div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: ${projectNotes ? "8px" : "0"};">
      <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Order Received</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${formatDate(project.order_received_at)}</td></tr>
      <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Arrival</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${formatDate(project.install_start)}${project.install_end ? " → " + formatDate(project.install_end) : ""}</td></tr>
    </table>

    ${projectNotes ? `
    <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.4px;">Remarks</div>
    <div style="font-size: 10px; color: #475569; background: #f8fafc; padding: 4px 6px; border-radius: 3px; border: 1px solid #e2e8f0; white-space: pre-wrap; line-height: 1.4;">${truncatedNotes}</div>
    ` : ""}
  `;
}
```

## 2. Use the shared builder for the individual marker's tooltip
Find:
```js
      tooltip.innerHTML = `
        <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: ${assignedRunLabel ? "4px" : "8px"}; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">${project.client_name || "Untitled"}</div>
        ${assignedRunLabel ? `<div style="font-size: 10px; color: #6366f1; font-weight: 500; margin-bottom: 8px;">📦 Run: ${assignedRunLabel}</div>` : ""}

        <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px;">Customer Information</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Dealer</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${project.dealer || "—"}</td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Building Category</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${buildingCategoryName || "—"}</td></tr>
        </table>

        <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px;">Project Information</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Address</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${addressDisplay || "—"}<br/><span style="font-size: 8px; color: #94a3b8; font-weight: 400;">${rawLat.toFixed(6)}, ${rawLng.toFixed(6)}</span></td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Dimensions</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${formatProjectDescriptionForDisplay(project.dimension) || "—"}</td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">State</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${project.state || project.state_code ? `${project.state || ""}${project.state_code ? " (" + project.state_code + ")" : ""}` : "—"}</td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Project Subtotal</td><td style="font-size: 10px; color: #16a34a; font-weight: 700; text-align: right; padding-bottom: 2px;">${subtotalStr || "—"}</td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Invoice #</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${project.invoice_number || "—"}</td></tr>
        </table>

        <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px;">Workflow Status</div>
        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
          <span style="font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 600; background: ${getStatusColor(statusName, statuses)}20; color: ${getStatusColor(statusName, statuses)}; border: 1px solid ${getStatusColor(statusName, statuses)}40;">${statusName || "—"}</span>
          <span style="font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 600; background: ${permitStatusNameVal ? "#6366f120" : "#6b728020"}; color: ${permitStatusNameVal ? "#6366f1" : "#6b7280"}; border: 1px solid ${permitStatusNameVal ? "#6366f140" : "#6b728040"};">${permitStatusNameVal || "—"}</span>
          <span style="font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 600; background: ${welcomeCallStatusNameVal ? "#0891b220" : "#6b728020"}; color: ${welcomeCallStatusNameVal ? "#0891b2" : "#6b7280"}; border: 1px solid ${welcomeCallStatusNameVal ? "#0891b240" : "#6b728040"};">${welcomeCallStatusNameVal || "—"}</span>
        </div>

        <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px;">Schedule</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: ${projectNotes ? "8px" : "0"};">
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Order Received</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${formatDate(project.order_received_at)}</td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Arrival</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${formatDate(project.install_start)}${project.install_end ? " → " + formatDate(project.install_end) : ""}</td></tr>
        </table>

        ${projectNotes ? `
        <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.4px;">Remarks</div>
        <div style="font-size: 10px; color: #475569; background: #f8fafc; padding: 4px 6px; border-radius: 3px; border: 1px solid #e2e8f0; white-space: pre-wrap; line-height: 1.4;">${truncatedNotes}</div>
        ` : ""}
      `;
```
Replace with:
```js
      tooltip.innerHTML = buildProjectTooltipHTML(project, {
        statuses, buildingCategories, permitStatuses, welcomeCallStatuses, assignedRunLabel,
      });
```

The now-unused local variables (`addressDisplay`, `buildingCategoryName`, `permitStatusNameVal`, `welcomeCallStatusNameVal`, `subtotalStr`, `formatDate`, `projectNotes`, `truncatedNotes`) computed earlier in this same block are still used elsewhere (the persistent label, marker color, etc.) — leave those computations exactly as they are; only the `tooltip.innerHTML` assignment itself changes.

## 3. Restructure the cluster list into a two-pane list + detail layout
Find:
```js
      // Detailed hover list — one row per project, each clickable.
      const listContent = document.createElement("div");
      listContent.style.cssText = "min-width: 220px; max-width: 280px;";
      const header = document.createElement("div");
      header.style.cssText = "padding: 8px 10px 6px; font-size: 11px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0;";
      header.textContent = `${groupProjects.length} orders at this address`;
      listContent.appendChild(header);

      groupProjects.forEach((p) => {
        const row = document.createElement("div");
        row.style.cssText = "padding: 8px 10px; cursor: pointer; border-bottom: 1px solid #f1f5f9;";
        const subtotalStr = p.project_subtotal != null
          ? `$${Number(p.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "—";
        row.innerHTML = `
          <div style="font-weight: 600; font-size: 12px; color: #1e293b;">${p.client_name || "Untitled"}</div>
          <div style="font-size: 10px; color: #16a34a; font-weight: 600;">${subtotalStr}</div>
        `;
        row.addEventListener("mouseenter", () => { row.style.background = "#f8fafc"; });
        row.addEventListener("mouseleave", () => { row.style.background = ""; });
        row.addEventListener("click", () => {
          try { hoverPopup.remove(); } catch (e) {}
          onSelectProject?.(p.id);
        });
        listContent.appendChild(row);
      });

      const hoverPopup = new MapLibreGL.Popup({
        anchor: "right",
        offset: 10,
        closeButton: false,
        closeOnClick: false,
        className: "project-map-tooltip",
      }).setDOMContent(listContent);
```
Replace with:
```js
      // Two-pane hover popup: the row list on the left, and a detail pane
      // on the right that fills in with the same full detail card an
      // individual pin shows, whenever a specific row is hovered.
      const listContent = document.createElement("div");
      listContent.style.cssText = "display: flex;";

      const listColumn = document.createElement("div");
      listColumn.style.cssText = "min-width: 200px; max-width: 220px; border-right: 1px solid #e2e8f0;";
      const header = document.createElement("div");
      header.style.cssText = "padding: 8px 10px 6px; font-size: 11px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0;";
      header.textContent = `${groupProjects.length} orders at this address`;
      listColumn.appendChild(header);

      const detailPane = document.createElement("div");
      detailPane.style.cssText = "display: none; min-width: 220px; max-width: 280px; padding: 10px 12px; pointer-events: none;";

      groupProjects.forEach((p) => {
        const row = document.createElement("div");
        row.style.cssText = "padding: 8px 10px; cursor: pointer; border-bottom: 1px solid #f1f5f9;";
        const subtotalStr = p.project_subtotal != null
          ? `$${Number(p.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "—";
        row.innerHTML = `
          <div style="font-weight: 600; font-size: 12px; color: #1e293b;">${p.client_name || "Untitled"}</div>
          <div style="font-size: 10px; color: #16a34a; font-weight: 600;">${subtotalStr}</div>
        `;
        row.addEventListener("mouseenter", () => {
          row.style.background = "#f8fafc";
          const rowAssignment = projectRunLookupRef.current.get(p.id) || null;
          const rowAssignedRun = rowAssignment?.run || null;
          const rowStopSequence = rowAssignment?.stopSequence;
          const rowAssignedRunBase = rowAssignedRun ? rowAssignedRun.run_name || `Run #${rowAssignedRun.run_number || rowAssignedRun.id}` : null;
          const rowAssignedRunLabel = rowAssignedRunBase && rowStopSequence != null ? `${rowAssignedRunBase} (${getOrdinalStop(rowStopSequence)})` : rowAssignedRunBase;
          detailPane.innerHTML = buildProjectTooltipHTML(p, {
            statuses, buildingCategories, permitStatuses, welcomeCallStatuses, assignedRunLabel: rowAssignedRunLabel,
          });
          detailPane.style.display = "block";
        });
        row.addEventListener("mouseleave", () => {
          row.style.background = "";
          detailPane.style.display = "none";
          detailPane.innerHTML = "";
        });
        row.addEventListener("click", () => {
          try { hoverPopup.remove(); } catch (e) {}
          onSelectProject?.(p.id);
        });
        listColumn.appendChild(row);
      });

      listContent.appendChild(listColumn);
      listContent.appendChild(detailPane);

      const hoverPopup = new MapLibreGL.Popup({
        anchor: "right",
        offset: 10,
        closeButton: false,
        closeOnClick: false,
        className: "project-map-tooltip",
      }).setDOMContent(listContent);
```

The detail pane is `pointer-events: none` (matching the individual tooltip's own styling) since it's purely informational — the row itself remains the click target for selecting a project, not the detail card.

## DO NOT
- Do not change the outer hover-open/close debounce logic (the `hoverCloseTimer`/`cancelHoverClose`/`scheduleHoverClose` functions right after this block) — that governs the whole popup's open/close lifecycle and is unaffected by this change.
- Do not add coordinates or the full detail card to the always-visible persistent label (`labelContent`) for either individual or cluster markers — that stays minimal, unchanged.
- Do not change `getStatusColor`, `stripTownshipLabel`, or `formatProjectDescriptionForDisplay` — the new shared function just calls them exactly as the original inline code did.

## Verification checklist
1. `grep -n "function buildProjectTooltipHTML\|buildProjectTooltipHTML(project\|buildProjectTooltipHTML(p," src/modules/project-map/components/ProjectMap.jsx` → should show the function definition plus two call sites (individual marker, cluster row hover).
2. Reload `/project-map`, hover a normal single-project pin — confirm its detail tooltip looks identical to before (no visual regression from the extraction).
3. Hover a multi-order cluster marker — confirm the compact row list still appears as before.
4. Hover an individual row inside that list — confirm the detail pane appears beside it showing the full card (Customer Information, Project Information with address + coordinates, Workflow Status, Schedule) for that specific project.
5. Move to a different row — confirm the detail pane updates to that project's info.
6. Move the mouse off the rows entirely (but still within the popup) — confirm the detail pane clears/hides.
7. Click a row — confirm it still selects that project and closes the popup, exactly as before.
8. Paste back the output of step 1 to confirm the edit persisted to disk.