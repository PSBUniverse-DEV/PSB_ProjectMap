"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, Modal, toastError, toastSuccess } from "@/shared/components/ui";
import { createRun, updateRun } from "../data/projectMap.actions";

export default function RunForm({ show, mode, run, origins = [], statuses = [], onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    run_name: "",
    origin_id: "",
    run_date: "",
    status: "Draft",
    notes: "",
    team_assigned: "",
    vehicle_assigned: "",
    estimated_distance: "",
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
        estimated_duration: run.estimated_duration != null ? String(run.estimated_duration) : "",
        estimated_subtotal: run.estimated_subtotal != null ? String(run.estimated_subtotal) : "",
      });
    } else {
      setForm({
        run_name: "",
        origin_id: "",
        run_date: "",
        status: "Draft",
        notes: "",
        team_assigned: "",
        vehicle_assigned: "",
        estimated_distance: "",
        estimated_duration: "",
        estimated_subtotal: "",
      });
    }
  }, [run, show]);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.run_name.trim()) {
      toastError("Run name is required.", "Validation");
      return;
    }

    setBusy(true);
    try {
      // Estimate fields are auto-calculated after projects are added
      const payload = {
        run_name: form.run_name,
        origin_id: form.origin_id || null,
        run_date: form.run_date || null,
        status: form.status,
        notes: form.notes || null,
        team_assigned: form.team_assigned || null,
        vehicle_assigned: form.vehicle_assigned || null,
        estimated_distance: null,
        estimated_duration: null,
        estimated_subtotal: null,
      };

      if (mode === "edit" && run?.id) {
        await updateRun(run.id, payload);
        toastSuccess("Run updated.", "Runs");
      } else {
        await createRun(payload);
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

  const title = mode === "edit" ? "Edit Run" : "New Run";

  return (
    <Modal show={show} onHide={onClose} title={title} size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>
            Run Name <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="text"
            value={form.run_name}
            onChange={(e) => handleChange("run_name", e.target.value)}
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
            placeholder="Enter run name"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Origin</label>
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
              <option value="Draft">Draft</option>
              <option value="Planned">Planned</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Run Date</label>
            <input
              type="date"
              value={form.run_date}
              onChange={(e) => handleChange("run_date", e.target.value)}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Team Assigned</label>
            <input
              type="text"
              value={form.team_assigned}
              onChange={(e) => handleChange("team_assigned", e.target.value)}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
              placeholder="e.g. Team A"
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Vehicle Assigned</label>
            <input
              type="text"
              value={form.vehicle_assigned}
              onChange={(e) => handleChange("vehicle_assigned", e.target.value)}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
              placeholder="e.g. Truck 3"
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px", minHeight: "60px", resize: "vertical" }}
            placeholder="Optional notes..."
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Est. Distance (m)</label>
            <input
              type="text"
              value={form.estimated_distance ? `${Number(form.estimated_distance).toLocaleString()} m` : "—"}
              readOnly
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px", background: "#f8fafc", color: "#64748b" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Est. Duration</label>
            <input
              type="text"
              value={form.estimated_duration ? `${Math.round(Number(form.estimated_duration) / 60)} min` : "—"}
              readOnly
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px", background: "#f8fafc", color: "#64748b" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Est. Subtotal ($)</label>
            <input
              type="text"
              value={form.estimated_subtotal ? `$${Number(form.estimated_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              readOnly
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px", background: "#f8fafc", color: "#64748b" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "6px" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={handleSave}>
            {mode === "edit" ? "Save Changes" : "Create Run"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}