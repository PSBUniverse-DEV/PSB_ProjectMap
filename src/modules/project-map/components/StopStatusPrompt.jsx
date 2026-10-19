"use client";

import { useEffect, useState } from "react";
import { Button, Modal, toastError, toastSuccess } from "@/shared/components/ui";
import { saveReleasedStopStatuses } from "../data/projectMap.actions";

/**
 * StopStatusPrompt — after stops leave a run (one stop removed, or the run
 * cancelled or deleted), asks which project status each should have now.
 * Each row starts on the project's current status; nothing is saved unless a
 * status is changed and "Save Statuses" is pressed.
 *
 * prompt: { title, message, stops: [{ projectId, clientName, statusId }] } or null
 */
export default function StopStatusPrompt({ prompt, statuses = [], onClose, onSaved }) {
  const [choices, setChoices] = useState({});
  const [saving, setSaving] = useState(false);

  // Start every row on its current status whenever a new prompt opens.
  useEffect(() => {
    setChoices(Object.fromEntries((prompt?.stops || []).map((stop) => [stop.projectId, stop.statusId || ""])));
  }, [prompt]);

  const stops = prompt?.stops || [];
  const changedStops = stops.filter((stop) => choices[stop.projectId] && choices[stop.projectId] !== (stop.statusId || ""));

  // Active statuses in display order, plus the project's current one even if it was switched off.
  const statusOptions = (currentId) =>
    statuses
      .filter((s) => s.is_active !== false || String(s.status_id) === currentId)
      .slice()
      .sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0));

  const handleSave = async () => {
    setSaving(true);
    try {
      // The release's signed note allows exactly these projects (Runs-tab rule).
      await saveReleasedStopStatuses(
        prompt?.releaseToken,
        changedStops.map((stop) => ({ projectId: stop.projectId, statusId: Number(choices[stop.projectId]) }))
      );
      toastSuccess(changedStops.length === 1 ? "Project status updated." : `${changedStops.length} project statuses updated.`, "Runs");
      onSaved?.();
    } catch (err) {
      toastError(err?.message || "Failed to update the project statuses.", "Runs");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={!!prompt} onHide={onClose} title={prompt?.title || "Choose Project Statuses"}>
      <p style={{ fontSize: "13px", color: "#1e293b", margin: "0 0 10px" }}>{prompt?.message}</p>
      <div style={{ maxHeight: "50vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {stops.map((stop) => (
          <div key={stop.projectId} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", alignItems: "center" }}>
            <strong style={{ fontSize: "12px", color: "#1e293b" }}>{stop.clientName}</strong>
            <select
              value={choices[stop.projectId] || ""}
              onChange={(e) => setChoices((prev) => ({ ...prev, [stop.projectId]: e.target.value }))}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "6px 8px", fontSize: "12px", background: "#fff" }}
            >
              <option value="" disabled>Choose a status...</option>
              {statusOptions(stop.statusId).map((s) => (
                <option key={s.status_id} value={String(s.status_id)}>{s.status_name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onClose}>Keep as is</Button>
        <Button variant="primary" loading={saving} disabled={changedStops.length === 0} onClick={handleSave}>Save Statuses</Button>
      </div>
    </Modal>
  );
}
