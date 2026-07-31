"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPen, faTrash, faGripVertical, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Button, Modal, toastSuccess, toastError } from "@/shared/components/ui";

/**
 * LookupTableGrid — Reusable component for managing lookup/setup tables.
 *
 * @param {Object} props
 * @param {string} props.tableKey - One of: buildingCategories, permitStatuses, welcomeCallStatuses
 * @param {Array} props.data - Array of records from the server
 * @param {Function} props.onCreate - Async function to create a record
 * @param {Function} props.onUpdate - Async function to update a record
 * @param {Function} props.onToggle - Async function to toggle active status
 * @param {Function} props.onReorder - Async function to reorder records
 * @param {Function} props.onDelete - Async function to soft-delete a record
 * @param {Function} props.onRefresh - Optional callback after successful operations
 *
 * @param {Object} props.config
 * @param {string} config.title - Page title (e.g., "Building Categories")
 * @param {string} config.singularName - Singular form (e.g., "Building Category")
 * @param {string} config.nameField - Field name for the primary name (e.g., "building_category_name")
 * @param {string} config.nameLabel - Label for the name field (e.g., "Category Name")
 * @param {string} [config.descField] - Field name for description (optional)
 * @param {string} [config.descLabel] - Label for description (optional)
 * @param {string} config.searchFields - Comma-separated fields to search (e.g., "building_category_name,description")
 * @param {boolean} [config.hasColor=false] - Whether this table has a display_color field
 */
export default function LookupTableGrid({
  tableKey,
  data = [],
  onCreate,
  onUpdate,
  onToggle,
  onReorder,
  onDelete,
  onRefresh,
  config,
}) {
  const router = useRouter();
  const {
    title,
    singularName,
    nameField,
    nameLabel,
    descField,
    descLabel,
    searchFields,
    hasColor = false,
  } = config;

  // ─── State ─────────────────────────────────────────────────
  const [searchValue, setSearchValue] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [modalMode, setModalMode] = useState(null);
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
      const fields = searchFields.split(",").map((f) => f.trim());
      result = result.filter((r) => {
        return fields.some((field) => {
          const val = (r[field] || "").toLowerCase();
          return val.includes(q);
        });
      });
    }

    return result;
  }, [displayData, filterActive, searchValue, searchFields]);

  // ─── Drag & Drop ───────────────────────────────────────────

  const handleDragStart = useCallback((e, id) => {
    dragItem.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
    setTimeout(() => {
      e.target.closest(".ltg-row")?.classList.add("ltg-row--dragging");
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

      e.target.closest(".ltg-row")?.classList.remove("ltg-row--dragging");

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
        await onReorder(updates);
        toastSuccess("Display order updated.", "Reorder");
        router.refresh();
        onRefresh?.();
      } catch (err) {
        toastError(err?.message || "Unable to update display order. Please try again.", "Reorder");
        setLocalData(null);
      }
    },
    [displayData, onReorder, router, onRefresh]
  );

  const handleDragEnd = useCallback(() => {
    dragItem.current = null;
    setDragOverId(null);
    document.querySelectorAll(".ltg-row--dragging").forEach((el) => {
      el.classList.remove("ltg-row--dragging");
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
        await onToggle(id, newActive);
        toastSuccess(`${singularName} updated.`, "Toggle");
        router.refresh();
        onRefresh?.();
      } catch (err) {
        toastError(err?.message || `Unable to update ${singularName.toLowerCase()}. Please try again.`, "Toggle");
        setLocalData(null);
      }
    },
    [data, onToggle, singularName, router, onRefresh]
  );

  // ─── Modal Handlers ────────────────────────────────────────

  const openAdd = useCallback(() => {
    setModalDraft({
      [nameField]: "",
      ...(descField && { [descField]: "" }),
      ...(hasColor && { display_color: "" }),
      is_active: true,
    });
    setEditingRow(null);
    setModalMode("add");
  }, [nameField, descField, hasColor]);

  const openEdit = useCallback((row) => {
    const draft = {
      [nameField]: row[nameField] || "",
      ...(descField && { [descField]: row[descField] || "" }),
      ...(hasColor && { display_color: row.display_color || "" }),
      is_active: row.is_active === true,
    };
    setModalDraft(draft);
    setEditingRow(row);
    setModalMode("edit");
  }, [nameField, descField, hasColor]);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setEditingRow(null);
    setModalDraft({});
  }, []);

  const handleDraftChange = useCallback((field, value) => {
    setModalDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    // Validation
    const name = (modalDraft[nameField] || "").trim();
    if (!name) {
      toastError(`${nameLabel} is required.`, "Validation");
      return;
    }
    if (name.length > 100) {
      toastError(`${nameLabel} must be 100 characters or less.`, "Validation");
      return;
    }

    const color = modalDraft.display_color;
    if (hasColor && color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      toastError("Display color must be a valid hex color (e.g., #E53935).", "Validation");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        [nameField]: name,
        ...(descField && { [descField]: (modalDraft[descField] || "").trim() || null }),
        ...(hasColor && { display_color: color || null }),
        is_active: modalDraft.is_active === true,
      };

      if (modalMode === "add") {
        await onCreate(payload);
        toastSuccess(`${singularName} added successfully.`, "Add");
      } else {
        const id = editingRow?.id;
        if (!id) throw new Error("Missing id for edit.");
        await onUpdate(id, payload);
        toastSuccess(`${singularName} updated successfully.`, "Edit");
      }

      closeModal();
      router.refresh();
      onRefresh?.();
    } catch (err) {
      toastError(err?.message || `Unable to save ${singularName.toLowerCase()}. Please try again.`, "Save");
    } finally {
      setBusy(false);
    }
  }, [modalDraft, modalMode, editingRow, nameField, nameLabel, descField, hasColor, singularName, onCreate, onUpdate, closeModal, router, onRefresh]);

  // ─── Delete Handler ────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await onDelete(confirmDelete.id);
      toastSuccess(`${singularName} deactivated.`, "Delete");
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
      toastError(err?.message || `Unable to delete ${singularName.toLowerCase()}. Please try again.`, "Delete");
    } finally {
      setBusy(false);
    }
  }, [confirmDelete, data, onDelete, singularName, router, onRefresh]);

  // ─── Render Helpers ────────────────────────────────────────

  const renderColorPreview = (color) => {
    if (!color) {
      return <span className="ltg-color-none">No Color</span>;
    }
    return (
      <span className="ltg-color-preview">
        <span className="ltg-color-swatch" style={{ backgroundColor: color }} />
        {" "}{color}
      </span>
    );
  };

  const renderActiveBadge = (isActive) => {
    return (
      <span className={`ltg-status-badge ltg-status-badge--${isActive ? "active" : "inactive"}`}>
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="ltg-root">
      {/* ─── Toolbar ─────────────────────────────────────────── */}
      <div className="ltg-toolbar">
        <div className="ltg-toolbar__left">
          <h2 className="ltg-toolbar__title">{title}</h2>
          <span className="ltg-toolbar__count">
            {filteredData.length} record{filteredData.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="ltg-toolbar__right">
          {/* Filters */}
          <div className="ltg-filters">
            {["all", "active", "inactive"].map((f) => (
              <button
                key={f}
                className={`ltg-filter-btn ${filterActive === f ? "ltg-filter-btn--active" : ""}`}
                onClick={() => setFilterActive(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="ltg-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="ltg-search__icon" />
            <input
              type="text"
              className="ltg-search__input"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          {/* Add Button */}
          <Button variant="success" onClick={openAdd} className="ltg-add-btn">
            <FontAwesomeIcon icon={faPlus} />
            <span>Add {singularName}</span>
          </Button>
        </div>
      </div>

      {/* ─── Grid ─────────────────────────────────────────────── */}
      <div className="ltg-grid-wrap">
        {filteredData.length === 0 ? (
          <div className="ltg-empty">
            {searchValue || filterActive !== "all" ? (
              <>
                <p className="ltg-empty__title">No matching {title.toLowerCase()}</p>
                <p className="ltg-empty__desc">Try adjusting your search or filter.</p>
              </>
            ) : (
              <>
                <p className="ltg-empty__title">No {title}</p>
                <p className="ltg-empty__desc">Click "Add {singularName}" to create one.</p>
              </>
            )}
          </div>
        ) : (
          <table className="ltg-table">
            <thead>
              <tr>
                <th className="ltg-col-actions">Actions</th>
                <th className="ltg-col-order">Order</th>
                {hasColor && <th className="ltg-col-color">Color</th>}
                <th className="ltg-col-name">{nameLabel}</th>
                {descField && <th className="ltg-col-desc">{descLabel}</th>}
                <th className="ltg-col-active">Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => {
                const isDragOver = dragOverId === row.id;
                return (
                  <tr
                    key={row.id}
                    className={`ltg-row ${isDragOver ? "ltg-row--drag-over" : ""}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, row.id)}
                    onDragOver={(e) => handleDragOver(e, row.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, row.id)}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Actions */}
                    <td className="ltg-col-actions">
                      <div className="ltg-actions">
                        <button
                          className="ltg-action-btn ltg-action-btn--edit"
                          title="Edit"
                          onClick={() => openEdit(row)}
                          disabled={busy}
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button
                          className="ltg-action-btn ltg-action-btn--delete"
                          title="Delete"
                          onClick={() => setConfirmDelete(row)}
                          disabled={busy}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>

                    {/* Order */}
                    <td className="ltg-col-order">
                      <span className="ltg-order-handle" title="Drag to reorder">
                        <FontAwesomeIcon icon={faGripVertical} className="ltg-order-handle__icon" />
                        {" "}{row.display_order ?? ""}
                      </span>
                    </td>

                    {/* Color (optional) */}
                    {hasColor && (
                      <td className="ltg-col-color">
                        {renderColorPreview(row.display_color)}
                      </td>
                    )}

                    {/* Name */}
                    <td className="ltg-col-name">
                      <span className="ltg-name">{row[nameField]}</span>
                    </td>

                    {/* Description (optional) */}
                    {descField && (
                      <td className="ltg-col-desc">
                        <span className="ltg-description">{row[descField] || "—"}</span>
                      </td>
                    )}

                    {/* Active */}
                    <td className="ltg-col-active">
                      <div className="ltg-active-cell">
                        <Form.Check
                          type="switch"
                          id={`active-${row.id}`}
                          checked={row.is_active === true}
                          onChange={() => handleToggleActive(row.id, row.is_active === true)}
                          disabled={busy}
                          className="ltg-active-switch"
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
      <Modal show={!!modalMode} onHide={closeModal} title={modalMode === "add" ? `Add ${singularName}` : `Edit ${singularName}`}>
        <div className="ltg-modal-form">
          {/* Name (required) */}
          <Form.Group className="ltg-modal-field">
            <Form.Label className="ltg-modal-label">
              {nameLabel} <span className="ltg-modal-required">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              size="sm"
              value={modalDraft[nameField] ?? ""}
              onChange={(e) => handleDraftChange(nameField, e.target.value)}
              placeholder={`Enter ${nameLabel.toLowerCase()}`}
              maxLength={100}
              className="ltg-modal-input"
            />
          </Form.Group>

          {/* Description (optional) */}
          {descField && (
            <Form.Group className="ltg-modal-field">
              <Form.Label className="ltg-modal-label">{descLabel}</Form.Label>
              <Form.Control
                type="text"
                size="sm"
                value={modalDraft[descField] ?? ""}
                onChange={(e) => handleDraftChange(descField, e.target.value)}
                placeholder={`Enter ${descLabel.toLowerCase()}`}
                className="ltg-modal-input"
              />
            </Form.Group>
          )}

          {/* Display Color (optional) */}
          {hasColor && (
            <Form.Group className="ltg-modal-field">
              <Form.Label className="ltg-modal-label">Display Color</Form.Label>
              <div className="ltg-color-picker-row">
                <input
                  type="color"
                  value={modalDraft.display_color || "#000000"}
                  onChange={(e) => handleDraftChange("display_color", e.target.value)}
                  className="ltg-color-input"
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
                  className="ltg-modal-input ltg-color-hex"
                />
                {modalDraft.display_color && (
                  <span
                    className="ltg-color-swatch-lg"
                    style={{ backgroundColor: modalDraft.display_color }}
                  />
                )}
              </div>
            </Form.Group>
          )}

          {/* Active Status */}
          <Form.Group className="ltg-modal-field">
            <Form.Check
              type="switch"
              id="modal-active-switch"
              label="Active"
              checked={modalDraft.is_active === true}
              onChange={(e) => handleDraftChange("is_active", e.target.checked)}
              className="ltg-modal-switch"
            />
          </Form.Group>

          {/* Actions */}
          <div className="ltg-modal-actions">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={handleSave}>
              {modalMode === "add" ? "Save" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirmation ─────────────────────────────── */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} title={`Delete ${singularName}`}>
        <div className="ltg-delete-modal">
          <p className="ltg-delete-msg">
            This {singularName.toLowerCase()} may already be referenced by existing projects.
          </p>
          <p className="ltg-delete-msg">
            The {singularName.toLowerCase()} will be deactivated instead of permanently removed.
          </p>
          <div className="ltg-modal-actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}