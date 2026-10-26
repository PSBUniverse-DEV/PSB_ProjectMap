"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { Button, Modal, toastSuccess, toastError } from "@/shared/components/ui";
import { saveRoleStatusTabs, saveRoleRunStatuses } from "../data/projectMap.actions";
import { isGroupedStatusTab } from "../data/projectMap.data";

// role_id -> status ids (as strings)
function groupStatusIdsByRole(rows) {
  const lookup = new Map();
  rows.forEach((row) => {
    const key = String(row.role_id);
    if (!lookup.has(key)) lookup.set(key, []);
    lookup.get(key).push(String(row.status_id));
  });
  return lookup;
}

const byDisplayOrder = (a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0);

/**
 * RoleStatusTabsGrid — what each Project Map role gives on the Project Map:
 * project status tabs (proj_m_role_project_status) and run statuses
 * (proj_m_role_run_status). A user with several roles sees all of their
 * roles' statuses combined.
 *
 * Every Project Map user SEES every status; these ticks decide what a role
 * may CHANGE. A role with nothing ticked is view only (e.g. "Viewer"). Repair
 * sub-statuses are not listed: the "Repairs" tab covers them.
 */
export default function RoleStatusTabsGrid({ roles = [], statuses = [], mappings = [], runStatuses = [], runMappings = [] }) {
  const router = useRouter();
  const [editingRole, setEditingRole] = useState(null);
  const [selected, setSelected] = useState([]);
  const [selectedRuns, setSelectedRuns] = useState([]);
  const [busy, setBusy] = useState(false);

  // Statuses that can be a tab, in tab order.
  const tabStatuses = useMemo(
    () => statuses.filter((s) => s.is_active !== false && !isGroupedStatusTab(s, statuses)).sort(byDisplayOrder),
    [statuses]
  );
  const activeRunStatuses = useMemo(
    () => runStatuses.filter((s) => s.is_active !== false).sort(byDisplayOrder),
    [runStatuses]
  );

  const statusIdsByRole = useMemo(() => groupStatusIdsByRole(mappings), [mappings]);
  const runStatusIdsByRole = useMemo(() => groupStatusIdsByRole(runMappings), [runMappings]);

  const openEdit = useCallback(
    (role) => {
      // Start from every saved row, including ones not listed below, so saving never drops them silently.
      setSelected(statusIdsByRole.get(String(role.role_id)) || []);
      setSelectedRuns(runStatusIdsByRole.get(String(role.role_id)) || []);
      setEditingRole(role);
    },
    [statusIdsByRole, runStatusIdsByRole]
  );

  const closeModal = useCallback(() => {
    setEditingRole(null);
    setSelected([]);
    setSelectedRuns([]);
  }, []);

  const toggle = (setter) => (statusId) => {
    setter((prev) => (prev.includes(statusId) ? prev.filter((id) => id !== statusId) : [...prev, statusId]));
  };

  // Ticks every listed status while keeping saved ones that are not listed.
  const selectAll = (setter, listed) => () => {
    const listedIds = new Set(listed.map((status) => String(status.status_id)));
    setter((prev) => [...prev.filter((statusId) => !listedIds.has(statusId)), ...listedIds]);
  };

  const handleSave = useCallback(async () => {
    if (!editingRole) return;
    setBusy(true);
    try {
      await saveRoleStatusTabs(editingRole.role_id, selected);
      await saveRoleRunStatuses(editingRole.role_id, selectedRuns);
      toastSuccess("Role tabs saved.", "Role Tabs");
      closeModal();
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Unable to save role tabs. Please try again.", "Role Tabs");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }, [editingRole, selected, selectedRuns, closeModal, router]);

  const renderChecklist = (title, listed, values, setter, idPrefix) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <strong style={{ fontSize: "13px", flex: 1 }}>{title}</strong>
        <Button variant="secondary" size="sm" onClick={selectAll(setter, listed)}>Select all</Button>
        <Button variant="secondary" size="sm" onClick={() => setter([])}>Clear</Button>
      </div>
      <div style={{ maxHeight: "28vh", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "8px 12px" }}>
        {listed.map((status) => {
          const statusId = String(status.status_id);
          return (
            <Form.Check
              key={statusId}
              type="checkbox"
              id={`${idPrefix}-${statusId}`}
              label={status.status_name}
              checked={values.includes(statusId)}
              onChange={() => toggle(setter)(statusId)}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="oag-root">
      <div className="oag-toolbar">
        <div className="oag-toolbar__left">
          <h2 className="oag-toolbar__title">Role Tabs</h2>
          <span className="oag-toolbar__count">
            {roles.length} role{roles.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="oag-grid-wrap">
        {roles.length === 0 ? (
          <div className="oag-empty">
            <p className="oag-empty__title">No Project Map Roles</p>
            <p className="oag-empty__desc">Add roles for Project Map in Application Setup first.</p>
          </div>
        ) : (
          <table className="oag-table">
            <thead>
              <tr>
                <th className="oag-col-actions">Actions</th>
                <th className="oag-col-name">Role</th>
                <th>Can Edit Projects In</th>
                <th>Can Edit Runs In</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => {
                const ids = statusIdsByRole.get(String(role.role_id)) || [];
                const names = tabStatuses.filter((s) => ids.includes(String(s.status_id))).map((s) => s.status_name);
                const runIds = runStatusIdsByRole.get(String(role.role_id)) || [];
                const runNames = activeRunStatuses.filter((s) => runIds.includes(String(s.status_id))).map((s) => s.status_name);
                return (
                  <tr key={role.role_id} className="oag-row">
                    <td className="oag-col-actions">
                      <div className="oag-actions">
                        <button
                          className="oag-action-btn oag-action-btn--edit"
                          title="Edit tabs"
                          onClick={() => openEdit(role)}
                          disabled={busy}
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                      </div>
                    </td>
                    <td className="oag-col-name">
                      <span className="oag-origin-name">{role.role_name}</span>
                      {role.is_active === false && <span style={{ marginLeft: "6px", fontSize: "11px", color: "#64748b" }}>(inactive)</span>}
                    </td>
                    <td>
                      {names.length > 0 ? (
                        <span className="oag-address">{names.join(", ")}</span>
                      ) : (
                        <span style={{ color: "#64748b", fontWeight: 600 }}>None (view only)</span>
                      )}
                    </td>
                    <td>
                      {runNames.length > 0 ? (
                        <span className="oag-address">{runNames.join(", ")}</span>
                      ) : (
                        <span style={{ color: "#64748b", fontWeight: 600 }}>None (view only)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal show={!!editingRole} onHide={closeModal} title={`What ${editingRole?.role_name || ""} can edit`}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {renderChecklist("Can edit projects in these statuses", tabStatuses, selected, setSelected, "role-tab")}
          {selected.length === 0 && (
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Nothing ticked: this role can view every project but change none. A user with another Project Map role still gets that role&apos;s edit rights.
            </p>
          )}
          {renderChecklist("Can edit runs in these statuses", activeRunStatuses, selectedRuns, setSelectedRuns, "role-run")}
          {selectedRuns.length === 0 && (
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
              Nothing ticked: this role can view every run but change none. A user with another Project Map role still gets that role&apos;s edit rights.
            </p>
          )}
          <div className="oag-modal-actions">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
