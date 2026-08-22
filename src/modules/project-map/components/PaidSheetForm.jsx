"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, Modal, toastError, toastSuccess } from "@/shared/components/ui";
import { updateRun, updateProjectPaymentInfo, loadPaidSheet, upsertPaidSheet } from "../data/projectMap.actions";
import { formatProjectDescriptionForDisplay } from "../data/projectMap.data";

/**
 * formatCurrency — local copy of the helper used in RunMasterView.jsx so
 * the paid-sheet ledger rows show Amounts in the same dollars-and-cents
 * format as Print Manifest's subtotal column.
 */
function formatCurrency(value) {
  if (value == null) return "$0.00";
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * PaidSheetForm — a ledger-style editor for a run's payment/installer
 * info, opened from the Run Master List's row "Edit" action.
 *
 * Presents one row per stop in a table that mirrors the paper "Paid
 * Sheet" the business uses: Order #, Description, Payment Method (radio
 * group) + Ref #, Amount, and Notes. The Installer field at the top is
 * run-level (proj_t_runs.team_assigned); everything else lives per
 * stop on proj_t_projects.
 *
 * Order #, Description, and Amount are read-only (pulled from the
 * project record — invoice_number / client_name + building dimension / project_subtotal).
 * Only Installer, Payment Method, Ref #, and Notes are editable and
 * written back. Unrelated project fields are never touched, which is
 * why saving uses the narrow updateProjectPaymentInfo action rather
 * than the general updateProject.
 */
export default function PaidSheetForm({
  show,
  run = null,
  projects = [],
  paymentMethods = [],
  onClose,
  onSaved,
}) {
  const [busy, setBusy] = useState(false);
  const [installer, setInstaller] = useState("");
  // Confirmation gate for unchecking "Mark run as paid" — destructive because
  // it hides the Paid Date / Paid Reference fields.
  const [showUnmarkConfirm, setShowUnmarkConfirm] = useState(false);
  // stopValues keyed by project id → { payment_method_type, payment_method_number, paid_sheet_notes, paid_sheet_done }
  const [stopValues, setStopValues] = useState({});
  // Run-level paid-sheet header fields (proj_t_paid_sheet, one row per run).
  const [headerFields, setHeaderFields] = useState({
    phone_number: "",
    dot_number: "",
    state_route: "",
    extra_notes: "",
    is_paid: false,
    paid_date: "",
    paid_reference: "",
    installer_signature_date: "",
    psb_representative_name: "",
    psb_representative_date: "",
  });

  // Seed form state whenever the modal opens or the run/projects change.
  useEffect(() => {
    setInstaller(run?.team_assigned || "");
    const seeded = {};
    projects.forEach((rp) => {
      const proj = rp.proj_t_projects || {};
      seeded[proj.id] = {
        payment_method_type: proj.payment_method_type != null ? String(proj.payment_method_type) : "",
        payment_method_number: proj.payment_method_number || "",
        paid_sheet_notes: proj.paid_sheet_notes || "",
        paid_sheet_done: proj.paid_sheet_done || false,
      };
    });
    setStopValues(seeded);

    if (!show || !run?.id) {
      setHeaderFields({
        phone_number: "", dot_number: "", state_route: "", extra_notes: "",
        is_paid: false, paid_date: "", paid_reference: "",
        installer_signature_date: "", psb_representative_name: "", psb_representative_date: "",
      });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const existing = await loadPaidSheet(run.id);
        if (cancelled) return;
        setHeaderFields({
          phone_number: existing?.phone_number || "",
          dot_number: existing?.dot_number || "",
          state_route: existing?.state_route || "",
          extra_notes: existing?.extra_notes || "",
          is_paid: existing?.is_paid || false,
          paid_date: existing?.paid_date || "",
          paid_reference: existing?.paid_reference || "",
          installer_signature_date: existing?.installer_signature_date || "",
          psb_representative_name: existing?.psb_representative_name || "",
          psb_representative_date: existing?.psb_representative_date || "",
        });
      } catch (err) {
        console.error("[PaidSheetForm] Failed to load paid sheet header:", err);
      }
    })();

    return () => { cancelled = true; };
  }, [run, projects, show]);

  // Total Amount Run = sum of the displayed project_subtotal values.
  const totalAmount = useMemo(() => {
    return projects.reduce((sum, rp) => sum + (Number(rp.proj_t_projects?.project_subtotal) || 0), 0);
  }, [projects]);

  const handleStopChange = (projectId, field, value) => {
    setStopValues((s) => ({
      ...s,
      [projectId]: { ...(s[projectId] || {}), [field]: value },
    }));
  };

  const handleHeaderChange = (field, value) => {
    setHeaderFields((h) => ({ ...h, [field]: value }));
  };

  /**
   * Checkbox toggle for "Mark run as paid".
   *
   * Checking (→ paid) is applied directly. Unchecking (→ unpaid) is gated
   * behind a confirmation because it hides the Paid Date and Paid Reference
   * fields — if the user cancels, the checkbox stays checked and no state
   * changes.
   */
  const handlePaidCheckChange = (e) => {
    if (e.target.checked) {
      handleHeaderChange("is_paid", true);
      return;
    }
    setShowUnmarkConfirm(true);
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      // Installer lives on the run itself.
      await updateRun(run.id, { team_assigned: installer || null });

      // Run-level paid-sheet header row (one per run, upserted).
      await upsertPaidSheet(run.id, headerFields);

      // Payment fields + per-stop "done" flag live on each project/stop.
      await Promise.all(
        projects.map((rp) => {
          const proj = rp.proj_t_projects || {};
          if (!proj.id) return Promise.resolve();
          const v = stopValues[proj.id] || {};
          return updateProjectPaymentInfo(proj.id, v);
        })
      );

      toastSuccess("Paid sheet saved.", "Runs");
      onSaved?.();
      onClose?.();
    } catch (err) {
      toastError(err?.message || "Error saving paid sheet.", "Runs");
    } finally {
      setBusy(false);
    }
  };

  const title = run?.run_name ? `Paid Sheet — ${run.run_name}` : "Paid Sheet";

  // Shared cell/label styling consistent with RunForm.jsx.
  const cellStyle = { padding: "6px 8px", verticalAlign: "top", borderBottom: "1px solid #e2e8f0", fontSize: "12px" };
  const inputStyle = { width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "3px 6px", fontSize: "12px", background: "#fff" };
  // Boxed-section styling, consistent with AddProjectForm.jsx / RunForm.jsx.
  const sectionStyle = { background: "#f8fafc", padding: "12px", borderRadius: "4px", border: "1px solid #e2e8f0", marginBottom: "10px" };
  const sectionTitleStyle = { fontSize: "11px", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" };

    return (
    <>
      <Modal show={show} onHide={onClose} title={title} size="xl">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Section 1: Installer */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Installer</div>
          <input
            type="text"
            value={installer}
            onChange={(e) => setInstaller(e.target.value)}
            style={{ width: "100%", maxWidth: "320px", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px", background: "#fff" }}
            placeholder="Assigned installer..."
          />
        </div>

        {/* Section 2: Route Info */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Route Info</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Phone Number</label>
              <input
                type="text"
                value={headerFields.phone_number}
                onChange={(e) => handleHeaderChange("phone_number", e.target.value)}
                style={inputStyle}
                placeholder="Phone..."
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>DOT#</label>
              <input
                type="text"
                value={headerFields.dot_number}
                onChange={(e) => handleHeaderChange("dot_number", e.target.value)}
                style={inputStyle}
                placeholder="DOT..."
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>State/Route</label>
              <input
                type="text"
                value={headerFields.state_route}
                onChange={(e) => handleHeaderChange("state_route", e.target.value)}
                style={inputStyle}
                placeholder="State / route..."
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Extra Notes</label>
            <textarea
              value={headerFields.extra_notes}
              onChange={(e) => handleHeaderChange("extra_notes", e.target.value)}
              style={{ ...inputStyle, minHeight: "44px", resize: "vertical" }}
              placeholder="Optional notes..."
            />
          </div>
        </div>

        {/* Section 3: Payment Status & Signatures */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Payment Status &amp; Signatures</div>
          {/* Paid toggle row */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <input
              type="checkbox"
              id="paid-check"
              checked={headerFields.is_paid}
              onChange={handlePaidCheckChange}
              style={{ width: "15px", height: "15px", cursor: "pointer" }}
            />
            <label htmlFor="paid-check" style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", cursor: "pointer", margin: 0 }}>
              Mark run as paid
            </label>
          </div>
          {headerFields.is_paid && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "4px", marginBottom: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Paid Date</label>
                <input type="date" value={headerFields.paid_date} onChange={(e) => handleHeaderChange("paid_date", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Paid Reference</label>
                <input type="text" value={headerFields.paid_reference} onChange={(e) => handleHeaderChange("paid_reference", e.target.value)} style={inputStyle} placeholder="e.g. #2181" />
              </div>
            </div>
          )}
          {/* PSB Representative Name — full width */}
          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>PSB Representative Name</label>
            <input type="text" value={headerFields.psb_representative_name} onChange={(e) => handleHeaderChange("psb_representative_name", e.target.value)} style={inputStyle} placeholder="Name..." />
          </div>
          {/* Installer Signature Date | PSB Representative Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Installer Signature Date</label>
              <input type="date" value={headerFields.installer_signature_date} onChange={(e) => handleHeaderChange("installer_signature_date", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>PSB Representative Date</label>
              <input type="date" value={headerFields.psb_representative_date} onChange={(e) => handleHeaderChange("psb_representative_date", e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Ledger table — one row per stop */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "4px", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ ...cellStyle, textAlign: "left", fontWeight: 700 }}>Order #</th>
                <th style={{ ...cellStyle, textAlign: "left", fontWeight: 700 }}>Description</th>
                <th style={{ ...cellStyle, textAlign: "left", fontWeight: 700 }}>Payment Method</th>
                <th style={{ ...cellStyle, textAlign: "left", fontWeight: 700 }}></th>
                <th style={{ ...cellStyle, textAlign: "right", fontWeight: 700 }}>Amount</th>
                <th style={{ ...cellStyle, textAlign: "left", fontWeight: 700 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ ...cellStyle, fontStyle: "italic", color: "#64748b" }}>
                    No stops assigned to this run.
                  </td>
                </tr>
              ) : (
                projects.map((rp, idx) => {
                  const proj = rp.proj_t_projects || {};
                  const v = stopValues[proj.id] || { payment_method_type: "", payment_method_number: "", paid_sheet_notes: "", paid_sheet_done: false };
                  const orderNo = proj.invoice_number || "";
                  return (
                    <tr key={proj.id}>
                      <td style={cellStyle}>{orderNo}</td>
                      <td style={cellStyle}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{proj.client_name || `Stop #${idx + 1}`}</div>
                        <div style={{ color: "#64748b", fontSize: "11px", marginTop: "2px" }}>{formatProjectDescriptionForDisplay(proj.dimension) || "—"}</div>
                      </td>
                      <td style={cellStyle}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {paymentMethods.length === 0 ? (
                            <span style={{ fontStyle: "italic", color: "#64748b" }}>No payment methods configured.</span>
                          ) : (
                            paymentMethods.map((m) => (
                              <label key={m.id} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#1e293b", cursor: "pointer", whiteSpace: "nowrap" }}>
                                <input
                                  type="radio"
                                  name={`pm-${proj.id}`}
                                  value={m.id}
                                  checked={String(v.payment_method_type) === String(m.id)}
                                  onChange={() => handleStopChange(proj.id, "payment_method_type", String(m.id))}
                                />
                                {m.method_description || m.method_name}
                              </label>
                            ))
                          )}
                        </div>
                      </td>
                      <td style={cellStyle}>
                        <input
                          type="text"
                          value={v.payment_method_number}
                          onChange={(e) => handleStopChange(proj.id, "payment_method_number", e.target.value)}
                          style={inputStyle}
                          placeholder="Ref #"
                        />
                      </td>
                      <td style={{ ...cellStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                        {formatCurrency(proj.project_subtotal)}
                      </td>
                      <td style={cellStyle}>
                        <input
                          type="text"
                          value={v.paid_sheet_notes}
                          onChange={(e) => handleStopChange(proj.id, "paid_sheet_notes", e.target.value)}
                          style={inputStyle}
                          placeholder="Notes..."
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Total Amount Run */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>Total Amount Run</span>
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", minWidth: "90px", textAlign: "right" }}>
            {formatCurrency(totalAmount)}
          </span>
        </div>

        {/* Footer buttons */}
        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "6px" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={handleSave}>
            Save Changes
          </Button>
                </div>
      </div>
    </Modal>

    {/* Unmark-as-paid confirmation — rendered as a top-level sibling (not nested
        inside the main form Modal's body) so its Portal stacks above the form
        Modal's backdrop and its buttons receive click events. */}
    <Modal show={showUnmarkConfirm} onHide={() => setShowUnmarkConfirm(false)} title="Unmark Run as Paid?">
      <p style={{ fontSize: "13px", color: "#1e293b", margin: "0 0 16px", lineHeight: 1.5 }}>
        Unmark this run as paid?
      </p>
      <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 16px", lineHeight: "1.5" }}>
        This will clear the Paid Date and Paid Reference fields for this run.
      </p>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={() => { setShowUnmarkConfirm(false); }}>Cancel</Button>
        <Button variant="danger"
      onClick={() => {
        setShowUnmarkConfirm(false);
        setHeaderFields((h) => ({ ...h, is_paid: false, paid_date: null, paid_reference: null }));
      }}
    >
      Unmark
    </Button>
      </div>
    </Modal>
  </>
  );
}
