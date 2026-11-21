"use client";

import { useEffect, useRef, useState } from "react";
import { Form } from "react-bootstrap";
import { Button, FileAttachments, Modal, toastError, toastSuccess } from "@/shared/components/ui";
import { loadRepairForm, saveRepairForm, loadFiles, createFileUpload, saveUploadedFile, getFileUrl, deleteFile } from "../data/projectMap.actions";
import { PROJECT_FILE_MAX_BYTES, REPAIR_PHOTO_TYPES, REPAIR_PROBLEM_MAX_LENGTH, formatDisplayDate } from "../data/projectMap.data";
import { generateRepairFormPrint } from "../utils/printRepairForm";

const EMPTY_DRAFT = { phone_number: "", form_date: "", original_installer: "", reported_problem: "" };
const CARD = { background: "#fff", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px" };
const ROW = { display: "flex", justifyContent: "space-between", gap: "12px" };
const LABEL = { color: "#64748b", flexShrink: 0 };
const VALUE = { fontWeight: 600, color: "#0f172a", textAlign: "right", overflowWrap: "anywhere" };
const NOT_SET = { color: "#94a3b8", textAlign: "right" };

// Today as "YYYY-MM-DD" in the viewer's time zone (default form date).
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * "Repair form" card in the project panel, for projects in a repair status
 * (the panel shows it when isRepairProject is true). One form per project
 * (proj_t_repair_forms): phone, form date, original installer and reported
 * problem are saved on the form; customer name, repair address, invoice # and
 * amount owed come from the project. Repair photos are their own files
 * (owner type "repair"). Edit opens a pop-up; Print opens the printable sheet.
 *
 * Props: project; addressText / amountText (the panel's address line and
 * formatted amount); readOnly (form edits, same as editing the project);
 * filesReadOnly / canDeleteFile (photos, same rules as the project's Files).
 */
export default function RepairFormCard({ project, addressText = "", amountText = null, readOnly = false, filesReadOnly = false, canDeleteFile = null, onChanged = null }) {
  const projectId = project?.id;
  // The form and the photo count come with the project list (proj_t_repair_forms
  // and repair_photos embeds in loadProjectMapSetup / loadProjects), so the card
  // shows at once with no server call. The embed can be an object or a one-item array.
  const embeddedForm = Array.isArray(project?.proj_t_repair_forms)
    ? project.proj_t_repair_forms[0] || null
    : project?.proj_t_repair_forms || null;
  const photoCount = Array.isArray(project?.repair_photos) ? Number(project.repair_photos[0]?.count ?? 0) : null;
  const [form, setForm] = useState(embeddedForm);
  const [showEdit, setShowEdit] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);

  // A refreshed project list brings the latest form.
  useEffect(() => { setForm(embeddedForm); }, [embeddedForm]);

  // Photos are added and deleted in the pop-up: when it closes, the page
  // refreshes the project list so the form and photo count stay current.
  const wasEditOpen = useRef(false);
  useEffect(() => {
    if (wasEditOpen.current && !showEdit) onChanged?.();
    wasEditOpen.current = showEdit;
  }, [showEdit, onChanged]);

  const openEdit = () => {
    setDraft({
      phone_number: form?.phone_number || "",
      form_date: form?.form_date || todayKey(),
      original_installer: form?.original_installer || "",
      reported_problem: form?.reported_problem || "",
    });
    setShowEdit(true);
    // No installer yet: suggest the one from the project's earliest run. The
    // pop-up opens at once; the name fills in if the field is still empty.
    if (!form?.original_installer) {
      loadRepairForm(projectId)
        .then((result) => {
          const suggestion = result?.suggestedInstaller;
          if (suggestion) setDraft((prev) => (prev.original_installer ? prev : { ...prev, original_installer: suggestion }));
        })
        .catch(() => {});
    }
  };

  const handleChange = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveRepairForm(projectId, draft);
      if (!result?.success) throw new Error(result?.error || "Unable to save the repair form.");
      setForm(result.form);
      setShowEdit(false);
      toastSuccess("Repair form saved.", "Repair form");
    } catch (err) {
      toastError(err?.message || "Unable to save the repair form.", "Repair form");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    // Opened on the click, before any wait, so the browser does not block it.
    const printWindow = window.open("", "_blank", "width=900,height=1000");
    if (!printWindow) {
      toastError("Allow pop-ups for this site to print the repair form.", "Repair form");
      return;
    }
    setPrinting(true);
    try {
      const files = await loadFiles("repair", projectId);
      const images = (files || []).filter((file) => String(file.mime_type || "").startsWith("image/"));
      const photos = await Promise.all(images.map(async (file) => ({ name: file.file_name, url: await getFileUrl(file.id) })));
      generateRepairFormPrint(printWindow, {
        customerName: project?.client_name,
        phone: form?.phone_number,
        address: addressText,
        invoiceNumber: project?.invoice_number,
        originalInstaller: form?.original_installer,
        formDate: form?.form_date,
        amountOwed: amountText,
        reportedProblem: form?.reported_problem,
        photos,
      });
    } catch (err) {
      printWindow.close();
      toastError(err?.message || "Unable to print the repair form.", "Repair form");
    } finally {
      setPrinting(false);
    }
  };

  if (!project) return null;

  const valueOrNotSet = (value) => (
    <span style={value ? VALUE : NOT_SET}>{value || "Not set"}</span>
  );
return (
    <section aria-label="Repair form" style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#991b1b", letterSpacing: "0.04em", textTransform: "uppercase" }}>Repair form</h3>
        <span style={{ padding: "1px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: 600, background: form ? "#dcfce7" : "#f1f5f9", color: form ? "#166534" : "#475569" }}>
          {form ? "Filled in" : "Not filled in"}
        </span>
        {form?.form_date && (
          <span style={{ marginLeft: "auto", fontSize: "10px", color: "#64748b" }}>Form date {formatDisplayDate(form.form_date)}</span>
        )}
      </div>

      {form ? (
        <>
          <div style={ROW}><span style={LABEL}>Phone</span>{valueOrNotSet(form.phone_number)}</div>
          <div style={ROW}><span style={LABEL}>Original installer</span>{valueOrNotSet(form.original_installer)}</div>
          <div style={ROW}><span style={LABEL}>Invoice #</span>{valueOrNotSet(project.invoice_number)}</div>
          <div style={ROW}>
            <span style={LABEL}>Amount owed</span>
            <span style={amountText ? { ...VALUE, color: "#b91c1c", fontWeight: 700 } : NOT_SET}>{amountText || "Not set"}</span>
          </div>
          <div style={{ paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
            <div style={{ color: "#64748b", marginBottom: "3px" }}>Reported problem</div>
            {form.reported_problem ? (
              <div style={{ color: "#0f172a", lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{form.reported_problem}</div>
            ) : (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>Not written yet.</div>
            )}
          </div>
        </>
      ) : (
        <div style={{ color: "#475569" }}>No repair form yet.</div>
      )}

      {/* Only the number of repair photos here; they are added, opened and deleted in the repair form pop-up. */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
        <span style={{ color: "#64748b" }}>Repair photos</span>
        <span style={photoCount ? { fontWeight: 600, color: "#0f172a" } : { color: "#94a3b8" }}>
          {photoCount == null ? "—" : photoCount === 0 ? "None" : `${photoCount} photo${photoCount === 1 ? "" : "s"}`}
        </span>
      </div>

      <div style={{ display: "flex", gap: "8px", paddingTop: "4px" }}>
        {!readOnly && (
          <button type="button" onClick={openEdit} style={{ flex: 1, padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#fff", color: "#334155", fontFamily: "inherit", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            {form ? "Edit form" : "Fill in repair form"}
          </button>
        )}
        {form && (
          <button type="button" onClick={handlePrint} disabled={printing} style={{ flex: 1, padding: "7px 10px", border: "none", borderRadius: "8px", background: "#0f172a", color: "#fff", fontFamily: "inherit", fontSize: "12px", fontWeight: 600, cursor: printing ? "default" : "pointer", opacity: printing ? 0.6 : 1 }}>
            {printing ? "Preparing..." : "Print form"}
          </button>
        )}
      </div>
      <Modal show={showEdit} onHide={() => { if (!saving) setShowEdit(false); }} title="Repair form">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
          <div style={{ padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px 16px" }}>
            <div><div style={{ fontSize: "11px", color: "#64748b" }}>Customer name</div><div style={{ fontWeight: 600 }}>{project.client_name || "—"}</div></div>
            <div><div style={{ fontSize: "11px", color: "#64748b" }}>Invoice #</div><div style={{ fontWeight: 600 }}>{project.invoice_number || "—"}</div></div>
            <div style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: "11px", color: "#64748b" }}>Repair address</div><div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{addressText || "—"}</div></div>
            <div><div style={{ fontSize: "11px", color: "#64748b" }}>Amount owed</div><div style={{ fontWeight: 700, color: "#b91c1c" }}>{amountText || "—"}</div></div>
            <div style={{ fontSize: "11px", color: "#64748b", alignSelf: "end" }}>These come from the project. Change them with Edit project.</div>
          </div>

          <Form.Group controlId="repair-form-phone">
            <Form.Label style={{ fontWeight: 600, fontSize: "12px" }}>Phone number</Form.Label>
            <Form.Control type="tel" size="sm" maxLength={40} value={draft.phone_number} onChange={(e) => handleChange("phone_number", e.target.value)} disabled={saving} />
          </Form.Group>
          <Form.Group controlId="repair-form-date">
            <Form.Label style={{ fontWeight: 600, fontSize: "12px" }}>Form date</Form.Label>
            <Form.Control type="date" size="sm" value={draft.form_date} onChange={(e) => handleChange("form_date", e.target.value)} disabled={saving} />
          </Form.Group>
          <Form.Group controlId="repair-form-installer">
            <Form.Label style={{ fontWeight: 600, fontSize: "12px" }}>Original installer</Form.Label>
            <Form.Control type="text" size="sm" maxLength={200} value={draft.original_installer} onChange={(e) => handleChange("original_installer", e.target.value)} disabled={saving} />
            <Form.Text className="text-muted">Filled in from the installer of this project&apos;s earliest run. You can change it.</Form.Text>
          </Form.Group>
          <Form.Group controlId="repair-form-problem">
            <Form.Label style={{ fontWeight: 600, fontSize: "12px" }}>Reported problem</Form.Label>
            <Form.Control as="textarea" rows={5} maxLength={REPAIR_PROBLEM_MAX_LENGTH} value={draft.reported_problem} onChange={(e) => handleChange("reported_problem", e.target.value)} disabled={saving} />
          </Form.Group>
          {/* Repair photos: added and deleted only here. Same rules as the project's Files:
              add if you may attach; delete if you may edit, or your own file. */}
          <div style={{ paddingTop: "8px", borderTop: "1px solid #e2e8f0" }}>
            <FileAttachments
              key={`repair-photos-edit-${projectId}`}
              title="Repair photos"
              loadFiles={() => loadFiles("repair", projectId)}
              createUpload={(meta) => createFileUpload("repair", projectId, meta)}
              saveFile={(storagePath, meta) => saveUploadedFile("repair", projectId, storagePath, meta)}
              getFileUrl={(file) => getFileUrl(file.id)}
              deleteFile={(file) => deleteFile(file.id)}
              maxBytes={PROJECT_FILE_MAX_BYTES}
              accept={REPAIR_PHOTO_TYPES.join(",")}
              readOnly={filesReadOnly}
              canDeleteFile={canDeleteFile}
            />
            <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b" }}>Photos save as soon as they are added; they do not wait for Save form.</div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <Button variant="secondary" onClick={() => setShowEdit(false)} disabled={saving}>Cancel</Button>
            <Button variant="success" loading={saving} onClick={handleSave}>Save form</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}