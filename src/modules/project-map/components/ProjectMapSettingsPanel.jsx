"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Form } from "react-bootstrap";
import { Button, toastError, toastSuccess } from "@/shared/components/ui";
import { updateProjectMapSetting } from "../data/projectMap.actions";
import { PROJECT_MAP_SETTING_KEYS, STALE_AFTER_DAYS_LIMITS, getStaleAfterDays } from "../data/projectMap.data";

/**
 * "General Settings" in Project Map Setup: values saved in proj_s_settings
 * (one row per setting_key). Today: how many days without an update put an
 * open project or run in the bell.
 */
export default function ProjectMapSettingsPanel({ settings = [], readOnly = false }) {
  const router = useRouter();
  const savedDays = getStaleAfterDays(settings);
  const [days, setDays] = useState(String(savedDays));
  const [busy, setBusy] = useState(false);

  const parsed = Number(days);
  const valid = Number.isInteger(parsed) && parsed >= STALE_AFTER_DAYS_LIMITS.min && parsed <= STALE_AFTER_DAYS_LIMITS.max;
  const changed = valid && parsed !== savedDays;

  const handleSave = async () => {
    if (!valid) {
      toastError(`Enter a whole number from ${STALE_AFTER_DAYS_LIMITS.min} to ${STALE_AFTER_DAYS_LIMITS.max}.`, "General Settings");
      return;
    }
    setBusy(true);
    try {
      const result = await updateProjectMapSetting(PROJECT_MAP_SETTING_KEYS.staleAfterDays, String(parsed));
      if (!result?.success) throw new Error(result?.error || "Unable to save the setting.");
      toastSuccess("Setting saved.", "General Settings");
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Unable to save the setting.", "General Settings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ltg-root">
      <div className="ltg-toolbar">
        <div className="ltg-toolbar__left">
          <h2 className="ltg-toolbar__title">General Settings</h2>
        </div>
        {readOnly && (
          <div className="ltg-toolbar__right">
            <span
              title="Your Project Map roles are view only."
              style={{ alignSelf: "center", fontSize: "11px", fontWeight: 600, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "2px 10px" }}
            >
              View only
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: "16px", maxWidth: "520px" }}>
        <Form.Group className="ltg-modal-field">
          <Form.Label className="ltg-modal-label" htmlFor="setting-stale-after-days">Bell: days without an update</Form.Label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Form.Control
              id="setting-stale-after-days"
              type="number"
              size="sm"
              min={STALE_AFTER_DAYS_LIMITS.min}
              max={STALE_AFTER_DAYS_LIMITS.max}
              step={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              disabled={readOnly || busy}
              className="ltg-modal-input"
              style={{ maxWidth: "120px" }}
            />
            <span style={{ fontSize: "12px", color: "#64748b" }}>days</span>
            {!readOnly && (
              <Button variant="primary" loading={busy} disabled={!changed} onClick={handleSave}>Save</Button>
            )}
          </div>
          <Form.Text className="text-muted">
            Open projects and runs that nobody has updated for this many days show in the bell on the Project Map. Allowed: {STALE_AFTER_DAYS_LIMITS.min} to {STALE_AFTER_DAYS_LIMITS.max}.
          </Form.Text>
        </Form.Group>
      </div>
    </div>
  );
}