"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, Modal, toastError, toastSuccess } from "@/shared/components/ui";
import { createRun, updateRun, deleteRun } from "../data/projectMap.actions";
import { resolveRunStatusOptions } from "../data/projectMap.data";

export default function RunForm({ show, mode, run, origins = [], runStatuses = [], onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState({
    run_name: "",
    origin_id: "",
    run_date: "",
    status: "Scheduled",
    notes: "",
    team_assigned: "",
    vehicle_assigned: "",
    estimated_distance: "",
    estimated_mileage: "",
    estimated_duration: "",
    estimated_subtotal: "",
  });

  // Get selected origin object for address display
  const selectedOrigin = useMemo(() => {
    if (!form.origin_id) return null;
    return origins.find((o) => String(o.id) === String(form.origin_id)) || null;
  }, [form.origin_id, origins]);

  useEffect(() => {
    if (run) {
      setForm({
        run_name: run.run_name || "",
        origin_id: run.origin_id || "",
        run_date: run.run_date || "",
        status: run.status || "Draft",
        notes: run.notes || "",
        team_assigned: run.team_assigned || "",
        vehicle_assigned: run.vehicle_assigned || "",
        estimated_distance: run.estimated_distance != null ? String(run.estimated_distance) : "",
        estimated_mileage: run.estimated_mileage != null ? String(run.estimated_mileage) : "",
        estimated_duration: run.estimated_duration != null ? String(run.estimated_duration) : "",
        estimated_subtotal: run.estimated_subtotal != null ? String(run.estimated_subtotal) : "",
      });
    } else {
      setForm({
        run_name: "",
        origin_id: "",
        run_date: "",
        status: "Scheduled",
        notes: "",
        team_assigned: "",
        vehicle_assigned: "",
        estimated_distance: "",
        estimated_mileage: "",
        estimated_duration: "",
        estimated_subtotal: "",
      });
    }
  }, [run, show]);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.run_name || !form.run_name.trim()) {
      toastError("Run Name is required.", "Validation");
      return;
    }
    if (!form.origin_id) {
      toastError("Origin is required.", "Validation");
      return;
    }
    if (!form.run_date) {
      toastError("Run Date is required.", "Validation");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        run_name: form.run_name.trim(),
        origin_id: form.origin_id || null,
        run_date: form.run_date || null,
        status: form.status,
        notes: form.notes || null,
        team_assigned: form.team_assigned || null,
        vehicle_assigned: form.vehicle_assigned || null,
      };

      // Route estimates (estimated_distance / estimated_mileage /
      // estimated_duration / estimated_subtotal) are never typed into this
      // form — the map view's "Recalculate Run" computes them from the run's
      // origin + stops.
      //
      // Business rule on EDIT: leave the estimate fields out of the payload
      // entirely. updateRun only writes the fields it receives, so this keeps
      // the calculated estimates untouched. (The old behavior blanked three of
      // the four on every save — a simple rename wiped the estimates until
      // someone recalculated. If the origin changes, the estimates simply stay
      // until the next Recalculate, same as estimated_mileage always has.)
      if (mode === "edit" && run?.id) {
        await updateRun(run.id, payload);
        toastSuccess("Run updated.", "Runs");
      } else {
        // A brand-new run has no route estimates yet, so store nulls.
        await createRun({ ...payload, estimated_distance: null, estimated_duration: null, estimated_subtotal: null });
        toastSuccess("Run created.", "Runs");
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      toastError(err?.message || "Error saving run.", "Runs");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!run?.id) return;
    
    setBusy(true);
    try {
      await deleteRun(run.id);
      toastSuccess("Run deleted.", "Runs");
      setShowDeleteConfirm(false);
      onSaved?.();
      onClose?.();
    } catch (err) {
      toastError(err?.message || "Failed to delete run.", "Runs");
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "edit" ? "Edit Run" : "New Run";

  return (
    <Modal show={show} onHide={onClose} title={title} size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>
            Run Code
          </label>
          <input
            type="text"
            value={mode === "edit" ? (run?.run_code || "") : ""}
            disabled
            placeholder={mode === "edit" ? "" : "Auto-generated on save"}
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px", background: "#f8fafc", color: "#64748b" }}
          />
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>
            Run Name <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="text"
            value={form.run_name || ""}
            onChange={(e) => handleChange("run_name", e.target.value)}
            placeholder="e.g. North Texas Loop"
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Origin <span style={{ color: "#dc2626" }}>*</span></label>
            <select
              value={form.origin_id}
              onChange={(e) => handleChange("origin_id", e.target.value)}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px", background: "#fff" }}
            >
              <option value="">Select origin...</option>
              {origins.map((o) => (
                <option key={o.id} value={o.id}>{o.origin_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Origin Address</label>
            <input
              type="text"
              value={selectedOrigin?.formatted_address || selectedOrigin?.address_line_1 || ""}
              readOnly
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px", background: "#f8fafc", color: "#64748b" }}
              placeholder="Select an origin above..."
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px", background: "#fff" }}
            >
              {resolveRunStatusOptions(runStatuses).map((statusName) => (
                <option key={statusName} value={statusName}>{statusName}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Run Date <span style={{ color: "#dc2626" }}>*</span></label>
            <input
              type="date"
              value={form.run_date}
              onChange={(e) => handleChange("run_date", e.target.value)}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Installer</label>
            <input
              type="text"
              value={form.team_assigned}
              onChange={(e) => handleChange("team_assigned", e.target.value)}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
              placeholder="e.g. John Smith"
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Remarks</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px", minHeight: "60px", resize: "vertical" }}
            placeholder="Optional notes..."
          />
        </div>

        <div style={{ display: "flex", gap: "6px", justifyContent: "space-between", marginTop: "6px" }}>
          <div>
            {mode === "edit" && (
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} disabled={busy}>
                Delete Run
              </Button>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={busy} onClick={handleSave}>
              {mode === "edit" ? "Save Changes" : "Create Run"}
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} title="Delete Run">
          <p style={{ fontSize: "13px", color: "#1e293b", margin: "0 0 16px", lineHeight: 1.5 }}>
            Are you sure you want to delete this run?
          </p>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 16px", lineHeight: 1.5 }}>
            This action will permanently delete the run record.
            <br />
            Projects assigned to this run will <strong>NOT</strong> be deleted. They will simply be unassigned and become available to be added to another run.
          </p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={handleDelete}>Delete Run</Button>
          </div>
        </Modal>
      </div>
    </Modal>
  );
}
