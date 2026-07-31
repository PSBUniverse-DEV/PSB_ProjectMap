"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPen, faTrash, faGripVertical, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Button, Modal, toastSuccess, toastError } from "@/shared/components/ui";
import {
  createState,
  updateState,
  toggleStateActive,
  reorderStates,
  softDeleteState,
} from "../data/projectMap.actions";

/**
 * StatesGrid — Dedicated admin grid for managing states.
 * Visually and functionally identical to ProjectStatusesGrid.
 */
export default function StatesGrid({ data = [], onRefresh }) {
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

  // ─── Local data ────────────────────────────────────────────
  const [localData, setLocalData] = useState(null);
  const displayData = localData ?? data;

  // ─── Filtering & Search ────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = displayData;

    if (filterActive === "active") {
      result = result.filter((r) => r.is_active === true);
    } else if (filterActive === "inactive") {
      result = result.filter((r) => r.is_active === false);
    }

    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      result = result.filter((r) => {
        const name = (r.state_name || "").toLowerCase();
        const code = (r.state_code || "").toLowerCase();
        return name.includes(q) || code.includes(q);
      });
    }

    return result;
  }, [displayData, filterActive, searchValue]);

  // ─── Drag & Drop ───────────────────────────────────────────

  const handleDragStart = useCallback((e, id) => {
    dragItem.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
    setTimeout(() => {
      e.target.closest(".ssg-row")?.classList.add("ssg-row--dragging");
    }, 0);
  }, []);

  const handleDragOver = useCallback((e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragItem.current) {
      setDragOverId(id);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    async (e, targetId) => {
      e.preventDefault();
      setDragOverId(null);

      const sourceId = dragItem.current;
      if (!sourceId || sourceId === targetId) return;

      e.target.closest(".ssg-row")?.classList.remove("ssg-row--dragging");

      const items = [...displayData];
      const sourceIndex = items.findIndex((r) => r.id === sourceId);
      const targetIndex = items.findIndex((r) => r.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) return;

      const [movedItem] = items.splice(sourceIndex, 1);
      items.splice(targetIndex, 0, movedItem);

      const updates = items.map((item, idx) => ({
        id: item.id,
        display_order: (idx + 1) * 10,
      }));

      const reordered = items.map((item, idx) => ({
        ...item,
        display_order: (idx + 1) * 10,
      }));
      setLocalData(reordered);

      try {
        await reorderStates(updates);
        toastSuccess("Display order updated.", "Reorder");
        router.refresh();
        onRefresh?.();
      } catch (err) {
        toastError(err?.message || "Unable to update display order. Please try again.", "Reorder");
        setLocalData(null);
      }
    },
    [displayData, router, onRefresh]
  );

  const handleDragEnd = useCallback(() => {
    dragItem.current = null;
    setDragOverId(null);
    document.querySelectorAll(".ssg-row--dragging").forEach((el) => {
      el.classList.remove("ssg-row--dragging");
    });
  }, []);

  // ─── Active Toggle ─────────────────────────────────────────

  const handleToggleActive = useCallback(
    async (id, currentActive) => {
      const newActive = !currentActive;
      setLocalData((prev) => {
        const base = prev ?? data;
        return base.map((r) =>
          r.id === id ? { ...r, is_active: newActive } : r
        );
      });

      try {
        await toggleStateActive(id, newActive);
        toastSuccess("State updated.", "Toggle");
        router.refresh();
        onRefresh?.();
      } catch (err) {
        toastError(err?.message || "Unable to update state. Please try again.", "Toggle");
        setLocalData(null);
      }
    },
    [data, router, onRefresh]
  );

  // ─── Modal Handlers ────────────────────────────────────────

  const openAdd = useCallback(() => {
    setModalDraft({
      state_name: "",
      state_code: "",
      display_color: "",
      is_active: true,
    });
    setEditingRow(null);
    setModalMode("add");
  }, []);

  const openEdit = useCallback((row) => {
    setModalDraft({
      state_name: row.state_name || "",
      state_code: row.state_code || "",
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
    if (field === "state_code") {
      // Auto-uppercase while typing
      value = value.toUpperCase();
    }
    setModalDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    // ─── Client-side validation ──────────────────────────────
    const name = (modalDraft.state_name || "").trim();
    if (!name) {
      toastError("State name is required.", "Validation");
      return;
    }
    if (name.length > 100) {
      toastError("State name must be 100 characters or less.", "Validation");
      return;
    }

    const code = (modalDraft.state_code || "").trim().toUpperCase();
    if (!code) {
      toastError("State code is required.", "Validation");
      return;
    }
    if (code.length > 10) {
      toastError("State code must be 10 characters or less.", "Validation");
      return;
    }

    const color = (modalDraft.display_color || "").trim();
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      toastError("Display color must be a valid hex color (e.g., #E53935).", "Validation");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        state_name: name,
        state_code: code,
        display_color: color || null,
        is_active: modalDraft.is_active === true,
      };

      if (modalMode === "add") {
        await createState(payload);
        toastSuccess("State added successfully.", "Add");
      } else {
        const stateId = editingRow?.id;
        if (!stateId) throw new Error("Missing id for edit.");
        await updateState(stateId, payload);
        toastSuccess("State updated successfully.", "Edit");
      }

      closeModal();
      router.refresh();
      onRefresh?.();
    } catch (err) {
      toastError(err?.message || "Unable to save state. Please try again.", "Save");
    } finally {
      setBusy(false);
    }
  }, [modalDraft, modalMode, editingRow, closeModal, router, onRefresh]);

  // ─── Delete Handler ────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await softDeleteState(confirmDelete.id);
      toastSuccess("State deactivated.", "Delete");
      setConfirmDelete(null);
      setLocalData((prev) => {
        const base = prev ?? data;
        return base.map((r) =>
          r.id === confirmDelete.id ? { ...r, is_active: false } : r
        );
      });
      router.refresh();
      onRefresh?.();
    } catch (err) {
      toastError(err?.message || "Unable to delete state. Please try again.", "Delete");
    } finally {
      setBusy(false);
    }
  }, [confirmDelete, data, router, onRefresh]);

  // ─── Render Helpers ────────────────────────────────────────

  const renderColorPreview = (color) => {
    if (!color) {
      return <span className="ssg-color-none">No Color</span>;
    }
    return (
      <span className="ssg-color-preview">
        <span className="ssg-color-swatch" style={{ backgroundColor: color }} />
        {" "}{color}
      </span>
    );
  };

  const renderActiveBadge = (isActive) => {
    return (
      <span className={`ssg-status-badge ssg-status-badge--${isActive ? "active" : "inactive"}`}>
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="ssg-root">
      {/* ─── Toolbar ─────────────────────────────────────────── */}
      <div className="ssg-toolbar">
        <div className="ssg-toolbar__left">
          <h2 className="ssg-toolbar__title">States</h2>
          <span className="ssg-toolbar__count">
            {filteredData.length} record{filteredData.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="ssg-toolbar__right">
          {/* Filters */}
          <div className="ssg-filters">
            {["all", "active", "inactive"].map((f) => (
              <button
                key={f}
                className={`ssg-filter-btn ${filterActive === f ? "ssg-filter-btn--active" : ""}`}
                onClick={() => setFilterActive(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="ssg-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="ssg-search__icon" />
            <input
              type="text"
              className="ssg-search__input"
              placeholder="Search states..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          {/* Add Button */}
          <Button variant="success" onClick={openAdd} className="ssg-add-btn">
            <FontAwesomeIcon icon={faPlus} />
            <span>Add State</span>
          </Button>
        </div>
      </div>

      {/* ─── Grid ─────────────────────────────────────────────── */}
      <div className="ssg-grid-wrap">
        {filteredData.length === 0 ? (
          <div className="ssg-empty">
            {searchValue || filterActive !== "all" ? (
              <>
                <p className="ssg-empty__title">No matching states</p>
                <p className="ssg-empty__desc">Try adjusting your search or filter.</p>
              </>
            ) : (
              <>
                <p className="ssg-empty__title">No States</p>
                <p className="ssg-empty__desc">Click "Add State" to create one.</p>
              </>
            )}
          </div>
        ) : (
          <table className="ssg-table">
            <thead>
              <tr>
                <th className="ssg-col-actions">Actions</th>
                <th className="ssg-col-order">Order</th>
                <th className="ssg-col-color">Color</th>
                <th className="ssg-col-name">State Name</th>
                <th className="ssg-col-code">State Code</th>
                <th className="ssg-col-active">Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => {
                const isDragOver = dragOverId === row.id;
                return (
                  <tr
                    key={row.id}
                    className={`ssg-row ${isDragOver ? "ssg-row--drag-over" : ""}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, row.id)}
                    onDragOver={(e) => handleDragOver(e, row.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, row.id)}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Actions */}
                    <td className="ssg-col-actions">
                      <div className="ssg-actions">
                        <button
                          className="ssg-action-btn ssg-action-btn--edit"
                          title="Edit"
                          onClick={() => openEdit(row)}
                          disabled={busy}
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button
                          className="ssg-action-btn ssg-action-btn--delete"
                          title="Delete"
                          onClick={() => setConfirmDelete(row)}
                          disabled={busy}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>

                    {/* Order */}
                    <td className="ssg-col-order">
                      <span className="ssg-order-handle" title="Drag to reorder">
                        <FontAwesomeIcon icon={faGripVertical} className="ssg-order-handle__icon" />
                        {" "}{row.display_order ?? ""}
                      </span>
                    </td>

                    {/* Color */}
                    <td className="ssg-col-color">
                      {renderColorPreview(row.display_color)}
                    </td>

                    {/* State Name */}
                    <td className="ssg-col-name">
                      <span className="ssg-state-name">{row.state_name}</span>
                    </td>

                    {/* State Code */}
                    <td className="ssg-col-code">
                      <span className="ssg-state-code">{row.state_code || "—"}</span>
                    </td>

                    {/* Active */}
                    <td className="ssg-col-active">
                      <div className="ssg-active-cell">
                        <Form.Check
                          type="switch"
                          id={`active-${row.id}`}
                          checked={row.is_active === true}
                          onChange={() => handleToggleActive(row.id, row.is_active === true)}
                          disabled={busy}
                          className="ssg-active-switch"
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
      <Modal show={!!modalMode} onHide={closeModal} title={modalMode === "add" ? "Add State" : "Edit State"}>
        <div className="ssg-modal-form">
          {/* State Name (required) */}
          <Form.Group className="ssg-modal-field">
            <Form.Label className="ssg-modal-label">
              State Name <span className="ssg-modal-required">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              size="sm"
              value={modalDraft.state_name ?? ""}
              onChange={(e) => handleDraftChange("state_name", e.target.value)}
              placeholder="Enter state name"
              maxLength={100}
              className="ssg-modal-input"
            />
          </Form.Group>

          {/* State Code (required, auto-uppercase) */}
          <Form.Group className="ssg-modal-field">
            <Form.Label className="ssg-modal-label">
              State Code <span className="ssg-modal-required">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              size="sm"
              value={modalDraft.state_code ?? ""}
              onChange={(e) => handleDraftChange("state_code", e.target.value)}
              placeholder="e.g. AL"
              maxLength={10}
              className="ssg-modal-input ssg-modal-input--code"
              style={{ textTransform: "uppercase" }}
            />
          </Form.Group>

          {/* Display Color */}
          <Form.Group className="ssg-modal-field">
            <Form.Label className="ssg-modal-label">Display Color</Form.Label>
            <div className="ssg-color-picker-row">
              <input
                type="color"
                value={modalDraft.display_color || "#000000"}
                onChange={(e) => handleDraftChange("display_color", e.target.value)}
                className="ssg-color-input"
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
                className="ssg-modal-input ssg-color-hex"
              />
              {modalDraft.display_color && (
                <span
                  className="ssg-color-swatch-lg"
                  style={{ backgroundColor: modalDraft.display_color }}
                />
              )}
            </div>
          </Form.Group>

          {/* Active Status */}
          <Form.Group className="ssg-modal-field">
            <Form.Check
              type="switch"
              id="modal-active-switch"
              label="Active"
              checked={modalDraft.is_active === true}
              onChange={(e) => handleDraftChange("is_active", e.target.checked)}
              className="ssg-modal-switch"
            />
          </Form.Group>

          {/* Actions */}
          <div className="ssg-modal-actions">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={handleSave}>
              {modalMode === "add" ? "Save" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirmation ─────────────────────────────── */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} title="Delete State">
        <div className="ssg-delete-modal">
          <p className="ssg-delete-msg">
            This state may already be referenced by Origin Addresses or Projects.
          </p>
          <p className="ssg-delete-msg">
            The state will be deactivated instead of permanently removed.
          </p>
          <div className="ssg-modal-actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}