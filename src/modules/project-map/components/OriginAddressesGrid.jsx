"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPen, faTrash, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Button, Modal, toastSuccess, toastError } from "@/shared/components/ui";
import {
  createOriginAddress,
  updateOriginAddress,
  toggleOriginAddressActive,
  softDeleteOriginAddress,
} from "../data/projectMap.actions";
import LocationSearch from "./LocationSearch";

/**
 * OriginAddressesGrid — Dedicated admin grid for managing origin addresses.
 *
 * Features:
 *  - Grid columns: Actions, Origin Name, Formatted Address, Active
 *  - Active toggle inline (immediate DB update)
 *  - Search across name and formatted_address
 *  - Add/Edit modal with LocationSearch (auto-populates all address fields, hidden from user)
 *  - No is_default, origin_code, city, state fields exposed in UI
 *  - Delete confirmation with soft delete (is_active = false)
 *  - Empty state
 *  - Validation (required name, required address)
 */
export default function OriginAddressesGrid({ data = [], onRefresh }) {
  const router = useRouter();

  // ─── State ─────────────────────────────────────────────────
  const [searchValue, setSearchValue] = useState("");
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [modalDraft, setModalDraft] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [locationQuery, setLocationQuery] = useState("");

  // ─── Local data (for optimistic updates) ──────────────────
  const [localData, setLocalData] = useState(null);
  const displayData = localData ?? data;

  // ─── Search ─────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return displayData;
    const q = searchValue.toLowerCase();
    return displayData.filter((r) => {
      const name = (r.origin_name || "").toLowerCase();
      const addr = (r.formatted_address || "").toLowerCase();
      return name.includes(q) || addr.includes(q);
    });
  }, [displayData, searchValue]);

  // ─── Active Toggle ─────────────────────────────────────────

  const handleToggleActive = useCallback(
    async (id, currentActive) => {
      const newActive = !currentActive;
      // Optimistic update
      setLocalData((prev) => {
        const base = prev ?? data;
        return base.map((r) =>
          r.id === id ? { ...r, is_active: newActive } : r
        );
      });

      try {
        await toggleOriginAddressActive(id, newActive);
        toastSuccess("Origin address updated.", "Toggle");
        router.refresh();
        onRefresh?.();
      } catch (err) {
        toastError(err?.message || "Unable to update origin address. Please try again.", "Toggle");
        setLocalData(null);
      }
    },
    [data, router, onRefresh]
  );

  // ─── Modal Handlers ────────────────────────────────────────

  const openAdd = useCallback(() => {
    setModalDraft({
      origin_name: "",
      formatted_address: "",
      address_line_1: "",
      city: "",
      state: "",
      state_code: "",
      postal_code: "",
      country: "",
      latitude: null,
      longitude: null,
      is_active: true,
    });
    setLocationQuery("");
    setEditingRow(null);
    setModalMode("add");
  }, []);

  const openEdit = useCallback((row) => {
    const initialAddress = row.formatted_address || "";
    setModalDraft({
      origin_name: row.origin_name || "",
      formatted_address: initialAddress,
      address_line_1: row.address_line_1 || "",
      city: row.city || "",
      state: row.state || "",
      state_code: row.state_code || "",
      postal_code: row.postal_code || "",
      country: row.country || "",
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      is_active: row.is_active === true,
    });
    setLocationQuery(initialAddress);
    setEditingRow(row);
    setModalMode("edit");
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setEditingRow(null);
    setModalDraft({});
    setLocationQuery("");
  }, []);

  const handleDraftChange = useCallback((field, value) => {
    setModalDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleLocationSelect = useCallback((loc) => {
    setModalDraft((prev) => ({
      ...prev,
      formatted_address: loc.formatted_address || "",
      address_line_1: loc.address_line_1 || "",
      city: loc.city || "",
      state: loc.state || "",
      state_code: loc.state_code || "",
      postal_code: loc.postal_code || "",
      country: loc.country || "",
      latitude: loc.latitude ?? null,
      longitude: loc.longitude ?? null,
    }));
    // Update the location query to show the selected address in the search box
    setLocationQuery(loc.formatted_address || "");
  }, []);

  const handleSave = useCallback(async () => {
    // ─── Client-side validation ──────────────────────────────
    const name = (modalDraft.origin_name || "").trim();
    if (!name) {
      toastError("Origin name is required.", "Validation");
      return;
    }
    const addr = (modalDraft.formatted_address || "").trim();
    if (!addr) {
      toastError("Formatted address is required. Please search and select an address.", "Validation");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        origin_name: name,
        formatted_address: addr,
        address_line_1: modalDraft.address_line_1 || null,
        city: modalDraft.city || null,
        state: modalDraft.state || null,
        state_code: modalDraft.state_code || null,
        postal_code: modalDraft.postal_code || null,
        country: modalDraft.country || null,
        latitude: modalDraft.latitude != null ? Number(modalDraft.latitude) : null,
        longitude: modalDraft.longitude != null ? Number(modalDraft.longitude) : null,
        is_active: modalDraft.is_active === true,
      };

      if (modalMode === "add") {
        await createOriginAddress(payload);
        toastSuccess("Origin address added successfully.", "Add");
      } else {
        const originId = editingRow?.id;
        if (!originId) throw new Error("Missing id for edit.");
        await updateOriginAddress(originId, payload);
        toastSuccess("Origin address updated successfully.", "Edit");
      }

      closeModal();
      router.refresh();
      onRefresh?.();
    } catch (err) {
      toastError(err?.message || "Unable to save origin address. Please try again.", "Save");
    } finally {
      setBusy(false);
    }
  }, [modalDraft, modalMode, editingRow, closeModal, router, onRefresh]);

  // ─── Delete Handler (soft delete) ──────────────────────────

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await softDeleteOriginAddress(confirmDelete.id);
      toastSuccess("Origin address deactivated.", "Delete");
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
      toastError(err?.message || "Unable to delete origin address. Please try again.", "Delete");
    } finally {
      setBusy(false);
    }
  }, [confirmDelete, data, router, onRefresh]);

  // ─── Render Helpers ────────────────────────────────────────

  const renderActiveBadge = (isActive) => {
    return (
      <span className={`oag-status-badge oag-status-badge--${isActive ? "active" : "inactive"}`}>
        {isActive ? "ON" : "OFF"}
      </span>
    );
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="oag-root">
      {/* ─── Toolbar ─────────────────────────────────────────── */}
      <div className="oag-toolbar">
        <div className="oag-toolbar__left">
          <h2 className="oag-toolbar__title">Origin Addresses</h2>
          <span className="oag-toolbar__count">
            {filteredData.length} record{filteredData.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="oag-toolbar__right">
          {/* Search */}
          <div className="oag-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="oag-search__icon" />
            <input
              type="text"
              className="oag-search__input"
              placeholder="Search origin addresses..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          {/* Add Button */}
          <Button variant="success" onClick={openAdd} className="oag-add-btn">
            <FontAwesomeIcon icon={faPlus} />
            <span>Add Origin Address</span>
          </Button>
        </div>
      </div>

      {/* ─── Grid ─────────────────────────────────────────────── */}
      <div className="oag-grid-wrap">
        {filteredData.length === 0 ? (
          <div className="oag-empty">
            {searchValue ? (
              <>
                <p className="oag-empty__title">No matching origin addresses</p>
                <p className="oag-empty__desc">Try adjusting your search.</p>
              </>
            ) : (
              <>
                <p className="oag-empty__title">No Origin Addresses</p>
                <p className="oag-empty__desc">Click "Add Origin Address" to create one.</p>
              </>
            )}
          </div>
        ) : (
          <table className="oag-table">
            <thead>
              <tr>
                <th className="oag-col-actions">Actions</th>
                <th className="oag-col-name">Origin Name</th>
                <th className="oag-col-address">Formatted Address</th>
                <th className="oag-col-active">Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr key={row.id} className="oag-row">
                  {/* Actions */}
                  <td className="oag-col-actions">
                    <div className="oag-actions">
                      <button
                        className="oag-action-btn oag-action-btn--edit"
                        title="Edit"
                        onClick={() => openEdit(row)}
                        disabled={busy}
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        className="oag-action-btn oag-action-btn--delete"
                        title="Delete"
                        onClick={() => setConfirmDelete(row)}
                        disabled={busy}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>

                  {/* Origin Name */}
                  <td className="oag-col-name">
                    <span className="oag-origin-name">{row.origin_name}</span>
                  </td>

                  {/* Formatted Address */}
                  <td className="oag-col-address">
                    <span className="oag-address">{row.formatted_address || "—"}</span>
                  </td>

                  {/* Active */}
                  <td className="oag-col-active">
                    <div className="oag-active-cell">
                      <Form.Check
                        type="switch"
                        id={`active-${row.id}`}
                        checked={row.is_active === true}
                        onChange={() => handleToggleActive(row.id, row.is_active === true)}
                        disabled={busy}
                        className="oag-active-switch"
                      />
                      {renderActiveBadge(row.is_active === true)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Add / Edit Modal ────────────────────────────────── */}
      <Modal show={!!modalMode} onHide={closeModal} title={modalMode === "add" ? "Add Origin Address" : "Edit Origin Address"}>
        <div className="oag-modal-form">
          {/* Origin Name (required) */}
          <Form.Group className="oag-modal-field">
            <Form.Label className="oag-modal-label">
              Origin Name <span className="oag-modal-required">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              size="sm"
              value={modalDraft.origin_name ?? ""}
              onChange={(e) => handleDraftChange("origin_name", e.target.value)}
              placeholder="Enter origin name"
              className="oag-modal-input"
            />
          </Form.Group>

          {/* Address Search */}
          <Form.Group className="oag-modal-field">
            <Form.Label className="oag-modal-label">Search Address</Form.Label>
            <LocationSearch
              onSelect={handleLocationSelect}
              selectedLocation={modalDraft}
              query={locationQuery}
              onQueryChange={setLocationQuery}
            />
          </Form.Group>

          {/* Active Status */}
          <Form.Group className="oag-modal-field">
            <Form.Check
              type="switch"
              id="modal-active-switch"
              label="Active"
              checked={modalDraft.is_active === true}
              onChange={(e) => handleDraftChange("is_active", e.target.checked)}
              className="oag-modal-switch"
            />
          </Form.Group>

          {/* Actions */}
          <div className="oag-modal-actions">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={handleSave}>
              {modalMode === "add" ? "Save" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirmation ─────────────────────────────── */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} title="Delete Origin Address">
        <div className="oag-delete-modal">
          <p className="oag-delete-msg">
            This origin address may already be used by project runs or route calculations.
          </p>
          <p className="oag-delete-msg">
            The address will be deactivated instead of permanently removed.
          </p>
          <div className="oag-modal-actions">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}