"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { Button, Modal, toastSuccess, toastError } from "@/shared/components/ui";
import { saveDepartmentStatusTabs } from "../data/projectMap.actions";
import { isGroupedStatusTab } from "../data/projectMap.data";

/**
 * DepartmentStatusTabsGrid — which project status tabs each department sees
 * on the Project Map (proj_m_department_project_status).
 *
 * A department with no tabs assigned cannot open the Project Map, so those
 * rows are called out. Repair sub-statuses are not listed: the "Repairs" tab
 * covers them.
 */
export default function DepartmentStatusTabsGrid({ departments = [], statuses = [], mappings = [] }) {
  const router = useRouter();
  const [editingDept, setEditingDept] = useState(null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  // Statuses that can be a tab, in tab order.
  const tabStatuses = useMemo(
    () =>
      statuses
        .filter((s) => s.is_active !== false && !isGroupedStatusTab(s, statuses))
        .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0)),
    [statuses]
  );

  // dept_id -> status ids (as strings)
  const statusIdsByDept = useMemo(() => {
    const lookup = new Map();
    mappings.forEach((row) => {
      const key = String(row.dept_id);
      if (!lookup.has(key)) lookup.set(key, []);
      lookup.get(key).push(String(row.status_id));
    });
    return lookup;
  }, [mappings]);

  const openEdit = useCallback(
    (dept) => {
      // Start from every saved row, including ones not listed below, so saving never drops them silently.
      setSelected(statusIdsByDept.get(String(dept.dept_id)) || []);
      setEditingDept(dept);
    },
    [statusIdsByDept]
  );

  const closeModal = useCallback(() => {
    setEditingDept(null);
    setSelected([]);
  }, []);

  const toggleStatus = (statusId) => {
    setSelected((prev) => (prev.includes(statusId) ? prev.filter((id) => id !== statusId) : [...prev, statusId]));
  };

  const selectAllStatuses = () => {
    const selectableIds = new Set(tabStatuses.map((status) => String(status.status_id)));
    setSelected((prev) => [...prev.filter((statusId) => !selectableIds.has(statusId)), ...selectableIds]);
  };

  const handleSave = useCallback(async () => {
    if (!editingDept) return;
    setBusy(true);
    try {
      await saveDepartmentStatusTabs(editingDept.dept_id, selected);
      toastSuccess("Department tabs saved.", "Department Tabs");
      closeModal();
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Unable to save department tabs. Please try again.", "Department Tabs");
    } finally {
      setBusy(false);
    }
  }, [editingDept, selected, closeModal, router]);

  return (
    <div className="oag-root">
      <div className="oag-toolbar">
        <div className="oag-toolbar__left">
          <h2 className="oag-toolbar__title">Department Tabs</h2>
          <span className="oag-toolbar__count">
            {departments.length} department{departments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="oag-grid-wrap">
        {departments.length === 0 ? (
          <div className="oag-empty">
            <p className="oag-empty__title">No Departments</p>
            <p className="oag-empty__desc">Add departments in Company-Department Setup first.</p>
          </div>
        ) : (
          <table className="oag-table">
            <thead>
              <tr>
                <th className="oag-col-actions">Actions</th>
                <th className="oag-col-name">Department</th>
                <th>Visible Project Status Tabs</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => {
                const ids = statusIdsByDept.get(String(dept.dept_id)) || [];
                const names = tabStatuses.filter((s) => ids.includes(String(s.status_id))).map((s) => s.status_name);
                return (
                  <tr key={dept.dept_id} className="oag-row">
                    <td className="oag-col-actions">
                      <div className="oag-actions">
                        <button
                          className="oag-action-btn oag-action-btn--edit"
                          title="Edit tabs"
                          onClick={() => openEdit(dept)}
                          disabled={busy}
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                      </div>
                    </td>
                    <td className="oag-col-name">
                      <span className="oag-origin-name">{dept.dept_name}</span>
                      {dept.is_active === false && <span style={{ marginLeft: "6px", fontSize: "11px", color: "#64748b" }}>(inactive)</span>}
                    </td>
                    <td>
                      {names.length > 0 ? (
                        <span className="oag-address">{names.join(", ")}</span>
                      ) : (
                        <span style={{ color: "#b91c1c", fontWeight: 600 }}>None (blocked from Project Map)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal show={!!editingDept} onHide={closeModal} title={`Tabs for ${editingDept?.dept_name || ""}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="secondary" size="sm" onClick={selectAllStatuses}>Select all</Button>
            <Button variant="secondary" size="sm" onClick={() => setSelected([])}>Clear</Button>
          </div>
          <div style={{ maxHeight: "50vh", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "8px 12px" }}>
            {tabStatuses.map((status) => {
              const statusId = String(status.status_id);
              return (
                <Form.Check
                  key={statusId}
                  type="checkbox"
                  id={`dept-tab-${statusId}`}
                  label={status.status_name}
                  checked={selected.includes(statusId)}
                  onChange={() => toggleStatus(statusId)}
                />
              );
            })}
          </div>
          {selected.length === 0 && (
            <p style={{ margin: 0, fontSize: "12px", color: "#b91c1c" }}>
              With no tabs selected, users in this department cannot open the Project Map.
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
