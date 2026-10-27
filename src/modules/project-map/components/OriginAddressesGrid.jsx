"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Button, Modal, TableZ, toastSuccess, toastError } from "@/shared/components/ui";
import {
  createOriginAddress,
  updateOriginAddress,
  toggleOriginAddressActive,
  reorderOriginAddresses,
  deleteOriginAddress,
} from "../data/projectMap.actions";
import LocationSearch from "./LocationSearch";
import MapLocationPicker from "./MapLocationPicker";
import { stripTownshipLabel } from "../data/projectMap.data";

/**
 * OriginAddressesGrid — Dedicated admin grid for managing origin addresses.
 *
 * Features:
 *  - Same layout as the other setup grids (LookupTableGrid): All / Active /
 *    Inactive filter, drag to reorder (display_order), Active switch, delete
 *  - Grid columns: Actions, Order, Origin Name, Formatted Address, Active
 *  - Active toggle inline (immediate DB update)
 *  - Search across name and formatted_address
 *  - Add/Edit modal with LocationSearch (auto-populates all address fields, hidden from user)
 *  - No is_default, origin_code, city, state fields exposed in UI
 *  - Delete confirmation with permanent delete (blocked while a run uses the address)
 *  - Empty state
 *  - Validation (required name, required address)
 */
// readOnly: view-only user, no add, edit, delete, reorder or Active switch.
export default function OriginAddressesGrid({ data = [], onRefresh, readOnly = false }) {
  const router = useRouter();

  // ─── State ─────────────────────────────────────────────────
  const [searchValue, setSearchValue] = useState("");
  const [filterActive, setFilterActive] = useState("all"); // "all" | "active" | "inactive"
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [modalDraft, setModalDraft] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [showMapPicker, setShowMapPicker] = useState(false);

  // ─── Local data (for optimistic updates) ──────────────────
  const [localData, setLocalData] = useState(null);
  const displayData = localData ?? data;

  // Fresh server data replaces the local optimistic copy, so saved edits show.
  useEffect(() => {
    setLocalData(null);
  }, [data]);

  // ─── Search ─────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = displayData;
    if (filterActive === "active") result = result.filter((r) => r.is_active === true);
    else if (filterActive === "inactive") result = result.filter((r) => r.is_active !== true);
    if (!searchValue.trim()) return result;
    const q = searchValue.toLowerCase();
    return result.filter((r) => {
      const name = (r.origin_name || "").toLowerCase();
      const addr = (r.formatted_address || "").toLowerCase();
      return name.includes(q) || addr.includes(q);
    });
  }, [displayData, filterActive, searchValue]);

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

  /**
   * Handles a location chosen from the map picker modal.
   * Populates the same address fields as LocationSearch,
   * using the map-chosen coordinates.
   */
  const handleMapLocationChoose = useCallback((loc) => {
    setModalDraft((prev) => ({
      ...prev,
      formatted_address: loc.formatted_address || "",
      address_line_1: loc.address_line_1 || "",
      city: loc.city || "",
      state: loc.state || "",
      state_code: loc.state_code || "",
      postal_code: loc.postal_code || "",
      country: loc.country || "",
      latitude: loc.latitude ?? loc.site_latitude ?? null,
      longitude: loc.longitude ?? loc.site_longitude ?? null,
    }));
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

  // ─── Delete Handler (permanent delete) ─────────────────────

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await deleteOriginAddress(confirmDelete.id);
      toastSuccess("Origin address deleted.", "Delete");
      setConfirmDelete(null);
      setLocalData((prev) => {
        const base = prev ?? data;
        return base.filter((r) => r.id !== confirmDelete.id);
      });
      router.refresh();
      onRefresh?.();
    } catch (err) {
      toastError(err?.message || "Unable to delete origin address. Please try again.", "Delete");
    } finally {
      setBusy(false);
    }
  }, [confirmDelete, data, router, onRefresh]);

  // ─── Drag & Drop (same order numbering as LookupTableGrid) ─

  const handleReorder = useCallback(async (nextRows) => {
    const reordered = nextRows.map((item, index) => ({ ...item, display_order: (index + 1) * 10 }));
    setLocalData(reordered);
    try {
      await reorderOriginAddresses(reordered.map((item) => ({ id: item.id, display_order: item.display_order })));
      toastSuccess("Display order updated.", "Reorder");
      router.refresh();
      onRefresh?.();
    } catch (err) {
      toastError(err?.message || "Unable to update display order. Please try again.", "Reorder");
      setLocalData(null);
    }
  }, [router, onRefresh]);

  // ─── Table (same look as LookupTableGrid) ──────────────────

  const tableColumns = useMemo(() => [
    {
      key: "display_order",
      label: "Order",
      sortable: true,
      width: 86,
      render: (row) => row.display_order ?? "",
    },
    {
      key: "origin_name",
      label: "Origin Name",
      sortable: true,
      minWidth: 150,
      render: (row) => <span className="ltg-name">{row.origin_name}</span>,
    },
    {
      key: "formatted_address",
      label: "Formatted Address",
      sortable: true,
      minWidth: 260,
      render: (row) => <span className="ltg-description">{stripTownshipLabel(row.formatted_address) || "--"}</span>,
    },
    {
      key: "is_active",
      label: "Active",
      sortable: true,
      width: 120,
      render: (row) => (
        <div className="ltg-active-cell">
          <Form.Check
            type="switch"
            id={`active-${row.id}`}
            checked={row.is_active === true}
            onChange={() => handleToggleActive(row.id, row.is_active === true)}
            disabled={busy || readOnly}
            className="ltg-active-switch"
          />
          <span className={`ltg-status-badge ltg-status-badge--${row.is_active === true ? "active" : "inactive"}`}>
            {row.is_active === true ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
  ], [busy, handleToggleActive, readOnly]);

  // View-only users get no row actions (TableZ then hides the Actions column).
  const tableActions = useMemo(() => (readOnly ? [] : [
    { key: "edit", label: "Edit", icon: "pen", type: "primary", onClick: (row) => openEdit(row) },
    { key: "delete", label: "Delete", icon: "trash", type: "danger", onClick: (row) => setConfirmDelete(row) },
  ]), [openEdit, readOnly]);

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="ltg-root">
      {/* ─── Toolbar ─────────────────────────────────────────── */}
      <div className="ltg-toolbar">
        <div className="ltg-toolbar__left">
          <h2 className="ltg-toolbar__title">Origin Addresses</h2>
          <span className="ltg-toolbar__count">
            {filteredData.length} record{filteredData.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="ltg-toolbar__right">
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

          <div className="ltg-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="ltg-search__icon" />
            <input
              type="text"
              className="ltg-search__input"
              placeholder="Search origin addresses..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          {readOnly ? (
            <span
              title="Your Project Map roles are view only."
              style={{ alignSelf: "center", fontSize: "11px", fontWeight: 600, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "2px 10px" }}
            >
              View only
            </span>
          ) : (
            <Button variant="success" onClick={openAdd} className="ltg-add-btn">
              <FontAwesomeIcon icon={faPlus} />
              <span>Add Origin Address</span>
            </Button>
          )}
        </div>
      </div>

      {/* ─── Grid ─────────────────────────────────────────────── */}
      <div className="ltg-grid-wrap">
        <TableZ
          data={filteredData}
          columns={tableColumns}
          rowIdKey="id"
          actions={tableActions}
          variant="setup"
          draggable={!readOnly}
          onReorder={readOnly ? undefined : handleReorder}
          hideSearch
          hideFooter
          emptyMessage={searchValue || filterActive !== "all" ? "No matching origin addresses." : "No origin addresses found."}
        />
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
            <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <LocationSearch
                  onSelect={handleLocationSelect}
                  selectedLocation={modalDraft}
                  query={locationQuery}
                  onQueryChange={setLocationQuery}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                style={{ whiteSpace: "nowrap", padding: "8px 12px", fontSize: "12px" }}
                onClick={() => setShowMapPicker(true)}
              >
                🗺️ Choose Map
              </Button>
            </div>
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

      {/* Map location picker - rendered at root level to avoid nested modal issues */}
      <MapLocationPicker
        show={showMapPicker}
        onHide={() => setShowMapPicker(false)}
        onChoose={handleMapLocationChoose}
        initialLocation={modalDraft.latitude != null ? modalDraft : null}
      />

      {/* ─── Delete Confirmation ─────────────────────────────── */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} title="Delete Origin Address">
        <div className="oag-delete-modal">
          <p className="oag-delete-msg">
            Permanently delete <strong>{confirmDelete?.origin_name}</strong>? This cannot be undone.
          </p>
          <p className="oag-delete-msg">
            An address that is used by a run cannot be deleted. Use the Active switch to turn it off instead.
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