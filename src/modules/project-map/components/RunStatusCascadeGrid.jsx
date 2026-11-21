"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, toastError, toastSuccess } from "@/shared/components/ui";
import { saveRunStatusCascade } from "../data/projectMap.actions";
import { REPAIR_STATUS_KEYS } from "../data/projectMap.data";

const NO_CHANGE = "";
const GREY = "#64748b";
const HEAD_STYLE = { fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#475569" };
const ROW_GRID = { display: "grid", gridTemplateColumns: "220px 32px minmax(0, 1fr) minmax(0, 1fr)", gap: "12px", alignItems: "center" };
const HIDDEN_LABEL = { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" };

// run status id (string) -> { install, repair }: project status ids as strings ("" = no change).
function toDraft(runStatuses, rules) {
  const byRun = new Map((rules || []).map((rule) => [String(rule.run_status_id), rule]));
  const draft = {};
  (runStatuses || []).forEach((status) => {
    const rule = byRun.get(String(status.status_id));
    draft[String(status.status_id)] = {
      install: rule?.project_status_id != null ? String(rule.project_status_id) : NO_CHANGE,
      repair: rule?.repair_project_status_id != null ? String(rule.repair_project_status_id) : NO_CHANGE,
    };
  });
  return draft;
}

/**
 * "Status Cascade" in Project Map Setup: for each run status, the project
 * status every stop on the run moves to when the run enters that status, and
 * the one repair stops move to (proj_m_run_status_cascade). "No change" leaves
 * those stops as they are. updateRun and addProjectToRun use these rules
 * (resolveCascadeTargets in projectMap.actions.js).
 */
export default function RunStatusCascadeGrid({ runStatuses = [], projectStatuses = [], rules = [], readOnly = false }) {
  const router = useRouter();
  const saved = useMemo(() => toDraft(runStatuses, rules), [runStatuses, rules]);
  const [draft, setDraft] = useState(saved);
  const [busy, setBusy] = useState(false);

  // Fresh server data (after a save) replaces the local copy.
  useEffect(() => { setDraft(saved); }, [saved]);

  const statusById = useMemo(() => new Map(projectStatuses.map((s) => [String(s.status_id), s])), [projectStatuses]);
  const installList = useMemo(() => projectStatuses.filter((s) => s.is_active !== false), [projectStatuses]);
  const repairList = useMemo(
    () => projectStatuses.filter((s) => s.is_active !== false && REPAIR_STATUS_KEYS.includes(s.system_key)),
    [projectStatuses]
  );

  const valueOf = (runId) => draft[runId] || { install: NO_CHANGE, repair: NO_CHANGE };
  const savedOf = (runId) => saved[runId] || { install: NO_CHANGE, repair: NO_CHANGE };
  const dirty = runStatuses.some((s) => {
    const id = String(s.status_id);
    return valueOf(id).install !== savedOf(id).install || valueOf(id).repair !== savedOf(id).repair;
  });
  const ruleCount = runStatuses.filter((s) => {
    const v = valueOf(String(s.status_id));
    return v.install || v.repair;
  }).length;

  // A drop-down's options; a saved choice that is switched off (or outside the list) still shows.
  const optionsFor = (list, currentId) => {
    const options = list.map((s) => ({ value: String(s.status_id), label: s.status_name }));
    if (currentId && !options.some((o) => o.value === currentId)) {
      const current = statusById.get(currentId);
      options.push({ value: currentId, label: `${current?.status_name || "Removed status"}${current?.is_active === false ? " (switched off)" : ""}` });
    }
    return [{ value: NO_CHANGE, label: "No change" }, ...options];
  };

  const chipOf = (statusId) => {
    const s = statusId ? statusById.get(statusId) : null;
    const color = s?.display_color || GREY;
    return { label: s ? s.status_name : "No change", color, background: s ? `${color}1a` : "#f1f5f9" };
  };

  const setOne = (runId, field, value) => {
    setDraft((prev) => ({ ...prev, [runId]: { ...(prev[runId] || { install: NO_CHANGE, repair: NO_CHANGE }), [field]: value } }));
  };

  const flow = (field) => runStatuses
    .map((s) => ({ run: s.status_name, target: valueOf(String(s.status_id))[field] }))
    .filter((step) => step.target)
    .map((step) => ({ ...step, chip: chipOf(step.target) }));

  const handleSave = async () => {
    setBusy(true);
    try {
      const payload = runStatuses.map((s) => {
        const v = valueOf(String(s.status_id));
        return { run_status_id: s.status_id, project_status_id: v.install || null, repair_project_status_id: v.repair || null };
      });
      const result = await saveRunStatusCascade(payload);
      if (!result?.success) throw new Error(result?.error || "Unable to save the status cascade.");
      toastSuccess("Status cascade saved.", "Status Cascade");
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Unable to save the status cascade.", "Status Cascade");
    } finally {
      setBusy(false);
    }
  };
const renderChip = (chip) => (
    <span style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: "6px", padding: "2px 9px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, background: chip.background, color: chip.color }}>
      <span aria-hidden="true" style={{ width: "7px", height: "7px", borderRadius: "50%", background: chip.color }} />
      {chip.label}
    </span>
  );

  const renderFlow = (title, steps, tone) => (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px", minWidth: 0 }}>
      <h3 style={{ margin: 0, ...HEAD_STYLE }}>{title}</h3>
      {steps.length === 0 ? (
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>No run status moves these stops.</span>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
          {steps.map((step) => (
            <span key={`${step.run}-${step.target}`} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "8px", background: tone.background, border: `1px solid ${tone.border}`, fontSize: "12px" }}>
              <span style={{ color: "#64748b" }}>{step.run}</span>
              <span aria-hidden="true" style={{ color: "#94a3b8" }}>→</span>
              <strong style={{ color: step.chip.color }}>{step.chip.label}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="ltg-root">
      <div className="ltg-toolbar">
        <div className="ltg-toolbar__left">
          <h2 className="ltg-toolbar__title">Status Cascade</h2>
          <span className="ltg-toolbar__count">{ruleCount} rule{ruleCount === 1 ? "" : "s"}</span>
        </div>
        <div className="ltg-toolbar__right">
          {readOnly ? (
            <span
              title="Your Project Map roles are view only."
              style={{ alignSelf: "center", fontSize: "11px", fontWeight: 600, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "2px 10px" }}
            >
              View only
            </span>
          ) : (
            <>
              {dirty && (
                <span style={{ alignSelf: "center", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px", background: "#fef3c7", color: "#92400e" }}>Unsaved changes</span>
              )}
              <Button variant="secondary" disabled={!dirty || busy} onClick={() => setDraft(saved)}>Undo changes</Button>
              <Button variant="success" loading={busy} disabled={!dirty} onClick={handleSave}>Save cascade</Button>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <p style={{ margin: 0, maxWidth: "760px", color: "#475569", fontSize: "13px", lineHeight: 1.5 }}>
          When a run moves into a run status, every project on that run moves to the project status picked here. Repair projects follow their own column, so a repair never turns into an install. &quot;No change&quot; leaves those projects as they are.
        </p>

        <section aria-label="Run status to project status" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", overflowX: "auto" }}>
          <div style={{ minWidth: "760px" }}>
            <div style={{ ...ROW_GRID, padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", ...HEAD_STYLE }}>
              <span>When a run becomes</span>
              <span />
              <span>Projects become</span>
              <span>Repair projects become</span>
            </div>
{runStatuses.length === 0 ? (
              <div style={{ padding: "16px", fontSize: "12px", color: "#94a3b8" }}>No run statuses yet. Add them under Run Statuses.</div>
            ) : runStatuses.map((runStatus) => {
              const runId = String(runStatus.status_id);
              const value = valueOf(runId);
              const original = savedOf(runId);
              const runColor = runStatus.display_color || GREY;
              const installChanged = value.install !== original.install;
              const repairChanged = value.repair !== original.repair;
              return (
                <div key={runId} style={{ ...ROW_GRID, padding: "12px 16px", borderBottom: "1px solid #f1f5f9", background: installChanged || repairChanged ? "#fffbeb" : "#fff" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
                    <span style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: `${runColor}1a`, color: runColor }}>
                      <span aria-hidden="true" style={{ width: "8px", height: "8px", borderRadius: "50%", background: runColor }} />
                      {runStatus.status_name}
                    </span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      {[
                        runStatus.is_active === false ? "Switched off" : "",
                        runStatus.is_finished === true ? "Finished" : "",
                        value.install || value.repair ? "Moves the stops" : "Changes nothing",
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </div>

                  <span aria-hidden="true" style={{ color: "#94a3b8", fontSize: "16px", textAlign: "center" }}>→</span>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
                    <label htmlFor={`cascade-install-${runId}`} style={HIDDEN_LABEL}>Projects become, when a run becomes {runStatus.status_name}</label>
                    <select
                      id={`cascade-install-${runId}`}
                      value={value.install}
                      onChange={(e) => setOne(runId, "install", e.target.value)}
                      disabled={readOnly || busy}
                      style={{ width: "100%", padding: "7px 10px", border: `1px solid ${installChanged ? "#f59e0b" : "#cbd5e1"}`, borderRadius: "8px", background: "#fff", font: "inherit", fontSize: "13px", color: "#0f172a" }}
                    >
                      {optionsFor(installList, value.install).map((option) => (
                        <option key={option.value || "none"} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {renderChip(chipOf(value.install))}
                  </div>
<div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
                    <label htmlFor={`cascade-repair-${runId}`} style={HIDDEN_LABEL}>Repair projects become, when a run becomes {runStatus.status_name}</label>
                    <select
                      id={`cascade-repair-${runId}`}
                      value={value.repair}
                      onChange={(e) => setOne(runId, "repair", e.target.value)}
                      disabled={readOnly || busy}
                      style={{ width: "100%", padding: "7px 10px", border: `1px solid ${repairChanged ? "#f59e0b" : "#cbd5e1"}`, borderRadius: "8px", background: "#fff", font: "inherit", fontSize: "13px", color: "#0f172a" }}
                    >
                      {optionsFor(repairList, value.repair).map((option) => (
                        <option key={option.value || "none"} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {renderChip(chipOf(value.repair))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
          {renderFlow("Install flow (preview)", flow("install"), { background: "#f8fafc", border: "#e2e8f0" })}
          {renderFlow("Repair flow (preview)", flow("repair"), { background: "#fef2f2", border: "#fecaca" })}
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "12px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", color: "#1e3a8a", fontSize: "13px", lineHeight: 1.5, maxWidth: "900px" }}>
          <span aria-hidden="true" style={{ fontWeight: 700 }}>i</span>
          <span>
            A project counts as a repair when its status is one of the repair statuses (the ones with a repair system key, such as Repairs, For Repair, Currently Being Repaired and Repaired). Cancelling a run still asks which status each stop should go back to; that pop-up is not part of this table.
          </span>
        </div>
      </div>
    </div>
  );
}