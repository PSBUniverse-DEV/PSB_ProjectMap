"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { Button, Modal, toastSuccess, toastError } from "@/shared/components/ui";
import { saveDepartmentStatusTabs, saveDepartmentRunStatuses } from "../data/projectMap.actions";
import { isGroupedStatusTab } from "../data/projectMap.data";

// dept_id -> status ids (as strings)
function groupStatusIdsByDept(rows) {
  const lookup = new Map();
  rows.forEach((row) => {
    const key = String(row.dept_id);
    if (!lookup.has(key)) lookup.set(key, []);
    lookup.get(key).push(String(row.status_id));
  });
  return lookup;
}

const byDisplayOrder = (a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0);

/**
 * DepartmentStatusTabsGrid — what each department sees on the Project Map:
 * project status tabs (proj_m_department_project_status) and run statuses
 * (proj_m_department_run_status).
 *
 * A department with no project tabs cannot open the Project Map; one with no
 * run statuses loses the Runs buttons. Both are called out. Repair
 * sub-statuses are not listed: the "Repairs" tab covers them.
 */
export default function DepartmentStatusTabsGrid({ departments = [], statuses = [], mappings = [], runStatuses = [], runMappings = [] }) {
  const router = useRouter();
  const [editingDept, setEditingDept] = useState(null);
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

  const statusIdsByDept = useMemo(() => groupStatusIdsByDept(mappings), [mappings]);
  const runStatusIdsByDept = useMemo(() => groupStatusIdsByDept(runMappings), [runMappings]);

  const openEdit = useCallback(
    (dept) => {
      // Start from every saved row, including ones not listed below, so saving never drops them silently.
      setSelected(statusIdsByDept.get(String(dept.dept_id)) || []);
      setSelectedRuns(runStatusIdsByDept.get(String(dept.dept_id)) || []);
      setEditingDept(dept);
    },
    [statusIdsByDept, runStatusIdsByDept]
  );

  const closeModal = useCallback(() => {
    setEditingDept(null);
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
    if (!editingDept) return;
    setBusy(true);
    try {
      await saveDepartmentStatusTabs(editingDept.dept_id, selected);
      await saveDepartmentRunStatuses(editingDept.dept_id, selectedRuns);
      toastSuccess("Department tabs saved.", "Department Tabs");
      closeModal();
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Unable to save department tabs. Please try again.", "Department Tabs");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }, [editingDept, selected, selectedRuns, closeModal, router]);

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
                <th>Visible Run Statuses</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => {
                const ids = statusIdsByDept.get(String(dept.dept_id)) || [];
                const names = tabStatuses.filter((s) => ids.includes(String(s.status_id))).map((s) => s.status_name);
                const runIds = runStatusIdsByDept.get(String(dept.dept_id)) || [];
                const runNames = activeRunStatuses.filter((s) => runIds.includes(String(s.status_id))).map((s) => s.status_name);
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
                    <td>
                      {runNames.length > 0 ? (
                        <span className="oag-address">{runNames.join(", ")}</span>
                      ) : (
                        <span style={{ color: "#b45309", fontWeight: 600 }}>None (Runs hidden)</span>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {renderChecklist("Project status tabs", tabStatuses, selected, setSelected, "dept-tab")}
          {selected.length === 0 && (
            <p style={{ margin: 0, fontSize: "12px", color: "#b91c1c" }}>
              With no project tabs selected, users in this department cannot open the Project Map.
            </p>
          )}
          {renderChecklist("Run statuses", activeRunStatuses, selectedRuns, setSelectedRuns, "dept-run")}
          {selectedRuns.length === 0 && (
            <p style={{ margin: 0, fontSize: "12px", color: "#b45309" }}>
              With no run statuses selected, users in this department will not see Runs or the Run Master List.
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
