"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, TableZ, toastError, toastSuccess } from "@/shared/components/ui";
import { createSetupRow, updateSetupRow, deleteSetupRow } from "../../data/projectMap.actions";
import SetupWorkspaceLayout from "./SetupWorkspaceLayout";
import SetupSidebar from "./SetupSidebar";
import SetupToolbar from "./SetupToolbar";
import SetupFormModal from "./SetupFormModal";

// ─── Table Definitions ─────────────────────────────────────────────

const TABLE_DEFS = [
  {
    key: "projectStatuses",
    label: "Project Statuses",
    pk: "status_id",
    columns: [
      { key: "status_name", label: "Status Name", sortable: true },
      { key: "status_description", label: "Description", sortable: true },
      { key: "display_color", label: "Color", sortable: false },
    ],
    fields: [
      { key: "status_name", label: "Status Name", required: true },
      { key: "status_description", label: "Description" },
      { key: "display_color", label: "Display Color", type: "color" },
    ],
  },
  {
    key: "originAddresses",
    label: "Origin Addresses",
    pk: "id",
    columns: [
      { key: "origin_name", label: "Origin Name", sortable: true },
      { key: "origin_code", label: "Code", sortable: true },
      { key: "city", label: "City", sortable: true },
      { key: "state", label: "State", sortable: true },
      { key: "is_default", label: "Default", sortable: true },
      { key: "is_active", label: "Active", sortable: true },
    ],
    fields: [
      { key: "origin_name", label: "Origin Name", required: true },
      { key: "formatted_address", label: "Address", required: true, type: "location" },
      { key: "is_default", label: "Is Default", type: "boolean" },
      { key: "is_active", label: "Is Active", type: "boolean" },
    ],
  },
  {
    key: "states",
    label: "States",
    pk: "id",
    columns: [
      { key: "state_name", label: "State Name", sortable: true },
      { key: "state_code", label: "Code", sortable: true },
      { key: "display_color", label: "Color", sortable: false },
      { key: "display_order", label: "Order", sortable: true },
      { key: "is_active", label: "Active", sortable: true },
    ],
    fields: [
      { key: "state_name", label: "State Name", required: true },
      { key: "state_code", label: "State Code", required: true },
      { key: "display_color", label: "Display Color", type: "color", required: true },
      { key: "display_order", label: "Display Order", type: "number" },
      { key: "is_active", label: "Is Active", type: "boolean" },
    ],
  },
];

// ─── Main Setup View ─────────────────────────────────────────────────────────

export default function ProjectMapSetupView({ setup = {} }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("projectStatuses");
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [modalRow, setModalRow] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchValue, setSearchValue] = useState("");

  const tableDef = useMemo(() => TABLE_DEFS.find((t) => t.key === activeTab), [activeTab]);

  const columns = useMemo(() => {
    if (!tableDef) return [];
    return tableDef.columns;
  }, [tableDef]);

  const fields = useMemo(() => {
    if (!tableDef) return [];
    return tableDef.fields;
  }, [tableDef]);

  const rows = useMemo(() => {
    const data = setup[activeTab];
    return Array.isArray(data) ? data : [];
  }, [setup, activeTab]);

  // Filter rows by toolbar search
  const filteredRows = useMemo(() => {
    if (!searchValue.trim()) return rows;
    const q = searchValue.toLowerCase();
    return rows.filter((row) =>
      tableDef?.columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [rows, searchValue, tableDef]);

  // Sidebar table list with counts
  const sidebarTables = useMemo(
    () => TABLE_DEFS.map((t) => ({
      key: t.key,
      label: t.label,
      count: Array.isArray(setup[t.key]) ? setup[t.key].length : 0,
    })),
    [setup]
  );

  // Reset search when switching tabs
  const handleTabChange = useCallback((key) => {
    setActiveTab(key);
    setSearchValue("");
  }, []);

  // ─── Modal Handlers ──────────────────────────────

  const openAdd = useCallback(() => {
    setDraft({});
    setModalRow(null);
    setModalMode("add");
  }, []);

  const openEdit = useCallback((row) => {
    const initial = {};
    tableDef.fields.forEach((f) => { initial[f.key] = row[f.key] ?? ""; });
    // For origin addresses, also populate location sub-fields for the LocationSearch
    if (tableDef.key === "originAddresses") {
      initial.formatted_address = row.formatted_address || "";
      initial.address_line_1 = row.address_line_1 || "";
      initial.city = row.city || "";
      initial.state = row.state || "";
      initial.state_code = row.state_code || "";
      initial.postal_code = row.postal_code || "";
      initial.country = row.country || "";
      initial.latitude = row.latitude ?? "";
      initial.longitude = row.longitude ?? "";
    }
    setDraft(initial);
    setModalRow(row);
    setModalMode("edit");
  }, [tableDef]);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setModalRow(null);
    setDraft({});
  }, []);

  const handleDraftChange = (field, value) => {
    setDraft((d) => ({ ...d, [field]: value }));
  };

  const handleSave = useCallback(async () => {
    if (!tableDef) return;

    console.log("[ProjectMapSetupView] handleSave called");
    console.log("[ProjectMapSetupView] draft:", JSON.stringify(draft));
    console.log("[ProjectMapSetupView] fields:", JSON.stringify(tableDef.fields));

    // Validate required fields
    for (const f of tableDef.fields) {
      const val = draft[f.key];
      console.log(`[ProjectMapSetupView] Validating ${f.key}:`, val, "trimmed:", String(val ?? "").trim());
      if (f.required && !String(val ?? "").trim()) {
        toastError(`${f.label} is required.`, "Validation");
        return;
      }
    }

    setBusy(true);
    try {
      const payload = {};
      tableDef.fields.forEach((f) => {
        const val = draft[f.key];
        if (f.type === "boolean") {
          payload[f.key] = val === true || val === "true" || val === "1";
        } else if (f.type === "number") {
          payload[f.key] = val === "" || val == null ? null : Number(val);
        } else if (f.type === "select") {
          payload[f.key] = val === "" || val == null ? null : Number(val);
        } else if (f.type === "location") {
          // Location sub-fields are stored separately in draft
          // Include them in the payload for the database
          payload.formatted_address = draft.formatted_address || "";
          payload.address_line_1 = draft.address_line_1 || "";
          payload.city = draft.city || "";
          payload.state = draft.state || "";
          payload.state_code = draft.state_code || "";
          payload.postal_code = draft.postal_code || "";
          payload.country = draft.country || "";
          payload.latitude = draft.latitude != null ? Number(draft.latitude) : null;
          payload.longitude = draft.longitude != null ? Number(draft.longitude) : null;
        } else {
          payload[f.key] = String(val ?? "").trim();
        }
      });
      console.log("[ProjectMapSetupView] payload:", JSON.stringify(payload));

      if (modalMode === "add") {
        await createSetupRow(activeTab, payload);
        toastSuccess("Row added.", tableDef.label);
      } else {
        const rowId = modalRow[tableDef.pk];
        await updateSetupRow(activeTab, rowId, payload);
        toastSuccess("Row updated.", tableDef.label);
      }

      closeModal();
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Error saving.", tableDef.label);
    } finally {
      setBusy(false);
    }
  }, [tableDef, draft, modalMode, modalRow, activeTab, closeModal, router]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete || !tableDef) return;
    setBusy(true);
    try {
      const rowId = confirmDelete[tableDef.pk];
      await deleteSetupRow(activeTab, rowId);
      toastSuccess("Row deleted.", tableDef.label);
      setConfirmDelete(null);
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Error deleting.", tableDef.label);
    } finally {
      setBusy(false);
    }
  }, [confirmDelete, tableDef, activeTab, router]);

  // ─── Render ────────────────────────────────────────────────

  const actions = useMemo(() => [
    {
      key: "edit",
      label: "Edit",
      icon: "pen",
      type: "primary",
      onClick: (row) => openEdit(row),
    },
    {
      key: "delete",
      label: "Delete",
      icon: "trash",
      type: "danger",
      onClick: (row) => setConfirmDelete(row),
    },
  ], [openEdit]);

  const singularName = tableDef?.label?.replace(/s$/, "") || "Item";

  return (
    <div className="setup-workspace-root">
      <SetupWorkspaceLayout
        sidebar={
          <SetupSidebar
            tables={sidebarTables}
            activeKey={activeTab}
            onSelect={handleTabChange}
          />
        }
        toolbar={
          <SetupToolbar
            tableName={tableDef?.label || ""}
            recordCount={rows.length}
            searchValue={searchValue}
            onSearchChange={(v) => { setSearchValue(v); }}
            onAdd={openAdd}
            addLabel={`Add ${singularName}`}
          />
        }
      >
        {tableDef && (
          <div className="setup-grid-wrap">
            <TableZ
              data={filteredRows}
              columns={columns}
              rowIdKey={tableDef.pk}
              actions={actions}
              hideSearch
              emptyMessage={`No ${tableDef.label.toLowerCase()} found.`}
            />
          </div>
        )}
      </SetupWorkspaceLayout>

      {/* Add / Edit Modal */}
      <SetupFormModal
        show={!!modalMode}
        mode={modalMode}
        tableName={singularName}
        fields={fields}
        draft={draft}
        busy={busy}
        onDraftChange={handleDraftChange}
        onSave={handleSave}
        onClose={closeModal}
      />

      {/* Delete Confirmation */}
      <Modal show={!!confirmDelete} onHide={() => setConfirmDelete(null)} title="Confirm Delete">
        <p className="setup-delete-msg">Delete this row? This cannot be undone.</p>
        <div className="setup-delete-actions">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}