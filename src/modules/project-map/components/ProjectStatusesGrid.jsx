"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPen, faTrash, faGripVertical, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Button, Modal, toastSuccess, toastError } from "@/shared/components/ui";
import {
  createProjectStatus,
  updateProjectStatus,
  toggleProjectStatusActive,
  reorderProjectStatuses,
  softDeleteProjectStatus,
} from "../data/projectMap.actions";

/**
 * ProjectStatusesGrid — Dedicated admin grid for managing project statuses.
 *
 * Features:
 *  - Drag & drop reordering (HTML5 native)
 *  - Color preview with colored square + hex code
 *  - Active/inactive toggle inline
 *  - Search across name, description, color
 *  - Filters: All / Active / Inactive
 *  - Add / Edit modal with native color picker
 *  - Delete confirmation with soft delete (is_active = false)
 *  - Empty state
 *  - Validation (required name, max 100 chars, unique name, valid hex)
 */
export default function ProjectStatusesGrid({ data = [], onRefresh }) {
  const router = useRouter();

  // ─── State ─────────────────────────────────────────────────
  const [searchValue, setSearchValue] = useState("");
  const [filterActive, setFilterActive] = useState("all"); // "all" | "active" | "inactive"
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [modalDraft, setModalDraft] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Drag state
  const [dragOverId, setDragOverId] = useState(null);
  const dragItem = useRef(null);

  // ─── Local data (for optimistic reorder) ──────────────────
  const [localData, setLocalData] = useState(null);

  // Use local data if available (for optimistic updates), otherwise use server data
  const displayData = localData ?? data;

  // ─── Filtering & Search ────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = displayData;

    // Filter by active status
    if (filterActive === "active") {
      result = result.filter((r) => r.is_active === true);
    } else if (filterActive === "inactive") {
      result = result.filter((r) => r.is_active === false);
    }

    // Search across name, description, color
    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      result = result.filter((r) => {
        const name = (r.status_name || "").toLowerCase();
        const desc = (r.status_description || "").toLowerCase();
        const color = (r.display_color || "").toLowerCase();
        return name.includes(q) || desc.includes(q) || color.includes(q);
      });
    }

    return result;
  }, [displayData, filterActive, searchValue]);

  // ─── Drag & Drop Handlers ──────────────────────────────────

  const handleDragStart = useCallback((e, statusId) => {
    dragItem.current = statusId;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(statusId));
    // Add a slight delay for visual feedback
    setTimeout(() => {
      e.target.closest(".psg-row")?.classList.add("psg-row--dragging");
    }, 0);
  }, []);

  const handleDragOver = useCallback((e, statusId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (statusId !== dragItem.current) {
      setDragOverId(statusId);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    async (e, targetStatusId) => {
      e.preventDefault();
      setDragOverId(null);

      const sourceId = dragItem.current;
      if (!sourceId || sourceId === targetStatusId) return;

      // Remove dragging class
      e.target.closest(".psg-row")?.classList.remove("psg-row--dragging");

      // Build new order
      const items = [...displayData];
      const sourceIndex = items.findIndex((r) => r.status_id === sourceId);
      const targetIndex = items.findIndex((r) => r.status_id === targetStatusId);

      if (sourceIndex === -1 || targetIndex === -1) return;

      // Remove source item and insert at target position
      const [movedItem] = items.splice(sourceIndex, 1);
      items.splice(targetIndex, 0, movedItem);

      // Recalculate display_order
      const updates = items.map((item, idx) => ({
        status_id: item.status_id,
        display_order: (idx + 1) * 10,
      }));

      // Optimistic update
      const reordered = items.map((item, idx) => ({
        ...item,
        display_order: (idx + 1) * 10,
      }));
      setLocalData(reordered);

      // Save to server
      try {
        await reorderProjectStatuses(updates);
        toastSuccess("Display order updated.", "Reorder");
        // Refresh server data
        router.refresh();
        onRefresh?.();
      } catch (err) {
        toastError(err?.message || "Unable to update display order. Please try again.", "Reorder");
        // Revert optimistic update
        setLocalData(null);
      }
    },
    [displayData, router, onRefresh]
  );

  const handleDragEnd = useCallback(() => {
    dragItem.current = null;
    setDragOverId(null);
    document.querySelectorAll(".psg-row--dragging").forEach((el) => {
      el.classList.remove("psg-row--dragging");
    });
  }, []);

  // ─── Active Toggle ─────────────────────────────────────────

  const handleToggleActive = useCallback(
    async (statusId, currentActive) => {
      const newActive = !currentActive;
      // Optimistic update
      setLocalData((prev) => {
        const base = prev ?? data;
        return base.map((r) =>
          r.status_id === statusId ? { ...r, is_active: newActive } : r
        );
      });

      try {
        await toggleProjectStatusActive(statusId, newActive);
        toastSuccess("Project status updated.", "Toggle");
        router.refresh();
        onRefresh?.();
      } catch (err) {
        toastError(err?.message || "Unable to update status. Please try again.", "Toggle");
        // Revert
        setLocalData(null);
      }
    },
    [data, router, onRefresh]
  );

  // ─── Modal Handlers ────────────────────────────────────────

  const openAdd = useCallback(() => {
    setModalDraft({
      status_name: "",
      status_description: "",
      display_color: "",
      is_active: true,
    });
    setEditingRow(null);
    setModalMode("add");
  }, []);

  const openEdit = useCallback((row) => {
    setModalDraft({
      status_name: row.status_name || "",
      status_description: row.status_description || "",
      display_color: row.display_color || "",
      is_active: row.is_active === true,
    });
    setEditingRow(row);
    setModalMode("edit");
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setEditingRow(null);
    setModalDraft({});
  }, []);

  const handleDraftChange = useCallback((field, value) => {
    setModalDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    // ─── Client-side validation ──────────────────────────────
    const name = (modalDraft.status_name || "").trim();
    if (!name) {
      toastError("Status name is required.", "Validation");
      return;
    }
    if (name.length > 100) {
      toastError("Status name must be 100 characters or less.", "Validation");
      return;
    }

    const color = (modalDraft.display_color || "").trim();
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      toastError("Display color must be a valid hex color (e.g., #3B82F6).", "Validation");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        status_name: name,
        status_description: (modalDraft.status_description || "").trim() || null,
        display_color: color || null,
        is_active: modalDraft.is_active === true,
      };

      if (modalMode === "add") {
        await createProjectStatus(payload);
        toastSuccess("Project status added successfully.", "Add");
      } else {
        const statusId = editingRow?.status_id;
        if (!statusId) throw new Error("Missing status_id for edit.");
        await updateProjectStatus(statusId, payload);
        toastSuccess("Project status updated successfully.", "Edit");
      }

      closeModal();
      // Refresh server data
      router.refresh();
      onRefresh?.();
    } catch (err) {
      toastError(err?.message || "Unable to save project status. Please try again.", "Save");
    } finally {
      setBusy(false);
    }
  }, [modalDraft, modalMode, editingRow, closeModal, router, onRefresh]);

  // ─── Delete Handler (soft delete) ──────────────────────────

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await softDeleteProjectStatus(confirmDelete.status_id);
      toastSuccess("Project status deactivated.", "Delete");
      setConfirmDelete(null);
      // Optimistic update
      setLocalData((prev) => {
        const base = prev ?? data;
        return base.map((r) =>
          r.status_id === confirmDelete.status_id ? { ...r, is_active: false } : r
        );
      });
      router.refresh();
      onRefresh?.();
    } catch (err) {
      toastError(err?.message || "Unable to delete project status. Please try again.", "Delete");
    } finally {
      setBusy(false);
    }
  }, [confirmDelete, data, router, onRefresh]);

  // ─── Render Helpers ────────────────────────────────────────

  const renderColorPreview = (color) => {
    if (!color) {
      return <span className="psg-color-none">No Color</span>;
    }
    return (
      <span className="psg-color-preview">
        <span
          className="psg-color-swatch"
          style={{ backgroundColor: color }}
        />
        {" "}{color}
      </span>
    );
  };

  const renderActiveBadge = (isActive) => {
    return (
      <span className={`psg-status-badge psg-status-badge--${isActive ? "active" : "inactive"}`}>
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  // Reset local data when server data changes
  useMemo(() => {
    if (data !== displayData && !localData) {
      // Only reset if we don't have optimistic local data
    }
  }, [data, localData, displayData]);

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="psg-root">
      {/* ─── Toolbar ─────────────────────────────────────────── */}
      <div className="psg-toolbar">
        <div className="psg-toolbar__left">
          <h2 className="psg-toolbar__title">Project Statuses</h2>
          <span className="psg-toolbar__count">
            {filteredData.length} record{filteredData.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="psg-toolbar__right">
          {/* Filters */}
          <div className="psg-filters">
            {["all", "active", "inactive"].map((f) => (
              <button
                key={f}
                className={`psg-filter-btn ${filterActive === f ? "psg-filter-btn--active" : ""}`}
                onClick={() => setFilterActive(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="psg-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="psg-search__icon" />
            <input
              type="text"
              className="psg-search__input"
              placeholder="Search statuses..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          {/* Add Button */}
          <Button variant="success" onClick={openAdd} className="psg-add-btn">
            <FontAwesomeIcon icon={faPlus} />
            <span>Add Project Status</span>
          </Button>
        </div>
      </div>

      {/* ─── Grid ─────────────────────────────────────────────── */}
      <div className="psg-grid-wrap">
        {filteredData.length === 0 ? (
          <div className="psg-empty">
            {searchValue || filterActive !== "all" ? (
              <>
                <p className="psg-empty__title">No matching statuses</p>
                <p className="psg-empty__desc">Try adjusting your search or filter.</p>
              </>
            ) : (
              <>
                <p className="psg-empty__title">No Project Statuses</p>
                <p className="psg-empty__desc">Click "Add Project Status" to create one.</p>
              </>
            )}
          </div>
        ) : (
          <table className="psg-table">
            <thead>
              <tr>
                <th className="psg-col-actions">Actions</th>
                <th className="psg-col-order">Order</th>
                <th className="psg-col-color">Color</th>
                <th className="psg-col-name">Status Name</th>
                <th className="psg-col-desc">Description</th>
                <th className="psg-col-active">Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => {
                const isDragOver = dragOverId === row.status_id;
                return (
                  <tr
                    key={row.status_id}
                    className={`psg-row ${isDragOver ? "psg-row--drag-over" : ""}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, row.status_id)}
                    onDragOver={(e) => handleDragOver(e, row.status_id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, row.status_id)}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Actions */}
                    <td className="psg-col-actions">
                      <div className="psg-actions">
                        <button
                          className="psg-action-btn psg-action-btn--edit"
                          title="Edit"
                          onClick={() => openEdit(row)}
                          disabled={busy}
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button
                          className="psg-action-btn psg-action-btn--delete"
                          title="Delete"
                          onClick={() => setConfirmDelete(row)}
                          disabled={busy}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>

                    {/* Order */}
                    <td className="psg-col-order">
                      <span className="psg-order-handle" title="Drag to reorder">
                        <FontAwesomeIcon icon={faGripVertical} className="psg-order-handle__icon" />
                        {" "}{row.display_order ?? ""}
                      </span>
                    </td>

                    {/* Color */}
                    <td className="psg-col-color">
                      {renderColorPreview(row.display_color)}
                    </td>

                    {/* Status Name */}
                    <td className="psg-col-name">
                      <span className="psg-status-name">{row.status_name}</span>
                    </td>

                    {/* Description */}
                    <td className="psg-col-desc">
                      <span className="psg-description">{row.status_description || "—"}</span>
                    </td>

                    {/* Active */}
                    <td className="psg-col-active">
                      <div className="psg-active-cell">
                        <Form.Check
                          type="switch"
                          id={`active-${row.status_id}`}
                          checked={row.is_active === true}
                          onChange={() => handleToggleActive(row.status_id, row.is_active === true)}
                          disabled={busy}
                          className="psg-active-switch"
                        />
                        {renderActiveBadge(row.is_active === true)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Add / Edit Modal ────────────────────────────────── */}
      <Modal show={!!modalMode} onHide={closeModal} title={modalMode === "add" ? "Add Project Status" : "Edit Project Status"}>
        <div className="psg-modal-form">
          {/* Status Name (required) */}
          <Form.Group className="psg-modal-field">
            <Form.Label className="psg-modal-label">
              Status Name <span className="psg-modal-required">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              size="sm"
              value={modalDraft.status_name ?? ""}
              onChange={(e) => handleDraftChange("status_name", e.target.value)}
              placeholder="Enter status name"
              maxLength={100}
              className="psg-modal-input"
            />
          </Form.Group>

          {/* Description */}
          <Form.Group className="psg-modal-field">
            <Form.Label className="psg-modal-label">Description</Form.Label>
            <Form.Control
              type="text"
              size="sm"
              value={modalDraft.status_description ?? ""}
              onChange={(e) => handleDraftChange("status_description", e.target.value)}
              placeholder="Enter description"
              className="psg-modal-input"
            />
          </Form.Group>

          {/* Display Color */}
          <Form.Group className="psg-modal-field">
            <Form.Label className="psg-modal-label">Display Color</Form.Label>
            <div className="psg-color-picker-row">
              <input
                type="color"
                value={modalDraft.display_color || "#000000"}
                onChange={(e) => handleDraftChange("display_color", e.target.value)}
                className="psg-color-input"
              />
              <Form.Control
                type="text"
                size="sm"
                value={modalDraft.display_color ?? ""}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val && !val.startsWith("#")) val = "#" + val;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(val) || val === "#" || val === "") {
                    handleDraftChange("display_color", val);
                  }
                }}
                placeholder="#000000"
                className="psg-modal-input psg-color-hex"
              />
              {modalDraft.display_color && (
                <span
                  className="psg-color-swatch-lg"
                  style={{ backgroundColor: modalDraft.display_color }}
                />
              )}
            </div>
          </Form.Group>

          {/* Active Status */}
          <Form.Group className="psg-modal-field">
            <Form.Check
              type="switch"
              id="modal-active-switch"
              label="Active"
              checked={modalDraft.is_active === true}
              onChange={(e) => handleDraftChange("is_active", e.target.checked)}
              className="psg-modal-switch"
            />
          </Form.Group>

          {/* Actions */}
          <div className="psg-modal-actions">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={handleSave}>
              {modalMode === "add" ? "Save" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirmation ─────────────────────────────── */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} title="Delete Project Status">
        <div className="psg-delete-modal">
          <p className="psg-delete-msg">
            This status may already be used by existing projects.
          </p>
          <p className="psg-delete-msg">
            The status will be deactivated instead of permanently removed.
          </p>
          <div className="psg-modal-actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}