"use client";

import { useState } from "react";
import { Form } from "react-bootstrap";
import { Button, Modal } from "@/shared/components/ui";
import LocationSearch from "../../components/LocationSearch";

/**
 * SetupFormModal — Lightweight modal for add/edit operations.
 */
export default function SetupFormModal({ show, mode, tableName, fields, draft, busy, onDraftChange, onSave, onClose }) {
  if (!show) return null;

  const title = mode === "add" ? `Add ${tableName}` : `Edit ${tableName}`;

  // Separate query state for LocationSearch so it can be controlled independently
  const [locationQuery, setLocationQuery] = useState("");

  // Sync locationQuery when draft changes (e.g., when opening edit modal)
  if (draft.formatted_address && draft.formatted_address !== locationQuery && !locationQuery) {
    setLocationQuery(draft.formatted_address);
  }

  const handleLocationSelect = (loc) => {
    console.log("[SetupFormModal] handleLocationSelect called with:", loc);
    onDraftChange("formatted_address", loc.formatted_address || "");
    onDraftChange("address_line_1", loc.address_line_1 || "");
    onDraftChange("city", loc.city || "");
    onDraftChange("state", loc.state || "");
    onDraftChange("state_code", loc.state_code || "");
    onDraftChange("postal_code", loc.postal_code || "");
    onDraftChange("country", loc.country || "");
    onDraftChange("latitude", loc.latitude);
    onDraftChange("longitude", loc.longitude);
  };

  return (
    <Modal show={show} onHide={onClose} title={title}>
      <div className="setup-form-modal">
        {fields?.map((f) => (
          <Form.Group key={f.key} className="setup-form-modal__field">
            {f.type !== "boolean" && f.type !== "location" && (
              <Form.Label className="setup-form-modal__label">
                {f.label}{f.required ? <span className="setup-form-modal__required">*</span> : ""}
              </Form.Label>
            )}
            {f.type === "boolean" ? (
              <Form.Check
                type="switch"
                id={`field-${f.key}`}
                label={f.label}
                checked={draft[f.key] === true || draft[f.key] === "true" || draft[f.key] === "1"}
                onChange={(e) => onDraftChange(f.key, e.target.checked)}
              />
            ) : f.type === "location" ? (
              <LocationSearch
                onSelect={handleLocationSelect}
                selectedLocation={draft}
                query={locationQuery}
                onQueryChange={setLocationQuery}
              />
            ) : f.type === "color" ? (
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input
                  type="color"
                  value={draft[f.key] || "#000000"}
                  onChange={(e) => onDraftChange(f.key, e.target.value)}
                  style={{ width: "36px", height: "32px", padding: "0", border: "1px solid #e2e8f0", borderRadius: "3px", cursor: "pointer" }}
                />
                <Form.Control
                  type="text"
                  size="sm"
                  value={draft[f.key] ?? ""}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val && !val.startsWith("#")) val = "#" + val;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(val) || val === "#") {
                      onDraftChange(f.key, val);
                    }
                  }}
                  placeholder="#000000"
                  className="setup-form-modal__input"
                  style={{ flex: 1 }}
                />
              </div>
            ) : f.type === "select" ? (
              <Form.Select
                size="sm"
                value={draft[f.key] ?? ""}
                onChange={(e) => onDraftChange(f.key, e.target.value)}
                className="setup-form-modal__input"
              >
                <option value="">— Select {f.label} —</option>
                {(f.options || []).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Form.Select>
            ) : (
              <Form.Control
                type={f.type || "text"}
                step={f.step || undefined}
                size="sm"
                value={draft[f.key] ?? ""}
                onChange={(e) => onDraftChange(f.key, e.target.value)}
                placeholder={f.label}
                className="setup-form-modal__input"
              />
            )}
          </Form.Group>
        ))}
        <div className="setup-form-modal__actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={onSave}>
            {mode === "add" ? "Add" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}