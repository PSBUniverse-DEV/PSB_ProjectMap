"use client";

import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot, faTruck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { formatProjectDescriptionForDisplay, stripTownshipLabel, PROJECT_FILE_MAX_BYTES, PROJECT_FILE_TYPES, getProjectAmountDisplay } from "../data/projectMap.data";
import { FileAttachments } from "@/shared/components/ui";
import ProjectComments from "./ProjectComments";
import ProjectStatusHistory from "./ProjectStatusHistory";
import RepairFormCard from "./RepairFormCard";
import { loadFiles, createFileUpload, saveUploadedFile, getFileUrl, deleteFile } from "../data/projectMap.actions";

/**
 * ProjectDetailDrawer — the side panel shown when a project pin is selected on
 * the Projects tab. Read-only summary of the project's customer, schedule and
 * workflow data.
 *
 * The run box under "Schedule & run" doubles as a quick way to unassign the
 * project: when it belongs to a run, a "Remove" button appears next to the run
 * name. `onOpenRun(runId)` (optional) makes the run name open that run.
 * It calls `onRemoveFromRun(project.id)`, which the parent view resolves to
 * the SAME removal flow used by the Runs tab's detail panel (same action, same
 * toasts, same refreshes) so every unassign path stays in sync.
 */
export default function ProjectDetailDrawer({ project, statuses = [], buildingCategories = [], permitStatuses = [], welcomeCallStatuses = [], confirmationStatuses = [], projectRunLookup = new Map(), onClose, onEdit = null, onDelete = null, onRemoveFromRun = null, routeInfo = null, onOpenRun = null, onRepairFormChanged = null, readOnly = false, commentsReadOnly = false, filesReadOnly = false, canDeleteFile = null }) {
  const statusName = useMemo(() => {
    if (!project) return "";
    return project.proj_s_project_status?.status_name || statuses.find((s) => s.status_id === project.status_id)?.status_name || "";
  }, [project, statuses]);

  const assignedRun = useMemo(() => {
    if (!project) return null;
    const assignment = projectRunLookup.get(project.id) || null;
    return assignment?.run || null;
  }, [project, projectRunLookup]);

  // Guards against double-clicking the remove "×" while the unassign request
  // is in flight. Error handling/toasting lives in the parent's removal flow.
  const [isRemoving, setIsRemoving] = useState(false);

  /**
   * Removes this project from its assigned run via the parent's shared
   * removal flow. After the parent refreshes its run-projects lookup, the
   * drawer re-renders showing "Not Assigned" and the project becomes an
   * assignable candidate again (map pin + Project Selector).
   */
  const handleRemoveFromRun = async () => {
    if (!project || isRemoving) return;
    setIsRemoving(true);
    try {
      await onRemoveFromRun?.(project.id);
    } finally {
      setIsRemoving(false);
    }
  };

  const buildingCategoryName = useMemo(() => {
    if (!project) return "";
    const cat = project.proj_s_building_categories || buildingCategories.find((c) => c.id === project.building_category_id);
    return cat?.building_category_name || "";
  }, [project, buildingCategories]);

  const permitStatusName = useMemo(() => {
    if (!project) return "";
    const s = project.proj_s_permit_status || permitStatuses.find((p) => p.id === project.permit_status_id);
    return s?.status_name || "";
  }, [project, permitStatuses]);

  const welcomeCallStatusName = useMemo(() => {
    if (!project) return "";
    const s = project.proj_s_welcome_call_status || welcomeCallStatuses.find((w) => w.id === project.welcome_call_status_id);
    return s?.status_name || "";
  }, [project, welcomeCallStatuses]);

  const confirmationStatusName = useMemo(() => {
    if (!project) return "";
    const s = project.proj_s_confirmation_status || confirmationStatuses.find((c) => c.id === project.confirmation_status_id);
    return s?.status_name || "";
  }, [project, confirmationStatuses]);

  function getStatusColor(name) {
    if (!name) return "#6b7280";
    const found = statuses.find((s) => s.status_name === name);
    return found?.display_color || "#6b7280";
  }

  function formatDateTime(val) {
    if (!val) return "—";
    try {
      const d = new Date(val);
      return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
    } catch { return val; }
  }

  // Comments / Files tabs at the bottom of the drawer.
  const [activeTab, setActiveTab] = useState("comments");

  if (!project) return null;

  const amount = getProjectAmountDisplay(project, statuses);
  const subtotal = project.project_subtotal != null
    ? `$${Number(project.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

  // Shared looks for the cards in this drawer (approved drawer mockup).
  const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px" };
  const cardTitle = { margin: 0, fontSize: "11px", fontWeight: 700, color: "#475569", letterSpacing: "0.04em", textTransform: "uppercase" };
  const infoRow = { display: "flex", justifyContent: "space-between", gap: "12px" };
  const infoLabel = { color: "#64748b", flexShrink: 0 };
  const infoValue = { fontWeight: 600, color: "#0f172a", textAlign: "right", overflowWrap: "anywhere" };
  const notSet = { color: "#94a3b8", textAlign: "right" };

  const statusColor = getStatusColor(statusName);
  // Whole days since the project was added to the map.
  const createdMs = project.created_at ? new Date(project.created_at).getTime() : NaN;
  const daysOnMap = Number.isNaN(createdMs) ? null : Math.max(0, Math.floor((Date.now() - createdMs) / 86400000));
  const subtitle = [project.dealer, buildingCategoryName].filter(Boolean).join(" · ");
  // stopSequence is the stop's 0-based position in its run.
  const runAssignment = projectRunLookup.get(project.id) || null;
  const stopNumber = runAssignment?.stopSequence != null && Number.isFinite(Number(runAssignment.stopSequence)) ? Number(runAssignment.stopSequence) + 1 : null;
  const runLabel = assignedRun ? (assignedRun.run_name || `Run #${assignedRun.run_number || assignedRun.id}`) : "";
  const runSubLabel = assignedRun ? [stopNumber ? `Stop ${stopNumber}` : "", assignedRun.run_code || ""].filter(Boolean).join(" · ") : "";
  const lat = project.site_latitude ?? project.address_latitude;
  const lng = project.site_longitude ?? project.address_longitude;
  const stateText = project.state || project.state_code ? `${project.state || ""}${project.state_code ? ` (${project.state_code})` : ""}` : "";
  const locationSub = [stateText, lat != null && lng != null ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}` : ""].filter(Boolean).join(" · ");
  const addressText = project.formatted_address
    ? stripTownshipLabel(project.formatted_address)
    : [project.address_line_1, [stripTownshipLabel(project.city), project.state, project.postal_code].filter(Boolean).join(", ")].filter(Boolean).join(", ");
  const dimensions = formatProjectDescriptionForDisplay(project.dimension);
  const sideStatuses = [
    { label: "Welcome call", name: welcomeCallStatusName },
    { label: "Confirmation", name: confirmationStatusName },
    { label: "Permit", name: permitStatusName },
  ];
  const tabs = [
    { key: "comments", label: "Comments" },
    { key: "files", label: "Files" },
  ];
  const hasFooter = Boolean(readOnly || onEdit || onDelete);

  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: "360px", height: "100%", background: "#f8fafc", borderLeft: "1px solid #cbd5e1", boxShadow: "-4px 0 12px rgba(0,0,0,0.08)", zIndex: 10, display: "flex", flexDirection: "column", fontSize: "12px", color: "#0f172a" }}>
      {/* Header: where it stands, who, how much */}
      <div style={{ padding: "14px 16px 12px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "2px 9px", borderRadius: "999px", background: `${statusColor}1a`, color: statusColor, border: `1px solid ${statusColor}55`, fontSize: "11px", fontWeight: 600 }}>
            <span aria-hidden="true" style={{ width: "7px", height: "7px", borderRadius: "50%", background: statusColor }} />
            {statusName || "No status"}
          </span>
          {daysOnMap != null && (
            <span style={{ fontSize: "11px", color: "#64748b" }}>{daysOnMap === 1 ? "1 day" : `${daysOnMap} days`} on the map</span>
          )}
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close project details" title="Close" style={{ marginLeft: "auto", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: "6px", background: "transparent", color: "#64748b", cursor: "pointer" }}>
              <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
            </button>
          )}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, lineHeight: 1.2, color: "#0f172a", overflowWrap: "anywhere" }}>{project.client_name || "Untitled"}</h2>
          {subtitle && <div style={{ marginTop: "2px", color: "#64748b" }}>{subtitle}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" }}>
          <span style={{ fontSize: "11px", color: amount.isRepair ? amount.color : "#64748b", fontWeight: amount.isRepair ? 700 : 400 }}>{amount.label}</span>
          <span style={{ fontSize: "20px", fontWeight: 700, color: subtotal ? amount.color : "#94a3b8" }}>{subtotal || "—"}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Workflow: the three side statuses at a glance */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px" }}>
          {sideStatuses.map((item) => (
            <div key={item.label} style={{ padding: "7px 8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", minWidth: 0 }}>
              <div style={{ fontSize: "10px", color: "#64748b" }}>{item.label}</div>
              <div style={{ marginTop: "2px", fontWeight: 600, color: item.name ? "#0f172a" : "#94a3b8", overflowWrap: "anywhere" }}>{item.name || "Not set"}</div>
            </div>
          ))}
        </div>

        {/* Repair form: only for projects in a repair status (amount.isRepair = isRepairProject). */}
        {amount.isRepair && (
          <RepairFormCard
            key={`repair-${project.id}`}
            project={project}
            addressText={addressText}
            amountText={subtotal}
            readOnly={readOnly}
            filesReadOnly={filesReadOnly}
            canDeleteFile={canDeleteFile}
            onChanged={onRepairFormChanged}
          />
        )}

        {/* Details */}
        <section style={card}>
          <h3 style={cardTitle}>Details</h3>
          <div style={infoRow}>
            <span style={infoLabel}>Building</span>
            <span style={buildingCategoryName ? infoValue : notSet}>{buildingCategoryName || "Not set"}</span>
          </div>
          <div style={infoRow}>
            <span style={infoLabel}>Dimensions</span>
            <span style={dimensions ? infoValue : notSet}>{dimensions || "Not set"}</span>
          </div>
          <div style={infoRow}>
            <span style={infoLabel}>Invoice #</span>
            <span style={project.invoice_number ? infoValue : notSet}>{project.invoice_number || "Not set"}</span>
          </div>
          <div style={{ paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
            <div style={{ color: "#64748b", marginBottom: "3px" }}>Remarks</div>
            {project.project_notes ? (
              <div style={{ color: "#0f172a", lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{project.project_notes}</div>
            ) : (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No remarks yet.</div>
            )}
          </div>
        </section>

        {/* Location */}
        <section style={card}>
          <h3 style={cardTitle}>Location</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <FontAwesomeIcon icon={faLocationDot} aria-hidden="true" style={{ color: "#475569", marginTop: "2px" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{addressText || "No address"}</div>
              {locationSub && <div style={{ fontSize: "10px", color: "#64748b" }}>{locationSub}</div>}
            </div>
          </div>
          {routeInfo && (
            <div style={{ ...infoRow, paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
              <span style={infoLabel}>From origin</span>
              <span style={infoValue}>{routeInfo.distance} · {routeInfo.duration}</span>
            </div>
          )}
        </section>

        {/* Schedule & run */}
        <section style={card}>
          <h3 style={cardTitle}>Schedule &amp; run</h3>
          <div style={infoRow}>
            <span style={infoLabel}>Order received</span>
            <span style={project.order_received_at ? infoValue : notSet}>{project.order_received_at ? formatDateTime(project.order_received_at) : "Not set"}</span>
          </div>
          <div style={infoRow}>
            <span style={infoLabel}>Arrival</span>
            <span style={project.install_start ? infoValue : notSet}>
              {project.install_start ? `${formatDateTime(project.install_start)}${project.install_end ? ` → ${formatDateTime(project.install_end)}` : ""}` : "Not set"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
            <FontAwesomeIcon icon={faTruck} aria-hidden="true" style={{ color: "#475569" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {assignedRun ? (
                onOpenRun ? (
                  <button type="button" onClick={() => onOpenRun(assignedRun.id)} title="Open this run" style={{ padding: 0, border: "none", background: "none", fontFamily: "inherit", fontSize: "12px", fontWeight: 600, color: "#1d4ed8", cursor: "pointer", textAlign: "left", overflowWrap: "anywhere" }}>{runLabel}</button>
                ) : (
                  <span style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{runLabel}</span>
                )
              ) : (
                <span style={{ color: "#94a3b8" }}>Not assigned to a run</span>
              )}
              {runSubLabel && <div style={{ fontSize: "10px", color: "#64748b" }}>{runSubLabel}</div>}
            </div>
            {/* Unassign shortcut — goes through the same removal flow as the
                "×" in the Runs tab's detail panel. */}
            {assignedRun && onRemoveFromRun && (
              <button
                type="button"
                onClick={handleRemoveFromRun}
                disabled={isRemoving}
                title="Remove from run"
                aria-label="Remove project from assigned run"
                style={{ flexShrink: 0, padding: "4px 8px", border: "1px solid #fecaca", borderRadius: "6px", background: "#fff", color: "#b91c1c", fontFamily: "inherit", fontSize: "11px", fontWeight: 600, cursor: isRemoving ? "default" : "pointer", opacity: isRemoving ? 0.5 : 1 }}
              >
                {isRemoving ? "Removing..." : "Remove"}
              </button>
            )}
          </div>
        </section>

        {/* Comments / Files as tabs. Both stay mounted (the inactive one is
            hidden) so switching tabs does not reload them. */}
        <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
          <div role="tablist" aria-label="Comments and files" style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  style={{ flex: 1, padding: "9px", border: "none", borderBottom: `2px solid ${active ? "#0f172a" : "transparent"}`, background: active ? "#fff" : "#f8fafc", color: active ? "#0f172a" : "#475569", fontFamily: "inherit", fontSize: "12px", fontWeight: active ? 700 : 500, cursor: "pointer" }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div style={{ padding: "10px 12px" }}>
            <div style={{ display: activeTab === "comments" ? "block" : "none" }}>
              {/* Comments: open to every role whose "Comments & Files" tick is on,
                  also on view-only projects. Unticked roles (e.g. Viewer) only read them. */}
              <ProjectComments key={`comments-${project.id}`} projectId={project.id} readOnly={commentsReadOnly} />
            </div>
            <div style={{ display: activeTab === "files" ? "block" : "none" }}>
              <FileAttachments
                key={project.id}
                loadFiles={() => loadFiles("project", project.id)}
                createUpload={(meta) => createFileUpload("project", project.id, meta)}
                saveFile={(storagePath, meta) => saveUploadedFile("project", project.id, storagePath, meta)}
                getFileUrl={(file) => getFileUrl(file.id)}
                deleteFile={(file) => deleteFile(file.id)}
                maxBytes={PROJECT_FILE_MAX_BYTES}
                accept={PROJECT_FILE_TYPES.join(",")}
                // Add file: editors and anyone who may comment and attach. Delete: editors, or your own file.
                readOnly={filesReadOnly}
                canDeleteFile={canDeleteFile}
              />
            </div>
          </div>
        </section>

        {/* History: every status change with dates, durations and who made it. */}
        <ProjectStatusHistory key={`history-${project.id}`} project={project} statuses={statuses} />

      </div>

      {/* Sticky footer: Delete left, Edit right */}
      {hasFooter && (
        <div style={{ padding: "10px 12px", background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {onDelete && (
            <button type="button" onClick={onDelete} style={{ padding: "8px 12px", border: "1px solid #fecaca", borderRadius: "8px", background: "#fff", color: "#b91c1c", fontFamily: "inherit", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Delete</button>
          )}
          {readOnly && (
            <span
              title="Your Project Map roles cannot change projects in this status."
              style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1px 8px" }}
            >
              View only
            </span>
          )}
          {onEdit && (
            <button type="button" onClick={onEdit} style={{ marginLeft: "auto", padding: "8px 18px", border: "none", borderRadius: "8px", background: "#0f172a", color: "#fff", fontFamily: "inherit", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Edit project</button>
          )}
        </div>
      )}
    </div>
  );
}